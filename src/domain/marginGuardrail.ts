// Pure deterministic margin guardrail evaluator

export type MarginGuardrailStatus = 'AUTO_APPROVED' | 'WARNING_SOFT' | 'HARD_LOCK_REQUIRED' | 'REJECTED';

export interface MarginGuardrailResult {
  status: MarginGuardrailStatus;
  isApprovalRequired: boolean;
  message: string;
  badgeVariant: 'green' | 'yellow' | 'red';
  minMarginFloor: number;
}

export function evaluateMarginGuardrails(marginPercentage: number): MarginGuardrailResult {
  const minFloor = 0.08; // 8% minimum company target
  
  if (marginPercentage >= 0.12) {
    return {
      status: 'AUTO_APPROVED',
      isApprovalRequired: false,
      message: 'Margin within healthy commercial target (≥ 12%).',
      badgeVariant: 'green',
      minMarginFloor: minFloor,
    };
  }
  
  if (marginPercentage >= 0.08) {
    return {
      status: 'WARNING_SOFT',
      isApprovalRequired: false,
      message: 'Low Margin Alert: Between 8% and 11.9%. Rep acknowledgment logged.',
      badgeVariant: 'yellow',
      minMarginFloor: minFloor,
    };
  }
  
  if (marginPercentage >= 0.06) {
    return {
      status: 'HARD_LOCK_REQUIRED',
      isApprovalRequired: true,
      message: 'Sub-Floor Breach: Margin is between 6% and 7.9%. Sales Manager approval mandatory before dispatch.',
      badgeVariant: 'red',
      minMarginFloor: minFloor,
    };
  }
  
  return {
    status: 'REJECTED',
    isApprovalRequired: true,
    message: 'Margin below 6% is strictly disallowed. Requires Managing Director exception sign-off.',
    badgeVariant: 'red',
    minMarginFloor: minFloor,
  };
}
