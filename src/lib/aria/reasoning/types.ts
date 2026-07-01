/**
 * Phase 8.6 — Executive Cognitive Reasoning Engine (types, server-only).
 *
 * Strictly additive. Reasoning produces validated thinking artifacts
 * consumed by the Planning Engine. It never executes, dispatches,
 * plans tasks, or mutates memory.
 */

export type ReasoningMode =
  | "strategic"
  | "analytical"
  | "critical"
  | "creative"
  | "systems"
  | "root_cause"
  | "first_principles"
  | "scenario"
  | "risk"
  | "opportunity"
  | "executive_advisory";

export type Language = "ar" | "en" | "mixed";

export type ConfidenceBand = "very_low" | "low" | "medium" | "high" | "very_high";

export interface ConfidenceScore {
  value: number; // 0..1
  band: ConfidenceBand;
  reasoning: string;
  evidence_ids: string[];
}

export interface Evidence {
  id: string;
  claim: string;
  source: string;
  source_kind:
    | "context_snapshot"
    | "memory_summary"
    | "policy"
    | "metric"
    | "incident"
    | "external_reference"
    | "domain_knowledge";
  weight: number; // 0..1
  freshness_ms: number | null;
  reliability: number; // 0..1
  supports: "yes" | "no" | "mixed";
  reasoning: string;
  collected_at: string;
}

export interface Assumption {
  id: string;
  statement: string;
  necessity: "must_hold" | "should_hold" | "nice_to_hold";
  risk_if_wrong: "low" | "medium" | "high" | "critical";
  challenged: boolean;
  challenge_reasoning: string | null;
  confidence: ConfidenceScore;
}

export interface Hypothesis {
  id: string;
  statement: string;
  rationale: string;
  supporting_evidence_ids: string[];
  opposing_evidence_ids: string[];
  confidence: ConfidenceScore;
  status: "candidate" | "supported" | "rejected" | "inconclusive";
  rejection_reason: string | null;
}

export interface CounterArgument {
  id: string;
  target_hypothesis_id: string;
  statement: string;
  strength: "weak" | "moderate" | "strong";
  evidence_ids: string[];
  rebuttal: string | null;
  rebuttal_holds: boolean;
  reasoning: string;
}

export type TradeoffAxis =
  | "time"
  | "money"
  | "risk"
  | "complexity"
  | "maintainability"
  | "scalability"
  | "compliance"
  | "security";

export interface Tradeoff {
  axis: TradeoffAxis;
  favors: string; // option id
  magnitude: "small" | "medium" | "large";
  reasoning: string;
}

export interface DecisionCriterion {
  key: string;
  description: string;
  weight: number; // 0..1
}

export interface DecisionOption {
  id: string;
  title: string;
  description: string;
  supporting_hypothesis_ids: string[];
  tradeoffs: Tradeoff[];
  scores: Record<string, number>; // criterion.key → 0..1
  weighted_score: number;
  risk: "low" | "medium" | "high" | "critical";
  reward: "low" | "medium" | "high";
  time_horizon: "short" | "medium" | "long";
  confidence: ConfidenceScore;
  reasoning: string;
}

export interface Uncertainty {
  id: string;
  topic: string;
  kind:
    | "missing_evidence"
    | "conflicting_evidence"
    | "external_dependency"
    | "future_event"
    | "measurement_error"
    | "domain_gap";
  impact: "low" | "medium" | "high" | "critical";
  mitigation: string;
  reasoning: string;
}

export interface ExecutiveRecommendation {
  id: string;
  title: string;
  summary: string;
  selected_option_id: string;
  rejected_option_ids: string[];
  why_selected: string;
  why_rejected: Record<string, string>; // option id → reason
  next_action: string;
  confidence: ConfidenceScore;
  business_impact: "low" | "medium" | "high" | "critical";
  time_horizon: "short" | "medium" | "long";
  requires_human_approval: boolean;
  reasoning_trace_id: string;
}

export type ReasoningNodeKind =
  | "analysis"
  | "hypothesis"
  | "evidence"
  | "counter_argument"
  | "assumption_challenge"
  | "critical_check"
  | "tradeoff"
  | "decision"
  | "reflection"
  | "recommendation";

export interface ReasoningNode {
  id: string;
  kind: ReasoningNodeKind;
  summary: string;
  detail: string;
  parents: string[];
  children: string[];
  confidence: ConfidenceScore | null;
  ts: string;
}

export interface ReasoningTrace {
  id: string;
  mode: ReasoningMode;
  nodes: ReasoningNode[];
  root_id: string;
  depth: number;
  created_at: string;
}

export interface ReasoningContext {
  id: string;
  question: string;
  language: Language;
  mode: ReasoningMode;
  domain: string;
  goals: string[];
  constraints: string[];
  seed_evidence: Evidence[];
  seed_assumptions: Assumption[];
  received_at: string;
}

export interface ReflectionReport {
  ok: boolean;
  logical_consistency: boolean;
  bias_flags: string[];
  circular_flags: string[];
  unsupported_claims: string[];
  gaps: string[];
  reasoning: string;
}

export interface ReasoningResult {
  context: ReasoningContext;
  trace: ReasoningTrace;
  evidence: Evidence[];
  assumptions: Assumption[];
  hypotheses: Hypothesis[];
  counterarguments: CounterArgument[];
  options: DecisionOption[];
  criteria: DecisionCriterion[];
  uncertainties: Uncertainty[];
  reflection: ReflectionReport;
  recommendation: ExecutiveRecommendation | null;
  confidence: ConfidenceScore;
  created_at: string;
  reasoner_version: string;
}

export interface ReasoningMetrics {
  reasonings_produced: number;
  reasonings_failed: number;
  average_latency_ms: number;
  average_depth: number;
  average_evidence_quality: number;
  average_confidence: number;
  average_decision_quality: number;
  average_reflection_pass_rate: number;
}

export interface ReasoningHealth {
  ok: boolean;
  reasoner_version: string;
  active_reasonings: number;
  last_failure_at: string | null;
  last_failure_reason: string | null;
}

export type ReasoningEventName =
  | "ReasoningStarted"
  | "EvidenceCollected"
  | "HypothesisGenerated"
  | "AlternativeGenerated"
  | "CounterArgumentGenerated"
  | "ReflectionCompleted"
  | "RecommendationGenerated"
  | "ReasoningCompleted"
  | "ReasoningFailed";

export interface ReasoningEvent {
  name: ReasoningEventName;
  context_id: string;
  ts: string;
  detail?: Record<string, unknown>;
}
