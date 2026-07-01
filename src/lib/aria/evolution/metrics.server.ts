/**
 * Metric collector for the Self-Evolution Engine.
 *
 * Metrics are append-only points with a stable key. No aggregation is
 * cached — every reader recomputes from the raw points.
 */

import type { MetricPoint } from "./types";

const POINTS: MetricPoint[] = [];

export function recordMetric(key: string, value: number): MetricPoint {
  if (!Number.isFinite(value)) throw new Error(`metric ${key}: non-finite value`);
  const point: MetricPoint = Object.freeze({
    ts: new Date().toISOString(),
    key,
    value,
  });
  POINTS.push(point);
  return point;
}

export function listMetrics(key?: string): readonly MetricPoint[] {
  return key ? POINTS.filter((p) => p.key === key) : POINTS.slice();
}

export function metricSummary(key: string): {
  readonly count: number;
  readonly last: number | undefined;
  readonly min: number | undefined;
  readonly max: number | undefined;
  readonly mean: number | undefined;
} {
  const series = POINTS.filter((p) => p.key === key).map((p) => p.value);
  if (series.length === 0)
    return { count: 0, last: undefined, min: undefined, max: undefined, mean: undefined };
  const sum = series.reduce((a, b) => a + b, 0);
  return {
    count: series.length,
    last: series[series.length - 1],
    min: Math.min(...series),
    max: Math.max(...series),
    mean: sum / series.length,
  };
}
