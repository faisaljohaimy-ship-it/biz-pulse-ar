/**
 * Phase 10.1 — Crash recovery.
 * Restores runtime state from the latest checkpoint. If no checkpoint
 * exists, recovery status is UNKNOWN.
 */
import type { EvidenceRef, RecoveryOutcome } from "./types";
import type { CheckpointStore } from "./checkpoint.server";
import type { RuntimeStateStore } from "./state.server";

export class CrashRecovery {
  constructor(
    private readonly checkpoints: CheckpointStore,
    private readonly state: RuntimeStateStore,
  ) {}

  recover(): RecoveryOutcome {
    const latest = this.checkpoints.latest();
    if (!latest) {
      return {
        recovered: false,
        reason: "No checkpoint available; recovery UNKNOWN.",
        evidence: [],
      };
    }
    const restoredJobs = latest.jobs;
    const queue = restoredJobs.filter((r) => r.status === "queued");
    const running = restoredJobs
      .filter((r) => r.status === "running")
      .map((r) => ({ ...r, status: "queued" as const })); // requeue in-flight
    const history = restoredJobs.filter(
      (r) => r.status === "succeeded" || r.status === "failed" || r.status === "cancelled",
    );
    this.state.restore({
      runtime_id: latest.runtime_id,
      phase: "initializing",
      workers: latest.workers,
      queue: [...queue, ...running],
      running: [],
      history,
      heartbeats: [],
      sessions: [],
    });
    const evidence: EvidenceRef[] = [
      {
        kind: "recovery",
        source: "runtime.production.recovery",
        ref: latest.id,
        captured_at: new Date().toISOString(),
      },
    ];
    return {
      recovered: true,
      restored_from: latest.id,
      reason: `Restored from checkpoint ${latest.id}.`,
      evidence,
    };
  }
}
