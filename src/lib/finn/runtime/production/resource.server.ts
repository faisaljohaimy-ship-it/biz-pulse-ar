/**
 * Phase 10.1 — Resource usage snapshot.
 */
import type { ResourceUsage } from "./types";
import type { RuntimeStateStore } from "./state.server";

export class ResourceMonitor {
  constructor(private readonly store: RuntimeStateStore) {}

  snapshot(): ResourceUsage {
    const workers = this.store.listWorkers();
    const running = this.store.runningSnapshot();
    const busy = new Set(running.map((r) => r.worker_id).filter(Boolean));
    return {
      workers_registered: workers.length,
      workers_busy: busy.size,
      queue_depth: this.store.queueDepth(),
      jobs_running: running.length,
      captured_at: new Date().toISOString(),
    };
  }
}
