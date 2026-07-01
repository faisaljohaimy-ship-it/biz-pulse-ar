/**
 * Phase 10.1 — Heartbeat monitor.
 */
import { validateHeartbeat } from "./contracts";
import type { Heartbeat } from "./types";
import type { RuntimeStateStore } from "./state.server";

export class HeartbeatMonitor {
  constructor(
    private readonly store: RuntimeStateStore,
    private readonly intervalMs: number,
  ) {}

  submit(input: unknown): Heartbeat {
    const hb = validateHeartbeat(input);
    this.store.recordHeartbeat(hb);
    return hb;
  }

  stale(now: number = Date.now()): ReadonlyArray<string> {
    const latest = new Map<string, Heartbeat>();
    for (const hb of this.store.latestHeartbeats()) latest.set(hb.worker_id, hb);
    const stale: string[] = [];
    for (const w of this.store.listWorkers()) {
      const last = latest.get(w.id);
      if (!last || now - Date.parse(last.at) > this.intervalMs * 3) {
        stale.push(w.id);
      }
    }
    return stale;
  }
}
