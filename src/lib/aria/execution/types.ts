/**
 * Phase 8.5 — Autonomous Execution Director (types, server-only, internal).
 *
 * Strictly additive. The Director coordinates the existing Planning
 * Engine → Task Bus → Orchestrator → Marketplace → Agents pipeline.
 * It never re-implements any of those layers, never edits Memory, and
 * never assembles ExecutiveBrainAnswer (the Orchestrator owns that).
 */
import type { MissionOutcome, MissionRequest } from "../orchestrator/types";
import type { AriaIntent } from "../executive-reasoning.server";

export type ExecutionState =
  | "created"
  | "queued"
  | "running"
  | "paused"
  | "recovering"
  | "rolling_back"
  | "awaiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

export type ExecutionHealth =
  | "healthy"
  | "degraded"
  | "recovering"
  | "blocked"
  | "critical";

export type ExecutionFailureKind =
  | "transient"
  | "permanent"
  | "policy"
  | "capability"
  | "timeout"
  | "dependency"
  | "permission";

export type ExecutionDecisionKind =
  | "continue"
  | "pause"
  | "retry"
  | "rollback"
  | "escalate"
  | "skip"
  | "abort"
  | "await_approval";

export interface ExecutionCheckpoint {
  id: string;
  session_id: string;
  stage: string;
  taken_at: string;
  completed_task_ids: string[];
  completed_agent_ids: string[];
  reasoning: string;
}

export interface ExecutionFailure {
  id: string;
  session_id: string;
  task_id: string | null;
  agent_id: string | null;
  kind: ExecutionFailureKind;
  message: string;
  retryable: boolean;
  detected_at: string;
  evidence: string[];
}

export interface ExecutionRecovery {
  id: string;
  session_id: string;
  failure_id: string;
  strategy:
    | "retry"
    | "alternative_capability"
    | "alternative_route"
    | "partial_completion"
    | "graceful_degradation"
    | "human_takeover";
  target_task_id: string | null;
  reasoning: string;
  applied_at: string;
}

export interface ExecutionDecision {
  id: string;
  session_id: string;
  kind: ExecutionDecisionKind;
  reason: string;
  ts: string;
  detail?: Record<string, unknown>;
}

export interface ExecutionProgress {
  completed: number;
  running: number;
  blocked: number;
  failed: number;
  cancelled: number;
  skipped: number;
  remaining: number;
  total: number;
  critical_path: string[];
  eta_ms: number | null;
  percent: number;
}

export interface ExecutionMetrics {
  session_id: string;
  duration_ms: number;
  task_throughput: number;
  retry_count: number;
  rollback_count: number;
  recovery_count: number;
  success_rate: number;
  critical_path_delay_ms: number;
}

export interface ExecutionApproval {
  id: string;
  session_id: string;
  task_id: string | null;
  reason: string;
  requested_at: string;
  resolved_at: string | null;
  granted: boolean | null;
  resolver?: string;
}

export interface ExecutionSession {
  session_id: string;
  mission_id: string;
  intent: AriaIntent | "question";
  state: ExecutionState;
  health: ExecutionHealth;
  request: MissionRequest;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  paused_at: string | null;
  resumed_at: string | null;
  cancelled_at: string | null;
  checkpoints: ExecutionCheckpoint[];
  decisions: ExecutionDecision[];
  failures: ExecutionFailure[];
  recoveries: ExecutionRecovery[];
  approvals: ExecutionApproval[];
  progress: ExecutionProgress;
  metrics: ExecutionMetrics;
  /** Populated when execution terminates with an Orchestrator outcome. */
  outcome: MissionOutcome | null;
  reasons: string[];
}

export interface ExecutionSnapshot {
  session_id: string;
  state: ExecutionState;
  health: ExecutionHealth;
  progress: ExecutionProgress;
  last_decision: ExecutionDecision | null;
  last_failure: ExecutionFailure | null;
  taken_at: string;
}

export interface ExecutionResult {
  session_id: string;
  mission_id: string;
  state: ExecutionState;
  health: ExecutionHealth;
  outcome: MissionOutcome | null;
  progress: ExecutionProgress;
  metrics: ExecutionMetrics;
  checkpoints: ExecutionCheckpoint[];
  failures: ExecutionFailure[];
  recoveries: ExecutionRecovery[];
  decisions: ExecutionDecision[];
  approvals: ExecutionApproval[];
  duration_ms: number;
}

export type ExecutionEventName =
  | "MissionStarted"
  | "MissionPaused"
  | "MissionResumed"
  | "MissionCompleted"
  | "MissionFailed"
  | "TaskStarted"
  | "TaskCompleted"
  | "TaskFailed"
  | "RetryScheduled"
  | "RollbackStarted"
  | "RollbackCompleted"
  | "ApprovalRequested"
  | "ApprovalGranted"
  | "ApprovalRejected"
  | "ExecutionCancelled"
  | "CheckpointTaken"
  | "HealthChanged"
  | "ProgressUpdated";

export interface ExecutionEvent {
  name: ExecutionEventName;
  session_id: string;
  mission_id: string;
  ts: string;
  detail?: Record<string, unknown>;
}
