/**
 * Regression detection between a baseline and a current metric.
 */

import type { RegressionReport } from "./types";
import { deriveConfidence } from "./confidence.server";

const REGRESSION_THRESHOLD = 0.05;

function regId(metric: string, ts: string): string {
  let h = 5381;
  const seed = `reg|${metric}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `reg_${(h >>> 0).toString(16)}`;
}

export function detectRegression(
  metric: string,
  baseline: number,
  current: number,
): RegressionReport {
  const created_at = new Date().toISOString();
  const knownBaseline = Number.isFinite(baseline) && baseline >= 0;
  const knownCurrent = Number.isFinite(current) && current >= 0;
  const delta = knownBaseline && knownCurrent ? current - baseline : 0;
  const regressed =
    knownBaseline && knownCurrent && baseline > 0
      ? delta / baseline >= REGRESSION_THRESHOLD
      : false;
  const conf = deriveConfidence({
    subject_id: `reg:${metric}`,
    evidence_quality: knownBaseline && knownCurrent ? 1 : 0,
    execution_success_rate: -1,
    historical_alignment: knownBaseline ? 1 : -1,
    benchmark_alignment: knownCurrent ? 1 : -1,
    pattern_consistency: -1,
    coverage: knownBaseline && knownCurrent ? 1 : 0,
    evidence: [],
  });
  return Object.freeze({
    id: regId(metric, created_at),
    created_at,
    metric,
    baseline,
    current,
    delta,
    regressed,
    confidence: conf.confidence,
  });
}
