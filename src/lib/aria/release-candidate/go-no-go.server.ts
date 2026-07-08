/**
 * Phase 10.0 — Go/No-Go decision engine.
 */
import type { Blocker, Decision, GateResult } from "./types";

export interface DecisionOutcome {
  readonly decision: Decision;
  readonly reason: string;
}

export function decide(
  gates: ReadonlyArray<GateResult>,
  blockers: ReadonlyArray<Blocker>,
): DecisionOutcome {
  const criticalFail = gates.some((g) => g.severity === "critical" && g.status === "fail");
  if (criticalFail || blockers.some((b) => b.severity === "critical")) {
    return {
      decision: "NO-GO",
      reason: "One or more critical gates failed or blockers exist.",
    };
  }

  const criticalUnknown = gates.some((g) => g.severity === "critical" && g.status === "unknown");
  if (criticalUnknown) {
    return {
      decision: "NO-GO",
      reason: "Critical gates lack evidence; unknown remains unknown.",
    };
  }

  const highFail = gates.some((g) => g.severity === "high" && g.status === "fail");
  const anyUnknown = gates.some((g) => g.status === "unknown");
  const anyWarn = gates.some((g) => g.status === "warn");

  if (highFail || anyUnknown || anyWarn) {
    return {
      decision: "GO_WITH_KNOWN_LIMITATIONS",
      reason: "Non-critical gate issues remain; proceed with documented limitations.",
    };
  }

  return {
    decision: "GO",
    reason: "All gates passed with evidence.",
  };
}
