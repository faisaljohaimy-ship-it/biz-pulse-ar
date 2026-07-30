/**
 * Phase 10.1 — Checkpoint capture and restore.
 */
import type { Checkpoint, RuntimeConfig } from "./types";
import type { RuntimeStateStore } from "./state.server";
import type { ResourceMonitor } from "./resource.server";

export class CheckpointStore {
  private readonly checkpoints: Checkpoint[] = [];

  constructor(
    private readonly config: RuntimeConfig,
    private readonly state: RuntimeStateStore,
    private readonly resources: ResourceMonitor,
  ) {}

  capture(): Checkpoint | undefined {
    if (!this.config.checkpoint_enabled) return undefined;
    const snap = this.state.snapshot();
    const cp: Checkpoint = {
      id: `CKPT-${this.checkpoints.length + 1}`,
      runtime_id: this.config.runtime_id,
      phase: snap.phase,
      captured_at: new Date().toISOString(),
      jobs: [...snap.queue, ...snap.running, ...snap.history],
      workers: snap.workers,
      usage: this.resources.snapshot(),
    };
    this.checkpoints.push(cp);
    if (this.checkpoints.length > 32) this.checkpoints.shift();
    return cp;
  }

  latest(): Checkpoint | undefined {
    return this.checkpoints.at(-1);
  }

  list(): ReadonlyArray<Checkpoint> {
    return this.checkpoints.slice();
  }
}
