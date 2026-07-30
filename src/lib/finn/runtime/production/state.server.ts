/**
 * Phase 10.1 — Runtime state store (in-memory, per instance).
 * Append-only history; queue and running lists are mutable.
 */
import type {
  Heartbeat,
  Job,
  JobRecord,
  JobStatus,
  RuntimePhase,
  RuntimeState,
  Session,
  WorkerDescriptor,
} from "./types";

export class RuntimeStateStore {
  private phase: RuntimePhase = "idle";
  private startedAt?: string;
  private stoppedAt?: string;
  private readonly workers = new Map<string, WorkerDescriptor>();
  private readonly queue: JobRecord[] = [];
  private readonly running = new Map<string, JobRecord>();
  private readonly history: JobRecord[] = [];
  private readonly heartbeats: Heartbeat[] = [];
  private readonly sessions = new Map<string, Session>();

  constructor(private readonly runtimeId: string) {}

  getPhase(): RuntimePhase {
    return this.phase;
  }

  setPhase(phase: RuntimePhase): void {
    this.phase = phase;
    if (phase === "accepting_jobs" && !this.startedAt) {
      this.startedAt = new Date().toISOString();
    }
    if (phase === "stopped") {
      this.stoppedAt = new Date().toISOString();
    }
  }

  registerWorker(w: WorkerDescriptor): void {
    this.workers.set(w.id, w);
  }

  removeWorker(id: string): void {
    this.workers.delete(id);
  }

  listWorkers(): ReadonlyArray<WorkerDescriptor> {
    return Array.from(this.workers.values());
  }

  enqueue(job: Job): JobRecord {
    const record: JobRecord = { job, status: "queued" };
    this.queue.push(record);
    return record;
  }

  dequeue(): JobRecord | undefined {
    return this.queue.shift();
  }

  queueDepth(): number {
    return this.queue.length;
  }

  queueSnapshot(): ReadonlyArray<JobRecord> {
    return this.queue.slice();
  }

  markRunning(record: JobRecord, workerId: string): JobRecord {
    const updated: JobRecord = {
      ...record,
      status: "running",
      worker_id: workerId,
      started_at: new Date().toISOString(),
    };
    this.running.set(record.job.id, updated);
    return updated;
  }

  finish(
    jobId: string,
    status: JobStatus,
    result?: Readonly<Record<string, unknown>>,
    error?: string,
  ): JobRecord | undefined {
    const current = this.running.get(jobId);
    if (!current) return undefined;
    const finished: JobRecord = {
      ...current,
      status,
      finished_at: new Date().toISOString(),
      result,
      error,
    };
    this.running.delete(jobId);
    this.history.push(finished);
    return finished;
  }

  runningSnapshot(): ReadonlyArray<JobRecord> {
    return Array.from(this.running.values());
  }

  historySnapshot(): ReadonlyArray<JobRecord> {
    return this.history.slice();
  }

  recordHeartbeat(hb: Heartbeat): void {
    this.heartbeats.push(hb);
    if (this.heartbeats.length > 1024) this.heartbeats.shift();
  }

  latestHeartbeats(): ReadonlyArray<Heartbeat> {
    return this.heartbeats.slice(-64);
  }

  openSession(s: Session): void {
    this.sessions.set(s.id, s);
  }

  touchSession(id: string): Session | undefined {
    const s = this.sessions.get(id);
    if (!s) return undefined;
    const updated: Session = { ...s, last_seen_at: new Date().toISOString() };
    this.sessions.set(id, updated);
    return updated;
  }

  closeSession(id: string): void {
    const s = this.sessions.get(id);
    if (!s) return;
    this.sessions.set(id, { ...s, closed_at: new Date().toISOString() });
  }

  listSessions(): ReadonlyArray<Session> {
    return Array.from(this.sessions.values());
  }

  snapshot(): RuntimeState {
    return {
      runtime_id: this.runtimeId,
      phase: this.phase,
      started_at: this.startedAt,
      stopped_at: this.stoppedAt,
      workers: this.listWorkers(),
      queue: this.queueSnapshot(),
      running: this.runningSnapshot(),
      history: this.historySnapshot(),
      heartbeats: this.latestHeartbeats(),
      sessions: this.listSessions(),
    };
  }

  restore(state: RuntimeState): void {
    this.phase = state.phase;
    this.startedAt = state.started_at;
    this.stoppedAt = state.stopped_at;
    this.workers.clear();
    for (const w of state.workers) this.workers.set(w.id, w);
    this.queue.splice(0, this.queue.length, ...state.queue);
    this.running.clear();
    for (const r of state.running) this.running.set(r.job.id, r);
    this.history.splice(0, this.history.length, ...state.history);
    this.heartbeats.splice(0, this.heartbeats.length, ...state.heartbeats);
    this.sessions.clear();
    for (const s of state.sessions) this.sessions.set(s.id, s);
  }
}
