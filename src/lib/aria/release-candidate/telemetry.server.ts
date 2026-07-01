/**
 * Per-run telemetry for the RC pipeline.
 */
export interface RcRun {
  readonly id: string;
  readonly started_at: string;
  finished_at?: string;
  readonly stages: Record<string, { count: number; ms: number }>;
  decision?: "GO" | "NO-GO" | "CONDITIONAL-GO";
}

const runs = new Map<string, RcRun>();

export function startRun(id: string): RcRun {
  const run: RcRun = {
    id,
    started_at: new Date().toISOString(),
    stages: {},
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
  decision: NonNullable<RcRun["decision"]>,
): RcRun | null {
  const run = runs.get(id);
  if (!run) return null;
  const finished: RcRun = { ...run, finished_at: new Date().toISOString(), decision };
  runs.set(id, finished);
  return finished;
}
export function getRun(id: string): RcRun | null {
  return runs.get(id) ?? null;
}
