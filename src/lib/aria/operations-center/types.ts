// Phase 10.5 — Operations Center: shared types. Server-only. Additive.

export type TriState = "pass" | "fail" | "unknown";
export type Severity = "info" | "low" | "medium" | "high" | "critical" | "unknown";
export type Priority = "p4" | "p3" | "p2" | "p1" | "p0" | "unknown";
export type HealthState = "healthy" | "degraded" | "down" | "unknown";
export type OperatorRole =
  | "operator"
  | "supervisor"
  | "director"
  | "executive"
  | "board"
  | "unknown";
export type ApprovalDecision = "approve" | "reject" | "defer" | "unknown";
export type CommandStatus =
  | "pending_authorization"
  | "authorized"
  | "rejected"
  | "executed"
  | "blocked"
  | "unknown";
export type EngineDecision = "GO" | "NO_GO" | "GO_WITH_KNOWN_LIMITATIONS" | "UNKNOWN";

export interface EvidenceRef {
  readonly source: string;
  readonly ref: string;
  readonly at: string;
}

export interface OpsSignal {
  readonly id: string;
  readonly domain:
    | "mission"
    | "incident"
    | "risk"
    | "runtime"
    | "mesh"
    | "tool"
    | "readiness"
    | "unknown";
  readonly subject: string;
  readonly severity: Severity;
  readonly detail: string;
  readonly capturedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface NormalizedSignal extends OpsSignal {
  readonly priority: Priority;
}

export interface MissionStatus {
  readonly missionId: string;
  readonly phase: "planning" | "executing" | "paused" | "completed" | "failed" | "unknown";
  readonly progressPct: number | null; // 0..1
  readonly health: HealthState;
  readonly detail: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
  readonly updatedAt: string;
}

export interface IncidentRecord {
  readonly incidentId: string;
  readonly subject: string;
  readonly severity: Severity;
  readonly state: "open" | "acknowledged" | "mitigating" | "resolved" | "unknown";
  readonly openedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface RiskRecord {
  readonly riskId: string;
  readonly subject: string;
  readonly likelihood: number; // 0..1
  readonly impact: number; // 0..1
  readonly severity: Severity;
  readonly evidence: ReadonlyArray<EvidenceRef>;
  readonly updatedAt: string;
}

export interface RuntimeHealth {
  readonly nodeId: string;
  readonly state: HealthState;
  readonly cpuLoad: number | null; // 0..1
  readonly memLoad: number | null; // 0..1
  readonly queueDepth: number | null;
  readonly evidence: ReadonlyArray<EvidenceRef>;
  readonly capturedAt: string;
}

export interface MeshHealth {
  readonly meshId: string;
  readonly nodeCount: number;
  readonly reachableCount: number;
  readonly partitionSuspected: boolean;
  readonly state: HealthState;
  readonly evidence: ReadonlyArray<EvidenceRef>;
  readonly capturedAt: string;
}

export interface ToolReadiness {
  readonly toolId: string;
  readonly state: HealthState;
  readonly lastCheckAt: string;
  readonly failureRate: number | null; // 0..1
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface ReadinessSnapshot {
  readonly subject: string;
  readonly state: HealthState;
  readonly detail: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
  readonly capturedAt: string;
}

export interface Alert {
  readonly id: string;
  readonly signalId: string;
  readonly severity: Severity;
  readonly priority: Priority;
  readonly subject: string;
  readonly detail: string;
  readonly openedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface EscalationHop {
  readonly toRole: OperatorRole;
  readonly at: string;
  readonly reason: string;
}

export interface EscalationRecord {
  readonly id: string;
  readonly alertId: string;
  readonly currentRole: OperatorRole;
  readonly hops: ReadonlyArray<EscalationHop>;
  readonly resolvedAt: string | null;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface OperatorAction {
  readonly id: string;
  readonly requestedBy: string;
  readonly role: OperatorRole;
  readonly command: string;
  readonly target: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly justification: string;
  readonly requestedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface ApprovalRecord {
  readonly actionId: string;
  readonly approverId: string;
  readonly role: OperatorRole;
  readonly decision: ApprovalDecision;
  readonly justification: string;
  readonly decidedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface CommandRecord {
  readonly id: string;
  readonly actionId: string;
  readonly status: CommandStatus;
  readonly detail: string;
  readonly at: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface StatusBoardEntry {
  readonly domain: NormalizedSignal["domain"];
  readonly subject: string;
  readonly state: HealthState;
  readonly severity: Severity;
  readonly priority: Priority;
  readonly detail: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
  readonly updatedAt: string;
}

export interface StatusBoard {
  readonly generatedAt: string;
  readonly entries: ReadonlyArray<StatusBoardEntry>;
  readonly overall: HealthState;
}

export interface TimelineEvent {
  readonly id: string;
  readonly at: string;
  readonly kind:
    | "signal"
    | "alert"
    | "escalation"
    | "action"
    | "approval"
    | "command"
    | "note"
    | "unknown";
  readonly subject: string;
  readonly detail: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface OpsAuditEntry {
  readonly id: string;
  readonly at: string;
  readonly stage: string;
  readonly status: TriState;
  readonly detail: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface OpsMetrics {
  readonly signals: number;
  readonly alerts: number;
  readonly escalations: number;
  readonly actionsRequested: number;
  readonly actionsApproved: number;
  readonly actionsRejected: number;
  readonly commandsExecuted: number;
  readonly commandsBlocked: number;
  readonly openIncidents: number;
  readonly criticalRisks: number;
  readonly nodesDown: number;
  readonly toolsDown: number;
}

export interface OpsTelemetry {
  readonly emittedAt: string;
  readonly metrics: OpsMetrics;
  readonly recent: ReadonlyArray<OpsAuditEntry>;
}

export interface OpsReport {
  readonly signals: ReadonlyArray<NormalizedSignal>;
  readonly alerts: ReadonlyArray<Alert>;
  readonly escalations: ReadonlyArray<EscalationRecord>;
  readonly missions: ReadonlyArray<MissionStatus>;
  readonly incidents: ReadonlyArray<IncidentRecord>;
  readonly risks: ReadonlyArray<RiskRecord>;
  readonly runtime: ReadonlyArray<RuntimeHealth>;
  readonly mesh: ReadonlyArray<MeshHealth>;
  readonly tools: ReadonlyArray<ToolReadiness>;
  readonly readiness: ReadonlyArray<ReadinessSnapshot>;
  readonly actions: ReadonlyArray<OperatorAction>;
  readonly approvals: ReadonlyArray<ApprovalRecord>;
  readonly commands: ReadonlyArray<CommandRecord>;
  readonly statusBoard: StatusBoard;
  readonly timeline: ReadonlyArray<TimelineEvent>;
  readonly metrics: OpsMetrics;
  readonly audit: ReadonlyArray<OpsAuditEntry>;
  readonly decision: EngineDecision;
  readonly reasons: ReadonlyArray<string>;
  readonly generatedAt: string;
}
