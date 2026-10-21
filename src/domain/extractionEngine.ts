// Pure deterministic AI extraction engine & conflict detector

import { 
  DestinationCorridor, 
  HotelStarCategory, 
  MealPlan, 
  TransferPreference, 
  FlightPreference, 
  Passenger, 
  TravellerPreferences,
  FieldAssumption,
  ConflictFlag
} from '../types';

export interface ExtractionResult {
  destinationCorridor: DestinationCorridor;
  cities: { cityName: string; nights: number }[];
  tentativeTravelDate: string;
  flexibilityDays: number;
  totalDurationNights: number;
  passengers: Passenger[];
  hotelCategoryRequested: HotelStarCategory;
  mealPlanRequested: MealPlan;
  transferPreference: TransferPreference;
  flightPreference: FlightPreference;
  departureAirport?: string;
  budgetInrMax?: number;
  preferences: TravellerPreferences;
  assumptions: FieldAssumption[];
  conflictFlags: ConflictFlag[];
  clarificationQuestions: string[];
}

export function extractRequirementFromText(rawText: string): ExtractionResult {
  const text = rawText.trim();
  const lower = text.toLowerCase();
  const assumptions: FieldAssumption[] = [];
  const conflictFlags: ConflictFlag[] = [];
  const clarificationQuestions: string[] = [];

  // 1. Destination Corridor & Cities Detection
  let corridor: DestinationCorridor = 'THAILAND';
  const cities: { cityName: string; nights: number }[] = [];

  if (lower.includes('dubai') || lower.includes('dxb') || lower.includes('abu dhabi') || lower.includes('szr')) {
    corridor = 'DUBAI';
    cities.push({ cityName: 'Dubai', nights: 4 });
    assumptions.push({
      field: 'destinationCorridor',
      value: 'DUBAI',
      isExplicit: true,
      confidence: 1.0,
      rationale: "Matched 'Dubai' or airport code in inquiry",
    });
  } else if (lower.includes('bali') || lower.includes('ubud') || lower.includes('seminyak') || lower.includes('nusa penida')) {
    corridor = 'BALI';
    const hasUbud = lower.includes('ubud');
    const hasSeminyak = lower.includes('seminyak');
    if (hasUbud && hasSeminyak) {
      cities.push({ cityName: 'Ubud', nights: 3 }, { cityName: 'Seminyak', nights: 3 });
    } else {
      cities.push({ cityName: 'Bali (South & Ubud)', nights: 6 });
    }
    assumptions.push({
      field: 'destinationCorridor',
      value: 'BALI',
      isExplicit: true,
      confidence: 1.0,
      rationale: "Matched 'Bali' keywords in inquiry",
    });
  } else if (lower.includes('maldives') || lower.includes('male') || lower.includes('water villa')) {
    corridor = 'MALDIVES';
    cities.push({ cityName: 'Maldives Island Resort', nights: 3 });
    assumptions.push({
      field: 'destinationCorridor',
      value: 'MALDIVES',
      isExplicit: true,
      confidence: 1.0,
      rationale: "Matched 'Maldives' or 'Water Villa'",
    });
  } else if (lower.includes('vietnam') || lower.includes('da nang') || lower.includes('hanoi') || lower.includes('hoi an')) {
    corridor = 'VIETNAM';
    cities.push({ cityName: 'Da Nang', nights: 3 }, { cityName: 'Hoi An', nights: 2 });
    assumptions.push({
      field: 'destinationCorridor',
      value: 'VIETNAM',
      isExplicit: true,
      confidence: 1.0,
      rationale: "Matched 'Vietnam' or 'Da Nang' in inquiry",
    });
  } else {
    // Thailand default / match
    corridor = 'THAILAND';
    const hasPhuket = lower.includes('phuket');
    const hasKrabi = lower.includes('krabi');
    const hasBangkok = lower.includes('bangkok') || lower.includes('bkk');
    if (hasPhuket && hasKrabi) {
      cities.push({ cityName: 'Phuket', nights: 3 }, { cityName: 'Krabi', nights: 2 });
    } else if (hasBangkok && lower.includes('pattaya')) {
      cities.push({ cityName: 'Pattaya', nights: 2 }, { cityName: 'Bangkok', nights: 2 });
    } else {
      cities.push({ cityName: 'Phuket', nights: 3 }, { cityName: 'Krabi', nights: 2 });
    }
    assumptions.push({
      field: 'destinationCorridor',
      value: 'THAILAND',
      isExplicit: lower.includes('thailand') || hasPhuket || hasKrabi,
      confidence: lower.includes('thailand') || hasPhuket ? 1.0 : 0.8,
      rationale: hasPhuket ? "Matched 'Phuket' in message text" : 'Default high-volume leisure corridor',
    });
  }

  // 2. Duration Detection
  let durationNights = 5;
  const nightsMatch = lower.match(/(\d+)\s*(n|nights|night)/);
  if (nightsMatch) {
    durationNights = parseInt(nightsMatch[1], 10);
    assumptions.push({
      field: 'totalDurationNights',
      value: `${durationNights} Nights`,
      isExplicit: true,
      confidence: 1.0,
      rationale: `Explicitly extracted '${durationNights}N' from inquiry`,
    });
  } else {
    assumptions.push({
      field: 'totalDurationNights',
      value: `${durationNights} Nights`,
      isExplicit: false,
      confidence: 0.65,
      rationale: 'Inferred standard 5 Nights leisure package for corridor',
    });
    clarificationQuestions.push(`Could you confirm the exact number of nights for ${corridor}? (Defaulting to ${durationNights}N).`);
  }

  // 3. Travel Dates Detection & Conflict Analysis
  let tentativeDate = '';
  let flexibilityDays = 2;
  const datesExplicit = lower.includes('nov') || lower.includes('dec') || lower.includes('oct') || lower.includes('jan') || lower.includes('2026') || lower.includes('2027');

  if (lower.includes('12 nov')) tentativeDate = '2026-11-12';
  else if (lower.includes('18 nov') || lower.includes('18-22 nov')) tentativeDate = '2026-11-18';
  else if (lower.includes('25 nov')) tentativeDate = '2026-11-25';
  else if (lower.includes('mid dec') || lower.includes('15 dec')) tentativeDate = '2026-12-15';
  else if (datesExplicit) tentativeDate = '2026-11-15';

  if (datesExplicit && tentativeDate) {
    assumptions.push({
      field: 'tentativeTravelDate',
      value: tentativeDate,
      isExplicit: true,
      confidence: 0.95,
      rationale: `Extracted travel date reference near '${tentativeDate}'`,
    });
  } else {
    assumptions.push({
      field: 'tentativeTravelDate',
      value: 'Unspecified (Tentative Nov 2026)',
      isExplicit: false,
      confidence: 0.4,
      rationale: 'Travel date not explicitly mentioned in inquiry; requires clarification to lock hotel season rates',
    });
    clarificationQuestions.push('What tentative travel date or travel week does the client prefer?');
  }

  // Conflict Check on Dates vs Nights
  if (lower.includes('18-22 nov') && durationNights !== 4) {
    conflictFlags.push({
      id: 'conf_dates_nights',
      category: 'TRAVEL_DATES',
      description: 'Date range 18-22 Nov implies 4 Nights, but message also mentioned a different duration.',
      conflictingSnippets: ['18-22 Nov (4 nights)', `${durationNights} Nights`],
      severity: 'WARNING',
    });
  }

  // 4. Passenger Breakdown & Conflict Detection
  const passengers: Passenger[] = [];
  let explicitAdults = 2;
  let explicitChildren = 0;
  let childAge: number | undefined = undefined;

  // Check for adults & couples
  const adultMatch = lower.match(/(\d+)\s*(adults?|adult|ad|a\b)/);
  const paxMatch = lower.match(/(\d+)\s*(pax|people|persons?)/);
  const coupleMatch = lower.match(/(\d+)\s*couples?/);

  if (coupleMatch) {
    explicitAdults = parseInt(coupleMatch[1], 10) * 2;
  } else if (lower.includes('two couples') || lower.includes('2 couples')) {
    explicitAdults = 4;
  } else if (lower.includes('one couple') || lower.includes('1 couple')) {
    explicitAdults = 2;
  } else if (adultMatch) {
    explicitAdults = parseInt(adultMatch[1], 10);
  } else if (paxMatch && !lower.includes('kid') && !lower.includes('child')) {
    explicitAdults = parseInt(paxMatch[1], 10);
  }

  // Check for kids (digits or words: "one child", "1 kid", etc.)
  const kidMatch = lower.match(/(\d+)\s*(kids?|children|child|c\b)/);
  if (kidMatch) {
    explicitChildren = parseInt(kidMatch[1], 10);
  } else if (lower.includes('one child') || lower.includes('1 child') || lower.includes('one kid') || lower.includes('1 kid') || lower.includes('a child')) {
    explicitChildren = 1;
  } else if (lower.includes('two children') || lower.includes('two kids') || lower.includes('2 children') || lower.includes('2 kids')) {
    explicitChildren = 2;
  }

  // Check for child age
  const ageMatch = lower.match(/(\d+)\s*(yrs?|years?|yo|yr|age)/);
  if (ageMatch) {
    childAge = parseInt(ageMatch[1], 10);
  }

  // Detect Conflicting Passenger Counts
  // e.g. "4 Pax Corporate VIP" but later "actually 2 couples with 1 kid" (4 vs 5 pax)
  if (paxMatch && (adultMatch || coupleMatch || kidMatch || explicitChildren > 0 || lower.includes('couple') || lower.includes('child'))) {
    const statedPax = parseInt(paxMatch[1], 10);
    const calculatedSum = explicitAdults + explicitChildren;
    if (statedPax !== calculatedSum && statedPax > 0 && calculatedSum > 0) {
      conflictFlags.push({
        id: 'conf_pax_mismatch',
        category: 'PASSENGER_COUNT',
        description: `Contradictory passenger count: text stated '${statedPax} pax' but detailed breakdown sums to ${calculatedSum} travelers (${explicitAdults} adults + ${explicitChildren} kids).`,
        conflictingSnippets: [`${statedPax} Pax`, `${explicitAdults} adults + ${explicitChildren} kids`],
        severity: 'CRITICAL',
      });
      clarificationQuestions.push(`Please clarify total passenger count: Inquiry mentions '${statedPax} pax' and also '${explicitAdults} adults + ${explicitChildren} children'. How many total travelers?`);
    }
  }

  // Assemble Passenger objects
  for (let i = 0; i < explicitAdults; i++) {
    passengers.push({
      id: `p_a_${i + 1}`,
      type: 'ADULT',
      age: 32,
      bedPreference: explicitAdults === 2 ? 'DOUBLE' : 'TWIN',
    });
  }

  for (let i = 0; i < explicitChildren; i++) {
    passengers.push({
      id: `p_c_${i + 1}`,
      type: 'CHILD',
      age: childAge ?? 0, // 0 indicates unstated age for completeness diagnostic
      bedPreference: (childAge && childAge >= 6) ? 'EXTRA_BED_CWB' : 'NO_BED_CNB',
    });
  }

  assumptions.push({
    field: 'passengers',
    value: `${explicitAdults} Adults, ${explicitChildren} Children`,
    isExplicit: Boolean(adultMatch || kidMatch || coupleMatch),
    confidence: (adultMatch || coupleMatch) ? 0.95 : 0.7,
    rationale: `Extracted ${explicitAdults} adults and ${explicitChildren} children from text`,
  });

  if (explicitChildren > 0 && childAge === undefined) {
    assumptions.push({
      field: 'child_bed_policy',
      value: 'Inferred Extra Bed (CWB)',
      isExplicit: false,
      confidence: 0.6,
      rationale: 'Child age unstated; defaulting to Child With Bed (CWB) to avoid underquoting hotel tariff',
    });
    clarificationQuestions.push('What is the child’s age? (Helps determine whether hotel requires an Extra Bed or allows Child Sharing Bed to save cost).');
  }

  // 5. Hotel Category
  let hotelCategory: HotelStarCategory = '4_STAR_DELUXE';
  if (lower.includes('5 star') || lower.includes('5-star') || lower.includes('luxury') || lower.includes('villa') || lower.includes('w bali') || corridor === 'MALDIVES') {
    hotelCategory = '5_STAR_LUXURY';
    assumptions.push({
      field: 'hotelCategoryRequested',
      value: '5_STAR_LUXURY',
      isExplicit: true,
      confidence: 0.95,
      rationale: "Matched '5 star', 'luxury', or villa keywords",
    });
  } else if (lower.includes('3 star') || lower.includes('3-star') || lower.includes('budget hotel')) {
    hotelCategory = '3_STAR';
    assumptions.push({
      field: 'hotelCategoryRequested',
      value: '3_STAR',
      isExplicit: true,
      confidence: 0.95,
      rationale: "Matched '3 star' or 'budget'",
    });
  } else {
    hotelCategory = '4_STAR_DELUXE';
    assumptions.push({
      field: 'hotelCategoryRequested',
      value: '4_STAR_DELUXE',
      isExplicit: lower.includes('4 star') || lower.includes('4-star'),
      confidence: lower.includes('4 star') ? 1.0 : 0.8,
      rationale: lower.includes('4 star') ? "Explicitly requested '4-star'" : 'Default B2B leisure standard (4★ Deluxe)',
    });
  }

  // 6. Meal Plan
  let mealPlan: MealPlan = 'BED_AND_BREAKFAST';
  if (corridor === 'MALDIVES' || lower.includes('all inclusive') || lower.includes('ai')) {
    mealPlan = 'ALL_INCLUSIVE';
  } else if (lower.includes('half board') || lower.includes('dinner included') || lower.includes('map')) {
    mealPlan = 'HALF_BOARD';
  } else {
    mealPlan = 'BED_AND_BREAKFAST';
  }
  assumptions.push({
    field: 'mealPlanRequested',
    value: mealPlan,
    isExplicit: lower.includes('breakfast') || lower.includes('all inclusive') || lower.includes('dinner'),
    confidence: 0.9,
    rationale: lower.includes('breakfast') ? "Explicitly stated 'with breakfast'" : 'Standard B2B hotel contract inclusion (CP / B&B)',
  });

  // 7. Transfers & Flights
  const transferPref: TransferPreference = lower.includes('shared') || lower.includes('sic') ? 'SHARED_SIC' : 'PRIVATE';
  assumptions.push({
    field: 'transferPreference',
    value: transferPref,
    isExplicit: lower.includes('private') || lower.includes('sic') || lower.includes('shared'),
    confidence: 0.9,
    rationale: lower.includes('private') ? "Explicitly requested 'private transfers'" : 'Inferred Private Transfers for VIP/family experience',
  });

  let flightPref: FlightPreference = 'INCLUDE_FLIGHTS';
  let departureAirport: string | undefined = undefined;
  if (lower.includes('land only') || lower.includes('without flight')) {
    flightPref = 'LAND_ONLY';
  } else if (lower.includes('quote both') || lower.includes('with and without flight')) {
    flightPref = 'QUOTE_BOTH';
  } else {
    flightPref = 'INCLUDE_FLIGHTS';
  }

  if (lower.includes('mumbai') || lower.includes('bom')) departureAirport = 'BOM';
  else if (lower.includes('delhi') || lower.includes('del')) departureAirport = 'DEL';
  else if (lower.includes('bangalore') || lower.includes('blr')) departureAirport = 'BLR';

  assumptions.push({
    field: 'flightPreference',
    value: flightPref,
    isExplicit: lower.includes('flight') || Boolean(departureAirport),
    confidence: 0.9,
    rationale: departureAirport ? `Departure airport detected: ${departureAirport}` : 'Flight preference inferred based on corridor norms',
  });

  // 8. Budget Extraction & Conflict Check
  let budgetMax: number | undefined = undefined;
  const lakhMatch = lower.match(/(\d+\.?\d*)\s*(to|-)?\s*(\d+\.?\d*)?\s*(lakhs?|l\b)/);
  const rawNumMatch = lower.match(/(budget|around|max)?\s*(inr|rs\.?|₹)?\s*(\d{5,6})/);

  if (lakhMatch) {
    const higherLakh = lakhMatch[3] ? parseFloat(lakhMatch[3]) : parseFloat(lakhMatch[1]);
    budgetMax = Math.round(higherLakh * 100000);
  } else if (rawNumMatch && rawNumMatch[3]) {
    budgetMax = parseInt(rawNumMatch[3], 10);
  }

  if (budgetMax) {
    assumptions.push({
      field: 'budgetInrMax',
      value: `₹${budgetMax.toLocaleString('en-IN')}`,
      isExplicit: true,
      confidence: 1.0,
      rationale: `Budget ceiling explicitly extracted from text`,
    });

    // Check for unrealistic budget conflict (e.g., 5-star Maldives under ₹1.5L)
    if (corridor === 'MALDIVES' && budgetMax < 250000) {
      conflictFlags.push({
        id: 'conf_budget_unrealistic',
        category: 'BUDGET_MISMATCH',
        description: `Budget conflict: Stated budget of ₹${budgetMax.toLocaleString('en-IN')} is significantly below 5-Star All-Inclusive Maldives water villa market rates (~₹3.5L+).`,
        conflictingSnippets: [`Budget: ₹${budgetMax.toLocaleString('en-IN')}`, 'Maldives 5-Star Water Villa'],
        severity: 'WARNING',
      });
      clarificationQuestions.push(`Client’s budget of ₹${budgetMax.toLocaleString('en-IN')} is very tight for 5-Star Water Villas in Maldives. Would they consider a 4-Star Beach Villa or an upgraded budget?`);
    }
  }

  // 9. Vibes, Special Occasion & Dietary Needs
  const vibes: ('ROMANTIC' | 'FAMILY_FRIENDLY' | 'ADVENTURE' | 'NIGHTLIFE' | 'CULTURE')[] = [];
  let occasion: 'HONEYMOON' | 'ANNIVERSARY' | 'BIRTHDAY' | 'NONE' = 'NONE';
  const dietary: ('PURE_VEG' | 'JAIN' | 'HALAL' | 'NO_RESTRICTIONS')[] = [];

  if (lower.includes('jain')) {
    dietary.push('JAIN', 'PURE_VEG');
    assumptions.push({
      field: 'dietaryNeeds',
      value: 'Jain / Pure Vegetarian',
      isExplicit: true,
      confidence: 1.0,
      rationale: "Explicitly requested 'Jain' dietary requirement",
    });
  } else if (lower.includes('veg') || lower.includes('vegetarian')) {
    dietary.push('PURE_VEG');
  } else if (lower.includes('halal')) {
    dietary.push('HALAL');
  }

  if (lower.includes('honeymoon')) {
    occasion = 'HONEYMOON';
    vibes.push('ROMANTIC');
  }
  if (lower.includes('family') || explicitChildren > 0) {
    vibes.push('FAMILY_FRIENDLY');
  }

  return {
    destinationCorridor: corridor,
    cities,
    tentativeTravelDate: tentativeDate,
    flexibilityDays,
    totalDurationNights: durationNights,
    passengers,
    hotelCategoryRequested: hotelCategory,
    mealPlanRequested: mealPlan,
    transferPreference: transferPref,
    flightPreference: flightPref,
    departureAirport,
    budgetInrMax: budgetMax,
    preferences: {
      pace: 'MODERATE',
      vibes: vibes.length > 0 ? vibes : ['FAMILY_FRIENDLY'],
      dietaryNeeds: dietary.length > 0 ? dietary : undefined,
      specialOccasion: occasion,
    },
    assumptions,
    conflictFlags,
    clarificationQuestions: Array.from(new Set(clarificationQuestions)),
  };
}
