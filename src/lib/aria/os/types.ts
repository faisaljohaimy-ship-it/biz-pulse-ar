/**
 * Phase 8.9 — Executive AI Operating System (types).
 *
 * Strictly additive coordination layer over Executive Brain, Cognition,
 * Planning, Execution, Task Bus, Marketplace, Orchestrator and Memory.
 * These types describe OS-level artifacts (session, workspace, timeline,
 * artifact repository). They never redefine subsystem primitives — those
 * remain owned by their originating phase.
 */

import type { ExecutionPlan } from "../planning/types";
import type { ExecutionResult, ExecutionSession } from "../execution/types";
import type { ExecutiveBrainAnswer, BrainRequest } from "../executive-brain/types";
import type { CognitiveSession } from "../cognition/types";
import type { MissionOutcome } from "../orchestrator/types";

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export type ExecutiveSessionId = string;
export type ExecutiveWorkspaceId = string;
export type ExecutiveMissionId = string;
export type ExecutiveObjectiveId = string;
export type ExecutiveArtifactId = string;
export type ExecutiveConversationId = string;

export type Priority = "critical" | "high" | "medium" | "low";
export type ObjectiveHorizon = "operational" | "strategic" | "long_term";
export type ObjectiveStatus = "draft" | "active" | "at_risk" | "achieved" | "abandoned";

// ---------------------------------------------------------------------------
// Executive OS state
// ---------------------------------------------------------------------------

export type ExecutiveState =
  | "initializing"
  | "idle"
  | "thinking"
  | "planning"
  | "executing"
  | "reflecting"
  | "suspended"
  | "closed";

export type ExecutiveHealthLevel = "healthy" | "degraded" | "unhealthy";

export interface ExecutiveHealth {
  readonly level: ExecutiveHealthLevel;
  readonly issues: ReadonlyArray<string>;
  readonly subsystems: Readonly<Record<string, ExecutiveHealthLevel>>;
  readonly taken_at: string;
}

export interface ExecutiveMetrics {
  readonly sessions_started: number;
  readonly sessions_active: number;
  readonly missions_completed: number;
  readonly missions_failed: number;
  readonly artifacts_stored: number;
  readonly objectives_active: number;
  readonly workspaces_loaded: number;
  readonly last_updated: string;
}

// ---------------------------------------------------------------------------
// Signals / snapshots
// ---------------------------------------------------------------------------

export interface ExecutiveSignal {
  readonly kind: "info" | "warning" | "alert" | "decision" | "objective";
  readonly title: string;
  readonly detail?: string;
  readonly priority: Priority;
  readonly source: string;
  readonly ts: string;
}

export interface ExecutiveSnapshot {
  readonly session_id: ExecutiveSessionId;
  readonly workspace_id: ExecutiveWorkspaceId;
  readonly state: ExecutiveState;
  readonly health: ExecutiveHealth;
  readonly metrics: ExecutiveMetrics;
  readonly open_missions: ReadonlyArray<ExecutiveMissionId>;
  readonly recent_artifacts: ReadonlyArray<ExecutiveArtifactId>;
  readonly recent_signals: ReadonlyArray<ExecutiveSignal>;
  readonly taken_at: string;
}

// ---------------------------------------------------------------------------
// Capability descriptor (read-only view of Marketplace capabilities)
// ---------------------------------------------------------------------------

export interface ExecutiveCapability {
  readonly name: string;
  readonly agents: ReadonlyArray<string>;
  readonly healthy: boolean;
}

// ---------------------------------------------------------------------------
// Decision descriptor (Cognition-approved decision proposal)
// ---------------------------------------------------------------------------

export interface ExecutiveDecision {
  readonly id: string;
  readonly session_id: ExecutiveSessionId;
  readonly mission_id: ExecutiveMissionId | null;
  readonly summary: string;
  readonly confidence: number;
  readonly requires_human_approval: boolean;
  readonly created_at: string;
}

// ---------------------------------------------------------------------------
// Objectives
// ---------------------------------------------------------------------------

export interface ExecutiveObjective {
  readonly id: ExecutiveObjectiveId;
  readonly workspace_id: ExecutiveWorkspaceId;
  readonly title: string;
  readonly description: string;
  readonly horizon: ObjectiveHorizon;
  readonly status: ObjectiveStatus;
  readonly priority: Priority;
  readonly owner?: string;
  readonly due_at?: string;
  readonly progress: number; // 0..1
  readonly created_at: string;
  readonly updated_at: string;
}

// ---------------------------------------------------------------------------
// Artifacts (unified repository for plans, reports, evidence, files)
// ---------------------------------------------------------------------------

export type ExecutiveArtifactKind =
  | "plan"
  | "report"
  | "result"
  | "evidence"
  | "answer"
  | "reasoning"
  | "file"
  | "note";

