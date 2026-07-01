/**
 * Phase 8.4 — Autonomous Planning & Mission Engine types.
 * Server-only. Strictly additive. The Planner never executes agents;
 * it produces validated, optimized, executable plans consumed by the
 * existing Orchestrator + Task Bus.
 */
import type { AgentId } from "../orchestrator/types";
import type { CapabilityKey } from "../marketplace/types";

// ---------------------------------------------------------------------------
// Goals & objectives
// ---------------------------------------------------------------------------

export type Priority = "critical" | "high" | "medium" | "low";
export type Language = "ar" | "en" | "mixed";

export interface MissionGoal {
  id: string;
  raw_utterance: string;
  language: Language;
  intent: string;
  domain: string;
  priority: Priority;
  deadline_ms?: number;
  requested_by?: string;
  received_at: string;
  reasoning: string;
}

export interface MissionObjective {
  id: string;
  goal_id: string;
  title: string;
  description: string;
  deliverables: string[];
  acceptance_criteria: string[];
  priority: Priority;
  reasoning: string;
}

export interface MissionConstraint {
  id: string;
  kind:
    | "budget"
    | "permission"
    | "policy"
    | "deadline"
    | "time"
    | "cpu"
    | "tokens"
    | "memory"
    | "priority"
    | "human_approval"
    | "compliance";
  value: string | number;
  hard: boolean;
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Mission tree (decomposition output)
// ---------------------------------------------------------------------------

export type GoalNodeKind = "goal" | "objective" | "task" | "subtask" | "atomic";

export interface GoalNode {
  id: string;
  kind: GoalNodeKind;
  title: string;
  description: string;
  parent_id: string | null;
  children_ids: string[];
  depth: number;
  /** Capability required for atomic nodes. Non-atomic nodes carry null. */
  capability: CapabilityKey | null;
  reasoning: string;
}

export interface MissionTree {
  mission_id: string;
  root_id: string;
  nodes: Record<string, GoalNode>;
  depth: number;
  atomic_ids: string[];
}

// ---------------------------------------------------------------------------
// Strategy, stages, execution graph
// ---------------------------------------------------------------------------

export type MissionStrategy =
  | "sequential"
  | "parallel"
  | "hybrid"
  | "iterative"
  | "approval_based"
  | "exploration"
  | "optimization"
  | "recovery";

export interface MissionStage {
  id: string;
  order: number;
  strategy: MissionStrategy;
  node_ids: string[];
  reasoning: string;
}

export interface ExecutionEdge {
  from: string;
  to: string;
  reason: string;
}

export interface ExecutionGraph {
  nodes: string[];
  edges: ExecutionEdge[];
  layers: string[][];
  critical_path: string[];
}

// ---------------------------------------------------------------------------
// Routing / capabilities (planner ↔ marketplace bridge)
// ---------------------------------------------------------------------------

export interface CapabilityBinding {
  node_id: string;
  capability: CapabilityKey;
  resolved_agent: AgentId | null;
  score: number;
  match_kind: "exact" | "synonym" | "tag" | "semantic" | "unresolved";
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Estimation / risk / recovery
// ---------------------------------------------------------------------------

export interface Estimation {
  duration_ms: number;
  cost_units: number;
  tokens: number;
  retries_expected: number;
  failure_probability: number;
  confidence: number;
  reasoning: string;
}

export interface RiskFactor {
  id: string;
  kind:
    | "single_point_failure"
    | "missing_capability"
    | "dependency_risk"
    | "permission_risk"
    | "timeout_risk"
    | "deadlock_risk"
    | "budget_risk"
    | "policy_risk";
  severity: "low" | "medium" | "high" | "critical";
  node_id?: string;
  evidence: string[];
  reasoning: string;
}

export interface RecoveryOption {
  id: string;
  target_node_id: string;
  strategy:
    | "retry"
    | "fallback_capability"
    | "alternative_path"
    | "graceful_degradation"
    | "rollback"
    | "human_takeover";
  alternative_capability?: CapabilityKey;
  reasoning: string;
}

export interface RollbackStep {
  node_id: string;
  action: string;
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Approval, verification, decisions
// ---------------------------------------------------------------------------

export type ApprovalMode =
  | "required"
  | "optional"
  | "auto_approved"
  | "conditional";

export interface ApprovalGate {
  id: string;
  node_id: string;
  mode: ApprovalMode;
  condition?: string;
  reasoning: string;
}

export interface VerificationIssue {
  code: string;
  message: string;
  node_id?: string;
  fatal: boolean;
}

export interface VerificationReport {
  ok: boolean;
  issues: VerificationIssue[];
  covered_objective_ids: string[];
  missing_objective_ids: string[];
}

export interface PlanningDecision {
  id: string;
  stage:
    | "goal_parsing"
    | "decomposition"
    | "dependency"
    | "routing"
    | "strategy"
    | "constraint"
    | "optimization"
    | "risk"
    | "recovery"
    | "reflection"
    | "verification"
    | "approval";
  summary: string;
  reasoning: string;
  evidence: string[];
  confidence: number;
  ts: string;
}

// ---------------------------------------------------------------------------
// Execution plan (final artefact consumed by the Orchestrator)
// ---------------------------------------------------------------------------

export interface SuccessCriterion {
  id: string;
  description: string;
  reasoning: string;
}

export interface ExecutionPlan {
  mission_id: string;
  goal: MissionGoal;
  objectives: MissionObjective[];
  constraints: MissionConstraint[];
  tree: MissionTree;
  graph: ExecutionGraph;
  stages: MissionStage[];
  bindings: CapabilityBinding[];
  strategy: MissionStrategy;
  success_criteria: SuccessCriterion[];
  approvals: ApprovalGate[];
  risks: RiskFactor[];
  recovery: RecoveryOption[];
  rollback: RollbackStep[];
  estimation: Estimation;
  verification: VerificationReport;
  decisions: PlanningDecision[];
  created_at: string;
  planner_version: string;
}

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

export interface PlanningMetrics {
  plans_produced: number;
  plans_failed: number;
  average_latency_ms: number;
  average_tree_depth: number;
  average_optimization_gain: number;
  average_risk_score: number;
  average_confidence: number;
  average_estimated_cost: number;
  average_estimated_duration_ms: number;
}

export interface PlanningHealth {
  ok: boolean;
  planner_version: string;
  active_plans: number;
  last_failure_at: string | null;
  last_failure_reason?: string;
}

export type PlanningEventName =
  | "GoalReceived"
  | "PlanningStarted"
  | "GoalParsed"
  | "ObjectivesCreated"
  | "MissionExpanded"
  | "DependenciesBuilt"
  | "StrategyChosen"
  | "OptimizationFinished"
  | "RiskCalculated"
  | "RecoveryGenerated"
  | "VerificationPassed"
  | "ApprovalRequired"
  | "PlanningCompleted"
  | "PlanningFailed";

export interface PlanningEvent {
  name: PlanningEventName;
  mission_id: string;
  ts: string;
  detail?: Record<string, unknown>;
}
