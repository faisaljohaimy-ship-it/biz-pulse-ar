// Improvement scoring model. Deterministic composite with confidence bucket.
import type { ConfidenceBucket, ImprovementScore } from "./types";
import { ScoringInputZ } from "./contracts";

export function scoreImprovement(input: {
  impact: number;
  effort: number;
  risk: number;
  evidenceCount: number;
}): ImprovementScore {
  const parsed = ScoringInputZ.parse(input);
  // composite: reward impact, penalize effort and risk, keep in [0,1].
  const raw = parsed.impact * (1 - parsed.effort * 0.5) * (1 - parsed.risk * 0.5);
  const composite = Math.max(0, Math.min(1, raw));
  let confidence: ConfidenceBucket;
  if (parsed.evidenceCount === 0) confidence = "unknown";
  else if (parsed.evidenceCount >= 10) confidence = "high";
  else if (parsed.evidenceCount >= 3) confidence = "medium";
  else confidence = "low";
  const rationale = `impact=${parsed.impact.toFixed(2)} effort=${parsed.effort.toFixed(
    2,
  )} risk=${parsed.risk.toFixed(2)} evidence=${parsed.evidenceCount}`;
  return {
    impact: parsed.impact,
    effort: parsed.effort,
    risk: parsed.risk,
    confidence,
    composite,
    rationale,
  };
}
