// Liveness probe — heartbeat freshness only.
import type { ProbeResult } from "./types";
import { ProbeInputZ } from "./contracts";

export function livenessProbe(input: {
  nodeId: string;
  signals?: { lastHeartbeatAgeMs?: number };
  now: string;
  evidence?: ProbeResult["evidence"];
}): ProbeResult {
  const parsed = ProbeInputZ.parse({
    nodeId: input.nodeId,
    kind: "liveness",
    signals: input.signals ?? {},
    now: input.now,
    evidence: input.evidence ?? [],
  });
  const age = parsed.signals.lastHeartbeatAgeMs;
  if (age === undefined) {
    return {
      kind: "liveness",
      nodeId: parsed.nodeId,
      state: "unknown",
      detail: "no_heartbeat_signal",
      checkedAt: parsed.now,
      evidence: parsed.evidence,
    };
  }
  return {
    kind: "liveness",
    nodeId: parsed.nodeId,
    state: age <= 30_000 ? "healthy" : "unhealthy",
    detail: `heartbeat_age_ms=${age}`,
    checkedAt: parsed.now,
    evidence: parsed.evidence,
  };
}
