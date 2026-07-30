/**
 * Experience generator.
 *
 * Converts validated execution evidence into an immutable experience
 * record. Confidence is derived, never invented; when evidence is
 * insufficient the confidence remains "unknown".
 */

import { ExperienceInputSchema, type ExperienceInput } from "./contracts";
import { appendExperience } from "./experience-store.server";
import { deriveConfidence } from "./confidence.server";
import type { ExperienceRecord } from "./types";

function experienceId(input: ExperienceInput, ts: string): string {
  const seed = `${input.problem}|${input.goal}|${input.outcome}|${ts}`;
  // Deterministic djb2-style hash for reproducibility.
  let h = 5381;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `exp_${(h >>> 0).toString(16)}`;
}

export function generateExperience(raw: ExperienceInput): ExperienceRecord {
  const input = ExperienceInputSchema.parse(raw);
  const created_at = new Date().toISOString();

  const evidence_quality = Math.min(1, input.evidence.length / 5);
  const success_rate =
    input.outcome === "success"
      ? 1
      : input.outcome === "partial"
        ? 0.5
        : input.outcome === "failure"
          ? 0
          : -1;

  const confidence = deriveConfidence({
    subject_id: "experience",
    evidence_quality,
    execution_success_rate: success_rate,
    historical_alignment: -1,
    benchmark_alignment: -1,
    pattern_consistency: -1,
    coverage: evidence_quality,
    evidence: input.evidence,
  }).confidence;

  const record: ExperienceRecord = {
    id: experienceId(input, created_at),
    created_at,
    problem: input.problem,
    context: input.context,
    goal: input.goal,
    actions: input.actions,
    evidence: input.evidence,
    outcome: input.outcome,
    failures: input.failures,
    successes: input.successes,
    metrics: input.metrics,
    duration_ms: input.duration_ms,
    cost_tokens: input.cost_tokens,
    confidence,
    risk: input.risk,
    lessons: input.lessons,
    recommendations: input.recommendations,
  };

  return appendExperience(record);
}
