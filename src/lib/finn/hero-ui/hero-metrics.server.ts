export interface HeroMetricsSnapshot {
  readonly renders: number;
  readonly stateChanges: number;
  readonly captionsShown: number;
  readonly transitionsCancelled: number;
  readonly perfDowngrades: number;
  readonly avgFps: number | null;
}

const M = {
  renders: 0,
  stateChanges: 0,
  captionsShown: 0,
  transitionsCancelled: 0,
  perfDowngrades: 0,
};
const FPS_SAMPLES: number[] = [];

export function noteRender(): void {
  M.renders++;
}
export function noteStateChange(): void {
  M.stateChanges++;
}
export function noteCaption(): void {
  M.captionsShown++;
}
export function noteTransitionCancel(): void {
  M.transitionsCancelled++;
}
export function notePerfDowngrade(): void {
  M.perfDowngrades++;
}
export function noteFpsSample(v: number): void {
  FPS_SAMPLES.push(v);
  if (FPS_SAMPLES.length > 240) FPS_SAMPLES.shift();
}

export function heroMetrics(): HeroMetricsSnapshot {
  const avg = FPS_SAMPLES.length
    ? Math.round(FPS_SAMPLES.reduce((a, b) => a + b, 0) / FPS_SAMPLES.length)
    : null;
  return { ...M, avgFps: avg };
}
