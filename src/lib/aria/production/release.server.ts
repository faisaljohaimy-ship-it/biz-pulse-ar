/**
 * Phase 9.0 — Release Gate.
 *
 * Emits a strict GO / NO-GO / CONDITIONAL decision from the readiness
 * report. Rules:
 *   - Any blocker  → NO-GO
 *   - Any unknown  → CONDITIONAL (never claim GO with missing data)
 *   - Warnings only → CONDITIONAL
 *   - All pass     → GO
 */

import { evaluateReadiness } from "./readiness.server";
import type { ReleaseDecisionReport, ReleaseDecision } from "./types";

function nextActionsFor(blockers: string[], warnings: string[], unknowns: string[]): string[] {
  const actions: string[] = [];
  if (blockers.length > 0) {
    actions.push("Resolve all blockers listed below before requesting release re-evaluation.");
  }
  if (unknowns.length > 0) {
    actions.push("Gather evidence for UNKNOWN gates (CI status, DB-side readiness, route review sign-off).");
  }
  if (warnings.length > 0) {
    actions.push("Triage warnings: either mitigate or explicitly accept with owner + expiry.");
  }
  if (actions.length === 0) {
    actions.push("Proceed with staged rollout and monitor observability dashboards for 24h.");
  }
  return actions;
}

export async function evaluateRelease(): Promise<ReleaseDecisionReport> {
  const readiness = await evaluateReadiness();
  let decision: ReleaseDecision;
  if (readiness.blockers.length > 0) decision = "NO-GO";
  else if (readiness.unknowns.length > 0 || readiness.warnings.length > 0) decision = "CONDITIONAL";
  else decision = "GO";

  return {
    taken_at: new Date().toISOString(),
    decision,
    overall_score: readiness.overall_score,
    readiness,
    blockers: readiness.blockers,
    warnings: readiness.warnings,
    next_actions: nextActionsFor(readiness.blockers, readiness.warnings, readiness.unknowns),
  };
}
