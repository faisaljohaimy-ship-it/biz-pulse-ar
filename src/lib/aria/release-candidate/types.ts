/**
 * Phase 10.0 — Enterprise Release Candidate RC1
 * Types (server-side only, worker-compatible)
 *
 * Rules:
 *  - Unknown remains UNKNOWN.
 *  - Every gate result is evidence-linked.
 *  - No fabricated readiness. No fabricated test results.
 */

export type GateId =
  | "architecture"
  | "type_safety"
  | "build"
  | "runtime"
  | "security"
  | "governance"
  | "memory"
  | "knowledge_graph"
  | "world_model"
  | "agent_runtime"
  | "tool_engine"
  | "integration"
  | "simulation"
  | "executive_demo"
  | "aria_conversation"
  | "approval_workflow"
  | "audit_trail"
  | "performance"
  | "error_handling"
  | "fallback";

export type GateStatus = "pass" | "warn" | "fail" | "unknown";
export type Criticality = "critical" | "high" | "medium" | "low";

export type ReleaseDecision = "GO" | "NO-GO" | "CONDITIONAL-GO";

export interface EvidenceRef {
  readonly source_id: string;
  readonly kind:
    | "audit"
    | "metric"
    | "log"
    | "artifact"
    | "policy"
    | "test"
    | "config"
    | "signal";
  readonly locator: string;
  readonly captured_at: string;
}

export interface GateResult {
  readonly id: GateId;
  readonly title: string;
  readonly status: GateStatus;
  readonly criticality: Criticality;
  readonly score: number; // 0..1
  readonly summary: string;
  readonly findings: readonly string[];
  readonly evidence: readonly EvidenceRef[];
  readonly unknown_reason?: string;
  readonly checked_at: string;
}

export interface KnownLimitation {
  readonly id: string;
  readonly area: string;
  readonly description: string;
  readonly severity: Criticality;
  readonly workaround?: string;
  readonly evidence: readonly EvidenceRef[];
}

export interface Requirement {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly blocker: boolean;
}

export interface PilotReadinessScore {
  readonly overall: number; // 0..100
  readonly by_gate: Readonly<Record<GateId, number>>;
  readonly gaps: readonly string[];
}

export interface ReleaseNotes {
  readonly version: string;
  readonly generated_at: string;
  readonly highlights: readonly string[];
  readonly gates: readonly GateResult[];
  readonly known_limitations: readonly KnownLimitation[];
  readonly requirements: readonly Requirement[];
  readonly decision: ReleaseDecision;
  readonly decision_reason: string;
}

export interface RcReport {
  readonly id: string;
  readonly generated_at: string;
  readonly gates: readonly GateResult[];
  readonly pilot_readiness: PilotReadinessScore;
  readonly known_limitations: readonly KnownLimitation[];
  readonly requirements: readonly Requirement[];
  readonly release_notes: ReleaseNotes;
  readonly decision: ReleaseDecision;
  readonly decision_reason: string;
  readonly telemetry_id: string;
}

export interface RcInputs {
  readonly version?: string;
  /** Optional caller-supplied evidence (build/runtime/test signals). */
  readonly build_ok?: boolean;
  readonly typecheck_ok?: boolean;
  readonly runtime_ok?: boolean;
  readonly external_credentials?: Readonly<Record<string, boolean>>;
  readonly performance_p95_ms?: number;
  readonly notes?: readonly string[];
}
