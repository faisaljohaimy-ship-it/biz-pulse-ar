/**
 * Phase 9.9 — Executive AGI Governance & Control Layer
 * Types (server-side only, worker-compatible)
 *
 * Rules:
 *  - Unknown remains UNKNOWN.
 *  - Every decision is evidence-linked.
 *  - No autonomous high-impact execution without human approval.
 */

export type ImpactLevel = "low" | "medium" | "high" | "critical" | "unknown";

export type AuthorityLevel =
  | "agent"
  | "supervisor"
  | "manager"
  | "director"
  | "executive"
  | "board";

export type DecisionKind =
  | "read"
  | "notify"
  | "recommend"
  | "write"
  | "external_call"
  | "financial"
  | "security_change"
  | "policy_change"
  | "user_facing"
  | "unknown";

export type ApprovalStatus =
  | "pending"
  | "auto_approved"
  | "approved"
  | "rejected"
  | "expired"
  | "escalated"
  | "overridden";

export type ComplianceStatus = "compliant" | "non_compliant" | "requires_review" | "unknown";

export interface EvidenceRef {
  readonly source_id: string;
  readonly kind: "policy" | "audit" | "memory" | "graph" | "artifact" | "signal";
  readonly locator: string;
  readonly captured_at: string;
}

export interface ProposedAction {
  readonly id: string;
  readonly agent_id: string;
  readonly kind: DecisionKind;
  readonly summary: string;
  readonly target?: string;
  readonly params?: Readonly<Record<string, unknown>>;
  readonly tenant_id?: string;
  readonly requested_authority?: AuthorityLevel;
  readonly evidence: readonly EvidenceRef[];
  readonly created_at: string;
}

export interface ImpactAssessment {
  readonly level: ImpactLevel;
  readonly score: number; // 0..1
  readonly factors: readonly string[];
  readonly unknown_reason?: string;
}

export interface PolicyCheck {
  readonly policy_id: string;
  readonly ok: boolean;
  readonly reason: string;
}

export interface AuthorityCheck {
  readonly required: AuthorityLevel;
  readonly granted: AuthorityLevel | null;
  readonly ok: boolean;
  readonly reason: string;
}

export interface ComplianceCheck {
  readonly status: ComplianceStatus;
  readonly rule_ids: readonly string[];
  readonly notes?: string;
}

export interface EthicsCheck {
  readonly ok: boolean;
  readonly principles: readonly string[];
  readonly reason?: string;
}

export interface RiskGateResult {
  readonly ok: boolean;
  readonly impact: ImpactAssessment;
  readonly policy: readonly PolicyCheck[];
  readonly authority: AuthorityCheck;
  readonly compliance: ComplianceCheck;
  readonly ethics: EthicsCheck;
  readonly blocked_reasons: readonly string[];
}

export interface ApprovalRequest {
  readonly id: string;
  readonly action_id: string;
  readonly required_from: AuthorityLevel;
  readonly status: ApprovalStatus;
  readonly requested_at: string;
  readonly resolved_at?: string;
  readonly decided_by?: string;
  readonly decision_reason?: string;
  readonly expires_at?: string;
}

export interface AuditEntry {
  readonly id: string;
  readonly ts: string;
  readonly action_id: string;
  readonly stage: string;
  readonly actor: string;
  readonly ok: boolean;
  readonly detail?: string;
  readonly evidence: readonly EvidenceRef[];
}

export interface EscalationEntry {
  readonly id: string;
  readonly action_id: string;
  readonly level: AuthorityLevel;
  readonly reason: string;
  readonly created_at: string;
  readonly acknowledged_at?: string;
  readonly acknowledged_by?: string;
}

export interface OverrideEntry {
  readonly id: string;
  readonly action_id: string;
  readonly override_by: string;
  readonly justification: string;
  readonly at: string;
  readonly evidence: readonly EvidenceRef[];
}

export interface ExecutionPermission {
  readonly ok: boolean;
  readonly action_id: string;
  readonly approval_id?: string;
  readonly authority: AuthorityLevel | null;
  readonly reason: string;
  readonly issued_at: string;
  readonly expires_at?: string;
}

export interface ControlPlaneOutcome {
  readonly ok: boolean;
  readonly action_id: string;
  readonly impact: ImpactAssessment;
  readonly gate: RiskGateResult;
  readonly approval?: ApprovalRequest;
  readonly escalation?: EscalationEntry;
  readonly permission?: ExecutionPermission;
  readonly audit_ids: readonly string[];
  readonly telemetry_id: string;
}
