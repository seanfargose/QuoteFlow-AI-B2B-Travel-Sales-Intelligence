// Pure behavioral telemetry intent scoring algorithm (0 - 100)

export interface IntentTelemetryInput {
  viewCount: number;
  totalDwellSeconds: number;
  clientForwardedDetected: boolean;
  pdfExportCount?: number;
  daysUntilTravel: number;
  hoursSinceLastActivity: number;
}

export function calculateIntentScore(input: IntentTelemetryInput): number {
  let score = 20; // Baseline entry score

  // View count component: Max 25 pts (8 pts per view)
  score += Math.min(25, input.viewCount * 8);

  // Dwell time component: Max 25 pts (1 pt per 10s up to 250s)
  score += Math.min(25, Math.floor(input.totalDwellSeconds / 10));

  // Client-forwarded signal: Multiple unique IPs = 20 pts
  if (input.clientForwardedDetected) {
    score += 20;
  }

  // PDF download: Indicates retail agent shared file with consumer = 15 pts
  if (input.pdfExportCount && input.pdfExportCount > 0) {
    score += 15;
  }

  // Travel proximity boost: Within 14 days = 10 pts
  if (input.daysUntilTravel <= 14) {
    score += 10;
  }

  // Inactivity decay: -5 pts per 24 hours of silence
  const decayDays = Math.floor(input.hoursSinceLastActivity / 24);
  score -= decayDays * 5;

  return Math.max(0, Math.min(100, score));
}
