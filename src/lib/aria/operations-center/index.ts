// Phase 10.5 — Operations Center public barrel.
// Server-only. Strictly additive. Never bypasses governance.

export * from "./types";
export * as OpsContracts from "./contracts";
export {
  createControlPlane,
  classifyPriority,
  type ControlPlane,
} from "./control-plane.server";
export { validateMission, summarizeMissions } from "./mission-control.server";
export {
  validateIncident,
  incidentPriority,
  shouldEscalateIncident,
  summarizeIncidents,
} from "./incident-control.server";
export { deriveRiskSeverity, validateRisk, summarizeRisks } from "./risk-control.server";
export { validateRuntime, summarizeRuntime } from "./runtime-control.server";
export { validateMesh, summarizeMesh } from "./mesh-control.server";
export { validateTool, summarizeTools } from "./tool-control.server";
export { validateReadiness, summarizeReadiness } from "./readiness-control.server";
export { shouldAlert, buildAlert, buildAlerts } from "./alerting.server";
export {
  buildEscalation,
  escalate,
  resolveEscalation,
} from "./escalation.server";
export { buildStatusBoard } from "./status-board.server";
export { buildTimeline } from "./timeline.server";
export { routeCommand, markExecuted } from "./command-router.server";
export { submitOperatorAction } from "./operator-action.server";
export { submitApproval, isAuthorized } from "./approval-gate.server";
export { createOpsAudit } from "./audit.server";
export { computeOpsMetrics } from "./metrics.server";
export { emitOpsTelemetry } from "./telemetry.server";
export { verifyOps, type VerificationOutput } from "./verification.server";

// High-level pipeline orchestrator.
import type {
  ApprovalRecord,
  CommandRecord,
  EscalationRecord,
  IncidentRecord,
  MeshHealth,
  MissionStatus,
  OperatorAction,
  OpsReport,
  OpsSignal,
  ReadinessSnapshot,
  RiskRecord,
  RuntimeHealth,
  Severity,
  ToolReadiness,
} from "./types";
import { createControlPlane } from "./control-plane.server";
import { buildAlerts } from "./alerting.server";
import { buildEscalation } from "./escalation.server";
import { buildStatusBoard } from "./status-board.server";
import { buildTimeline } from "./timeline.server";
import { routeCommand } from "./command-router.server";
import { createOpsAudit } from "./audit.server";
import { computeOpsMetrics } from "./metrics.server";
import { verifyOps } from "./verification.server";

export interface OpsPipelineInput {
  readonly signals: ReadonlyArray<OpsSignal>;
  readonly missions: ReadonlyArray<MissionStatus>;
  readonly incidents: ReadonlyArray<IncidentRecord>;
  readonly risks: ReadonlyArray<RiskRecord>;
  readonly runtime: ReadonlyArray<RuntimeHealth>;
  readonly mesh: ReadonlyArray<MeshHealth>;
  readonly tools: ReadonlyArray<ToolReadiness>;
  readonly readiness: ReadonlyArray<ReadinessSnapshot>;
  readonly actions: ReadonlyArray<OperatorAction>;
  readonly approvals: ReadonlyArray<ApprovalRecord>;
  readonly alertMinSeverity?: Severity;
  readonly now: string;
}

export function runOpsPipeline(input: OpsPipelineInput): OpsReport {
  const audit = createOpsAudit();
  const plane = createControlPlane();
  for (const s of input.signals) plane.ingest(s);
  audit.append({
    at: input.now,
    stage: "collect",
    status: input.signals.length > 0 ? "pass" : "unknown",
    detail: `signals=${input.signals.length}`,
  });

  const normalized = plane.all();
  const alerts = buildAlerts(normalized, input.alertMinSeverity ?? "high", input.now);
  audit.append({
    at: input.now,
    stage: "alert",
    status: "pass",
    detail: `alerts=${alerts.length}`,
  });

  const escalations: EscalationRecord[] = alerts.map((a) => buildEscalation(a, input.now));
  audit.append({
    at: input.now,
    stage: "escalate",
    status: "pass",
    detail: `escalations=${escalations.length}`,
  });

  const commands: CommandRecord[] = input.actions.map((a) =>
    routeCommand({ action: a, approvals: input.approvals, at: input.now }),
  );
  audit.append({
    at: input.now,
    stage: "route_command",
    status: "pass",
    detail: `commands=${commands.length}`,
  });

  const statusBoard = buildStatusBoard({
    missions: input.missions,
    incidents: input.incidents,
    risks: input.risks,
    runtime: input.runtime,
    mesh: input.mesh,
    tools: input.tools,
    readiness: input.readiness,
    signals: normalized,
    generatedAt: input.now,
  });

  const timeline = buildTimeline({
    signals: normalized,
    alerts,
    escalations,
    actions: input.actions,
    approvals: input.approvals,
    commands,
  });

  const metrics = computeOpsMetrics({
    signals: normalized,
    alerts,
    escalations,
    actions: input.actions,
    approvals: input.approvals,
    commands,
    incidents: input.incidents,
    risks: input.risks,
    runtime: input.runtime,
    tools: input.tools,
  });

  const { decision, reasons } = verifyOps({
    alerts,
    actions: input.actions,
    approvals: input.approvals,
    commands,
  });

  return {
    signals: normalized,
    alerts,
    escalations,
    missions: input.missions,
    incidents: input.incidents,
    risks: input.risks,
    runtime: input.runtime,
    mesh: input.mesh,
    tools: input.tools,
    readiness: input.readiness,
    actions: input.actions,
    approvals: input.approvals,
    commands,
    statusBoard,
    timeline,
    metrics,
    audit: audit.entries(),
    decision,
    reasons,
    generatedAt: input.now,
  };
}
