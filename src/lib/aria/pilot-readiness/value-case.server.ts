// Value case — aggregates value drivers with confidence rollup.
import type {
  ConfidenceBucket,
  EvidenceRef,
  ValueCase,
  ValueDriver,
} from "./types";
import { ValueDriverZ } from "./contracts";

const CONF_RANK: Record<ConfidenceBucket, number> = {
  high: 3,
  medium: 2,
  low: 1,
  unknown: 0,
};

function worstConfidence(cs: ReadonlyArray<ConfidenceBucket>): ConfidenceBucket {
  if (cs.length === 0) return "unknown";
  return cs.reduce((a, b) => (CONF_RANK[a] <= CONF_RANK[b] ? a : b));
}

export function buildValueCase(input: {
  pilotId: string;
  drivers: ReadonlyArray<ValueDriver>;
  currency: string;
  evidence: ReadonlyArray<EvidenceRef>;
}): ValueCase {
  if (input.evidence.length === 0) throw new Error("value case requires evidence");
  const drivers = input.drivers.map((d) => ValueDriverZ.parse(d));
  for (const d of drivers) {
    if (d.currency !== input.currency) {
      throw new Error(`value driver currency mismatch: ${d.currency} vs ${input.currency}`);
    }
  }
  const anyUnknown = drivers.some((d) => d.confidence === "unknown");
  const total = anyUnknown
    ? null
    : drivers.reduce((acc, d) => acc + d.annualValue, 0);
  const confidence: ConfidenceBucket =
    drivers.length === 0 ? "unknown" : worstConfidence(drivers.map((d) => d.confidence));
  return {
    pilotId: input.pilotId,
    drivers,
    totalAnnualValue: total,
    currency: input.currency,
    confidence,
    evidence: input.evidence,
  };
}
