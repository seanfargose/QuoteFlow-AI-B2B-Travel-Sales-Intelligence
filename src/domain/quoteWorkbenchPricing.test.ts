import { describe, it, expect } from 'vitest';
import { 
  calculateLineItemCostInr, 
  calculateQuoteVersionTotals, 
  checkQuoteRisks, 
  createNewQuoteVersion 
} from './pricingEngine';
import { QuoteLineItem, QuoteVersion, HotelRate } from '../types';

describe('Quote Workbench Pricing Arithmetic & FX Hedge Buffer', () => {
  it('calculates foreign line item net cost in INR with mandatory 1.5% FX hedge buffer', () => {
    // 5,000 THB at fx 2.42 with 1.5% buffer:
    // effective fx = 2.42 * 1.015 = 2.4563 (floating point 12281.4999...)
    // cost = Math.round(1 * 5000 * 2.4563) = 12281 INR
    const costInr = calculateLineItemCostInr(1, 5000, 2.42, 0.015);
    expect(costInr).toBe(12281);
  });

  it('calculates multi-unit costs correctly', () => {
    // 3 nights * 4,000 THB at 2.42 with 0% buffer = 3 * 4000 * 2.42 = 29,040
    const costInr = calculateLineItemCostInr(3, 4000, 2.42, 0);
    expect(costInr).toBe(29040);
  });

  it('handles edge case: zero or negative units and costs gracefully by returning 0', () => {
    expect(calculateLineItemCostInr(0, 5000, 2.42)).toBe(0);
    expect(calculateLineItemCostInr(3, 0, 2.42)).toBe(0);
    expect(calculateLineItemCostInr(-2, 5000, 2.42)).toBe(0);
    expect(calculateLineItemCostInr(2, -5000, 2.42)).toBe(0);
    expect(calculateLineItemCostInr(2, 5000, 0)).toBe(0);
  });
});

describe('Mathematical Separation: Cost-based Markup vs Selling-price Gross Margin', () => {
  const sampleItems: QuoteLineItem[] = [
    {
      id: 'li_land_1',
      category: 'HOTEL',
      title: 'Centara Grand Phuket (3N)',
      supplierId: 'sup_asiaworld_th',
      inventorySourceType: 'PREPAID_COMMITMENT',
      units: 3,
      unitNetCostForeign: 4000,
      foreignCurrency: 'THB',
      fxRateToInr: 2.42,
      totalNetCostInr: 30000,
      markupPercentage: 0.15,
      sellingPriceInr: 34500,
      isPrepaidCommitment: true,
      isOptionalAddon: false,
    },
    {
      id: 'li_flight_1',
      category: 'FLIGHT',
      title: 'Air India Indigo Flights BOM-HKT',
      supplierId: 'sup_asiaworld_th',
      inventorySourceType: 'THIRD_PARTY_ON_DEMAND',
      units: 2,
      unitNetCostForeign: 35000,
      foreignCurrency: 'INR',
      fxRateToInr: 1,
      totalNetCostInr: 70000,
      markupPercentage: 0.15,
      sellingPriceInr: 80500,
      isPrepaidCommitment: false,
      isOptionalAddon: false,
    },
  ];

  it('accurately distinguishes cost-based markup from gross margin without conflation', () => {
    // Total Net Cost = 30,000 + 70,000 = 100,000 INR
    // Markup = 15% (0.15)
    // Markup Amount = 15,000 INR
    // Total Selling Price = 115,000 INR
    // Cost-based Markup % = (15,000 / 100,000) * 100 = 15.0%
    // Selling-price Gross Margin % = (15,000 / 115,000) * 100 = 13.04%
    const totals = calculateQuoteVersionTotals(sampleItems, 0.15, 2);

    expect(totals.totalLandNetCostInr).toBe(30000);
    expect(totals.totalFlightNetCostInr).toBe(70000);
    expect(totals.totalNetCostInr).toBe(100000);
    expect(totals.markupAmountInr).toBe(15000);
    expect(totals.totalSellingPriceInr).toBe(115000);

    // Strict mathematical checks
    expect(totals.costBasedMarkupPercentage).toBe(15.0);
    expect(totals.sellingPriceGrossMarginPercentage).toBe(13.04);
    expect(totals.costBasedMarkupPercentage).not.toBe(totals.sellingPriceGrossMarginPercentage);
  });

  it('computes correct per-traveller costs and updates when passenger counts change', () => {
    const for2Pax = calculateQuoteVersionTotals(sampleItems, 0.15, 2);
    expect(for2Pax.perPersonSellingPriceInr).toBe(Math.round(115000 / 2)); // 57,500 INR

    const for4Pax = calculateQuoteVersionTotals(sampleItems, 0.15, 4);
    expect(for4Pax.perPersonSellingPriceInr).toBe(Math.round(115000 / 4)); // 28,750 INR
  });

  it('handles edge case: zero passenger count safely without division by zero NaN', () => {
    const zeroPaxResult = calculateQuoteVersionTotals(sampleItems, 0.15, 0);
    expect(zeroPaxResult.paxCount).toBe(1);
    expect(Number.isFinite(zeroPaxResult.perPersonSellingPriceInr)).toBe(true);
  });

  it('handles edge case: empty quote with 0 net cost gracefully', () => {
    const emptyResult = calculateQuoteVersionTotals([], 0.15, 2);
    expect(emptyResult.totalNetCostInr).toBe(0);
    expect(emptyResult.totalSellingPriceInr).toBe(0);
    expect(emptyResult.costBasedMarkupPercentage).toBe(0);
    expect(emptyResult.sellingPriceGrossMarginPercentage).toBe(0);
    expect(emptyResult.perPersonSellingPriceInr).toBe(0);
  });
});

