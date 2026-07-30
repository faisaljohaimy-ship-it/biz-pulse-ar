// Readiness probe — declares whether the node can accept traffic.
import type { ProbeResult } from "./types";
import { ProbeInputZ } from "./contracts";

export function readinessProbe(input: {
  nodeId: string;
  signals?: { workerPoolReady?: boolean; configLoaded?: boolean };
  now: string;
  evidence?: ProbeResult["evidence"];
}): ProbeResult {
  const parsed = ProbeInputZ.parse({
    nodeId: input.nodeId,
    kind: "readiness",
    signals: input.signals ?? {},
    now: input.now,
    evidence: input.evidence ?? [],
  });
  const s = parsed.signals;
  if (s.workerPoolReady === undefined || s.configLoaded === undefined) {
    return {
      kind: "readiness",
      nodeId: parsed.nodeId,
      state: "unknown",
      detail: "missing_signals",
      checkedAt: parsed.now,
      evidence: parsed.evidence,
    };
  }
  const ready = s.workerPoolReady && s.configLoaded;
  return {
    kind: "readiness",
    nodeId: parsed.nodeId,
    state: ready ? "healthy" : "unhealthy",
    detail: ready ? "ready" : "not_ready",
    checkedAt: parsed.now,
    evidence: parsed.evidence,
  };
}
