/**
 * Phase 8.5 — Autonomous Execution Director (public server surface).
 *
 * Import from callers:
 *   import { executeMission, resumeMission, ... } from "@/lib/aria/execution";
 *
 * Strictly additive layer. Coordinates the existing Planning → Task
 * Bus → Orchestrator → Marketplace → Agents pipeline without
 * replacing, duplicating, or bypassing any of it.
 */
export {
  executeMission,
  pauseMission,
  resumeMission,
  cancelMission,
  retryMission,
  rollbackMission,
} from "./director.server";
export type { ExecuteMissionOptions } from "./director.server";

export { subscribeExecution } from "./events";
export { getSession, listSessions } from "./session.server";
export { createCheckpoint, findCheckpoint, latestCheckpoint } from "./checkpoint.server";
export { assessHealth } from "./health.server";
export { refreshMetrics, aggregateMetrics } from "./metrics.server";
export type { AggregateExecutionMetrics } from "./metrics.server";
export {
  requestApproval,
  resolveApproval,
  pendingApprovals,
} from "./approval.server";
export {
  registerPolicy,
  listPolicies,
  evaluatePolicies,
  type ExecutionRuntimePolicy,
  type PolicyViolation,
} from "./policy.server";
export { decideNext } from "./decision.server";
export { classifyError, classifyOutcome, recordFailure } from "./failure.server";
export { planRecovery } from "./recovery.server";
export { performRollback, type RollbackReport } from "./rollback.server";
export { computeProgress } from "./progress.server";

export {
  ExecuteMissionInputSchema,
  ResumeMissionInputSchema,
  PauseMissionInputSchema,
  CancelMissionInputSchema,
  RetryMissionInputSchema,
  RollbackMissionInputSchema,
  ApprovalResolutionInputSchema,
} from "./contracts";

export type {
  ExecutionApproval,
  ExecutionCheckpoint,
  ExecutionDecision,
  ExecutionDecisionKind,
  ExecutionEvent,
  ExecutionEventName,
  ExecutionFailure,
  ExecutionFailureKind,
  ExecutionHealth,
  ExecutionMetrics,
  ExecutionProgress,
  ExecutionRecovery,
  ExecutionResult,
  ExecutionSession,
  ExecutionSnapshot,
  ExecutionState,
} from "./types";
