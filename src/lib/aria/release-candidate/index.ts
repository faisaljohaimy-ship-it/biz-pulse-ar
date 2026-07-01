/**
 * Phase 10.0 — Enterprise Release Candidate RC1 (public surface)
 *
 * Pipeline:
 *   inputs → run all audits → score pilot readiness → known limitations
 *          → derive requirements → decide GO / NO-GO / CONDITIONAL-GO
 *          → build release notes → verify report → return RcReport
 *
 * Strictly additive. Server-side only. Worker compatible.
 * Never approves without evidence.
 */
import type {
  GateResult,
  RcInputs,
  RcReport,
  ReleaseDecision,
  Requirement,
} from "./types";
import { RcInputsSchema } from "./contracts";
import { RC1_CHECKLIST } from "./rc-checklist.server";
import { auditSystem } from "./system-audit.server";
import { auditIntegration } from "./integration-audit.server";
import { auditSecurity } from "./security-audit.server";
import { auditPerformance } from "./performance-audit.server";
import { auditAi } from "./ai-audit.server";
import { auditMemory } from "./memory-audit.server";
import { auditGovernance } from "./governance-audit.server";
import { auditSimulation } from "./simulation-audit.server";
import { auditE2e } from "./e2e-audit.server";
import { baseKnownLimitations } from "./known-limitations.server";
import { scorePilotReadiness } from "./pilot-readiness.server";
import { buildReleaseNotes } from "./release-notes.server";
import { verifyReport } from "./verification.server";
import { finishRun, markStage, startRun } from "./telemetry.server";
import { incr, observe } from "./metrics.server";

export * from "./types";
export * from "./contracts";
export { RC1_CHECKLIST, checklistItem } from "./rc-checklist.server";
export { scorePilotReadiness } from "./pilot-readiness.server";
export { verifyReport } from "./verification.server";
export { baseKnownLimitations } from "./known-limitations.server";
export { buildReleaseNotes } from "./release-notes.server";
export { snapshot as metricsSnapshot } from "./metrics.server";
export { getRun as getRcRun } from "./telemetry.server";

function requirementsFromInputs(input: RcInputs): readonly Requirement[] {
  const reqs: Requirement[] = [];
  const creds = input.external_credentials ?? {};
  for (const [name, present] of Object.entries(creds)) {
    if (!present) {
      reqs.push({
        id: `REQ-CRED-${name.toUpperCase()}`,
        title: `Provision external credential: ${name}`,
        detail: `Connector requiring "${name}" runs in degraded mode until supplied.`,
        blocker: true,
      });
    }
  }
  if (input.typecheck_ok === undefined) {
    reqs.push({
      id: "REQ-TYPECHECK",
      title: "Provide typecheck evidence",
      detail: "Run bunx tsgo --noEmit and supply typecheck_ok before decision.",
      blocker: false,
    });
  }
  if (input.build_ok === undefined) {
    reqs.push({
      id: "REQ-BUILD",
      title: "Provide build evidence",
      detail: "Run production build and supply build_ok before decision.",
      blocker: false,
    });
  }
  if (input.runtime_ok === undefined) {
    reqs.push({
      id: "REQ-RUNTIME",
      title: "Provide runtime probe evidence",
      detail: "Probe worker runtime and supply runtime_ok before decision.",
      blocker: false,
    });
  }
  if (input.performance_p95_ms === undefined) {
    reqs.push({
      id: "REQ-PERF",
      title: "Provide performance evidence",
      detail: "Supply performance_p95_ms (ms) from an interactive session.",
      blocker: false,
    });
  }
  return reqs;
}

