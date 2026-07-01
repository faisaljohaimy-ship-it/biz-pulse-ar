// Node health scoring. Unknown stays UNKNOWN.
import type { HealthReport } from "./types";
import { HealthInputZ } from "./contracts";

export function computeHealth(input: {
  nodeId: string;
  signals?: { lastHeartbeatAgeMs?: number; load?: number; errorRate?: number };
  checkedAt: string;
  evidence?: HealthReport["evidence"];
}): HealthReport {
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
  const hbScore = Math.max(0, 1 - s.lastHeartbeatAgeMs / 15_000);
  const loadScore = 1 - s.load;
  const errScore = 1 - s.errorRate;
  const raw = hbScore * 0.4 + loadScore * 0.3 + errScore * 0.3;
  const score = Math.max(0, Math.min(1, raw));
  const state = score >= 0.75 ? "pass" : score >= 0.4 ? "unknown" : "fail";
  return {
    nodeId: parsed.nodeId,
    score,
    state,
    detail: `hb=${hbScore.toFixed(2)} load=${loadScore.toFixed(2)} err=${errScore.toFixed(2)}`,
    checkedAt: parsed.checkedAt,
    evidence: parsed.evidence,
  };
}
