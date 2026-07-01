// Metrics aggregator for Operations Center.
import type {
  Alert,
  ApprovalRecord,
  CommandRecord,
  EscalationRecord,
  IncidentRecord,
  NormalizedSignal,
  OperatorAction,
  OpsMetrics,
  RiskRecord,
  RuntimeHealth,
  ToolReadiness,
} from "./types";

export function computeOpsMetrics(input: {
  signals: ReadonlyArray<NormalizedSignal>;
  alerts: ReadonlyArray<Alert>;
  escalations: ReadonlyArray<EscalationRecord>;
  actions: ReadonlyArray<OperatorAction>;
  approvals: ReadonlyArray<ApprovalRecord>;
  commands: ReadonlyArray<CommandRecord>;
  incidents: ReadonlyArray<IncidentRecord>;
  risks: ReadonlyArray<RiskRecord>;
  runtime: ReadonlyArray<RuntimeHealth>;
  tools: ReadonlyArray<ToolReadiness>;
}): OpsMetrics {
  return {
    signals: input.signals.length,
    alerts: input.alerts.length,
    escalations: input.escalations.length,
    actionsRequested: input.actions.length,
    actionsApproved: input.approvals.filter((a) => a.decision === "approve").length,
    actionsRejected: input.approvals.filter((a) => a.decision === "reject").length,
    commandsExecuted: input.commands.filter((c) => c.status === "executed").length,
    commandsBlocked: input.commands.filter(
      (c) => c.status === "blocked" || c.status === "rejected",
    ).length,
    openIncidents: input.incidents.filter((i) => i.state !== "resolved").length,
    criticalRisks: input.risks.filter((r) => r.severity === "critical").length,
    nodesDown: input.runtime.filter((n) => n.state === "down").length,
    toolsDown: input.tools.filter((t) => t.state === "down").length,
  };
}
