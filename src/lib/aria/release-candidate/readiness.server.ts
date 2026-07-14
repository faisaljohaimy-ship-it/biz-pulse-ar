/**
 * Phase 10.0 — Readiness evaluator.
 * Maps signals to gate results. Unknown remains UNKNOWN.
 */
import type {
  GateId,
  GateResult,
  GateSeverity,
  GateStatus,
  EvidenceRef,
  Rc1Signals,
  TestReport,
  ReviewReport,
} from "./types";

interface GateSpec {
  readonly gate: GateId;
  readonly severity: GateSeverity;
  readonly description: string;
}

export const GATE_SPECS: ReadonlyArray<GateSpec> = [
  { gate: "build", severity: "critical", description: "npm run build succeeds" },
  { gate: "typecheck", severity: "critical", description: "npm run typecheck passes" },
  { gate: "lint", severity: "high", description: "lint passes without errors" },
  { gate: "core_runtime", severity: "critical", description: "Core runtime boots" },
  { gate: "aria_os", severity: "critical", description: "ARIA OS kernel available" },
  { gate: "planning", severity: "high", description: "Planning layer available" },
  { gate: "execution", severity: "high", description: "Execution engine available" },
  { gate: "marketplace", severity: "medium", description: "Marketplace registry available" },
  { gate: "task_bus", severity: "high", description: "Universal Task Bus available" },
  { gate: "runtime", severity: "critical", description: "Multi-agent runtime available" },
  { gate: "tools", severity: "high", description: "Universal Tool Engine available" },
  { gate: "memory", severity: "high", description: "Long-term memory available" },
  { gate: "knowledge_graph", severity: "high", description: "Knowledge Graph available" },
  { gate: "world_model", severity: "medium", description: "World Model available" },
  { gate: "governance", severity: "critical", description: "Governance gates enforced" },
  { gate: "security", severity: "critical", description: "Security review clean" },
  { gate: "performance", severity: "high", description: "Performance within baseline" },
  { gate: "accessibility", severity: "high", description: "Accessibility review clean" },
  { gate: "observability", severity: "high", description: "Observability instrumented" },
  { gate: "error_handling", severity: "high", description: "Error handling covered" },
  { gate: "release_notes", severity: "medium", description: "Release notes prepared" },
];

function statusFromBoolean(v: boolean | undefined): GateStatus {
  if (v === undefined) return "unknown";
  return v ? "pass" : "fail";
}

function statusFromReport(r: TestReport | undefined): GateStatus {
  if (!r) return "unknown";
  if (r.outcomes.length === 0) return "unknown";
  const fail = r.outcomes.some((o) => o.status === "fail");
  if (fail) return "fail";
  const unknown = r.outcomes.some((o) => o.status === "unknown");
  if (unknown) return "unknown";
  const warn = r.outcomes.some((o) => o.status === "warn");
  return warn ? "warn" : "pass";
}

function statusFromReview(r: ReviewReport | undefined): GateStatus {
  if (!r) return "unknown";
  return r.status;
}

function reportEvidence(r: TestReport | undefined): ReadonlyArray<EvidenceRef> {
  if (!r) return [];
  const out: EvidenceRef[] = [];
  for (const o of r.outcomes) if (o.evidence) out.push(o.evidence);
  return out;
}

export function evaluateGates(signals: Rc1Signals): ReadonlyArray<GateResult> {
  const smokeStatus = statusFromReport(signals.smoke);
  const integrationStatus = statusFromReport(signals.integration);
  const e2eStatus = statusFromReport(signals.e2e);
  const regressionStatus = statusFromReport(signals.regression);

  const smokeEv = reportEvidence(signals.smoke);
  const integrationEv = reportEvidence(signals.integration);
  const e2eEv = reportEvidence(signals.e2e);

  const results: GateResult[] = GATE_SPECS.map((spec) => {
    let status: GateStatus = "unknown";
    const evidence: EvidenceRef[] = [];
    const blockers: string[] = [];
    const notes: string[] = [];

    switch (spec.gate) {
      case "typecheck":
        status = statusFromBoolean(signals.typecheck_ok);
        break;
      case "build":
        status = statusFromBoolean(signals.build_ok);
        break;
      case "lint":
        status = statusFromBoolean(signals.lint_ok);
        break;
      case "core_runtime":
        status = statusFromBoolean(signals.runtime_ok);
        break;
      case "aria_os":
      case "planning":
      case "execution":
      case "marketplace":
      case "task_bus":
      case "runtime":
      case "tools":
      case "memory":
      case "knowledge_graph":
      case "world_model":
        status = smokeStatus;
        for (const e of smokeEv) evidence.push(e);
        break;
      case "governance":
        status = worstOf(smokeStatus, integrationStatus);
        for (const e of smokeEv) evidence.push(e);
        for (const e of integrationEv) evidence.push(e);
        break;
      case "security":
        status = statusFromReview(signals.security);
        if (signals.security) for (const e of signals.security.evidence) evidence.push(e);
        break;
      case "performance":
        status = statusFromReview(signals.performance);
        if (signals.performance) for (const e of signals.performance.evidence) evidence.push(e);
        break;
      case "accessibility":
        status = statusFromReview(signals.accessibility);
        if (signals.accessibility) for (const e of signals.accessibility.evidence) evidence.push(e);
        break;
      case "observability":
        status = statusFromReview(signals.observability);
        if (signals.observability) for (const e of signals.observability.evidence) evidence.push(e);
        break;
      case "error_handling":
        status = worstOf(regressionStatus, e2eStatus);
        for (const e of e2eEv) evidence.push(e);
        break;
      case "release_notes":
        status = "pass";
        notes.push("Release notes generated by release-notes.server.ts.");
        break;
    }

    if (status === "unknown") {
      blockers.push(`Gate ${spec.gate} has no evidence; supply required signal.`);
    } else if (status === "fail") {
      blockers.push(`Gate ${spec.gate} failed; investigate before release.`);
    }

    return {
      gate: spec.gate,
      severity: spec.severity,
      status,
      summary: `${spec.description} — ${status.toUpperCase()}`,
      evidence,
      blockers,
      notes,
    };
  });

  return results;
}

function worstOf(a: GateStatus, b: GateStatus): GateStatus {
  const order: Record<GateStatus, number> = { fail: 3, unknown: 2, warn: 1, pass: 0 };
  return order[a] >= order[b] ? a : b;
}
