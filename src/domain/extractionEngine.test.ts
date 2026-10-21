import { describe, it, expect } from 'vitest';
import { extractRequirementFromText } from './extractionEngine';
import { scoreRequirementCompleteness } from './completenessEngine';

describe('AI Extraction Engine (Rule-Based Fallback)', () => {
  it('extracts structured parameters from an inquiry with Thailand corridor', () => {
    const raw = 'Need 5N Phuket Krabi package for 2 adults and 1 kid (7 yrs). 4-star hotel, private transfers, Nov 15 travel. Budget 1.4 Lakhs.';
    const result = extractRequirementFromText(raw);

    expect(result.destinationCorridor).toBe('THAILAND');
    expect(result.totalDurationNights).toBe(5);
    expect(result.passengers.length).toBe(3);
    expect(result.passengers.filter(p => p.type === 'ADULT').length).toBe(2);
    expect(result.passengers.find(p => p.type === 'CHILD')?.age).toBe(7);
    expect(result.hotelCategoryRequested).toBe('4_STAR_DELUXE');
    expect(result.transferPreference).toBe('PRIVATE');
    expect(result.budgetInrMax).toBe(140000);
    expect(result.tentativeTravelDate).toBe('2026-11-15');
  });

  it('distinguishes explicit requirements from inferred assumptions', () => {
    // Message explicitly mentions 4-star and 5N, but does NOT specify meal plan or child bed preference
    const raw = 'Looking for 5 nights Thailand for 2 adults and 1 child. 4 star hotel.';
    const result = extractRequirementFromText(raw);

    const hotelAssumption = result.assumptions.find(a => a.field === 'hotelCategoryRequested');
    expect(hotelAssumption?.isExplicit).toBe(true);

    const mealAssumption = result.assumptions.find(a => a.field === 'mealPlanRequested');
    expect(mealAssumption?.isExplicit).toBe(false);

    const childBedAssumption = result.assumptions.find(a => a.field === 'child_bed_policy');
    expect(childBedAssumption?.isExplicit).toBe(false);
  });

  it('flags passenger count conflict when stated pax contradicts detailed traveler breakdown', () => {
    const conflictRaw = 'Urgent: Please quote for 4 Pax Corporate VIP Dubai 4N. Wait, actually it is 2 couples and one child (6 yrs) also joining now. Quote 4 Pax in 2 twin rooms with Voco SZR.';
    const result = extractRequirementFromText(conflictRaw);

    expect(result.conflictFlags.length).toBeGreaterThan(0);
    const paxConflict = result.conflictFlags.find(c => c.category === 'PASSENGER_COUNT');
    expect(paxConflict).toBeDefined();
    expect(paxConflict?.severity).toBe('CRITICAL');
    expect(paxConflict?.description).toContain('Contradictory passenger count');
    expect(result.clarificationQuestions.some(q => q.includes('passenger count'))).toBe(true);
  });

  it('flags unrealistic budget conflict for luxury corridors', () => {
    const lowBudgetMaldives = 'Want 4 nights Maldives 5-star water villa all inclusive for honeymoon couple, budget max 1.2 Lakh total.';
    const result = extractRequirementFromText(lowBudgetMaldives);

    const budgetConflict = result.conflictFlags.find(c => c.category === 'BUDGET_MISMATCH');
    expect(budgetConflict).toBeDefined();
    expect(budgetConflict?.description).toContain('significantly below 5-Star All-Inclusive Maldives');
  });

  it('handles phone-call notes with special dietary requirements and honeymoon vibe', () => {
    const phoneNotes = 'Call notes with Neha: VIP Honeymoon couple traveling to Bali 6N around 25 Nov. 3N Private Pool Villa Ubud + 3N beachfront Seminyak. Strictly Pure Jain/Veg breakfast options needed for wife. Budget 2.5L ex-BOM.';
    const result = extractRequirementFromText(phoneNotes);

    expect(result.destinationCorridor).toBe('BALI');
    expect(result.totalDurationNights).toBe(6);
    expect(result.preferences.specialOccasion).toBe('HONEYMOON');
    expect(result.preferences.dietaryNeeds).toContain('JAIN');
    expect(result.departureAirport).toBe('BOM');
    expect(result.budgetInrMax).toBe(250000);
  });
});

describe('Transparent Completeness Scoring Engine', () => {
  it('deducts points and provides actionable diagnostics for incomplete inquiries', () => {
    // Incomplete inquiry missing tentative dates and child age
    const incompleteReq = {
      destinationCorridor: 'THAILAND' as const,
      totalDurationNights: 5,
      tentativeTravelDate: '', // MISSING (-20 pts)
      passengers: [
        { id: 'p1', type: 'ADULT' as const, age: 30, bedPreference: 'DOUBLE' as const },
        { id: 'p2', type: 'ADULT' as const, age: 28, bedPreference: 'DOUBLE' as const },
        { id: 'p3', type: 'CHILD' as const, age: 0, bedPreference: 'NO_BED_CNB' as const }, // AGE MISSING (-12 pts)
      ],
      hotelCategoryRequested: '4_STAR_DELUXE' as const,
      mealPlanRequested: 'BED_AND_BREAKFAST' as const,
      transferPreference: 'PRIVATE' as const,
      flightPreference: 'INCLUDE_FLIGHTS' as const,
      departureAirport: undefined, // MISSING (-5 pts)
    };

    const result = scoreRequirementCompleteness(incompleteReq);

    expect(result.score).toBeLessThan(70);
    expect(result.isReadyForQuoting).toBe(false);

    // Verify itemized deductions
    const dateDeduction = result.deductions.find(d => d.fieldKey === 'tentativeTravelDate');
    expect(dateDeduction).toBeDefined();
    expect(dateDeduction?.pointsDeducted).toBe(20);
    expect(dateDeduction?.severity).toBe('BLOCKING');

    const childAgeDeduction = result.deductions.find(d => d.fieldKey === 'passengers.children.age');
    expect(childAgeDeduction).toBeDefined();
    expect(childAgeDeduction?.pointsDeducted).toBe(12);

    const departureCityDeduction = result.deductions.find(d => d.fieldKey === 'departureAirport');
    expect(departureCityDeduction).toBeDefined();
    expect(departureCityDeduction?.pointsDeducted).toBe(5);
  });

  it('awards high completeness score when all required parameters are present', () => {
    const completeReq = {
      destinationCorridor: 'DUBAI' as const,
      tentativeTravelDate: '2026-11-18',
      totalDurationNights: 4,
      passengers: [
        { id: 'p1', type: 'ADULT' as const, age: 35, bedPreference: 'DOUBLE' as const },
        { id: 'p2', type: 'ADULT' as const, age: 32, bedPreference: 'DOUBLE' as const },
      ],
      hotelCategoryRequested: '5_STAR_LUXURY' as const,
      mealPlanRequested: 'BED_AND_BREAKFAST' as const,
      transferPreference: 'PRIVATE' as const,
      flightPreference: 'LAND_ONLY' as const,
    };

    const result = scoreRequirementCompleteness(completeReq);

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.isReadyForQuoting).toBe(true);
    expect(result.missingFields.length).toBe(0);
  });
});
