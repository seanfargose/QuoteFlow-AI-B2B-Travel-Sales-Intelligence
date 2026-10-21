// AI Extraction Service with decoupled provider interface

import { TravelRequirement } from '../types';
import { extractRequirementFromText } from '../domain/extractionEngine';
import { scoreRequirementCompleteness } from '../domain/completenessEngine';

export interface IAIExtractionService {
  providerName: string;
  isSimulated: boolean;
  parseRequirement(
    rawText: string,
    agentId: string,
    channel: TravelRequirement['sourceChannel']
  ): Promise<TravelRequirement>;
}

export class RuleBasedExtractionService implements IAIExtractionService {
  public providerName = 'QuoteFlow Heuristic NLP Engine (Rule-Based Fallback)';
  public isSimulated = true;

  public async parseRequirement(
    rawText: string,
    agentId: string,
    channel: TravelRequirement['sourceChannel'] = 'WHATSAPP'
  ): Promise<TravelRequirement> {
    // 1. Run deterministic regex/NLP tokenization
    const extracted = extractRequirementFromText(rawText);

    // 2. Run transparent completeness scoring
    const completeness = scoreRequirementCompleteness({
      destinationCorridor: extracted.destinationCorridor,
      tentativeTravelDate: extracted.tentativeTravelDate,
      totalDurationNights: extracted.totalDurationNights,
      passengers: extracted.passengers,
      flightPreference: extracted.flightPreference,
      departureAirport: extracted.departureAirport,
      mealPlanRequested: extracted.mealPlanRequested,
    });

    // 3. Determine priority based on conflicts and completeness
    let priority: TravelRequirement['priority'] = 'MEDIUM';
    if (extracted.conflictFlags.some(c => c.severity === 'CRITICAL')) {
      priority = 'CRITICAL';
    } else if (completeness.missingFields.some(m => m.severity === 'BLOCKING')) {
      priority = 'HIGH';
    } else if (completeness.isReadyForQuoting) {
      priority = 'LOW';
    }

    // 4. Assemble full typed TravelRequirement
    const newRequirement: TravelRequirement = {
      id: `req_${Date.now()}`,
      agentId,
      sourceChannel: channel,
      rawInquiryText: rawText,
      destinationCorridor: extracted.destinationCorridor,
      cities: extracted.cities,
      tentativeTravelDate: extracted.tentativeTravelDate,
      flexibilityDays: extracted.flexibilityDays,
      totalDurationNights: extracted.totalDurationNights,
      passengers: extracted.passengers,
      hotelCategoryRequested: extracted.hotelCategoryRequested,
      mealPlanRequested: extracted.mealPlanRequested,
      transferPreference: extracted.transferPreference,
      flightPreference: extracted.flightPreference,
      departureAirport: extracted.departureAirport,
      budgetInrMax: extracted.budgetInrMax,
      preferences: extracted.preferences,
      completenessScore: completeness.score,
      missingFields: completeness.missingFields,
      assumptions: extracted.assumptions,
      conflictFlags: extracted.conflictFlags,
      clarificationQuestions: extracted.clarificationQuestions,
      editHistory: [],
      priority,
      status: completeness.isReadyForQuoting ? 'PARSED_READY' : 'CLARIFICATION_PENDING',
      extractedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    };

    return newRequirement;
  }
}

// Default export singleton
export const extractionService: IAIExtractionService = new RuleBasedExtractionService();
