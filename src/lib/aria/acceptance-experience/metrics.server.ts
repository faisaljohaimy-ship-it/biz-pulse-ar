// Acceptance metrics.
export interface AcceptanceMetricsSnapshot {
  readonly greetings: number;
  readonly stepsCompleted: number;
  readonly qualityFailures: number;
  readonly disciplineTrims: number;
  readonly handoffs: number;
  readonly delights: number;
  readonly avgQualityScore: number | null;
}

const M = {
  greetings: 0,
  stepsCompleted: 0,
  qualityFailures: 0,
  disciplineTrims: 0,
  handoffs: 0,
  delights: 0,
  qualitySamples: [] as number[],
};

export function recordGreeting(): void {
  M.greetings++;
}
export function recordStepCompleted(): void {
  M.stepsCompleted++;
}
export function recordQuality(score: number, ok: boolean): void {
  M.qualitySamples.push(score);
  if (M.qualitySamples.length > 200) M.qualitySamples.shift();
  if (!ok) M.qualityFailures++;
}
export function recordDisciplineTrim(): void {
  M.disciplineTrims++;
}
export function recordHandoff(): void {
  M.handoffs++;
}
export function recordDelight(): void {
  M.delights++;
}

export function acceptanceMetrics(): AcceptanceMetricsSnapshot {
  const avg = M.qualitySamples.length
    ? Math.round(M.qualitySamples.reduce((a, b) => a + b, 0) / M.qualitySamples.length)
    : null;
  return {
    greetings: M.greetings,
    stepsCompleted: M.stepsCompleted,
    qualityFailures: M.qualityFailures,
    disciplineTrims: M.disciplineTrims,
    handoffs: M.handoffs,
    delights: M.delights,
    avgQualityScore: avg,
  };
}
