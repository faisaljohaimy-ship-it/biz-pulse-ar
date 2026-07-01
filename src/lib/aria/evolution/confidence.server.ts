/**
 * Confidence derivation.
 *
 * Confidence is a bucket derived from measurable signals. When any
 * signal is unknown (-1) it is excluded from the mean, not defaulted
 * to a favourable value. If every signal is unknown the confidence
 * stays "unknown".
 */

import type { ConfidenceReport, Confidence, EvidenceRef } from "./types";

export interface ConfidenceInput {
  readonly subject_id: string;
  readonly evidence_quality: number;
  readonly execution_success_rate: number;
  readonly historical_alignment: number;
  readonly benchmark_alignment: number;
  readonly pattern_consistency: number;
  readonly coverage: number;
  readonly evidence: readonly EvidenceRef[];
}

function idFrom(subject: string, ts: string): string {
  let h = 5381;
  const seed = `${subject}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `conf_${(h >>> 0).toString(16)}`;
}

function bucket(score: number): Confidence {
  if (score < 0) return "unknown";
  if (score >= 0.75) return "high";
  if (score >= 0.5) return "medium";
  if (score >= 0.25) return "low";
  return "unknown";
}

export function deriveConfidence(input: ConfidenceInput): ConfidenceReport {
  const created_at = new Date().toISOString();
  const signals = [
    input.evidence_quality,
    input.execution_success_rate,
    input.historical_alignment,
    input.benchmark_alignment,
    input.pattern_consistency,
    input.coverage,
  ];
  const known = signals.filter((s) => s >= 0);
  const score =
    known.length === 0 ? -1 : known.reduce((a, b) => a + b, 0) / known.length;
  return Object.freeze({
    id: idFrom(input.subject_id, created_at),
    subject_id: input.subject_id,
    created_at,
    evidence_quality: input.evidence_quality,
    execution_success_rate: input.execution_success_rate,
    historical_alignment: input.historical_alignment,
    benchmark_alignment: input.benchmark_alignment,
    pattern_consistency: input.pattern_consistency,
    coverage: input.coverage,
    confidence: bucket(score),
    evidence: Object.freeze([...input.evidence]) as readonly EvidenceRef[],
  });
}
