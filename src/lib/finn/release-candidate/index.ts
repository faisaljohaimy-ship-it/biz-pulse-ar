/**
 * Phase 10.0 — Release Candidate RC1 orchestrator.
 *
 * Strictly additive. Server-side only. Evidence-linked only.
 * Unknown remains UNKNOWN. No fabricated results.
 */
import { validateSignals } from "./contracts";
import { evaluateGates } from "./readiness.server";
import { buildTestPlan } from "./test-plan.server";
import { buildRiskRegister } from "./risk-register.server";
import { computeBlockers } from "./blocker.server";
import { decide } from "./go-no-go.server";
import { buildReleaseNotes } from "./release-notes.server";
import { RcAuditTrail } from "./audit.server";
import { computeMetrics } from "./metrics.server";
import { verifyReport } from "./verification.server";
import type { Rc1Report, Rc1Signals, ReviewReport } from "./types";

export const RC1_VERSION = "10.0.0-rc1";

export function runRc1Pipeline(input: unknown, version: string = RC1_VERSION): Rc1Report {
  const signals: Rc1Signals = validateSignals(input);
  const audit = new RcAuditTrail();
  audit.record("intake", "info", "RC1 signals accepted.", signals.evidence);

  const gates = evaluateGates(signals);
  audit.record("readiness", "info", `Evaluated ${gates.length} gates.`);

  const reviews: ReviewReport[] = [];
  if (signals.security) reviews.push(signals.security);
  if (signals.performance) reviews.push(signals.performance);
  if (signals.accessibility) reviews.push(signals.accessibility);
  if (signals.observability) reviews.push(signals.observability);
  if (signals.dependency) reviews.push(signals.dependency);

  const risks = buildRiskRegister(gates, reviews);
  const blockers = computeBlockers(gates);
  audit.record("risk", "info", `Registered ${risks.length} risks and ${blockers.length} blockers.`);

  const outcome = decide(gates, blockers);
  audit.record("decision", "info", `${outcome.decision}: ${outcome.reason}`);

  const releaseNotes = buildReleaseNotes(version, gates, outcome.decision);
  const testPlan = buildTestPlan();
  const metrics = computeMetrics(gates);

  const draftReport: Rc1Report = {
    generated_at: new Date().toISOString(),
    version,
    gates,
    test_plan: testPlan,
    reviews,
    risks,
    blockers,
    release_notes: releaseNotes,
    audit: audit.entries(),
    metrics,
    decision: outcome.decision,
    decision_reason: outcome.reason,
    verified: true,
    verification_notes: [],
  };

  const verification = verifyReport(draftReport);
  audit.record(
    "verification",
    verification.verified ? "pass" : "warn",
    verification.verified
      ? "Report verified."
      : `Report verification produced ${verification.notes.length} note(s).`,
  );

  return {
    ...draftReport,
    audit: audit.entries(),
    verified: verification.verified,
    verification_notes: verification.notes,
  };
}

export * from "./types";
export { GATE_SPECS } from "./readiness.server";
export { validateSignals } from "./contracts";
export { buildTestPlan } from "./test-plan.server";
export { summarizeSmoke } from "./smoke-test.server";
export { summarizeIntegration } from "./integration-test.server";
export { summarizeE2E } from "./e2e-test.server";
export { summarizeRegression } from "./regression.server";
export { summarizeSecurity } from "./security-review.server";
export { summarizePerformance } from "./performance-review.server";
export { summarizeAccessibility } from "./accessibility-review.server";
export { summarizeObservability } from "./observability-review.server";
export { summarizeDependencies } from "./dependency-review.server";
export { buildRiskRegister } from "./risk-register.server";
export { computeBlockers } from "./blocker.server";
export { decide } from "./go-no-go.server";
export { buildReleaseNotes } from "./release-notes.server";
export { RcAuditTrail } from "./audit.server";
export { computeMetrics } from "./metrics.server";
export { verifyReport } from "./verification.server";
