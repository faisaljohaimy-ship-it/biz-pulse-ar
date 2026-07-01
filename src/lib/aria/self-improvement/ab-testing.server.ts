// Deterministic A/B analysis using caller-supplied samples. Two-sided delta only.
import type { AbResult, AbVariant, ConfidenceBucket } from "./types";
import { AbInputZ } from "./contracts";

function meanStd(values: ReadonlyArray<number>): { mean: number | null; stddev: number | null } {
  if (values.length === 0) return { mean: null, stddev: null };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.length > 1
      ? values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1)
      : 0;
  return { mean, stddev: Math.sqrt(variance) };
}

export function analyzeAb(input: {
  experimentId: string;
  variants: ReadonlyArray<AbVariant>;
  minSamplesPerVariant?: number;
  evaluatedAt: string;
}): AbResult {
  const parsed = AbInputZ.parse({
    experimentId: input.experimentId,
    variants: input.variants.map((v) => ({
      id: v.id,
      label: v.label,
      samples: [...v.samples],
    })),
    minSamplesPerVariant: input.minSamplesPerVariant ?? 10,
  });

  const summaries = parsed.variants.map((v) => {
    const values = v.samples.map((s) => s.value);
    const { mean, stddev } = meanStd(values);
    return { id: v.id, n: values.length, mean, stddev };
  });

  const insufficient = summaries.some((s) => s.n < parsed.minSamplesPerVariant || s.mean === null);
  if (insufficient) {
    return {
      experimentId: parsed.experimentId,
      variants: summaries,
      winnerId: null,
      deltaPct: null,
      confidence: "unknown",
      evidence: parsed.variants.flatMap((v) => v.samples.flatMap((s) => s.evidence)),
    };
  }

  const sorted = [...summaries].sort((a, b) => (b.mean ?? 0) - (a.mean ?? 0));
  const top = sorted[0];
  const runnerUp = sorted[1];
  const deltaPct =
    top.mean !== null && runnerUp?.mean !== null && runnerUp.mean !== 0
      ? (top.mean - runnerUp.mean) / Math.abs(runnerUp.mean)
      : null;

  // Confidence bucket without statistical claims we cannot substantiate.
  let confidence: ConfidenceBucket = "low";
  if (deltaPct !== null) {
    const abs = Math.abs(deltaPct);
    if (abs >= 0.2 && summaries.every((s) => s.n >= parsed.minSamplesPerVariant * 3)) {
      confidence = "high";
    } else if (abs >= 0.1) {
      confidence = "medium";
    }
  } else {
    confidence = "unknown";
  }

  return {
    experimentId: parsed.experimentId,
    variants: summaries,
    winnerId: deltaPct !== null && deltaPct > 0 ? top.id : null,
    deltaPct,
    confidence,
    evidence: parsed.variants.flatMap((v) => v.samples.flatMap((s) => s.evidence)),
  };
}
