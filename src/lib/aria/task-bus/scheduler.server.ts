/**
 * Scheduler — the Task Bus main loop for a mission.
 *
 * Responsibilities:
 *   • Enqueue tasks (with dedupe, delay, dependency, approval routing)
 *   • Drain ready tasks respecting priority + DAG
 *   • Dispatch in parallel via the Dispatcher
 *   • Retry with exponential backoff
 *   • Handle timeouts, cancellation, and dead-letter routing
 *   • Emit lifecycle events + metrics
 *
 * The Orchestrator is the sole consumer of scheduler output — the
 * scheduler never assembles `ExecutiveBrainAnswer` itself.
 */
import type { AgentResult, MissionRequest } from "../orchestrator/types";
import type { ExecutiveBrainMemory } from "../executive-brain/types";
import type { AriaIntent } from "../executive-reasoning.server";
import type {
  EnqueueTaskInput,
  Task,
  TaskPriority,
  TaskRetryPolicy,
} from "./types";
import {
  depths,
  detectCycle,
  disposeMission,
  drainReady,
  enqueueApproval,
  enqueueDelayed,
  enqueueMain,
  enqueueRetry,
  hasWork,
  listTasks,
  markFinishedFromRunning,
  markRunning,
  pushCancelled,
  pushCompleted,
  pushDeadLetter,
  registerTask,
} from "./queue.server";
import { dispatchTask } from "./dispatcher.server";
import { emitBusEvent } from "./events";
import { findDuplicate } from "./dedupe.server";
import { inherit } from "./priority.server";
import { abortableDelay, DEFAULT_RETRY, nextBackoffMs, shouldRetry } from "./retry.server";
import { recordTaskEnd, recordTaskStart, snapshotMetrics } from "./metrics.server";
import type { BusMetricsSnapshot } from "./types";

function nowIso(): string {
  return new Date().toISOString();
}

