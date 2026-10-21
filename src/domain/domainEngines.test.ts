import { describe, it, expect } from 'vitest';
import { calculateQuotePricing } from './pricingEngine';
import { evaluateMarginGuardrails } from './marginGuardrail';
import { evaluateRateFreshness } from './rateFreshness';
import { calculateIntentScore } from './intentScorer';
import { scoreRequirementCompleteness } from './completenessEngine';

describe('Pricing Engine & FX Fluctuation Buffer', () => {
  it('correctly calculates net cost in INR with 1.5% mandatory FX buffer for foreign currencies', () => {
    // 10,000 THB at fx 2.42 = 24,200 INR. With +1.5% buffer = 24,563 INR.
    const result = calculateQuotePricing({
      lineItems: [
        {
          unitNetCostForeign: 10000,
          foreignCurrency: 'THB',
          units: 1,
          fxRateToInr: 2.42,
        },
      ],
      targetMarkupPercentage: 0.12, // 12% markup
    });

    expect(result.totalNetCostInr).toBe(24563);
    expect(result.fxBufferCostInr).toBe(363);
    expect(result.sellingPriceInr).toBe(Math.round(24563 / (1 - 0.12)));
    expect(result.effectiveMarginPercentage).toBeGreaterThanOrEqual(0.12);
  });

  it('handles domestic INR lines without adding FX buffer', () => {
    const result = calculateQuotePricing({
      lineItems: [
        {
          unitNetCostForeign: 50000,
          foreignCurrency: 'INR',
          units: 1,
          fxRateToInr: 1,
        },
      ],
      targetMarkupPercentage: 0.10,
    });

    expect(result.totalNetCostInr).toBe(50000);
    expect(result.fxBufferCostInr).toBe(0);
    expect(result.sellingPriceInr).toBe(Math.round(50000 / 0.9));
  });
});

describe('Margin Guardrails & Governance', () => {
  it('auto-approves margin >= 12%', () => {
    const res = evaluateMarginGuardrails(0.135);
    expect(res.status).toBe('AUTO_APPROVED');
    expect(res.isApprovalRequired).toBe(false);
    expect(res.badgeVariant).toBe('green');
  });

  it('triggers soft warning for margin between 8% and 11.9%', () => {
    const res = evaluateMarginGuardrails(0.095);
    expect(res.status).toBe('WARNING_SOFT');
    expect(res.isApprovalRequired).toBe(false);
    expect(res.badgeVariant).toBe('yellow');
  });

  it('requires hard manager approval lock for margin between 6% and 7.9%', () => {
    const res = evaluateMarginGuardrails(0.075);
    expect(res.status).toBe('HARD_LOCK_REQUIRED');
    expect(res.isApprovalRequired).toBe(true);
    expect(res.badgeVariant).toBe('red');
  });

  it('strictly disallows margins below 6%', () => {
    const res = evaluateMarginGuardrails(0.045);
    expect(res.status).toBe('REJECTED');
    expect(res.isApprovalRequired).toBe(true);
  });
});

describe('Rate Freshness & Availability Confidence Policy', () => {
  it('flags contracted rates older than 30 days as stale', () => {
    const staleDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    const res = evaluateRateFreshness(staleDate, 'CONTRACTED_DIRECT');
    expect(res.isFresh).toBe(false);
    expect(res.confidenceScore).toBeLessThan(0.8);
    expect(res.actionWarning).toContain('verified 45 days ago');
  });

  it('maintains high confidence for prepaid commitment room blocks', () => {
    const date = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const res = evaluateRateFreshness(date, 'PREPAID_COMMITMENT');
    expect(res.isFresh).toBe(true);
    expect(res.confidenceScore).toBe(0.98);
  });
});

describe('Behavioral Intent Scoring ($I_{score}$)', () => {
  it('boosts intent score when repeat views, long dwell time, and client forwarding are detected', () => {
    const score = calculateIntentScore({
      viewCount: 3,
      totalDwellSeconds: 240,
      clientForwardedDetected: true,
      pdfExportCount: 1,
      daysUntilTravel: 10,
      hoursSinceLastActivity: 2,
    });

    // Baseline 20 + views (24) + dwell (24) + forward (20) + pdf (15) + proximity (10) - decay (0)
    expect(score).toBeGreaterThanOrEqual(85);
  });

  it('decays score when no activity has occurred in 72 hours', () => {
    const score = calculateIntentScore({
      viewCount: 1,
      totalDwellSeconds: 30,
      clientForwardedDetected: false,
      daysUntilTravel: 30,
      hoursSinceLastActivity: 72, // 3 days
    });

    expect(score).toBeLessThan(35);
  });
});

describe('Requirement Completeness & Missing Field Diagnostics', () => {
  it('identifies missing child age as a recommended diagnostic', () => {
    const diag = scoreRequirementCompleteness({
      destinationCorridor: 'THAILAND',
      tentativeTravelDate: '2026-11-15',
      totalDurationNights: 5,
      passengers: [
        { id: '1', type: 'ADULT', age: 32, bedPreference: 'DOUBLE' },
        { id: '2', type: 'CHILD', age: null as any, bedPreference: 'NO_BED_CNB' },
      ],
      flightPreference: 'INCLUDE_FLIGHTS',
    });

    expect(diag.score).toBeLessThan(100);
    const childAgeField = diag.missingFields.find(f => f.fieldKey === 'passengers.children.age');
    expect(childAgeField).toBeDefined();
    expect(childAgeField?.clarificationPromptTemplate).toContain('What is the age of the child?');
  });
});
