// Pure deterministic pricing arithmetic, margin rules, and versioning engine

import { 
  QuoteLineItem, 
  QuoteVersion, 
  PackageTier, 
  HotelRate, 
  TravelRequirement, 
  Supplier,
  DestinationCorridor
} from '../types';

export interface PricingTotals {
  totalLandNetCostInr: number;
  totalFlightNetCostInr: number;
  totalNetCostInr: number;
  markupAmountInr: number;
  costBasedMarkupPercentage: number;     // (Selling Price - Net Cost) / Net Cost * 100
  sellingPriceGrossMarginPercentage: number; // (Selling Price - Net Cost) / Selling Price * 100
  totalSellingPriceInr: number;
  perPersonSellingPriceInr: number;
  paxCount: number;
}

export interface RiskWarning {
  id: string;
  category: 'STALE_RATE' | 'BLACKOUT_DATE' | 'COMMITMENT_EXPIRING' | 'LOW_MARGIN' | 'INCOMPLETE_REQUIREMENT';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  affectedLineItemId?: string;
}

/**
 * Calculates line item INR costs using deterministic FX rate and FX buffer
 */
export function calculateLineItemCostInr(
  units: number,
  unitNetCostForeign: number,
  fxRateToInr: number,
  fxBufferPercentage = 0.015
): number {
  if (units <= 0 || unitNetCostForeign <= 0) return 0;
  if (fxRateToInr <= 0) return 0;
  
  // Apply FX buffer to hedge currency volatility
  const effectiveFxRate = fxRateToInr * (1 + fxBufferPercentage);
  return Math.round(units * unitNetCostForeign * effectiveFxRate);
}

/**
 * Deterministic calculation of pricing totals, strictly separating:
 * 1. Cost-based Markup %: Profit / Net Cost * 100
 * 2. Selling-price Gross Margin %: Profit / Selling Price * 100
 */
export function calculateQuoteVersionTotals(
  lineItems: QuoteLineItem[],
  markupPercentage: number, // Target markup on cost (e.g. 0.14 for 14% cost-based markup)
  paxCount = 2
): PricingTotals {
  const safePax = Math.max(1, paxCount);
  const activeItems = lineItems.filter(item => !item.isOptionalAddon);

  let landNetInr = 0;
  let flightNetInr = 0;

  for (const item of activeItems) {
    const cost = item.totalNetCostInr || 0;
    if (item.category === 'FLIGHT') {
      flightNetInr += cost;
    } else {
      landNetInr += cost;
    }
  }

  const totalNetCostInr = landNetInr + flightNetInr;

  // Handle zero cost edge case
  if (totalNetCostInr <= 0) {
    return {
      totalLandNetCostInr: 0,
      totalFlightNetCostInr: 0,
      totalNetCostInr: 0,
      markupAmountInr: 0,
      costBasedMarkupPercentage: 0,
      sellingPriceGrossMarginPercentage: 0,
      totalSellingPriceInr: 0,
      perPersonSellingPriceInr: 0,
      paxCount: safePax,
    };
  }

  // Cost-based markup applied to total net cost
  const safeMarkupPct = Math.max(0, markupPercentage);
  const markupAmountInr = Math.round(totalNetCostInr * safeMarkupPct);
  const totalSellingPriceInr = totalNetCostInr + markupAmountInr;

  // 1. Cost-based Markup %
  const costBasedMarkupPercentage = (markupAmountInr / totalNetCostInr) * 100;

  // 2. Selling-price Gross Margin %
  const sellingPriceGrossMarginPercentage = totalSellingPriceInr > 0 
    ? (markupAmountInr / totalSellingPriceInr) * 100 
    : 0;

  const perPersonSellingPriceInr = Math.round(totalSellingPriceInr / safePax);

  return {
    totalLandNetCostInr: landNetInr,
    totalFlightNetCostInr: flightNetInr,
    totalNetCostInr,
    markupAmountInr,
    costBasedMarkupPercentage: Number(costBasedMarkupPercentage.toFixed(2)),
    sellingPriceGrossMarginPercentage: Number(sellingPriceGrossMarginPercentage.toFixed(2)),
    totalSellingPriceInr,
    perPersonSellingPriceInr,
    paxCount: safePax,
  };
}

