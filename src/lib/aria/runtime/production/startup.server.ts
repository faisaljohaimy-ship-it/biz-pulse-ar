/**
 * Phase 10.1 — Graceful startup pipeline.
 * Boot → Load config → Initialize → Register workers → Start scheduler → Accept jobs.
 */
import { validateConfig } from "./contracts";
import type { EvidenceRef, RuntimeConfig, WorkerDescriptor } from "./types";
import type { RuntimeStateStore } from "./state.server";
import type { WorkerRegistry } from "./worker.server";
import type { RuntimeAuditTrail } from "./audit.server";
import type { TelemetryBus } from "./telemetry.server";

export interface StartupInput {
  readonly config: unknown;
  readonly workers: ReadonlyArray<unknown>;
}

export interface StartupOutcome {
  readonly config: RuntimeConfig;
  readonly workers_registered: ReadonlyArray<WorkerDescriptor>;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export class RuntimeStartup {
  constructor(
    private readonly state: RuntimeStateStore,
    private readonly registry: WorkerRegistry,
    private readonly audit: RuntimeAuditTrail,
    private readonly telemetry: TelemetryBus,
  ) {}

  run(input: StartupInput): StartupOutcome {
    this.state.setPhase("booting");
    this.audit.record("boot", "Runtime boot initiated.");

    this.state.setPhase("loading_config");
    const config = validateConfig(input.config);
    this.audit.record("config", `Config loaded for ${config.runtime_id}.`);

    this.state.setPhase("initializing");
    this.telemetry.emit("runtime", "initializing", config.runtime_id);

    this.state.setPhase("registering_workers");
    const registered: WorkerDescriptor[] = [];
    for (const w of input.workers) {
      registered.push(this.registry.register(w));
    }
    this.audit.record("workers", `Registered ${registered.length} worker(s).`);

    this.state.setPhase("starting_scheduler");
    this.audit.record("scheduler", "Scheduler ready.");

    this.state.setPhase("accepting_jobs");
    this.telemetry.emit("runtime", "accepting_jobs", config.runtime_id);

    const evidence: EvidenceRef[] = [
      {
        kind: "startup",
        source: "runtime.production.startup",
        ref: config.runtime_id,
        captured_at: new Date().toISOString(),
      },
    ];

    return { config, workers_registered: registered, evidence };
  }
}
