export interface ShowcaseMetricsSnapshot {
  readonly starts: number;
  readonly completions: number;
  readonly interruptions: number;
  readonly recoveries: number;
  readonly qaCount: number;
  readonly avgStepMs: number | null;
}

const M = { starts: 0, completions: 0, interruptions: 0, recoveries: 0, qaCount: 0 };
const STEP_SAMPLES: number[] = [];

export function noteStart(): void { M.starts++; }
export function noteCompletion(): void { M.completions++; }
export function noteInterruption(): void { M.interruptions++; }
export function noteRecovery(): void { M.recoveries++; }
export function noteQa(): void { M.qaCount++; }
export function noteStepDuration(ms: number): void {
  if (!Number.isFinite(ms) || ms < 0) return;
  STEP_SAMPLES.push(ms);
  if (STEP_SAMPLES.length > 200) STEP_SAMPLES.shift();
}

export function showcaseMetrics(): ShowcaseMetricsSnapshot {
  const avg = STEP_SAMPLES.length
    ? Math.round(STEP_SAMPLES.reduce((a, b) => a + b, 0) / STEP_SAMPLES.length)
    : null;
  return { ...M, avgStepMs: avg };
}
