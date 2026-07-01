/**
 * Phase 10.0 — Blocker computation.
 */
import type { Blocker, GateResult } from "./types";

export function computeBlockers(
  gates: ReadonlyArray<GateResult>,
): ReadonlyArray<Blocker> {
  const blockers: Blocker[] = [];
  for (const g of gates) {
    if (g.severity === "critical" && g.status === "fail") {
      blockers.push({
        id: `BLK-${g.gate}-fail`,
        gate: g.gate,
        severity: "critical",
        reason: `Critical gate ${g.gate} failed.`,
        requirement: g.blockers[0] ?? `Resolve failure for ${g.gate}.`,
      });
    } else if (g.severity === "critical" && g.status === "unknown") {
      blockers.push({
        id: `BLK-${g.gate}-unknown`,
        gate: g.gate,
        severity: "critical",
        reason: `Critical gate ${g.gate} has no evidence.`,
        requirement: `Supply evidence for ${g.gate}.`,
      });
    } else if (g.severity === "high" && g.status === "fail") {
      blockers.push({
        id: `BLK-${g.gate}-fail`,
        gate: g.gate,
        severity: "high",
        reason: `High-severity gate ${g.gate} failed.`,
        requirement: g.blockers[0] ?? `Resolve failure for ${g.gate}.`,
      });
    }
  }
  return blockers;
}
