/**
 * Per-run telemetry for the governance pipeline.
 */
export interface GovernanceRun {
  readonly id: string;
  readonly started_at: string;
  finished_at?: string;
  readonly stages: Record<string, { count: number; ms: number }>;
  outcome?: "allowed" | "pending" | "escalated" | "blocked" | "overridden";
}

const runs = new Map<string, GovernanceRun>();

export function startRun(id: string): GovernanceRun {
  const run: GovernanceRun = {
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
  outcome: NonNullable<GovernanceRun["outcome"]>,
): GovernanceRun | null {
  const run = runs.get(id);
  if (!run) return null;
  const finished: GovernanceRun = {
    ...run,
    finished_at: new Date().toISOString(),
    outcome,
  };
  runs.set(id, finished);
  return finished;
}

export function getRun(id: string): GovernanceRun | null {
  return runs.get(id) ?? null;
}
