// Mesh node health — weighted score. Unknown stays UNKNOWN.
import type { MeshHealthReport } from "./types";
import { HealthInputZ } from "./contracts";

export function computeHealth(input: {
  nodeId: string;
  signals?: { lastHeartbeatAgeMs?: number; load?: number; errorRate?: number };
  checkedAt: string;
  evidence?: MeshHealthReport["evidence"];
}): MeshHealthReport {
  const parsed = HealthInputZ.parse({
    nodeId: input.nodeId,
    signals: input.signals ?? {},
    checkedAt: input.checkedAt,
    evidence: input.evidence ?? [],
  });
  const s = parsed.signals;
  if (s.lastHeartbeatAgeMs === undefined || s.load === undefined || s.errorRate === undefined) {
    return {
      nodeId: parsed.nodeId,
      score: 0,
      state: "unknown",
      detail: "missing_signals",
      checkedAt: parsed.checkedAt,
      evidence: parsed.evidence,
    };
  }
  const hb = Math.max(0, 1 - s.lastHeartbeatAgeMs / 15_000);
  const load = 1 - s.load;
  const err = 1 - s.errorRate;
  const score = Math.max(0, Math.min(1, hb * 0.4 + load * 0.3 + err * 0.3));
  const state = score >= 0.75 ? "pass" : score >= 0.4 ? "unknown" : "fail";
  return {
    nodeId: parsed.nodeId,
    score,
    state,
    detail: `hb=${hb.toFixed(2)} load=${load.toFixed(2)} err=${err.toFixed(2)}`,
    checkedAt: parsed.checkedAt,
    evidence: parsed.evidence,
  };
}
