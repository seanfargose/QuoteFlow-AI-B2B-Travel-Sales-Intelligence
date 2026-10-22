// AI-assisted quote recommendation service explaining trade-offs across tiers

import { QuoteVersion, PackageTier, TravelRequirement } from '../types';

export interface TierTradeOffAnalysis {
  tier: PackageTier;
  displayName: string;
  priceInr: number;
  perPersonInr: number;
  marginPercentage: number;
  grossProfitInr: number;
  pros: string[];
  cons: string[];
  inventoryAdvantage?: string;
  recommendedAudience: string;
}

export interface QuoteRecommendationResult {
  recommendedTier: PackageTier;
  executiveSummary: string;
  tradeOffs: TierTradeOffAnalysis[];
  strategicRationale: string;
  providerName: string;
  isSimulated: boolean;
}

export interface IQuoteRecommendationService {
  providerName: string;
  isSimulated: boolean;
  generateRecommendation(
    requirement: TravelRequirement,
    versions: QuoteVersion[]
  ): Promise<QuoteRecommendationResult>;
}

export class DeterministicQuoteRecommendationService implements IQuoteRecommendationService {
  public providerName = 'QuoteFlow Strategic Pricing Advisor (Deterministic Heuristic Engine)';
  public isSimulated = true;

  public async generateRecommendation(
    requirement: TravelRequirement,
    versions: QuoteVersion[]
  ): Promise<QuoteRecommendationResult> {
    const saver = versions.find(v => v.packageTier === 'SAVER') || versions[0];
    const recommended = versions.find(v => v.packageTier === 'CURATED_RECOMMENDED') || versions[1] || versions[0];
    const luxury = versions.find(v => v.packageTier === 'ELITE_LUXURY') || versions[2] || versions[0];

    const budgetCeiling = requirement.budgetInrMax || 200000;
    const isHoneymoon = requirement.preferences.specialOccasion === 'HONEYMOON';

    const tradeOffs: TierTradeOffAnalysis[] = [
      {
        tier: 'SAVER',
        displayName: 'Saver Option (3★ Standard)',
        priceInr: saver?.totalSellingPriceInr || 118000,
        perPersonInr: saver?.perPersonSellingPriceInr || 59000,
        marginPercentage: saver?.totalSellingPriceInr > 0 ? (saver.grossProfitInr / saver.totalSellingPriceInr) * 100 : 9.5,
        grossProfitInr: saver?.grossProfitInr || 11200,
        pros: [
          'Lowest out-of-pocket entry price for price-conscious retail travelers',
          'Comfortably under agent budget ceiling',
          'Good close-rate on generic leisure leads',
        ],
        cons: [
          'Shared (SIC) transfers may lead to waiting friction at airport',
          'Standard room categories without resort/sea view',
          'Lower absolute gross profit (₹11,200)',
        ],
        inventoryAdvantage: 'Uses on-demand supplier tariffs with zero financial commitment liability',
        recommendedAudience: 'Budget-focused family travelers and price-sensitive retail inquiries',
      },
      {
        tier: 'CURATED_RECOMMENDED',
        displayName: 'Balanced Curated Option (4★ Deluxe)',
        priceInr: recommended?.totalSellingPriceInr || 148500,
        perPersonInr: recommended?.perPersonSellingPriceInr || 74250,
        marginPercentage: recommended?.totalSellingPriceInr > 0 ? (recommended.grossProfitInr / recommended.totalSellingPriceInr) * 100 : 12.4,
        grossProfitInr: recommended?.grossProfitInr || 18450,
        pros: [
          'Optimal value-to-comfort ratio with 4★ Deluxe centrally located resorts',
          'Guaranteed Private transfers and top-rated island/sightseeing tours',
          'Healthy 12.4% gross margin (comfortably above 8% company floor)',
        ],
        cons: [
          'Priced ~25% higher than the Saver option',
        ],
        inventoryAdvantage: 'Utilizes prepaid committed room blocks, burning down allocation and saving company sunk-cost penalties',
        recommendedAudience: 'Standard holiday families and quality-conscious leisure couples',
      },
      {
        tier: 'ELITE_LUXURY',
        displayName: 'Elite Luxury Option (5★ Resort / Pool Villa)',
        priceInr: luxury?.totalSellingPriceInr || 215000,
        perPersonInr: luxury?.perPersonSellingPriceInr || 107500,
        marginPercentage: luxury?.totalSellingPriceInr > 0 ? (luxury.grossProfitInr / luxury.totalSellingPriceInr) * 100 : 14.8,
        grossProfitInr: luxury?.grossProfitInr || 31800,
        pros: [
          'Highest customer satisfaction: 5★ beachfront resort or private pool villa',
          'VIP private luxury transport and premium sunset cruise inclusions',
          'Highest absolute profit generation (₹31,800)',
        ],
        cons: [
          'May exceed budget ceiling for standard inquiries',
          'Strict 14-day cancellation policies at high-end properties',
        ],
        inventoryAdvantage: 'Direct DMC contract with confirmed allocation priority',
        recommendedAudience: 'VIP travelers, Honeymoon couples, and high-net-worth leisure clients',
      },
    ];

    // Select recommended tier
    let chosenTier: PackageTier = 'CURATED_RECOMMENDED';
    let rationale = '';

    if (isHoneymoon || (luxury && luxury.totalSellingPriceInr <= budgetCeiling)) {
      chosenTier = 'ELITE_LUXURY';
      rationale = `Client inquiry is for a VIP Honeymoon with a healthy budget (₹${(budgetCeiling/100000).toFixed(1)}L). The Elite Luxury tier offers private pool villa arrangements and highest gross profit (₹${luxury.grossProfitInr.toLocaleString('en-IN')}) with superior agent satisfaction.`;
    } else if (recommended && recommended.totalSellingPriceInr <= budgetCeiling) {
      chosenTier = 'CURATED_RECOMMENDED';
      rationale = `The Curated Recommended tier fits client budget of ₹${(budgetCeiling/100000).toFixed(1)}L perfectly, delivers a healthy 12.4% gross margin, and prioritizes committed contracted inventory to protect company margin.`;
    } else {
      chosenTier = 'SAVER';
      rationale = `Client budget is constrained (₹${(budgetCeiling/100000).toFixed(1)}L). Pitching the Saver option first prevents lead leakage to competitors while maintaining a viable 9.5% gross margin.`;
    }

    return {
      recommendedTier: chosenTier,
      executiveSummary: `We recommend pitching the ${chosenTier === 'ELITE_LUXURY' ? 'Elite Luxury' : chosenTier === 'CURATED_RECOMMENDED' ? 'Curated Recommended' : 'Saver'} package as primary, with the other two options presented as alternatives for comparison.`,
      tradeOffs,
      strategicRationale: rationale,
      providerName: this.providerName,
      isSimulated: this.isSimulated,
    };
  }
}

export const quoteRecommendationService: IQuoteRecommendationService = new DeterministicQuoteRecommendationService();
