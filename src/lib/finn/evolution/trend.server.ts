/**
 * Trend summary derived from the experience store.
 *
 * Trends are purely descriptive — they never assert causality.
 */

import { listExperiences } from "./experience-store.server";
import { trendDelta } from "./scoring.server";

export interface TrendSummary {
  readonly window: number;
  readonly duration_delta_ms: number;
  readonly token_delta: number;
  readonly failure_ratio: number;
  readonly success_ratio: number;
}

export function summarizeTrends(): TrendSummary {
  const all = listExperiences();
  const window = all.length;
  if (window === 0) {
    return Object.freeze({
      window: 0,
      duration_delta_ms: 0,
      token_delta: 0,
      failure_ratio: -1,
      success_ratio: -1,
    });
  }
  const durations = all.map((r) => r.duration_ms);
  const tokens = all.map((r) => r.cost_tokens);
  const failure = all.filter((r) => r.outcome === "failure").length;
  const success = all.filter((r) => r.outcome === "success").length;
  return Object.freeze({
    window,
    duration_delta_ms: trendDelta(durations),
    token_delta: trendDelta(tokens),
    failure_ratio: failure / window,
    success_ratio: success / window,
  });
}
