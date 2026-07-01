/**
 * Phase 10.1 — Dispatcher: routes a queued job to an available worker.
 * Round-robin by worker kind. No fabricated execution — an executor
 * function must be provided by the caller.
 */
import type { JobRecord, WorkerDescriptor } from "./types";
import type { RuntimeStateStore } from "./state.server";
import type { TelemetryBus } from "./telemetry.server";

export type JobExecutor = (
  record: JobRecord,
  worker: WorkerDescriptor,
) => Promise<{
  readonly status: "succeeded" | "failed";
  readonly result?: Readonly<Record<string, unknown>>;
  readonly error?: string;
}>;

export class Dispatcher {
  private cursor = 0;

  constructor(
    private readonly store: RuntimeStateStore,
    private readonly telemetry: TelemetryBus,
  ) {}

  pickWorker(kind: string): WorkerDescriptor | undefined {
    const eligible = this.store
      .listWorkers()
      .filter((w) => w.kind === kind);
    if (eligible.length === 0) return undefined;
    const w = eligible[this.cursor % eligible.length];
    this.cursor += 1;
    return w;
  }

  async dispatch(
    record: JobRecord,
    executor: JobExecutor,
    timeoutMs: number,
  ): Promise<JobRecord | undefined> {
    const worker = this.pickWorker(record.job.kind);
    if (!worker) {
      this.telemetry.emit(
        "queue",
        "no_worker",
        `No worker available for kind=${record.job.kind}`,
      );
      return undefined;
    }
    const running = this.store.markRunning(record, worker.id);
    this.telemetry.emit(
      "queue",
      "dispatched",
      `Job ${record.job.id} -> worker ${worker.id}`,
    );

    try {
      const outcome = await withTimeout(
        executor(running, worker),
        timeoutMs,
        record.job.id,
      );
      return (
        this.store.finish(
          record.job.id,
          outcome.status,
          outcome.result,
          outcome.error,
        ) ?? running
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.telemetry.emit(
        "queue",
        "job_error",
        `Job ${record.job.id} failed: ${message}`,
      );
      return (
        this.store.finish(record.job.id, "failed", undefined, message) ??
        running
      );
    }
  }
}

async function withTimeout<T>(
  p: Promise<T>,
  ms: number,
  jobId: string,
): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Job ${jobId} timed out after ${ms}ms`));
    }, ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}
