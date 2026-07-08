/**
 * Phase 9.4 — Autonomous Self-Evolution Engine: types.
 *
 * Strictly additive. Server-side only. No mutation of prior layers.
 * The engine observes prior executions, extracts patterns, and produces
 * verifiable recommendations. It never rewrites prompts, policies,
 * planners, runtimes, or tools; those decisions belong to the Executive
 * Brain, which may adopt or reject a proposal.
 *
 * "unknown" is a first-class value everywhere. Missing evidence must
 * never be fabricated into a synthetic PASS or an invented confidence.
 */

export type EvolutionOutcome = "success" | "partial" | "failure" | "unknown";
export type Severity = "info" | "notice" | "warn" | "error" | "critical";
export type Confidence = "low" | "medium" | "high" | "unknown";
export type ProposalStatus = "proposed" | "verified" | "rejected" | "unknown";

export interface EvidenceRef {
  readonly id: string;
  readonly kind:
    | "execution"
    | "telemetry"
    | "audit"
    | "benchmark"
    | "pattern"
    | "experience"
    | "reflection";
  readonly source: string;
  readonly taken_at: string;
}

export interface ExecutionEvidence {
  readonly execution_id: string;
  readonly workspace_id: string;
  readonly started_at: string;
  readonly finished_at: string;
  readonly duration_ms: number;
  readonly outcome: EvolutionOutcome;
  readonly cost_tokens: number;
  readonly cost_ms: number;
  readonly tool_calls: number;
  readonly retries: number;
  readonly errors: readonly string[];
  readonly tags: readonly string[];
}

export interface FailureAnalysis {
  readonly id: string;
  readonly execution_id: string;
  readonly created_at: string;
  readonly failure_signals: readonly string[];
  readonly stage: "planning" | "runtime" | "tool" | "integration" | "cognition" | "unknown";
  readonly severity: Severity;
  readonly evidence: readonly EvidenceRef[];
}

export interface RootCauseReport {
  readonly id: string;
  readonly failure_id: string;
  readonly created_at: string;
  readonly hypothesis: string;
  readonly cause_category:
    | "capability_gap"
    | "budget_exhaustion"
    | "policy_violation"
    | "external_error"
    | "planning_defect"
    | "prompt_defect"
    | "unknown";
  readonly confidence: Confidence;
  readonly evidence: readonly EvidenceRef[];
}

export interface PatternReport {
  readonly id: string;
  readonly created_at: string;
  readonly kind:
    | "repeated_failure"
    | "repeated_success"
    | "latency_trend"
    | "budget_trend"
    | "token_trend"
    | "capability_gap"
    | "planning_weakness"
    | "execution_bottleneck"
    | "recovery_quality";
  readonly label: string;
  readonly window_size: number;
  readonly observations: number;
  readonly delta: number; // absolute or relative shift, positive = worsening
  readonly evidence: readonly EvidenceRef[];
}

export interface ExperienceRecord {
  readonly id: string;
  readonly created_at: string;
  readonly problem: string;
  readonly context: string;
  readonly goal: string;
  readonly actions: readonly string[];
  readonly evidence: readonly EvidenceRef[];
  readonly outcome: EvolutionOutcome;
  readonly failures: readonly string[];
  readonly successes: readonly string[];
  readonly metrics: Readonly<Record<string, number>>;
  readonly duration_ms: number;
  readonly cost_tokens: number;
  readonly confidence: Confidence;
  readonly risk: Severity;
  readonly lessons: readonly string[];
  readonly recommendations: readonly string[];
}

export interface StrategyDescriptor {
  readonly id: string;
  readonly label: string;
  readonly summary: string;
}

export interface StrategyComparison {
  readonly id: string;
  readonly created_at: string;
  readonly previous: StrategyDescriptor;
  readonly current: StrategyDescriptor;
  readonly alternatives: readonly StrategyDescriptor[];
  readonly expected_gain: number; // relative (-1..1)
  readonly expected_risk: Severity;
  readonly confidence: Confidence;
  readonly evidence: readonly EvidenceRef[];
}

export interface ImprovementProposal {
  readonly id: string;
  readonly created_at: string;
  readonly target: "prompt" | "policy" | "workflow" | "planner" | "runtime" | "tool" | "memory";
  readonly summary: string;
  readonly rationale: string;
  readonly expected_gain: number;
  readonly expected_risk: Severity;
  readonly confidence: Confidence;
  readonly status: ProposalStatus;
  readonly evidence: readonly EvidenceRef[];
}

export interface ConfidenceReport {
  readonly id: string;
  readonly subject_id: string;
  readonly created_at: string;
  readonly evidence_quality: number; // 0..1 or -1 when unknown
  readonly execution_success_rate: number;
  readonly historical_alignment: number;
  readonly benchmark_alignment: number;
  readonly pattern_consistency: number;
  readonly coverage: number;
  readonly confidence: Confidence;
  readonly evidence: readonly EvidenceRef[];
}

export interface ExecutiveRecommendation {
  readonly id: string;
  readonly created_at: string;
  readonly proposal_id: string;
  readonly headline: string;
  readonly body: string;
  readonly severity: Severity;
  readonly confidence: Confidence;
  readonly evidence: readonly EvidenceRef[];
}

export interface VerificationIssue {
  readonly code:
    | "circular_dependency"
    | "mutable_global"
    | "fake_learning"
    | "fabricated_confidence"
    | "synthetic_improvement"
    | "unbacked_recommendation"
    | "nonreproducible_score"
    | "nondeterministic_report";
  readonly detail: string;
}

export interface VerificationReport {
  readonly id: string;
  readonly created_at: string;
  readonly ok: boolean;
  readonly issues: readonly VerificationIssue[];
  readonly checked_ids: readonly string[];
}

export interface ReflectionReport {
  readonly id: string;
  readonly created_at: string;
  readonly execution_id: string;
  readonly failure_analysis?: FailureAnalysis;
  readonly root_cause?: RootCauseReport;
  readonly patterns: readonly PatternReport[];
  readonly experience?: ExperienceRecord;
  readonly strategy_comparison?: StrategyComparison;
  readonly proposal?: ImprovementProposal;
  readonly confidence?: ConfidenceReport;
  readonly recommendation?: ExecutiveRecommendation;
  readonly verification: VerificationReport;
}

export interface BenchmarkSample {
  readonly id: string;
  readonly created_at: string;
  readonly label: string;
  readonly runtime_cost_ms: number;
  readonly token_cost: number;
  readonly latency_ms: number;
  readonly reliability: number; // 0..1 or -1
  readonly risk: Severity;
  readonly evidence: readonly EvidenceRef[];
}

export interface ABTestResult {
  readonly id: string;
  readonly created_at: string;
  readonly a: BenchmarkSample;
  readonly b: BenchmarkSample;
  readonly winner: "a" | "b" | "tie" | "unknown";
  readonly margin: number;
  readonly confidence: Confidence;
}

export interface RegressionReport {
  readonly id: string;
  readonly created_at: string;
  readonly metric: string;
  readonly baseline: number;
  readonly current: number;
  readonly delta: number;
  readonly regressed: boolean;
  readonly confidence: Confidence;
}

export interface MetricPoint {
  readonly ts: string;
  readonly key: string;
  readonly value: number;
}

export interface TelemetryEvent {
  readonly id: string;
  readonly ts: string;
  readonly kind: string;
  readonly severity: Severity;
  readonly detail: string;
}

export interface AuditEntry {
  readonly id: string;
  readonly ts: string;
  readonly actor: "self-evolution";
  readonly action: string;
  readonly subject_id: string;
  readonly evidence_ids: readonly string[];
}
