// Quality dimension aggregator — helpfulness/accuracy/safety/latency/cost.
import type { QualitySignal, TriState } from "./types";
import { QualitySignalZ } from "./contracts";

export interface QualitySummary {
  readonly subject: string;
  readonly perDimension: Readonly<Record<QualitySignal["dimension"], number | null>>;
  readonly state: TriState;
  readonly evidence: QualitySignal["evidence"];
}

export function summarizeQuality(input: {
  subject: string;
  signals: ReadonlyArray<QualitySignal>;
}): QualitySummary {
  const per: Record<QualitySignal["dimension"], number[]> = {
    accuracy: [],
    helpfulness: [],
    safety: [],
    latency: [],
    cost: [],
  };
  const evidence: QualitySignal["evidence"] = [];
  for (const raw of input.signals) {
    const s = QualitySignalZ.parse(raw);
    if (s.subject !== input.subject) continue;
    per[s.dimension].push(s.value);
    for (const e of s.evidence) evidence.push(e);
  }
  const perDimension = (Object.fromEntries(
    (Object.keys(per) as QualitySignal["dimension"][]).map((k) => {
      const arr = per[k];
      return [k, arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length];
    }),
  ) as unknown) as QualitySummary["perDimension"];

  const anyMissing = Object.values(perDimension).some((v) => v === null);
  const state: TriState = anyMissing ? "unknown" : "pass";
  return { subject: input.subject, perDimension, state, evidence };
}
