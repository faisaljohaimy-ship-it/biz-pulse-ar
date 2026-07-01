/**
 * Runtime optimization advisor.
 *
 * Highlights latency or budget drift over the experience window.
 * Advisory only.
 */

import type { EvidenceRef, ImprovementProposal } from "./types";
import { listExperiences } from "./experience-store.server";
import { proposeImprovement } from "./improvement.server";
import { trendDelta } from "./scoring.server";

export function analyzeRuntimeSignals(): ImprovementProposal | undefined {
  const experiences = listExperiences();
  if (experiences.length < 4) return undefined;
  const latency = trendDelta(experiences.map((e) => e.duration_ms));
  const cost = trendDelta(experiences.map((e) => e.cost_tokens));
  if (latency <= 0 && cost <= 0) return undefined;
  const evidence: readonly EvidenceRef[] = experiences.slice(-5).map((e) => ({
    id: e.id,
    kind: "experience" as const,
    source: "evolution.experience-store",
    taken_at: e.created_at,
  }));
  return proposeImprovement({
    target: "runtime",
    summary: "Runtime latency or token cost is trending upward.",
    rationale: `Latency delta ${latency}ms; token delta ${cost}. Advisory review recommended.`,
    expected_gain: 0.08,
    expected_risk: latency > 5000 ? "error" : "warn",
    evidence,
  });
}
