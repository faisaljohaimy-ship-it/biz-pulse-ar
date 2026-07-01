/**
 * Phase 10.1 — Graceful shutdown pipeline.
 * Drain → cancel in-flight → checkpoint → stopped.
 */
import type { EvidenceRef } from "./types";
import type { RuntimeStateStore } from "./state.server";
import type { CheckpointStore } from "./checkpoint.server";
import type { RuntimeAuditTrail } from "./audit.server";
import type { TelemetryBus } from "./telemetry.server";

export interface ShutdownOutcome {
  readonly drained_queue: number;
  readonly cancelled_running: number;
  readonly checkpoint_id?: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export class RuntimeShutdown {
  constructor(
    private readonly state: RuntimeStateStore,
    private readonly checkpoints: CheckpointStore,
    private readonly audit: RuntimeAuditTrail,
    private readonly telemetry: TelemetryBus,
  ) {}

  run(): ShutdownOutcome {
    this.state.setPhase("draining");
    this.telemetry.emit("runtime", "draining", "shutdown started");

    const queueBefore = this.state.queueSnapshot().length;
    const runningBefore = this.state.runningSnapshot();
    for (const r of runningBefore) {
      this.state.finish(r.job.id, "cancelled", undefined, "runtime shutdown");
    }

    const cp = this.checkpoints.capture();
    this.state.setPhase("stopped");
    this.audit.record(
      "shutdown",
      `Drained queue=${queueBefore} cancelled=${runningBefore.length}` +
        (cp ? ` checkpoint=${cp.id}` : ""),
    );

    const evidence: EvidenceRef[] = [
      {
        kind: "shutdown",
        source: "runtime.production.shutdown",
        captured_at: new Date().toISOString(),
      },
    ];

    return {
      drained_queue: queueBefore,
      cancelled_running: runningBefore.length,
      checkpoint_id: cp?.id,
      evidence,
    };
  }
}
