// Placeholder for future ML-style learners. This build ships a strict
// evidence-linked learner that produces no output without evidence.
import type { EvidenceSample } from "./types";

export interface LearningSignal {
  readonly subject: string;
  readonly metric: string;
  readonly trend: "improving" | "regressing" | "flat" | "unknown";
  readonly slope: number | null;
  readonly evidence: EvidenceSample["evidence"];
}

export function learnFromSamples(input: {
  subject: string;
  metric: string;
  samples: ReadonlyArray<EvidenceSample>;
}): LearningSignal {
  const relevant = input.samples
    .filter((s) => s.subject === input.subject && s.metric === input.metric)
    .sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
  if (relevant.length < 2) {
    return {
      subject: input.subject,
      metric: input.metric,
      trend: "unknown",
      slope: null,
      evidence: relevant.flatMap((s) => s.evidence),
    };
  }
  const first = relevant[0];
  const last = relevant[relevant.length - 1];
  const dt = Date.parse(last.capturedAt) - Date.parse(first.capturedAt) || 1;
  const slope = (last.value - first.value) / dt;
  let trend: LearningSignal["trend"] = "flat";
  if (slope > 0)
    trend = "regressing"; // convention: higher = worse for latency/error metrics
  else if (slope < 0) trend = "improving";
  return {
    subject: input.subject,
    metric: input.metric,
    trend,
    slope,
    evidence: relevant.flatMap((s) => s.evidence),
  };
}
