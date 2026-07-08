/**
 * Phase 8.9 — Executive AI Operating System (public server surface).
 *
 * Strictly additive layer. Coordinates existing subsystems (Executive
 * Brain, Cognition, Planning, Execution Director, Task Bus, Marketplace,
 * Orchestrator, Memory). Never bypasses any of them. Never duplicates
 * their logic. Never mutates their state directly.
 *
 * Import from callers:
 *   import {
 *     startExecutiveSession,
 *     continueExecutiveSession,
 *     restoreExecutiveSession,
 *     finishExecutiveSession,
 *   } from "@/lib/aria/os";
 */

// ---------------------------------------------------------------------------
// Kernel (session lifecycle)
// ---------------------------------------------------------------------------

export {
  startSession as startExecutiveSession,
  continueSession as continueExecutiveSession,
  restoreSession as restoreExecutiveSession,
  finishSession as finishExecutiveSession,
  getSession as getExecutiveSession,
  listSessions as listExecutiveSessions,
  snapshotSession as snapshotExecutiveSession,
} from "./os.server";

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

export { loadWorkspace, getWorkspace, saveWorkspace, listWorkspaces } from "./workspace.server";

// ---------------------------------------------------------------------------
// Objectives
// ---------------------------------------------------------------------------

export { createObjective, updateObjective, getObjective, listObjectives } from "./objective.server";

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

export { storeArtifact, updateArtifact, getArtifact, listArtifacts } from "./artifact.server";

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------

export { getTimeline, replayTimeline } from "./timeline.server";

// ---------------------------------------------------------------------------
// Conversation
// ---------------------------------------------------------------------------

export {
  openConversation,
  appendTurn,
  getConversation,
  stitchHistory,
  composeBrainRequest,
} from "./conversation.server";

// ---------------------------------------------------------------------------
// Coordination (single-mission entrypoint used by the kernel)
// ---------------------------------------------------------------------------

export { coordinateMission } from "./coordination.server";
export type { CoordinateMissionArgs } from "./coordination.server";

// ---------------------------------------------------------------------------
// Health & metrics
// ---------------------------------------------------------------------------

export { evaluateOSHealth } from "./health.server";
export { snapshotMetrics as snapshotOSMetrics } from "./metrics.server";

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export { subscribeOS, emitOSEvent } from "./events";
export type { ExecutiveOSEvent, ExecutiveOSEventName } from "./events";

// ---------------------------------------------------------------------------
// Contracts (zod)
// ---------------------------------------------------------------------------

export {
  StartSessionInputSchema,
  ContinueSessionInputSchema,
  FinishSessionInputSchema,
  RestoreSessionInputSchema,
  CreateObjectiveInputSchema,
  UpdateObjectiveInputSchema,
  CreateArtifactInputSchema,
} from "./contracts";
export type {
  StartSessionInput,
  ContinueSessionInput,
  FinishSessionInput,
  RestoreSessionInput,
  CreateObjectiveInput,
  UpdateObjectiveInput,
  CreateArtifactInput,
} from "./contracts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type {
  BrainRequest,
  ExecutiveArtifact,
  ExecutiveArtifactId,
  ExecutiveArtifactKind,
  ExecutiveCapability,
  ExecutiveConversation,
  ExecutiveConversationId,
  ExecutiveConversationTurn,
  ExecutiveDecision,
  ExecutiveHealth,
  ExecutiveHealthLevel,
  ExecutiveMetrics,
  ExecutiveMission,
  ExecutiveMissionId,
  ExecutiveMissionResult,
  ExecutiveMissionState,
  ExecutiveObjective,
  ExecutiveObjectiveId,
  ExecutiveSession,
  ExecutiveSessionId,
  ExecutiveSignal,
  ExecutiveSnapshot,
  ExecutiveState,
  ExecutiveTimeline,
  ExecutiveTimelineEvent,
  ExecutiveTimelineEventKind,
  ExecutiveWorkspace,
  ExecutiveWorkspaceId,
  ObjectiveHorizon,
  ObjectiveStatus,
  Priority,
} from "./types";