/**
 * Checks quote line items against hotel rates, supplier freshness, and travel dates
 */
export function checkQuoteRisks(
  lineItems: QuoteLineItem[],
  hotelRates: HotelRate[],
  travelDateStr?: string,
  grossMarginPct = 12.0
): RiskWarning[] {
  const warnings: RiskWarning[] = [];
  const currentDate = new Date('2026-10-21T00:00:00Z');

  // 1. Check Gross Margin Floor (< 8% requires manager override)
  if (grossMarginPct < 8.0) {
    warnings.push({
      id: 'risk_low_margin',
      category: 'LOW_MARGIN',
      severity: 'CRITICAL',
      title: 'Gross Margin Below 8% Company Floor',
      description: `Requested gross margin of ${grossMarginPct.toFixed(1)}% is below the mandatory 8.0% company floor. Quote is locked pending Sales Manager approval.`,
    });
  }

  // 2. Check Line Items against Hotel Tariffs
  for (const item of lineItems) {
    if (item.category === 'HOTEL' && item.rateId) {
      const rate = hotelRates.find(r => r.id === item.rateId);
      if (rate) {
        // Check rate freshness (stale if verified > 14 days ago)
        const verifiedDate = new Date(rate.lastVerifiedAt);
        const daysSinceVerified = Math.floor((currentDate.getTime() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysSinceVerified > 14 || !rate.isFresh) {
          warnings.push({
            id: `risk_stale_${item.id}`,
            category: 'STALE_RATE',
            severity: 'WARNING',
            title: `Stale Supplier Tariff (${rate.hotelName})`,
            description: `Tariff was last verified ${daysSinceVerified} days ago (${rate.lastVerifiedAt.slice(0, 10)}). Rate re-verification recommended before issuing binding quote.`,
            affectedLineItemId: item.id,
          });
        }

        // Check blackout dates
        if (travelDateStr && rate.blackoutDates && rate.blackoutDates.length > 0) {
          if (rate.blackoutDates.includes(travelDateStr)) {
            warnings.push({
              id: `risk_blackout_${item.id}`,
              category: 'BLACKOUT_DATE',
              severity: 'CRITICAL',
              title: `Travel Date Falls on Supplier Blackout (${rate.hotelName})`,
              description: `Date ${travelDateStr} is listed as a blackout date by DMC ${rate.inventorySource.supplierId}. Hotel cannot confirm standard allotment.`,
              affectedLineItemId: item.id,
            });
          }
        }

        // Check committed inventory status
        if (rate.inventorySource.type === 'PREPAID_COMMITMENT' && rate.inventorySource.commitmentDetails) {
          const commit = rate.inventorySource.commitmentDetails;
          if (commit.roomsRemaining <= 2) {
            warnings.push({
              id: `risk_commit_low_${item.id}`,
              category: 'COMMITMENT_EXPIRING',
              severity: 'WARNING',
              title: `Low Prepaid Inventory (${commit.roomsRemaining} Rooms Left)`,
              description: `Only ${commit.roomsRemaining} of ${commit.totalRoomsCommitted} committed rooms remain at ${rate.hotelName}. Confirm allotment quickly.`,
              affectedLineItemId: item.id,
            });
          }
        }
      }
    }
  }

  return warnings;
}

/**
 * Creates a new version (e.g. v1 -> v2) recording change delta and modified line items
 */
export function createNewQuoteVersion(
  currentVersion: QuoteVersion,
  updatedLineItems: QuoteLineItem[],
  newMarkupPercentage: number,
  paxCount: number,
  changeReason = 'Sales rep revised hotel tier and transfers'
): QuoteVersion {
  const newTotals = calculateQuoteVersionTotals(updatedLineItems, newMarkupPercentage, paxCount);

  // Identify modified line items
  const modifiedTitles: string[] = [];
  updatedLineItems.forEach(item => {
    const prev = currentVersion.lineItems.find(p => p.id === item.id);
    if (!prev || prev.totalNetCostInr !== item.totalNetCostInr || prev.units !== item.units) {
      modifiedTitles.push(item.title);
    }
  });

  const nextVersionNumber = currentVersion.versionNumber + 1;
  const priceDelta = newTotals.totalSellingPriceInr - currentVersion.totalSellingPriceInr;
  const marginDelta = newTotals.sellingPriceGrossMarginPercentage - (
    currentVersion.totalSellingPriceInr > 0 
      ? (currentVersion.grossProfitInr / currentVersion.totalSellingPriceInr) * 100 
      : 0
  );

  const newVersion: QuoteVersion = {
    versionId: `ver_${currentVersion.packageTier.toLowerCase()}_v${nextVersionNumber}_${Date.now()}`,
    versionNumber: nextVersionNumber,
    createdAt: new Date().toISOString(),
    createdByUserId: 'usr_priya_sales',
    packageTier: currentVersion.packageTier,
    tierDisplayName: currentVersion.tierDisplayName,
    totalLandNetCostInr: newTotals.totalLandNetCostInr,
    totalFlightNetCostInr: newTotals.totalFlightNetCostInr,
    totalNetCostInr: newTotals.totalNetCostInr,
    markupPercentage: newMarkupPercentage,
    grossProfitInr: newTotals.markupAmountInr,
    totalSellingPriceInr: newTotals.totalSellingPriceInr,
    perPersonSellingPriceInr: newTotals.perPersonSellingPriceInr,
    lineItems: updatedLineItems,
    itineraryDays: currentVersion.itineraryDays,
    inclusions: currentVersion.inclusions,
    exclusions: currentVersion.exclusions,
    validityExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days validity
    cancellationPolicy: currentVersion.cancellationPolicy,
    paymentSchedule: [
      { dueDate: 'Immediate upon confirmation', amountInr: Math.round(newTotals.totalSellingPriceInr * 0.25), description: '25% Non-refundable Booking Deposit' },
      { dueDate: '21 Days before departure', amountInr: Math.round(newTotals.totalSellingPriceInr * 0.75), description: '75% Final Balance Payment' },
    ],
    assumptions: currentVersion.assumptions,
    diffFromPreviousVersion: {
      previousVersionId: currentVersion.versionId,
      priceDeltaInr: priceDelta,
      marginDeltaPercentage: Number(marginDelta.toFixed(2)),
      modifiedLineItemDescriptions: modifiedTitles.length > 0 ? modifiedTitles : [changeReason],
    },
  };

  return newVersion;
}

/**
 * Generates an initial multi-tier Quote (Saver, Curated Recommended, Elite Luxury) for a requirement
 */
export function generateInitialQuoteForRequirement(req: TravelRequirement): any {
  const quoteId = `quote_${req.destinationCorridor.toLowerCase()}_${Date.now()}`;
  const nights = req.totalDurationNights || 5;
  const pax = Math.max(1, req.passengers.length || 2);
  const includeFlights = req.flightPreference !== 'LAND_ONLY';

  // 1. Line items for SAVER (Budget 3-star, Shared SIC transfers)
  const saverLineItems: QuoteLineItem[] = [
    {
      id: `li_sav_hotel_${Date.now()}`,
      category: 'HOTEL',
      title: `3★ Standard City Hotel (${req.destinationCorridor}) - Standard Room`,
      supplierId: 'sup_asiaworld_th',
      inventorySourceType: 'THIRD_PARTY_ON_DEMAND',
      units: nights,
      unitNetCostForeign: 1800,
      foreignCurrency: req.destinationCorridor === 'DUBAI' ? 'AED' : req.destinationCorridor === 'BALI' ? 'USD' : 'THB',
      fxRateToInr: req.destinationCorridor === 'DUBAI' ? 22.95 : req.destinationCorridor === 'BALI' ? 84.2 : 2.42,
      totalNetCostInr: nights * (req.destinationCorridor === 'DUBAI' ? 4131 : req.destinationCorridor === 'BALI' ? 5894 : 4420),
      markupPercentage: 0.095,
      sellingPriceInr: Math.round(nights * (req.destinationCorridor === 'DUBAI' ? 4131 : req.destinationCorridor === 'BALI' ? 5894 : 4420) * 1.095),
      isPrepaidCommitment: false,
      isOptionalAddon: false,
      notes: 'Bed & Breakfast included. Standard check-in 14:00.',
    },
    {
      id: `li_sav_trf_${Date.now()}`,
      category: 'TRANSFER',
      title: 'Shared SIC Airport & City Sightseeing Transfers',
      supplierId: 'sup_asiaworld_th',
      inventorySourceType: 'THIRD_PARTY_ON_DEMAND',
      units: pax,
      unitNetCostForeign: 800,
      foreignCurrency: 'THB',
      fxRateToInr: 2.42,
      totalNetCostInr: pax * 2000,
      markupPercentage: 0.095,
      sellingPriceInr: Math.round(pax * 2000 * 1.095),
      isPrepaidCommitment: false,
      isOptionalAddon: false,
      notes: 'Scheduled seat-in-coach transfer.',
    },
    {
      id: `li_sav_act_${Date.now()}`,
      category: 'ACTIVITY',
      title: 'Essential Destination Orientation Tour & Temple Pass',
      supplierId: 'sup_asiaworld_th',
      inventorySourceType: 'THIRD_PARTY_ON_DEMAND',
      units: pax,
      unitNetCostForeign: 600,
      foreignCurrency: 'THB',
      fxRateToInr: 2.42,
      totalNetCostInr: pax * 1500,
      markupPercentage: 0.095,
      sellingPriceInr: Math.round(pax * 1500 * 1.095),
      isPrepaidCommitment: false,
      isOptionalAddon: false,
    },
  ];

  // 2. Line items for CURATED RECOMMENDED (4-star Deluxe, Private transfers, Committed inventory)
  const recLineItems: QuoteLineItem[] = [
    {
      id: `li_rec_hotel_${Date.now()}`,
      category: 'HOTEL',
      title: req.destinationCorridor === 'DUBAI' 
        ? 'Voco Dubai Sheikh Zayed Road (5★ City) - Superior City View' 
        : req.destinationCorridor === 'BALI'
        ? 'The Kayon Jungle Resort Ubud + Grand Mirage Seminyak'
        : 'Centara Grand Beach Resort Phuket - Deluxe Ocean Facing',
      supplierId: req.destinationCorridor === 'DUBAI' ? 'sup_travstarz_dxb' : 'sup_asiaworld_th',
      inventorySourceType: req.destinationCorridor === 'DUBAI' ? 'PREPAID_COMMITMENT' : 'CONTRACTED_DIRECT',
      rateId: req.destinationCorridor === 'DUBAI' ? 'rate_voco_dubai' : 'rate_centara_phuket',
      units: nights,
      unitNetCostForeign: req.destinationCorridor === 'DUBAI' ? 540 : 4200,
      foreignCurrency: req.destinationCorridor === 'DUBAI' ? 'AED' : 'THB',
      fxRateToInr: req.destinationCorridor === 'DUBAI' ? 22.95 : 2.42,
      totalNetCostInr: nights * (req.destinationCorridor === 'DUBAI' ? 12579 : 10312),
      markupPercentage: 0.124,
      sellingPriceInr: Math.round(nights * (req.destinationCorridor === 'DUBAI' ? 12579 : 10312) * 1.124),
      isPrepaidCommitment: req.destinationCorridor === 'DUBAI',
      isOptionalAddon: false,
      notes: 'Buffet breakfast included. Direct contracted DMC tariff.',
    },
    {
      id: `li_rec_trf_${Date.now()}`,
      category: 'TRANSFER',
      title: 'Private AC Van Airport & Inter-Hotel Transfer Service',
      supplierId: 'sup_asiaworld_th',
      inventorySourceType: 'CONTRACTED_DIRECT',
      units: 1,
      unitNetCostForeign: 3200,
      foreignCurrency: 'THB',
      fxRateToInr: 2.42,
      totalNetCostInr: 7850,
      markupPercentage: 0.124,
      sellingPriceInr: Math.round(7850 * 1.124),
      isPrepaidCommitment: false,
      isOptionalAddon: false,
      notes: 'Dedicated driver with luggage assistance.',
    },
    {
      id: `li_rec_act_${Date.now()}`,
      category: 'ACTIVITY',
      title: req.destinationCorridor === 'DUBAI' 
        ? 'VIP Red Dune Desert Safari with BBQ Dinner & Quad Biking' 
        : 'Phi Phi Island Luxury Speedboat Tour with National Park Fees',
      supplierId: 'sup_asiaworld_th',
      inventorySourceType: 'CONTRACTED_DIRECT',
      units: pax,
      unitNetCostForeign: 1800,
      foreignCurrency: 'THB',
      fxRateToInr: 2.42,
      totalNetCostInr: pax * 4450,
      markupPercentage: 0.124,
      sellingPriceInr: Math.round(pax * 4450 * 1.124),
      isPrepaidCommitment: false,
      isOptionalAddon: false,
    },
  ];

  // 3. Line items for ELITE LUXURY (5-star Luxury / Pool Villa, Luxury Vehicle)
  const luxLineItems: QuoteLineItem[] = [
    {
      id: `li_lux_hotel_${Date.now()}`,
      category: 'HOTEL',
      title: req.destinationCorridor === 'BALI' 
        ? 'W Bali Seminyak (Wonderful Garden View) + Private Pool Villa Ubud' 
        : req.destinationCorridor === 'DUBAI'
        ? 'Atlantis The Palm Dubai - Ocean King Room'
        : 'Banyan Tree Phuket - Signature Private Pool Villa',
      supplierId: 'sup_asiaworld_th',
      inventorySourceType: 'CONTRACTED_DIRECT',
      units: nights,
      unitNetCostForeign: req.destinationCorridor === 'BALI' ? 285 : 9800,
      foreignCurrency: req.destinationCorridor === 'BALI' ? 'USD' : 'THB',
      fxRateToInr: req.destinationCorridor === 'BALI' ? 84.2 : 2.42,
      totalNetCostInr: nights * (req.destinationCorridor === 'BALI' ? 24357 : 24100),
      markupPercentage: 0.148,
      sellingPriceInr: Math.round(nights * (req.destinationCorridor === 'BALI' ? 24357 : 24100) * 1.148),
      isPrepaidCommitment: false,
      isOptionalAddon: false,
      notes: 'Honeymoon amenities, club lounge access, daily gourmet breakfast.',
    },
    {
      id: `li_lux_trf_${Date.now()}`,
      category: 'TRANSFER',
      title: 'VIP Chauffeur Service in Luxury Van (Toyota Alphard / Mercedes)',
      supplierId: 'sup_asiaworld_th',
      inventorySourceType: 'CONTRACTED_DIRECT',
      units: 1,
      unitNetCostForeign: 6500,
      foreignCurrency: 'THB',
      fxRateToInr: 2.42,
      totalNetCostInr: 16000,
      markupPercentage: 0.148,
      sellingPriceInr: Math.round(16000 * 1.148),
      isPrepaidCommitment: false,
      isOptionalAddon: false,
    },
    {
      id: `li_lux_act_${Date.now()}`,
      category: 'ACTIVITY',
      title: 'Private Sunset Catamaran Yacht Cruise with Champagne & Seafood Dinner',
      supplierId: 'sup_asiaworld_th',
      inventorySourceType: 'CONTRACTED_DIRECT',
      units: pax,
      unitNetCostForeign: 4500,
      foreignCurrency: 'THB',
      fxRateToInr: 2.42,
      totalNetCostInr: pax * 11000,
      markupPercentage: 0.148,
      sellingPriceInr: Math.round(pax * 11000 * 1.148),
      isPrepaidCommitment: false,
      isOptionalAddon: false,
    },
  ];

  // Optional Flights
  if (includeFlights) {
    const flightCost = (req.destinationCorridor === 'DUBAI' ? 24000 : req.destinationCorridor === 'BALI' ? 32000 : 21000) * pax;
    const flightItem: QuoteLineItem = {
      id: `li_flt_${Date.now()}`,
      category: 'FLIGHT',
      title: `Return Airfare ex-${req.departureAirport || 'BOM'} to ${req.destinationCorridor} (Economy Class)`,
      supplierId: 'sup_asiaworld_th',
      inventorySourceType: 'THIRD_PARTY_ON_DEMAND',
      units: pax,
      unitNetCostForeign: flightCost,
      foreignCurrency: 'INR',
      fxRateToInr: 1.0,
      totalNetCostInr: flightCost,
      markupPercentage: 0.05, // 5% flight markup
      sellingPriceInr: Math.round(flightCost * 1.05),
      isPrepaidCommitment: false,
      isOptionalAddon: false,
      notes: 'Baggage 20kg included. Airfare subject to seat class availability at ticketing.',
    };
    saverLineItems.push({ ...flightItem, id: `li_sav_flt_${Date.now()}` });
    recLineItems.push({ ...flightItem, id: `li_rec_flt_${Date.now()}` });
    luxLineItems.push({ ...flightItem, id: `li_lux_flt_${Date.now()}` });
  }

  // Calculate totals
  const saverTotals = calculateQuoteVersionTotals(saverLineItems, 0.095, pax);
  const recTotals = calculateQuoteVersionTotals(recLineItems, 0.124, pax);
  const luxTotals = calculateQuoteVersionTotals(luxLineItems, 0.148, pax);

  const versions: QuoteVersion[] = [
    {
      versionId: `ver_sav_v1_${Date.now()}`,
      versionNumber: 1,
      createdAt: new Date().toISOString(),
      createdByUserId: 'usr_priya_sales',
      packageTier: 'SAVER',
      tierDisplayName: 'Saver Tier (3★ Standard & Shared Transfers)',
      totalLandNetCostInr: saverTotals.totalLandNetCostInr,
      totalFlightNetCostInr: saverTotals.totalFlightNetCostInr,
      totalNetCostInr: saverTotals.totalNetCostInr,
      markupPercentage: 0.095,
      grossProfitInr: saverTotals.markupAmountInr,
      totalSellingPriceInr: saverTotals.totalSellingPriceInr,
      perPersonSellingPriceInr: saverTotals.perPersonSellingPriceInr,
      lineItems: saverLineItems,
      itineraryDays: [],
      inclusions: ['Standard Hotel Accommodation', 'Daily Breakfast', 'Shared Airport Transfers', 'Orientation City Tour'],
      exclusions: ['Personal Expenses', 'Travel Insurance', 'Visa on Arrival Fees', 'Peak Season Hotel Surcharges'],
      validityExpiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      cancellationPolicy: 'Non-refundable within 14 days of departure.',
      paymentSchedule: [
        { dueDate: 'Immediate upon confirmation', amountInr: Math.round(saverTotals.totalSellingPriceInr * 0.3), description: '30% Advance Deposit' },
        { dueDate: '15 Days before departure', amountInr: Math.round(saverTotals.totalSellingPriceInr * 0.7), description: '70% Balance Payment' },
      ],
      assumptions: ['Standard 14:00 hotel check-in time', 'Seat-in-coach transfer timing subject to joint airport pick-up schedule'],
    },
    {
      versionId: `ver_rec_v1_${Date.now()}`,
      versionNumber: 1,
      createdAt: new Date().toISOString(),
      createdByUserId: 'usr_priya_sales',
      packageTier: 'CURATED_RECOMMENDED',
      tierDisplayName: 'Curated Recommended (4★ Deluxe & Private Transfers)',
      totalLandNetCostInr: recTotals.totalLandNetCostInr,
      totalFlightNetCostInr: recTotals.totalFlightNetCostInr,
      totalNetCostInr: recTotals.totalNetCostInr,
      markupPercentage: 0.124,
      grossProfitInr: recTotals.markupAmountInr,
      totalSellingPriceInr: recTotals.totalSellingPriceInr,
      perPersonSellingPriceInr: recTotals.perPersonSellingPriceInr,
      lineItems: recLineItems,
      itineraryDays: [],
      inclusions: ['4★ Deluxe Resort Accommodation', 'Daily Buffet Breakfast', 'Private AC Airport & Inter-Hotel Transfers', 'Top Sightseeing Tour with National Park Pass', '24/7 On-Ground Local Support'],
      exclusions: ['Personal Expenses', 'Items not mentioned in inclusions', 'Visa Fees (if applicable)'],
      validityExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      cancellationPolicy: 'Free cancellation up to 21 days before travel. 50% retention between 20 to 10 days.',
      paymentSchedule: [
        { dueDate: 'Immediate upon confirmation', amountInr: Math.round(recTotals.totalSellingPriceInr * 0.25), description: '25% Non-refundable Booking Deposit' },
        { dueDate: '21 Days before departure', amountInr: Math.round(recTotals.totalSellingPriceInr * 0.75), description: '75% Final Balance Payment' },
      ],
      assumptions: ['Direct DMC contracted allotments subject to release date cutoff', 'Private transfers provided with English-speaking driver'],
    },
    {
      versionId: `ver_lux_v1_${Date.now()}`,
      versionNumber: 1,
      createdAt: new Date().toISOString(),
      createdByUserId: 'usr_priya_sales',
      packageTier: 'ELITE_LUXURY',
      tierDisplayName: 'Elite Luxury (5★ Beachfront / Pool Villa & Chauffeur)',
      totalLandNetCostInr: luxTotals.totalLandNetCostInr,
      totalFlightNetCostInr: luxTotals.totalFlightNetCostInr,
      totalNetCostInr: luxTotals.totalNetCostInr,
      markupPercentage: 0.148,
      grossProfitInr: luxTotals.markupAmountInr,
      totalSellingPriceInr: luxTotals.totalSellingPriceInr,
      perPersonSellingPriceInr: luxTotals.perPersonSellingPriceInr,
      lineItems: luxLineItems,
      itineraryDays: [],
      inclusions: ['5★ Luxury Resort / Private Pool Villa', 'Club Lounge Access & Daily Champagne Breakfast', 'VIP Private Chauffeur Driven Luxury Van', 'Private Sunset Yacht / Catamaran Cruise with Dinner', 'VIP Fast-Track Airport Immigrations'],
      exclusions: ['Personal Expenses', 'Gratuities'],
      validityExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      cancellationPolicy: 'Strict luxury property policy: Non-refundable within 30 days of travel.',
      paymentSchedule: [
        { dueDate: 'Immediate upon confirmation', amountInr: Math.round(luxTotals.totalSellingPriceInr * 0.5), description: '50% Immediate Luxury Villa Deposit' },
        { dueDate: '30 Days before departure', amountInr: Math.round(luxTotals.totalSellingPriceInr * 0.5), description: '50% Final Settlement' },
      ],
      assumptions: ['Private pool villa allocated with King Double bed', 'VIP fast-track immigration subject to airport authority clearances'],
    },
  ];

  return {
    id: quoteId,
    requirementId: req.id,
    agentId: req.agentId,
    destinationCorridor: req.destinationCorridor,
    currentVersionId: versions[1].versionId, // Default to Recommended
    versions,
    activeTier: 'CURATED_RECOMMENDED',
    status: 'DRAFT',
    approvalState: {
      isApprovalRequired: false,
      approvalStatus: 'NOT_REQUIRED',
    },
    intentScore: 82,
    lastActivityAt: new Date().toISOString(),
    viewCount: 0,
    totalDwellSeconds: 0,
    clientForwardedDetected: false,
    webProposalSlug: `prop_${req.destinationCorridor.toLowerCase()}_${Math.random().toString(36).substring(2, 7)}`,
    whatsappShareText: `Hi! Here is the customized B2B quotation for ${req.destinationCorridor} (${nights}N, ${pax} Pax): Starting from ₹${recTotals.perPersonSellingPriceInr.toLocaleString('en-IN')}/person. View complete interactive itinerary: https://quoteflow.travel/p/${quoteId}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
