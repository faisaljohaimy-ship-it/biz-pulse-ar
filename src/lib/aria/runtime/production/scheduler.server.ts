/**
 * Phase 10.1 — Cooperative scheduler.
 * Drains the queue by dispatching one job per tick. Caller controls
 * pacing (Worker/edge-friendly — no timers held open).
 */
import type { JobExecutor, Dispatcher } from "./dispatcher.server";
import type { JobQueue } from "./queue.server";

export interface SchedulerTickResult {
  readonly dispatched: number;
  readonly skipped: number;
  readonly executed_at: string;
}

export class Scheduler {
  constructor(
    private readonly queue: JobQueue,
    private readonly dispatcher: Dispatcher,
    private readonly jobTimeoutMs: number,
  ) {}

  async tick(
    executor: JobExecutor,
    maxDispatchPerTick: number = 8,
  ): Promise<SchedulerTickResult> {
    let dispatched = 0;
    let skipped = 0;
    for (let i = 0; i < maxDispatchPerTick; i += 1) {
      const record = this.queue.next();
      if (!record) break;
      const now = Date.now();
      if (
        record.job.not_before &&
        Date.parse(record.job.not_before) > now
      ) {
        // re-enqueue by pushing back to head-of-queue via store.enqueue
        // simplest: skip and let caller re-submit
        skipped += 1;
        continue;
      }
      const finished = await this.dispatcher.dispatch(
        record,
        executor,
        this.jobTimeoutMs,
      );
      if (finished) dispatched += 1;
      else skipped += 1;
    }
    return {
      dispatched,
      skipped,
      executed_at: new Date().toISOString(),
    };
  }
}