export interface ExecutiveArtifact {
  readonly id: ExecutiveArtifactId;
  readonly workspace_id: ExecutiveWorkspaceId;
  readonly session_id: ExecutiveSessionId | null;
  readonly mission_id: ExecutiveMissionId | null;
  readonly kind: ExecutiveArtifactKind;
  readonly label: string;
  readonly summary?: string;
  readonly payload: unknown;
  readonly created_at: string;
  readonly updated_at: string;
}

// ---------------------------------------------------------------------------
// Timeline (mission history / replay)
// ---------------------------------------------------------------------------

export type ExecutiveTimelineEventKind =
  | "session_started"
  | "session_ended"
  | "workspace_loaded"
  | "workspace_saved"
  | "mission_started"
  | "mission_completed"
  | "mission_failed"
  | "mission_archived"
  | "objective_updated"
  | "artifact_created"
  | "artifact_updated"
  | "health_changed"
  | "conversation_turn";

export interface ExecutiveTimelineEvent {
  readonly seq: number;
  readonly kind: ExecutiveTimelineEventKind;
  readonly session_id: ExecutiveSessionId;
  readonly workspace_id: ExecutiveWorkspaceId;
  readonly mission_id?: ExecutiveMissionId;
  readonly detail?: Readonly<Record<string, unknown>>;
  readonly ts: string;
}

export interface ExecutiveTimeline {
  readonly session_id: ExecutiveSessionId;
  readonly events: ReadonlyArray<ExecutiveTimelineEvent>;
}

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

export interface ExecutiveConversationTurn {
  readonly role: "user" | "assistant";
  readonly text: string;
  readonly ts: string;
  readonly answer_ref?: ExecutiveArtifactId;
}

export interface ExecutiveConversation {
  readonly id: ExecutiveConversationId;
  readonly session_id: ExecutiveSessionId;
  readonly turns: ReadonlyArray<ExecutiveConversationTurn>;
  readonly started_at: string;
  readonly updated_at: string;
}

// ---------------------------------------------------------------------------
// Workspace (persistent per-executive scope)
// ---------------------------------------------------------------------------

export interface ExecutiveWorkspace {
  readonly id: ExecutiveWorkspaceId;
  readonly owner: string;
  readonly org_id: string | null;
  readonly title: string;
  readonly departments: ReadonlyArray<string>;
  readonly projects: ReadonlyArray<string>;
  readonly focus_site?: string;
  readonly created_at: string;
  readonly updated_at: string;
}

// ---------------------------------------------------------------------------
// Mission (OS view — wraps subsystem artifacts, never redefines them)
// ---------------------------------------------------------------------------

export type ExecutiveMissionState =
  | "queued"
  | "planning"
  | "cognition"
  | "executing"
  | "completed"
  | "failed"
  | "archived";

export interface ExecutiveMission {
  readonly id: ExecutiveMissionId;
  readonly session_id: ExecutiveSessionId;
  readonly workspace_id: ExecutiveWorkspaceId;
  readonly objective_id: ExecutiveObjectiveId | null;
  readonly goal: string;
  readonly lang: "ar" | "en" | "mixed";
  readonly state: ExecutiveMissionState;
  readonly started_at: string;
  readonly finished_at: string | null;
  readonly plan_artifact_id: ExecutiveArtifactId | null;
  readonly reasoning_artifact_id: ExecutiveArtifactId | null;
  readonly answer_artifact_id: ExecutiveArtifactId | null;
  readonly execution_artifact_id: ExecutiveArtifactId | null;
  readonly error?: string;
}

// ---------------------------------------------------------------------------
// Session (in-memory kernel container)
// ---------------------------------------------------------------------------

export interface ExecutiveSession {
  readonly id: ExecutiveSessionId;
  readonly workspace_id: ExecutiveWorkspaceId;
  readonly owner: string;
  readonly org_id: string | null;
  readonly conversation_id: ExecutiveConversationId;
  readonly state: ExecutiveState;
  readonly started_at: string;
  readonly last_active_at: string;
  readonly closed_at: string | null;
  readonly open_missions: ReadonlyArray<ExecutiveMissionId>;
  readonly recent_signals: ReadonlyArray<ExecutiveSignal>;
}

// ---------------------------------------------------------------------------
// Mission-execution bundle returned by the kernel
// ---------------------------------------------------------------------------

export interface ExecutiveMissionResult {
  readonly mission: ExecutiveMission;
  readonly answer: ExecutiveBrainAnswer | null;
  readonly plan: ExecutionPlan | null;
  readonly cognition: CognitiveSession | null;
  readonly execution: ExecutionResult | null;
  readonly outcome: MissionOutcome | null;
  readonly artifacts: ReadonlyArray<ExecutiveArtifact>;
}

// Re-exported so callers of the OS index can build BrainRequests without
// importing brain internals directly.
export type { BrainRequest };
