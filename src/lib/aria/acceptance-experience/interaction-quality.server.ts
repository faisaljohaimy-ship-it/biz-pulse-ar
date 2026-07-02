// Interaction quality (Phase 11.7 façade) — aggregates 11.6 quality assessor
// with responsiveness to produce a composite executive-grade score.
import { assessQuality } from "./conversation-quality.server";
import type { QualityInput } from "./conversation-quality.server";
import { responsivenessSnapshot } from "./responsiveness.server";

export interface InteractionQualityScore {
  readonly language: number;   // 0..100
  readonly latency: number;    // 0..100
  readonly composite: number;  // 0..100
  readonly acceptable: boolean;
  readonly violations: readonly string[];
}

export function scoreInteraction(input: QualityInput): InteractionQualityScore {
  const lang = assessQuality(input);
  const r = responsivenessSnapshot();
  const latencyScore = r.withinBudget ? 100 : 60;
  const composite = Math.round(lang.score * 0.7 + latencyScore * 0.3);
  return {
    language: lang.score,
    latency: latencyScore,
    composite,
    acceptable: lang.acceptable && r.withinBudget,
    violations: lang.violations,
  };
}
