/**
 * Phase 10.1 — In-memory job queue with bounded depth.
 */
import type { Job, JobRecord } from "./types";
import type { RuntimeStateStore } from "./state.server";

export class JobQueue {
  constructor(
    private readonly store: RuntimeStateStore,
    private readonly maxDepth: number,
  ) {}

  enqueue(job: Job): JobRecord {
    if (this.store.queueDepth() >= this.maxDepth) {
      throw new Error(`Queue full: depth=${this.store.queueDepth()} max=${this.maxDepth}`);
    }
    return this.store.enqueue(job);
  }

  next(): JobRecord | undefined {
    return this.store.dequeue();
  }

  depth(): number {
    return this.store.queueDepth();
  }
}
