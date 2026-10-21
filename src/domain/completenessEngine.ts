// Pure transparent completeness scoring engine

import { TravelRequirement, MissingFieldDiagnostic } from '../types';

export interface ScoreDeduction {
  fieldKey: string;
  pointsDeducted: number;
  reason: string;
  severity: 'BLOCKING' | 'RECOMMENDED' | 'OPTIONAL';
}

export interface CompletenessResult {
  score: number;
  deductions: ScoreDeduction[];
  missingFields: MissingFieldDiagnostic[];
  isReadyForQuoting: boolean;
}

export function scoreRequirementCompleteness(req: Partial<TravelRequirement>): CompletenessResult {
  const missing: MissingFieldDiagnostic[] = [];
  const deductions: ScoreDeduction[] = [];
  let score = 100;

  // 1. Destination Corridor (Critical 25 pts)
  if (!req.destinationCorridor) {
    score -= 25;
    deductions.push({
      fieldKey: 'destinationCorridor',
      pointsDeducted: 25,
      reason: 'Destination corridor is missing. Quoting engine cannot retrieve supplier tariffs.',
      severity: 'BLOCKING',
    });
    missing.push({
      fieldKey: 'destinationCorridor',
      severity: 'BLOCKING',
      humanDescription: 'Destination corridor not specified.',
      clarificationPromptTemplate: 'Which destination is your client planning? (Thailand, Dubai, Bali, Vietnam, Maldives)',
    });
  }

  // 2. Dates / Month (Critical 20 pts)
  if (!req.tentativeTravelDate) {
    score -= 20;
    deductions.push({
      fieldKey: 'tentativeTravelDate',
      pointsDeducted: 20,
      reason: 'Travel date or month is unstated. Cannot apply seasonal DMC contract rates or check blackout dates.',
      severity: 'BLOCKING',
    });
    missing.push({
      fieldKey: 'tentativeTravelDate',
      severity: 'BLOCKING',
      humanDescription: 'Approximate travel dates or month missing.',
      clarificationPromptTemplate: 'Could you confirm the tentative travel dates or which week of the month the client prefers?',
    });
  }

  // 3. Duration Nights (Critical 15 pts)
  if (!req.totalDurationNights || req.totalDurationNights <= 0) {
    score -= 15;
    deductions.push({
      fieldKey: 'totalDurationNights',
      pointsDeducted: 15,
      reason: 'Duration in nights is unknown. Hotel room-night multiplier cannot be computed.',
      severity: 'BLOCKING',
    });
    missing.push({
      fieldKey: 'totalDurationNights',
      severity: 'BLOCKING',
      humanDescription: 'Number of nights not specified.',
      clarificationPromptTemplate: 'How many nights is the client planning to stay?',
    });
  }

  // 4. Passenger Details & Child Bed Diagnostics (20 pts total)
  if (!req.passengers || req.passengers.length === 0) {
    score -= 20;
    deductions.push({
      fieldKey: 'passengers',
      pointsDeducted: 20,
      reason: 'Passenger headcount missing. Cannot determine room occupancy or transfer vehicle size.',
      severity: 'BLOCKING',
    });
    missing.push({
      fieldKey: 'passengers',
      severity: 'BLOCKING',
      humanDescription: 'Adult and child passenger counts missing.',
      clarificationPromptTemplate: 'How many adults and children are traveling in this group?',
    });
  } else {
    // Check if children have explicit ages
    const childrenWithoutAge = req.passengers.filter(
      p => p.type === 'CHILD' && (p.age === undefined || p.age === null || p.age === 0)
    );
    if (childrenWithoutAge.length > 0) {
      score -= 12;
      deductions.push({
        fieldKey: 'passengers.children.age',
        pointsDeducted: 12,
        reason: 'Child age is missing. Cannot verify hotel child policy (CWB Extra Bed vs CNB No Bed), risking financial under-quote.',
        severity: 'RECOMMENDED',
      });
      missing.push({
        fieldKey: 'passengers.children.age',
        severity: 'RECOMMENDED',
        humanDescription: 'Child age missing (Critical for Extra Bed CWB vs No Bed CNB hotel tariffs).',
        clarificationPromptTemplate: 'What is the age of the child? (Helps determine if the hotel requires an extra bed or allows sharing parents bed to save cost).',
      });
    }
  }

  // 5. Flight Preference & Departure Airport (8 pts)
  if (!req.flightPreference) {
    score -= 8;
    deductions.push({
      fieldKey: 'flightPreference',
      pointsDeducted: 8,
      reason: 'Unstated whether client needs flight-inclusive package or land-only.',
      severity: 'OPTIONAL',
    });
    missing.push({
      fieldKey: 'flightPreference',
      severity: 'OPTIONAL',
      humanDescription: 'Flight inclusion preference unstated.',
      clarificationPromptTemplate: 'Do you want airfare included from India or land-only package?',
    });
  } else if (req.flightPreference === 'INCLUDE_FLIGHTS' && !req.departureAirport) {
    score -= 5;
    deductions.push({
      fieldKey: 'departureAirport',
      pointsDeducted: 5,
      reason: 'Flight included, but departure city (BOM/DEL/BLR/etc.) not specified.',
      severity: 'RECOMMENDED',
    });
    missing.push({
      fieldKey: 'departureAirport',
      severity: 'RECOMMENDED',
      humanDescription: 'Departure airport city missing for flight quotation.',
      clarificationPromptTemplate: 'Which departure city should we price flights from? (Mumbai BOM, Delhi DEL, Bangalore BLR, etc.)',
    });
  }

  // 6. Meal Plan (5 pts)
  if (!req.mealPlanRequested) {
    score -= 5;
    deductions.push({
      fieldKey: 'mealPlanRequested',
      pointsDeducted: 5,
      reason: 'Meal plan unstated (defaulting to Bed & Breakfast).',
      severity: 'OPTIONAL',
    });
  }

  const finalScore = Math.max(0, Math.min(100, score));
  const hasBlockingDeduction = deductions.some(d => d.severity === 'BLOCKING');

  return {
    score: finalScore,
    deductions,
    missingFields: missing,
    isReadyForQuoting: !hasBlockingDeduction && finalScore >= 70,
  };
}
