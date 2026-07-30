/**
 * Phase 10.1 — Production Runtime Activation
 * Types.
 */

export type RuntimePhase =
  | "idle"
  | "booting"
  | "loading_config"
  | "initializing"
  | "registering_workers"
  | "starting_scheduler"
  | "accepting_jobs"
  | "draining"
  | "stopped"
  | "crashed";

export type JobStatus =
  | "queued"
  | "dispatched"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled"
  | "unknown";

export type Health = "healthy" | "degraded" | "unhealthy" | "unknown";

export interface EvidenceRef {
  readonly kind:
    | "config"
    | "startup"
    | "shutdown"
    | "dispatch"
    | "worker"
    | "queue"
    | "health"
    | "heartbeat"
    | "checkpoint"
    | "state"
    | "resource"
    | "audit"
    | "metric"
    | "recovery"
    | "session";
  readonly source: string;
  readonly ref?: string;
  readonly captured_at: string;
}

export interface RuntimeConfig {
  readonly runtime_id: string;
  readonly max_workers: number;
  readonly max_queue_depth: number;
  readonly heartbeat_interval_ms: number;
  readonly job_timeout_ms: number;
  readonly checkpoint_enabled: boolean;
}

export interface WorkerDescriptor {
  readonly id: string;
  readonly kind: string;
  readonly concurrency: number;
  readonly registered_at: string;
}

export interface Job {
  readonly id: string;
  readonly kind: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly enqueued_at: string;
  readonly not_before?: string;
}

export interface JobRecord {
  readonly job: Job;
  readonly status: JobStatus;
  readonly worker_id?: string;
  readonly started_at?: string;
  readonly finished_at?: string;
  readonly error?: string;
  readonly result?: Readonly<Record<string, unknown>>;
}

export interface Session {
  readonly id: string;
  readonly principal: string;
  readonly created_at: string;
  readonly last_seen_at: string;
  readonly closed_at?: string;
}

export interface Heartbeat {
  readonly worker_id: string;
  readonly at: string;
  readonly healthy: boolean;
  readonly note?: string;
}

export interface ResourceUsage {
  readonly workers_registered: number;
  readonly workers_busy: number;
  readonly queue_depth: number;
  readonly jobs_running: number;
  readonly captured_at: string;
}

export interface HealthReport {
  readonly status: Health;
  readonly phase: RuntimePhase;
  readonly usage: ResourceUsage;
  readonly checks: ReadonlyArray<{
    readonly name: string;
    readonly status: Health;
    readonly detail?: string;
  }>;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface Checkpoint {
  readonly id: string;
  readonly runtime_id: string;
  readonly phase: RuntimePhase;
  readonly captured_at: string;
  readonly jobs: ReadonlyArray<JobRecord>;
  readonly workers: ReadonlyArray<WorkerDescriptor>;
  readonly usage: ResourceUsage;
}

export interface RuntimeState {
  readonly runtime_id: string;
  readonly phase: RuntimePhase;
  readonly started_at?: string;
  readonly stopped_at?: string;
  readonly workers: ReadonlyArray<WorkerDescriptor>;
  readonly queue: ReadonlyArray<JobRecord>;
  readonly running: ReadonlyArray<JobRecord>;
  readonly history: ReadonlyArray<JobRecord>;
  readonly heartbeats: ReadonlyArray<Heartbeat>;
  readonly sessions: ReadonlyArray<Session>;
}

export interface AuditEntry {
  readonly id: string;
  readonly stage: string;
  readonly summary: string;
  readonly recorded_at: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface MetricSample {
  readonly name: string;
  readonly value: number;
  readonly unit: string;
  readonly captured_at: string;
}

export interface RecoveryOutcome {
  readonly recovered: boolean;
  readonly restored_from?: string;
  readonly reason: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}
