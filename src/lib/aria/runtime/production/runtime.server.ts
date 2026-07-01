/**
 * Phase 10.1 — Production Runtime kernel.
 * Wires state, queue, workers, dispatcher, scheduler, heartbeats,
 * sessions, health, checkpoints, and recovery into one runtime instance.
 */
import { RuntimeStateStore } from "./state.server";
import { RuntimeAuditTrail } from "./audit.server";
import { TelemetryBus } from "./telemetry.server";
import { WorkerRegistry } from "./worker.server";
import { JobQueue } from "./queue.server";
import { Dispatcher, type JobExecutor } from "./dispatcher.server";
import { Scheduler } from "./scheduler.server";
import { HeartbeatMonitor } from "./heartbeat.server";
import { SessionManager } from "./session.server";
import { ResourceMonitor } from "./resource.server";
import { HealthChecker } from "./health.server";
import { RuntimeMonitor } from "./monitor.server";
import { CheckpointStore } from "./checkpoint.server";
import { CrashRecovery } from "./crash-recovery.server";
import { RuntimeStartup, type StartupInput, type StartupOutcome } from "./startup.server";
import { RuntimeShutdown, type ShutdownOutcome } from "./shutdown.server";
import { validateConfig, validateJob } from "./contracts";
import { verifyRuntime, type VerificationResult } from "./verification.server";
import type {
  Job,
  JobRecord,
  MetricSample,
  RecoveryOutcome,
  RuntimeConfig,
  Session,
  WorkerDescriptor,
} from "./types";

export interface RuntimeHandle {
  readonly config: RuntimeConfig;
  readonly state: RuntimeStateStore;
  readonly queue: JobQueue;
  readonly workers: WorkerRegistry;
  readonly dispatcher: Dispatcher;
  readonly scheduler: Scheduler;
  readonly heartbeats: HeartbeatMonitor;
  readonly sessions: SessionManager;
  readonly resources: ResourceMonitor;
  readonly health: HealthChecker;
  readonly monitor: RuntimeMonitor;
  readonly checkpoints: CheckpointStore;
  readonly recovery: CrashRecovery;
  readonly telemetry: TelemetryBus;
  readonly audit: RuntimeAuditTrail;
  readonly startup: RuntimeStartup;
  readonly shutdown: RuntimeShutdown;

  submit(job: unknown): JobRecord;
  tick(executor: JobExecutor, maxPerTick?: number): Promise<{
    dispatched: number;
    skipped: number;
    executed_at: string;
  }>;
  openSession(principal: string): Session;
  closeSession(id: string): void;
  registerWorker(w: unknown): WorkerDescriptor;
  metrics(): ReadonlyArray<MetricSample>;
  verify(): VerificationResult;
  recover(): RecoveryOutcome;
}

export function createRuntime(rawConfig: unknown): RuntimeHandle {
  const config = validateConfig(rawConfig);
  const state = new RuntimeStateStore(config.runtime_id);
  const audit = new RuntimeAuditTrail();
  const telemetry = new TelemetryBus();
  const workers = new WorkerRegistry(state, config.max_workers);
  const queue = new JobQueue(state, config.max_queue_depth);
  const dispatcher = new Dispatcher(state, telemetry);
  const scheduler = new Scheduler(queue, dispatcher, config.job_timeout_ms);
  const heartbeats = new HeartbeatMonitor(state, config.heartbeat_interval_ms);
  const sessions = new SessionManager(state);
  const resources = new ResourceMonitor(state);
  const health = new HealthChecker(
    state,
    heartbeats,
    resources,
    config.max_queue_depth,
  );
  const monitor = new RuntimeMonitor(health, state, telemetry);
  const checkpoints = new CheckpointStore(config, state, resources);
  const recovery = new CrashRecovery(checkpoints, state);
  const startup = new RuntimeStartup(state, workers, audit, telemetry);
  const shutdown = new RuntimeShutdown(state, checkpoints, audit, telemetry);

  const handle: RuntimeHandle = {
    config,
    state,
    queue,
    workers,
    dispatcher,
    scheduler,
    heartbeats,
    sessions,
    resources,
    health,
    monitor,
    checkpoints,
    recovery,
    telemetry,
    audit,
    startup,
    shutdown,
    submit(jobInput: unknown): JobRecord {
      const job: Job = validateJob(jobInput);
      return queue.enqueue(job);
    },
    async tick(executor: JobExecutor, maxPerTick = 8) {
      return scheduler.tick(executor, maxPerTick);
    },
    openSession(principal: string) {
      return sessions.open(principal);
    },
    closeSession(id: string) {
      sessions.close(id);
    },
    registerWorker(w: unknown) {
      return workers.register(w);
    },
    metrics() {
      return monitor.report().metrics;
    },
    verify() {
      return verifyRuntime(state.snapshot(), health.check());
    },
    recover() {
      return recovery.recover();
    },
  };

  return handle;
}

export function runStartup(
  handle: RuntimeHandle,
  input: StartupInput,
): StartupOutcome {
  return handle.startup.run(input);
}

export function runShutdown(handle: RuntimeHandle): ShutdownOutcome {
  return handle.shutdown.run();
}