describe('Quote Versioning & Change Delta Tracking', () => {
  const initialVersion: QuoteVersion = {
    versionId: 'ver_v1_101',
    versionNumber: 1,
    createdAt: '2026-10-21T10:00:00Z',
    createdByUserId: 'usr_priya_sales',
    packageTier: 'CURATED_RECOMMENDED',
    tierDisplayName: 'Curated 4★ Package',
    totalLandNetCostInr: 50000,
    totalFlightNetCostInr: 30000,
    totalNetCostInr: 80000,
    markupPercentage: 0.15,
    grossProfitInr: 12000,
    totalSellingPriceInr: 92000,
    perPersonSellingPriceInr: 46000,
    lineItems: [
      {
        id: 'li_h1',
        category: 'HOTEL',
        title: 'Phuket Resort 4★ (3N)',
        supplierId: 'sup_asiaworld_th',
        inventorySourceType: 'CONTRACTED_DIRECT',
        units: 3,
        unitNetCostForeign: 4000,
        foreignCurrency: 'THB',
        fxRateToInr: 2.42,
        totalNetCostInr: 30000,
        markupPercentage: 0.15,
        sellingPriceInr: 34500,
        isPrepaidCommitment: false,
        isOptionalAddon: false,
      },
      {
        id: 'li_t1',
        category: 'TRANSFER',
        title: 'Airport Private Van',
        supplierId: 'sup_asiaworld_th',
        inventorySourceType: 'CONTRACTED_DIRECT',
        units: 2,
        unitNetCostForeign: 1000,
        foreignCurrency: 'THB',
        fxRateToInr: 2.42,
        totalNetCostInr: 5000,
        markupPercentage: 0.15,
        sellingPriceInr: 5750,
        isPrepaidCommitment: false,
        isOptionalAddon: false,
      },
    ],
    itineraryDays: [],
    inclusions: ['4★ Resort', 'Daily Breakfast'],
    exclusions: ['Visa'],
    validityExpiresAt: '2026-10-28T10:00:00Z',
    cancellationPolicy: 'Free cancellation up to 14 days',
    paymentSchedule: [],
    assumptions: ['Standard check-in 14:00'],
  };

  it('increments version number and calculates price delta & margin delta accurately', () => {
    // Modify line item: upgrade hotel cost from 30,000 to 45,000
    const updatedItems: QuoteLineItem[] = [
      {
        ...initialVersion.lineItems[0],
        totalNetCostInr: 45000,
      },
      initialVersion.lineItems[1],
    ];

    const newVer = createNewQuoteVersion(
      initialVersion,
      updatedItems,
      0.15, // 15% markup
      2,    // 2 pax
      'Upgraded to Sea View Deluxe Wing'
    );

    expect(newVer.versionNumber).toBe(2);
    expect(newVer.totalNetCostInr).toBe(50000); // 45,000 + 5,000
    expect(newVer.totalSellingPriceInr).toBe(57500); // 50,000 * 1.15
    
    // Check Diff against v1
    expect(newVer.diffFromPreviousVersion).toBeDefined();
    expect(newVer.diffFromPreviousVersion?.previousVersionId).toBe('ver_v1_101');
    expect(newVer.diffFromPreviousVersion?.priceDeltaInr).toBe(57500 - 92000);
    expect(newVer.diffFromPreviousVersion?.modifiedLineItemDescriptions).toContain('Phuket Resort 4★ (3N)');
  });
});

