// Evidence store — append-only, evidence-linked samples.
import type { EvidenceSample } from "./types";
import { EvidenceSampleZ } from "./contracts";

export interface EvidenceStore {
  ingest(sample: EvidenceSample): EvidenceSample;
  all(): ReadonlyArray<EvidenceSample>;
  bySubject(subject: string): ReadonlyArray<EvidenceSample>;
  byMetric(metric: string): ReadonlyArray<EvidenceSample>;
  latest(subject: string, metric: string): EvidenceSample | null;
}

export function createEvidenceStore(): EvidenceStore {
  const samples: EvidenceSample[] = [];
  return {
    ingest(raw) {
      const parsed = EvidenceSampleZ.parse(raw);
      samples.push(parsed);
      return parsed;
    },
    all: () => samples.slice(),
    bySubject: (s) => samples.filter((x) => x.subject === s),
    byMetric: (m) => samples.filter((x) => x.metric === m),
    latest(subject, metric) {
      const matches = samples.filter((x) => x.subject === subject && x.metric === metric);
      if (matches.length === 0) return null;
      return matches.reduce((a, b) =>
        Date.parse(a.capturedAt) >= Date.parse(b.capturedAt) ? a : b,
      );
    },
  };
}
