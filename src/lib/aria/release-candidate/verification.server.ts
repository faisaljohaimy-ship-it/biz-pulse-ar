/**
 * Phase 10.0 — RC1 report verification.
 * Ensures no gate passes without evidence and decisions match gate state.
 */
import type { Blocker, Decision, GateResult, Rc1Report } from "./types";

export interface VerificationResult {
  readonly verified: boolean;
  readonly notes: ReadonlyArray<string>;
}

export function verifyReport(report: Rc1Report): VerificationResult {
  const notes: string[] = [];

  for (const g of report.gates) {
    if (g.status === "pass" && g.evidence.length === 0 && g.gate !== "release_notes") {
      notes.push(`Gate ${g.gate} marked pass without evidence.`);
    }
    if (g.status === "unknown" && g.blockers.length === 0) {
      notes.push(`Gate ${g.gate} unknown but no blocker recorded.`);
    }
  }

  const criticalOpen = report.gates.some(
    (g) =>
      g.severity === "critical" && (g.status === "fail" || g.status === "unknown"),
  );
  if (criticalOpen && report.decision === "GO") {
    notes.push("Decision GO issued while critical gates remain open.");
  }

  const hasCriticalBlocker = report.blockers.some(
    (b: Blocker) => b.severity === "critical",
  );
  if (hasCriticalBlocker && report.decision !== "NO-GO") {
    notes.push("Critical blocker present but decision is not NO-GO.");
  }

  const validDecisions: Decision[] = ["GO", "NO-GO", "GO_WITH_KNOWN_LIMITATIONS"];
  if (!validDecisions.includes(report.decision)) {
    notes.push(`Unknown decision value: ${String(report.decision)}.`);
  }

  return { verified: notes.length === 0, notes };
}
