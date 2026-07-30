// Responsiveness — measures perceived latency; deterministic budget checks.
export interface LatencySample {
  readonly stage: "first_token" | "first_audio" | "full_answer";
  readonly ms: number;
}

const SAMPLES: Record<LatencySample["stage"], number[]> = {
  first_token: [],
  first_audio: [],
  full_answer: [],
};

const BUDGET_MS: Record<LatencySample["stage"], number> = {
  first_token: 1500,
  first_audio: 2500,
  full_answer: 8000,
};

export function recordLatency(sample: LatencySample): void {
  if (!Number.isFinite(sample.ms) || sample.ms < 0) return;
  const arr = SAMPLES[sample.stage];
  arr.push(sample.ms);
  if (arr.length > 200) arr.shift();
}

export interface ResponsivenessSnapshot {
  readonly avgFirstTokenMs: number | null;
  readonly avgFirstAudioMs: number | null;
  readonly avgFullAnswerMs: number | null;
  readonly withinBudget: boolean;
}

function avg(a: number[]): number | null {
  if (a.length === 0) return null;
  return Math.round(a.reduce((x, y) => x + y, 0) / a.length);
}

export function responsivenessSnapshot(): ResponsivenessSnapshot {
  const ft = avg(SAMPLES.first_token);
  const fa = avg(SAMPLES.first_audio);
  const full = avg(SAMPLES.full_answer);
  const within =
    (ft === null || ft <= BUDGET_MS.first_token) &&
    (fa === null || fa <= BUDGET_MS.first_audio) &&
    (full === null || full <= BUDGET_MS.full_answer);
  return {
    avgFirstTokenMs: ft,
    avgFirstAudioMs: fa,
    avgFullAnswerMs: full,
    withinBudget: within,
  };
}

export function latencyBudgets(): Readonly<typeof BUDGET_MS> {
  return BUDGET_MS;
}
