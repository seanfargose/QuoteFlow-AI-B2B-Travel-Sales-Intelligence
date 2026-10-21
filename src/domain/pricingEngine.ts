// Pure deterministic pricing engine (Zero side-effects)

export interface PricingLineItemInput {
  unitNetCostForeign: number;
  foreignCurrency: 'THB' | 'AED' | 'USD' | 'EUR' | 'INR';
  units: number;
  fxRateToInr: number;
}

export interface PricingCalculationInput {
  lineItems: PricingLineItemInput[];
  targetMarkupPercentage: number; // e.g. 0.12 for 12%
  mandatoryFxHedgePercentage?: number; // e.g. 0.015 for +1.5%
}

export interface PricingCalculationResult {
  totalNetCostInr: number;
  grossProfitInr: number;
  sellingPriceInr: number;
  effectiveMarginPercentage: number;
  fxBufferCostInr: number;
}

export function calculateQuotePricing(input: PricingCalculationInput): PricingCalculationResult {
  const fxBuffer = input.mandatoryFxHedgePercentage ?? 0.015;
  let totalNetInr = 0;
  let fxBufferCost = 0;

  for (const item of input.lineItems) {
    if (item.foreignCurrency === 'INR') {
      totalNetInr += item.unitNetCostForeign * item.units;
    } else {
      const baseInr = item.unitNetCostForeign * item.units * item.fxRateToInr;
      const bufferInr = baseInr * fxBuffer;
      totalNetInr += baseInr + bufferInr;
      fxBufferCost += bufferInr;
    }
  }

  const roundedNetCost = Math.round(totalNetInr);
  // Selling Price = Net / (1 - Markup)
  const safeMarkup = Math.min(0.9, Math.max(0, input.targetMarkupPercentage));
  const sellingPrice = Math.round(roundedNetCost / (1 - safeMarkup));
  const grossProfit = sellingPrice - roundedNetCost;
  const effectiveMargin = sellingPrice > 0 ? grossProfit / sellingPrice : 0;

  return {
    totalNetCostInr: roundedNetCost,
    grossProfitInr: grossProfit,
    sellingPriceInr: sellingPrice,
    effectiveMarginPercentage: Number(effectiveMargin.toFixed(4)),
    fxBufferCostInr: Math.round(fxBufferCost),
  };
}
