// Central signal collector + normalization + prioritization.
import type { NormalizedSignal, OpsSignal, Priority, Severity } from "./types";
import { OpsSignalZ } from "./contracts";

const SEV_TO_PRIO: Record<Severity, Priority> = {
  critical: "p0",
  high: "p1",
  medium: "p2",
  low: "p3",
  info: "p4",
  unknown: "unknown",
};

export interface ControlPlane {
  ingest(signal: OpsSignal): NormalizedSignal;
  all(): ReadonlyArray<NormalizedSignal>;
  byDomain(d: NormalizedSignal["domain"]): ReadonlyArray<NormalizedSignal>;
  bySeverity(s: Severity): ReadonlyArray<NormalizedSignal>;
}

export function createControlPlane(): ControlPlane {
  const items: NormalizedSignal[] = [];
  return {
    ingest(raw) {
      const parsed = OpsSignalZ.parse(raw);
      const normalized: NormalizedSignal = {
        ...parsed,
        priority: SEV_TO_PRIO[parsed.severity],
      };
      items.push(normalized);
      return normalized;
    },
    all: () => items.slice(),
    byDomain: (d) => items.filter((x) => x.domain === d),
    bySeverity: (s) => items.filter((x) => x.severity === s),
  };
}

export function classifyPriority(sev: Severity): Priority {
  return SEV_TO_PRIO[sev];
}
