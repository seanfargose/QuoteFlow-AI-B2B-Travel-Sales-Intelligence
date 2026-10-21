// Pure rate freshness and inventory confidence evaluator

import { InventorySourceType } from '../types';

export interface RateFreshnessResult {
  isFresh: boolean;
  isExpired: boolean;
  daysSinceVerification: number;
  confidenceScore: number; // 0.0 to 1.0
  actionWarning?: string;
}

export function evaluateRateFreshness(
  lastVerifiedIso: string,
  inventoryType: InventorySourceType,
  currentDateIso?: string
): RateFreshnessResult {
  const now = currentDateIso ? new Date(currentDateIso).getTime() : Date.now();
  const lastVerified = new Date(lastVerifiedIso).getTime();
  const diffDays = Math.max(0, Math.floor((now - lastVerified) / (1000 * 60 * 60 * 24)));

  if (inventoryType === 'PREPAID_COMMITMENT') {
    // Committed block inventory is pre-purchased: 100% allotment confidence unless cutoff passed
    return {
      isFresh: true,
      isExpired: false,
      daysSinceVerification: diffDays,
      confidenceScore: 0.98,
    };
  }

  if (inventoryType === 'CONTRACTED_DIRECT') {
    if (diffDays <= 30) {
      return {
        isFresh: true,
        isExpired: false,
        daysSinceVerification: diffDays,
        confidenceScore: 0.92,
      };
    }
    if (diffDays <= 60) {
      return {
        isFresh: false,
        isExpired: false,
        daysSinceVerification: diffDays,
        confidenceScore: 0.68,
        actionWarning: `Contract rate verified ${diffDays} days ago. Verify seasonal blackout dates.`,
      };
    }
    return {
      isFresh: false,
      isExpired: true,
      daysSinceVerification: diffDays,
      confidenceScore: 0.35,
      actionWarning: `Stale contract (${diffDays} days old). DMC tariff re-confirmation required.`,
    };
  }

  // THIRD_PARTY_ON_DEMAND (Spot rates)
  const isFresh = diffDays <= 7;
  return {
    isFresh,
    isExpired: diffDays > 14,
    daysSinceVerification: diffDays,
    confidenceScore: isFresh ? 0.85 : 0.40,
    actionWarning: isFresh ? undefined : `Spot rate is ${diffDays} days old. Live availability may have lapsed.`,
  };
}
