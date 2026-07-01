/**
 * Telemetry — per-pipeline-run counters and durations.
 * No PII; only stage timings.
 */
export interface PipelineTelemetry {
  readonly id: string;
  readonly started_at: string;
  finished_at?: string;
  readonly stages: Record<string, { count: number; ms: number }>;
  readonly counts: { inputs: number; findings: number; rejected: number };
}

const runs = new Map<string, PipelineTelemetry>();

export function startRun(id: string): PipelineTelemetry {
  const run: PipelineTelemetry = {
    id,
    started_at: new Date().toISOString(),
    stages: {},
    counts: { inputs: 0, findings: 0, rejected: 0 },
  };
  runs.set(id, run);
  return run;
}

export function markStage(id: string, stage: string, ms: number): void {
  const run = runs.get(id);
  if (!run) return;
  const cur = run.stages[stage] ?? { count: 0, ms: 0 };
  run.stages[stage] = { count: cur.count + 1, ms: cur.ms + Math.max(0, ms) };
}

export function finishRun(
  id: string,
  counts: { inputs: number; findings: number; rejected: number },
): PipelineTelemetry | null {
  const run = runs.get(id);
  if (!run) return null;
  const finished: PipelineTelemetry = {
    ...run,
    finished_at: new Date().toISOString(),
    counts,
  };
  runs.set(id, finished);
  return finished;
}

export function getRun(id: string): PipelineTelemetry | null {
  return runs.get(id) ?? null;
}