function newTaskId(): string {
  return `tsk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildTask(input: EnqueueTaskInput, parent: Task | null): Task {
  const priority: TaskPriority = inherit(input.priority ?? "medium", parent?.priority);
  return {
    taskId: newTaskId(),
    missionId: input.missionId,
    parentTaskId: input.parentTaskId ?? parent?.taskId ?? null,
    agentId: input.agentId,
    intent: input.intent,
    priority,
    status: "queued",
    deadline: input.deadline ?? null,
    timeout: input.timeout ?? Math.max(3_000, input.estimatedLatency ?? 8_000),
    createdAt: nowIso(),
    startedAt: null,
    completedAt: null,
    retryCount: 0,
    dependencies: input.dependencies ?? [],
    approvalRequired: input.approvalRequired ?? false,
    evidenceRefs: input.evidenceRefs ?? [],
    contextSignature: input.contextSignature ?? "",
    memoryScope: input.memoryScope ?? input.missionId,
    confidence: null,
    businessImpact: input.businessImpact ?? null,
    estimatedCost: input.estimatedCost ?? "low",
    estimatedLatency: input.estimatedLatency ?? 1_000,
    payload: input.payload ?? {},
    metadata: input.metadata ?? {},
    reasons: [],
  };
}

export interface SchedulerRunOptions {
  request: MissionRequest;
  memory: ExecutiveBrainMemory | null;
  signal: AbortSignal;
  apiKey?: string;
  /**
   * Approval gate. Return true to release a task from the approval queue.
   * When omitted, tasks marked `approvalRequired` are auto-released
   * (dev/testing default).
   */
  approvalGate?: (task: Task) => boolean;
  /** Global retry defaults (per-task retry policy overrides this). */
  retry?: Partial<TaskRetryPolicy>;
  /** Loop tick — ms between drain passes when waiting on delays. */
  tickMs?: number;
}

export interface SchedulerRunResult {
  missionId: string;
  tasks: Task[];
  results: AgentResult[];
  metrics: BusMetricsSnapshot;
  cycle: string[] | null;
  cancelled: boolean;
}

export class Scheduler {
  private readonly missionId: string;
  private readonly opts: SchedulerRunOptions;
  private readonly retryPolicy: TaskRetryPolicy;
  private readonly results: AgentResult[] = [];

  constructor(missionId: string, opts: SchedulerRunOptions) {
    this.missionId = missionId;
    this.opts = opts;
    this.retryPolicy = { ...DEFAULT_RETRY, ...(opts.retry ?? {}) };
  }

  /** Public API — enqueue a task. Dedupe merges duplicates. */
  enqueue(input: EnqueueTaskInput, parent: Task | null = null): Task {
    const built = buildTask({ ...input, missionId: this.missionId }, parent);
    const dup = findDuplicate(built, listTasks(this.missionId));
    if (dup) {
      built.status = "merged";
      built.mergedInto = dup.taskId;
      built.completedAt = nowIso();
      dup.mergedFrom = [...(dup.mergedFrom ?? []), built.taskId];
      registerTask(built);
      recordTaskEnd(built);
      emitBusEvent("TaskMerged", this.missionId, built.taskId, { into: dup.taskId });
      return built;
    }

    registerTask(built);

    if (input.approvalRequired && !this.opts.approvalGate?.(built)) {
      built.status = "waiting_approval";
      enqueueApproval(built);
      emitBusEvent("TaskQueued", this.missionId, built.taskId, { status: "waiting_approval" });
      return built;
    }

    if (input.delayMs && input.delayMs > 0) {
      built.status = "delayed";
      enqueueDelayed(built, Date.now() + input.delayMs);
      emitBusEvent("TaskQueued", this.missionId, built.taskId, { delayMs: input.delayMs });
      return built;
    }

    if (built.dependencies.length) built.status = "waiting_dependency";
    enqueueMain(built);
    emitBusEvent("TaskQueued", this.missionId, built.taskId, { priority: built.priority });
    return built;
  }

  /** Run until every enqueued task terminates or the signal aborts. */
  async run(): Promise<SchedulerRunResult> {
    const cycle = detectCycle(this.missionId);
    if (cycle) {
      // Fail every task in the cycle gracefully instead of throwing.
      for (const id of cycle) {
        const t = listTasks(this.missionId).find((x) => x.taskId === id);
        if (t && t.status !== "completed") {
          t.status = "failed";
          t.completedAt = nowIso();
          t.reasons.push("dependency cycle");
          pushDeadLetter(t);
          emitBusEvent("TaskFailed", this.missionId, t.taskId, { reason: "cycle" });
          recordTaskEnd(t);
        }
      }
    }

    const tickMs = this.opts.tickMs ?? 25;
    let cancelled = false;

    while (hasWork(this.missionId)) {
      if (this.opts.signal.aborted) {
        cancelled = true;
        this.cancelAllPending();
        break;
      }
      const ready = drainReady(this.missionId, Date.now());
      if (!ready.length) {
        await abortableDelay(tickMs, this.opts.signal);
        continue;
      }
      await Promise.all(ready.map((t) => this.execute(t)));
      emitBusEvent("MissionProgressUpdated", this.missionId, undefined, {
        depths: depths(this.missionId),
      });
    }

    return {
      missionId: this.missionId,
      tasks: listTasks(this.missionId),
      results: this.results.slice(),
      metrics: snapshotMetrics(depths(this.missionId)),
      cycle,
      cancelled,
    };
  }

  private async execute(task: Task): Promise<void> {
    task.status = "running";
    task.startedAt = nowIso();
    markRunning(task);
    recordTaskStart(task);
    emitBusEvent("TaskStarted", this.missionId, task.taskId, { agent: task.agentId });

    const result = await dispatchTask(
      task,
      {
        request: this.opts.request,
        memory: this.opts.memory,
        priorResults: this.results.slice(),
        apiKey: this.opts.apiKey,
      },
      this.opts.signal,
    );

    task.result = result;
    task.completedAt = nowIso();
    markFinishedFromRunning(task);

    if (result.ok) {
      task.status = "completed";
      task.confidence = result.contribution.confidence?.overall ?? task.confidence;
      pushCompleted(task);
      this.results.push(result);
      recordTaskEnd(task);
      emitBusEvent("TaskCompleted", this.missionId, task.taskId, { agent: task.agentId });
      return;
    }

    if (result.status === "timeout") {
      emitBusEvent("TaskTimedOut", this.missionId, task.taskId, { agent: task.agentId });
    } else {
      emitBusEvent("TaskFailed", this.missionId, task.taskId, {
        agent: task.agentId,
        error: result.error ?? "unknown",
      });
    }

    if (this.opts.signal.aborted) {
      task.status = "cancelled";
      pushCancelled(task);
      this.results.push(result);
      recordTaskEnd(task);
      emitBusEvent("TaskCancelled", this.missionId, task.taskId);
      return;
    }

    if (shouldRetry(task, this.retryPolicy)) {
      task.retryCount += 1;
      task.reasons.push(result.error ?? result.status);
      const delay = nextBackoffMs(this.retryPolicy, task.retryCount);
      task.status = "queued";
      task.startedAt = null;
      task.completedAt = null;
      enqueueRetry(task, Date.now() + delay);
      emitBusEvent("TaskRetried", this.missionId, task.taskId, { attempt: task.retryCount, delay });
      return;
    }

    task.status = result.status === "timeout" ? "timed_out" : "failed";
    pushDeadLetter(task);
    this.results.push(result);
    recordTaskEnd(task);
  }

  private cancelAllPending(): void {
    for (const t of listTasks(this.missionId)) {
      if (
        t.status === "queued" ||
        t.status === "delayed" ||
        t.status === "waiting_dependency" ||
        t.status === "waiting_approval" ||
        t.status === "running"
      ) {
        t.status = "cancelled";
        t.completedAt = nowIso();
        pushCancelled(t);
        emitBusEvent("TaskCancelled", this.missionId, t.taskId);
        recordTaskEnd(t);
      }
    }
  }
}

/**
 * Convenience — run a mission with a preset list of enqueued tasks.
 * Callers build the schedule (typically the Orchestrator) and hand it here.
 */
export async function runScheduledMission(
  missionId: string,
  opts: SchedulerRunOptions,
  seed: (enqueue: (i: EnqueueTaskInput) => Task) => void,
): Promise<SchedulerRunResult> {
  const scheduler = new Scheduler(missionId, opts);
  seed((i) => scheduler.enqueue({ ...i, missionId }));
  try {
    return await scheduler.run();
  } finally {
    disposeMission(missionId);
  }
}

/** Re-export for external convenience — the intent type used in tasks. */
export type { AriaIntent };
