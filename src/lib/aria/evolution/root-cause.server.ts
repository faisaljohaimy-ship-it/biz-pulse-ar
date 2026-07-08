/**
 * Root-cause categorisation.
 *
 * Hypotheses are derived from the failure signals; the engine never
 * declares certainty when the signals are ambiguous.
 */

import type { EvidenceRef, FailureAnalysis, RootCauseReport } from "./types";
import { deriveConfidence } from "./confidence.server";

function rcaId(failure_id: string, ts: string): string {
  let h = 5381;
  const seed = `rca|${failure_id}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `rca_${(h >>> 0).toString(16)}`;
}

function categorise(signals: readonly string[]): {
  readonly category: RootCauseReport["cause_category"];
  readonly hypothesis: string;
} {
  const text = signals.join(" ").toLowerCase();
  if (text.includes("budget") || text.includes("token"))
    return {
      category: "budget_exhaustion",
      hypothesis: "Budget exhausted before task completion.",
    };
  if (text.includes("permission") || text.includes("policy"))
    return { category: "policy_violation", hypothesis: "Policy denied a required action." };
  if (text.includes("unavailable") || text.includes("timeout") || text.includes("network"))
    return { category: "external_error", hypothesis: "External dependency failed or timed out." };
  if (text.includes("plan") || text.includes("dag"))
    return {
      category: "planning_defect",
      hypothesis: "Plan omitted or mis-ordered a required step.",
    };
  if (text.includes("prompt") || text.includes("format"))
    return {
      category: "prompt_defect",
      hypothesis: "Prompt failed to elicit the required structure.",
    };
  if (text.includes("capability") || text.includes("missing tool"))
    return { category: "capability_gap", hypothesis: "Required capability was not registered." };
  return { category: "unknown", hypothesis: "Cause unresolved from available evidence." };
}

export function rootCause(failure: FailureAnalysis): RootCauseReport {
  const created_at = new Date().toISOString();
  const { category, hypothesis } = categorise(failure.failure_signals);
  const evidence: readonly EvidenceRef[] = Object.freeze([
    ...failure.evidence,
    {
      id: failure.id,
      kind: "reflection",
      source: "evolution.failure-analysis",
      taken_at: failure.created_at,
    },
  ]) as readonly EvidenceRef[];

  const conf = deriveConfidence({
    subject_id: `rca:${failure.id}`,
    evidence_quality: Math.min(1, failure.evidence.length / 3),
    execution_success_rate: 0,
    historical_alignment: -1,
    benchmark_alignment: -1,
    pattern_consistency: -1,
    coverage: Math.min(1, failure.failure_signals.length / 3),
    evidence,
  });

  return Object.freeze({
    id: rcaId(failure.id, created_at),
    failure_id: failure.id,
    created_at,
    hypothesis,
    cause_category: category,
    confidence: conf.confidence,
    evidence,
  });
}