describe('Rate Freshness & Availability Risk Governance', () => {
  const mockHotelRates: HotelRate[] = [
    {
      id: 'rate_stale_hotel',
      hotelName: 'Heritage Stale Grand Resort',
      city: 'Phuket',
      destination: 'THAILAND',
      starRating: 4,
      roomCategory: 'Superior',
      mealPlan: 'BED_AND_BREAKFAST',
      inventorySource: {
        type: 'CONTRACTED_DIRECT',
        supplierId: 'sup_asiaworld_th',
        contractCode: 'TH-OLD-01',
      },
      netRatePerNightForeign: 3000,
      foreignCurrency: 'THB',
      appliedFxRateToInr: 2.42,
      fxBufferPercentage: 0.015,
      netRatePerNightInr: 7370,
      lastVerifiedAt: '2026-09-01T00:00:00Z', // Verified 50 days ago (> 14 days = Stale)
      isFresh: false,
      availabilityStatus: 'CONFIRMED_ALLOTMENT',
      confidenceScore: 0.70,
      blackoutDates: ['2026-11-20', '2026-12-25'],
    },
    {
      id: 'rate_committed_low',
      hotelName: 'Centara Grand Beach Resort',
      city: 'Phuket',
      destination: 'THAILAND',
      starRating: 5,
      roomCategory: 'Deluxe Ocean',
      mealPlan: 'BED_AND_BREAKFAST',
      inventorySource: {
        type: 'PREPAID_COMMITMENT',
        supplierId: 'sup_asiaworld_th',
        contractCode: 'TH-COMMITTED-W26',
        commitmentDetails: {
          totalRoomsCommitted: 30,
          roomsSold: 29,
          roomsRemaining: 1, // <= 2 rooms left!
          releaseCutoffDate: '2026-11-15T00:00:00Z',
          sunkCostPenaltyPerRoomInr: 12000,
          repIncentiveKickerInr: 500,
        },
      },
      netRatePerNightForeign: 5000,
      foreignCurrency: 'THB',
      appliedFxRateToInr: 2.42,
      fxBufferPercentage: 0.015,
      netRatePerNightInr: 12282,
      lastVerifiedAt: '2026-10-20T00:00:00Z', // Verified yesterday = Fresh
      isFresh: true,
      availabilityStatus: 'CONFIRMED_ALLOTMENT',
      confidenceScore: 0.98,
      blackoutDates: [],
    },
  ];

  it('flags stale supplier tariffs verified more than 14 days ago', () => {
    const items: QuoteLineItem[] = [
      {
        id: 'li_stale',
        category: 'HOTEL',
        rateId: 'rate_stale_hotel',
        title: 'Heritage Stale Grand Resort',
        supplierId: 'sup_asiaworld_th',
        inventorySourceType: 'CONTRACTED_DIRECT',
        units: 3,
        unitNetCostForeign: 3000,
        foreignCurrency: 'THB',
        fxRateToInr: 2.42,
        totalNetCostInr: 22000,
        markupPercentage: 0.12,
        sellingPriceInr: 24640,
        isPrepaidCommitment: false,
        isOptionalAddon: false,
      },
    ];

    const warnings = checkQuoteRisks(items, mockHotelRates, '2026-11-10', 12.0);
    const staleWarn = warnings.find(w => w.category === 'STALE_RATE');
    expect(staleWarn).toBeDefined();
    expect(staleWarn?.title).toContain('Stale Supplier Tariff');
  });

  it('flags blackout date collisions when travel dates coincide with supplier blackout', () => {
    const items: QuoteLineItem[] = [
      {
        id: 'li_blackout',
        category: 'HOTEL',
        rateId: 'rate_stale_hotel',
        title: 'Heritage Stale Grand Resort',
        supplierId: 'sup_asiaworld_th',
        inventorySourceType: 'CONTRACTED_DIRECT',
        units: 3,
        unitNetCostForeign: 3000,
        foreignCurrency: 'THB',
        fxRateToInr: 2.42,
        totalNetCostInr: 22000,
        markupPercentage: 0.12,
        sellingPriceInr: 24640,
        isPrepaidCommitment: false,
        isOptionalAddon: false,
      },
    ];

    const warnings = checkQuoteRisks(items, mockHotelRates, '2026-11-20', 12.0);
    const blackoutWarn = warnings.find(w => w.category === 'BLACKOUT_DATE');
    expect(blackoutWarn).toBeDefined();
    expect(blackoutWarn?.severity).toBe('CRITICAL');
  });

  it('flags low committed inventory when remaining rooms <= 2', () => {
    const items: QuoteLineItem[] = [
      {
        id: 'li_committed',
        category: 'HOTEL',
        rateId: 'rate_committed_low',
        title: 'Centara Grand Beach Resort',
        supplierId: 'sup_asiaworld_th',
        inventorySourceType: 'PREPAID_COMMITMENT',
        units: 3,
        unitNetCostForeign: 5000,
        foreignCurrency: 'THB',
        fxRateToInr: 2.42,
        totalNetCostInr: 36000,
        markupPercentage: 0.12,
        sellingPriceInr: 40320,
        isPrepaidCommitment: true,
        isOptionalAddon: false,
      },
    ];

    const warnings = checkQuoteRisks(items, mockHotelRates, '2026-11-10', 12.0);
    const commitWarn = warnings.find(w => w.category === 'COMMITMENT_EXPIRING');
    expect(commitWarn).toBeDefined();
    expect(commitWarn?.description).toContain('1 of 30 committed rooms remain');
  });

  it('triggers critical approval lock when gross margin is below the 8.0% company floor', () => {
    const items: QuoteLineItem[] = [];
    const warnings = checkQuoteRisks(items, mockHotelRates, '2026-11-10', 6.5);
    const marginWarn = warnings.find(w => w.category === 'LOW_MARGIN');
    expect(marginWarn).toBeDefined();
    expect(marginWarn?.severity).toBe('CRITICAL');
    expect(marginWarn?.description).toContain('6.5% is below the mandatory 8.0%');
  });
});
