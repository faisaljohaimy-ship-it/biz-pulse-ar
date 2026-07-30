/**
 * Confidence derivation.
 *
 * Confidence is a bucket derived from measurable signals. Any signal
 * < 0 is excluded — never defaulted upwards. If every signal is
 * unknown the confidence stays "unknown". Never invented.
 */

import type { Confidence, EvidenceRef } from "./types";

export interface ConfidenceInput {
  readonly evidence: readonly EvidenceRef[];
  readonly recurrence: number;
  readonly freshness_score: number;
  readonly provenance_score: number;
  readonly schema_score: number;
}

const CONFIDENCE_BUCKETS: readonly { readonly min: number; readonly bucket: Confidence }[] = [
  { min: 0.75, bucket: "high" },
  { min: 0.5, bucket: "medium" },
  { min: 0.25, bucket: "low" },
];

export function deriveConfidence(input: ConfidenceInput): Confidence {
  const evidenceScore = Math.min(1, input.evidence.length / 5);
  const recurrenceScore = input.recurrence <= 1 ? 0 : Math.min(1, Math.log10(input.recurrence));
  const signals = [
    evidenceScore,
    recurrenceScore,
    input.freshness_score,
    input.provenance_score,
    input.schema_score,
  ];
  const known = signals.filter((s) => s >= 0);
  if (known.length === 0) return "unknown";
  const score = known.reduce((a, b) => a + b, 0) / known.length;
  for (const b of CONFIDENCE_BUCKETS) if (score >= b.min) return b.bucket;
  return "unknown";
}

export function provenanceScore(kind: "asserted" | "ingested" | "resolved" | "inferred"): number {
  if (kind === "asserted") return 1;
  if (kind === "ingested") return 0.8;
  if (kind === "resolved") return 0.6;
  return 0.4;
}
