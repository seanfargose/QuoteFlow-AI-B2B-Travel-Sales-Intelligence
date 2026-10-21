// Pure completeness scoring and ambiguity diagnostic engine

import { TravelRequirement, MissingFieldDiagnostic } from '../types';

export function scoreRequirementCompleteness(req: Partial<TravelRequirement>): {
  score: number;
  missingFields: MissingFieldDiagnostic[];
} {
  const missing: MissingFieldDiagnostic[] = [];
  let score = 100;

  // 1. Destination Corridor
  if (!req.destinationCorridor) {
    score -= 25;
    missing.push({
      fieldKey: 'destinationCorridor',
      severity: 'BLOCKING',
      humanDescription: 'Destination corridor is not specified.',
      clarificationPromptTemplate: 'Which destination is your client planning? (Thailand, Dubai, Bali, Vietnam, Maldives)',
    });
  }

  // 2. Dates
  if (!req.tentativeTravelDate) {
    score -= 20;
    missing.push({
      fieldKey: 'tentativeTravelDate',
      severity: 'BLOCKING',
      humanDescription: 'Approximate travel dates or month missing.',
      clarificationPromptTemplate: 'Could you confirm the tentative travel dates or which week of the month the client prefers?',
    });
  }

  // 3. Duration
  if (!req.totalDurationNights || req.totalDurationNights <= 0) {
    score -= 15;
    missing.push({
      fieldKey: 'totalDurationNights',
      severity: 'BLOCKING',
      humanDescription: 'Number of nights not specified.',
      clarificationPromptTemplate: 'How many nights is the client planning to stay?',
    });
  }

  // 4. Passenger Details & Child Ages
  if (!req.passengers || req.passengers.length === 0) {
    score -= 20;
    missing.push({
      fieldKey: 'passengers',
      severity: 'BLOCKING',
      humanDescription: 'Adult and child passenger counts missing.',
      clarificationPromptTemplate: 'How many adults and children are traveling in this group?',
    });
  } else {
    // Check if children have ages
    const childrenWithoutAge = req.passengers.filter(p => p.type === 'CHILD' && (p.age === undefined || p.age === null));
    if (childrenWithoutAge.length > 0) {
      score -= 12;
      missing.push({
        fieldKey: 'passengers.children.age',
        severity: 'RECOMMENDED',
        humanDescription: 'Child age missing (Critical for Extra Bed CWB vs No Bed CNB hotel tariffs).',
        clarificationPromptTemplate: 'What is the age of the child? (Helps determine if the hotel requires an extra bed or allows sharing parents bed to save cost).',
      });
    }
  }

  // 5. Flight Preference
  if (!req.flightPreference) {
    score -= 8;
    missing.push({
      fieldKey: 'flightPreference',
      severity: 'OPTIONAL',
      humanDescription: 'Flight inclusion preference unstated.',
      clarificationPromptTemplate: 'Do you want airfare included from India or land-only package?',
    });
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    missingFields: missing,
  };
}
