/**
 * Phase 10.0 — Release Candidate RC1
 * Types for evidence-linked release readiness assessment.
 *
 * Rules:
 * - Unknown remains UNKNOWN.
 * - Evidence-linked only.
 * - No fabricated results.
 */

export type GateId =
  | "build"
  | "typecheck"
  | "lint"
  | "core_runtime"
  | "aria_os"
  | "planning"
  | "execution"
  | "marketplace"
  | "task_bus"
  | "runtime"
  | "tools"
  | "memory"
  | "knowledge_graph"
  | "world_model"
  | "governance"
  | "security"
  | "performance"
  | "accessibility"
  | "observability"
  | "error_handling"
  | "release_notes";

export type GateSeverity = "critical" | "high" | "medium" | "low";
export type GateStatus = "pass" | "fail" | "warn" | "unknown";

export type Decision = "GO" | "NO-GO" | "GO_WITH_KNOWN_LIMITATIONS";

export interface EvidenceRef {
  readonly kind:
    | "typecheck"
    | "build"
    | "lint"
    | "smoke"
    | "integration"
    | "e2e"
    | "regression"
    | "security"
    | "performance"
    | "accessibility"
    | "observability"
    | "dependency"
    | "audit"
    | "metric"
    | "manual";
  readonly source: string;
  readonly ref?: string;
  readonly captured_at: string;
}

export interface GateResult {
  readonly gate: GateId;
  readonly severity: GateSeverity;
  readonly status: GateStatus;
  readonly summary: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
  readonly blockers: ReadonlyArray<string>;
  readonly notes: ReadonlyArray<string>;
}

export interface TestCase {
  readonly id: string;
  readonly gate: GateId;
  readonly kind: "smoke" | "integration" | "e2e" | "regression";
  readonly title: string;
  readonly required: boolean;
}

export interface TestOutcome {
  readonly case_id: string;
  readonly status: GateStatus;
  readonly evidence?: EvidenceRef;
  readonly detail?: string;
}

export interface TestPlan {
  readonly cases: ReadonlyArray<TestCase>;
  readonly generated_at: string;
}

export interface TestReport {
  readonly kind: "smoke" | "integration" | "e2e" | "regression";
  readonly outcomes: ReadonlyArray<TestOutcome>;
  readonly executed_at: string;
}

export interface ReviewFinding {
  readonly id: string;
  readonly severity: GateSeverity;
  readonly title: string;
  readonly detail: string;
  readonly evidence?: EvidenceRef;
}

export interface ReviewReport {
  readonly domain: "security" | "performance" | "accessibility" | "observability" | "dependency";
  readonly status: GateStatus;
  readonly findings: ReadonlyArray<ReviewFinding>;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface RiskEntry {
  readonly id: string;
  readonly gate: GateId;
  readonly severity: GateSeverity;
  readonly likelihood: "low" | "medium" | "high";
  readonly impact: "low" | "medium" | "high";
  readonly description: string;
  readonly mitigation: string;
  readonly owner?: string;
}

export interface Blocker {
  readonly id: string;
  readonly gate: GateId;
  readonly severity: "critical" | "high";
  readonly reason: string;
  readonly requirement: string;
  readonly evidence?: EvidenceRef;
}

export interface ReleaseNotesDraft {
  readonly version: string;
  readonly generated_at: string;
  readonly highlights: ReadonlyArray<string>;
  readonly gates: ReadonlyArray<GateResult>;
  readonly known_limitations: ReadonlyArray<string>;
  readonly decision: Decision;
}

export interface AuditRecord {
  readonly id: string;
  readonly stage: string;
  readonly status: GateStatus | "info";
  readonly summary: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
  readonly recorded_at: string;
}

export interface MetricSample {
  readonly name: string;
  readonly value: number;
  readonly unit: string;
  readonly captured_at: string;
}

export interface Rc1Signals {
  readonly typecheck_ok?: boolean;
  readonly build_ok?: boolean;
  readonly lint_ok?: boolean;
  readonly runtime_ok?: boolean;
  readonly smoke?: TestReport;
  readonly integration?: TestReport;
  readonly e2e?: TestReport;
  readonly regression?: TestReport;
  readonly security?: ReviewReport;
  readonly performance?: ReviewReport;
  readonly accessibility?: ReviewReport;
  readonly observability?: ReviewReport;
  readonly dependency?: ReviewReport;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface Rc1Report {
  readonly generated_at: string;
  readonly version: string;
  readonly gates: ReadonlyArray<GateResult>;
  readonly test_plan: TestPlan;
  readonly reviews: ReadonlyArray<ReviewReport>;
  readonly risks: ReadonlyArray<RiskEntry>;
  readonly blockers: ReadonlyArray<Blocker>;
  readonly release_notes: ReleaseNotesDraft;
  readonly audit: ReadonlyArray<AuditRecord>;
  readonly metrics: ReadonlyArray<MetricSample>;
  readonly decision: Decision;
  readonly decision_reason: string;
  readonly verified: boolean;
  readonly verification_notes: ReadonlyArray<string>;
}
