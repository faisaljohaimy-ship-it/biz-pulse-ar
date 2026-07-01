// Health probe — composite state. Unknown stays UNKNOWN.
import type { ProbeResult } from "./types";
import { ProbeInputZ } from "./contracts";

export function healthProbe(input: {
  nodeId: string;
  signals?: {
    lastHeartbeatAgeMs?: number;
    workerPoolReady?: boolean;
    configLoaded?: boolean;
  };
  now: string;
  evidence?: ProbeResult["evidence"];
}): ProbeResult {
  const parsed = ProbeInputZ.parse({
    nodeId: input.nodeId,
    kind: "health",
    signals: input.signals ?? {},
    now: input.now,
    evidence: input.evidence ?? [],
  });
  const s = parsed.signals;
  if (s.lastHeartbeatAgeMs === undefined || s.workerPoolReady === undefined) {
    return {
      kind: "health",
      nodeId: parsed.nodeId,
      state: "unknown",
      detail: "missing_signals",
      checkedAt: parsed.now,
      evidence: parsed.evidence,
    };
  }
  const unhealthy = s.lastHeartbeatAgeMs > 15_000 || !s.workerPoolReady;
  return {
    kind: "health",
    nodeId: parsed.nodeId,
    state: unhealthy ? "unhealthy" : "healthy",
    detail: unhealthy ? "heartbeat_stale_or_pool_down" : "ok",
    checkedAt: parsed.now,
    evidence: parsed.evidence,
  };
}