function decide(
  gates: readonly GateResult[],
  requirements: readonly Requirement[],
): { decision: ReleaseDecision; reason: string } {
  const critical = gates.filter((g) => g.criticality === "critical");
  const criticalFail = critical.filter((g) => g.status === "fail");
  const criticalUnknown = critical.filter((g) => g.status === "unknown");
  if (criticalFail.length > 0) {
    return {
      decision: "NO-GO",
      reason: `Critical gate failure: ${criticalFail.map((g) => g.id).join(", ")}`,
    };
  }
  if (criticalUnknown.length > 0) {
    return {
      decision: "CONDITIONAL-GO",
      reason: `Critical gate unknown: ${criticalUnknown.map((g) => g.id).join(", ")} — supply evidence before pilot cutover.`,
    };
  }
  const blockers = requirements.filter((r) => r.blocker);
  if (blockers.length > 0) {
    return {
      decision: "CONDITIONAL-GO",
      reason: `Blocker requirements outstanding: ${blockers.map((b) => b.id).join(", ")}`,
    };
  }
  const highWarn = gates.filter((g) => g.criticality === "high" && g.status === "warn");
  if (highWarn.length > 0) {
    return {
      decision: "CONDITIONAL-GO",
      reason: `High-priority gates in warn state: ${highWarn.map((g) => g.id).join(", ")}`,
    };
  }
  return { decision: "GO", reason: "All critical gates pass; no outstanding blockers." };
}

/** Runs the full RC1 pipeline and returns an evidence-linked report. */
export function runRc1Pipeline(raw: RcInputs = {}): RcReport {
  const runId = `rc_run_${Date.now().toString(36)}`;
  startRun(runId);

  const parsed = RcInputsSchema.safeParse(raw);
  const input: RcInputs = parsed.success ? parsed.data : {};
  if (!parsed.success) incr("rc.invalid_input");

  const t0 = Date.now();
  const gates: GateResult[] = [
    ...auditSystem(input),
    auditSecurity(),
    ...auditGovernance(),
    auditMemory(),
    ...auditAi(),
    auditIntegration(input),
    auditSimulation(),
    auditE2e(),
    auditPerformance(input),
  ];
  markStage(runId, "audit", Date.now() - t0);

  // Ensure every checklist item has a gate; fill missing with unknown.
  const covered = new Set(gates.map((g) => g.id));
  for (const item of RC1_CHECKLIST) {
    if (!covered.has(item.id)) {
      gates.push({
        id: item.id,
        title: item.title,
        status: "unknown",
        criticality: item.criticality,
        score: 0,
        summary: "not audited",
        findings: [],
        evidence: [],
        unknown_reason: "no auditor emitted this gate",
        checked_at: new Date().toISOString(),
      });
    }
  }

  const t1 = Date.now();
  const pilot_readiness = scorePilotReadiness(gates);
  markStage(runId, "score", Date.now() - t1);
  observe("rc.pilot_readiness", pilot_readiness.overall);

  const known_limitations = baseKnownLimitations(input);
  const requirements = requirementsFromInputs(input);

  const t2 = Date.now();
  const { decision, reason } = decide(gates, requirements);
  markStage(runId, "decide", Date.now() - t2);

  const release_notes = buildReleaseNotes({
    version: input.version ?? "RC1",
    gates,
    known_limitations,
    requirements,
    decision,
    decision_reason: reason,
  });

  const report: RcReport = {
    id: runId,
    generated_at: new Date().toISOString(),
    gates,
    pilot_readiness,
    known_limitations,
    requirements,
    release_notes,
    decision,
    decision_reason: reason,
    telemetry_id: runId,
  };

  const v = verifyReport(report);
  if (!v.ok) {
    incr("rc.verify_fail");
    finishRun(runId, "NO-GO");
    return {
      ...report,
      decision: "NO-GO",
      decision_reason: `verifier rejected report: ${v.reasons.join("|")}`,
      release_notes: {
        ...report.release_notes,
        decision: "NO-GO",
        decision_reason: `verifier rejected report: ${v.reasons.join("|")}`,
      },
    };
  }
  incr(`rc.decision.${decision}`);
  finishRun(runId, decision);
  return report;
}
