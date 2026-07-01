/**
 * Phase 8.2 — Universal Executive Task Bus (types, server-only, internal).
 *
 * Additive on top of the Phase 8.1 Orchestrator. Every executive
 * operation flows through the bus as a Task. No UI fields.
 */
import type { AgentId, AgentResult, MissionRequest } from "../orchestrator/types";
import type { AriaIntent } from "../executive-reasoning.server";
import type { Priority } from "../executive-brain/types";

export type TaskStatus =
  | "queued"
  | "delayed"
  | "waiting_dependency"
  | "waiting_approval"
  | "dispatched"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "timed_out"
  | "merged"
  | "dead_letter";

export type TaskPriority = "critical" | "high" | "medium" | "low" | "background";

export interface TaskRetryPolicy {
  max_attempts: number;
  base_backoff_ms: number;
  factor: number;
}

export interface Task {
  taskId: string;
  missionId: string;
  parentTaskId: string | null;
  agentId: AgentId;
  intent: AriaIntent;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string | null;
  timeout: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  retryCount: number;
  dependencies: string[]; // taskIds
  approvalRequired: boolean;
  evidenceRefs: string[];
  contextSignature: string;
  memoryScope: string;
  confidence: number | null;
  businessImpact: Priority | null;
  estimatedCost: "low" | "medium" | "high";
  estimatedLatency: number;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  /** Populated when the task terminates. */
  result?: AgentResult;
  /** Reasons appended by retry/timeout/cancel/merge subsystems. */
  reasons: string[];
  /** If merged, points to the surviving canonical task. */
  mergedInto?: string;
  /** Delivered result for merged duplicates. */
  mergedFrom?: string[];
}

export interface EnqueueTaskInput {
  missionId: string;
  agentId: AgentId;
  intent: AriaIntent;
  priority?: TaskPriority;
  dependencies?: string[];
  parentTaskId?: string | null;
  approvalRequired?: boolean;
  timeout?: number;
  deadline?: string | null;
  memoryScope?: string;
  contextSignature?: string;
  estimatedCost?: "low" | "medium" | "high";
  estimatedLatency?: number;
  businessImpact?: Priority | null;
  evidenceRefs?: string[];
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  /** Optional pre-computed request the dispatcher hands to the agent. */
  request?: MissionRequest;
  /** Optional delay from now (ms) before the task becomes eligible. */
  delayMs?: number;
  retry?: Partial<TaskRetryPolicy>;
}

export type BusEventName =
  | "TaskQueued"
  | "TaskStarted"
  | "TaskCompleted"
  | "TaskFailed"
  | "TaskRetried"
  | "TaskTimedOut"
  | "TaskCancelled"
  | "TaskMerged"
  | "MissionProgressUpdated";

export interface BusEvent {
  name: BusEventName;
  taskId?: string;
  missionId: string;
  ts: string;
  detail?: Record<string, unknown>;
}

export interface BusMetricsSnapshot {
  queue_depth: number;
  delayed_depth: number;
  retry_depth: number;
  waiting_approval: number;
  running: number;
  completed: number;
  failed: number;
  cancelled: number;
  timed_out: number;
  merged: number;
  dead_letter: number;
  avg_wait_ms: number;
  avg_exec_ms: number;
  success_ratio: number;
}
