/**
 * Phase 8.2 — Universal Executive Task Bus (public server surface).
 *
 * Additive layer used by the Phase 8.1 Orchestrator. No UI, no endpoints,
 * no duplicate orchestration. The Orchestrator is the sole assembler of
 * `ExecutiveBrainAnswer`.
 */
export { Scheduler, runScheduledMission } from "./scheduler.server";
export type { SchedulerRunOptions, SchedulerRunResult } from "./scheduler.server";
export { dispatchTask } from "./dispatcher.server";
export {
  registerTask,
  listTasks,
  getTask,
  detectCycle,
  depths,
  disposeMission,
} from "./queue.server";
export { taskSignature, findDuplicate } from "./dedupe.server";
export { subscribeBus, emitBusEvent } from "./events";
export { snapshotMetrics } from "./metrics.server";
export { EnqueueTaskInputSchema, TaskPrioritySchema } from "./contracts";
export type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskRetryPolicy,
  EnqueueTaskInput,
  BusEvent,
  BusEventName,
  BusMetricsSnapshot,
} from "./types";
export type { TaskExecutor, TaskExecutionContext } from "./task.interface";
