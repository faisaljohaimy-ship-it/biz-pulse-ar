// Readiness supervision. Aggregates readiness snapshots and computes overall.
import type { HealthState, ReadinessSnapshot } from "./types";
import { ReadinessSnapshotZ } from "./contracts";

export function validateReadiness(r: ReadinessSnapshot): ReadinessSnapshot {
  return ReadinessSnapshotZ.parse(r);
}

export function summarizeReadiness(snaps: ReadonlyArray<ReadinessSnapshot>): {
  total: number;
  ready: number;
  overall: HealthState;
} {
  let ready = 0;
  let down = 0;
  let degraded = 0;
  for (const s of snaps) {
    if (s.state === "healthy") ready += 1;
    else if (s.state === "down") down += 1;
    else if (s.state === "degraded") degraded += 1;
  }
  let overall: HealthState = "healthy";
  if (snaps.length === 0) overall = "unknown";
  else if (down > 0) overall = "down";
  else if (degraded > 0) overall = "degraded";
  return { total: snaps.length, ready, overall };
}
