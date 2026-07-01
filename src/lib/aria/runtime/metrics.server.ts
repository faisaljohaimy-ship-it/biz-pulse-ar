/**
 * Phase 9.2 — Runtime metrics (bounded in-memory).
 */

import type { RuntimeMetric } from "./types";

const metrics: RuntimeMetric[] = [];
const MAX = 5000;

export function recordMetric(
  name: string,
  value: number,
  tags: Record<string, string> = {},
): RuntimeMetric {
  const m: RuntimeMetric = {
    name,
    value,
    taken_at: new Date().toISOString(),
    tags,
  };
  metrics.push(m);
  if (metrics.length > MAX) metrics.splice(0, metrics.length - MAX);
  return m;
}

export function listMetrics(name?: string): RuntimeMetric[] {
  return name ? metrics.filter((m) => m.name === name) : [...metrics];
}

export function summarizeMetric(name: string): {
  count: number;
  min: number;
  max: number;
  avg: number;
} {
  const values = metrics.filter((m) => m.name === name).map((m) => m.value);
  if (values.length === 0) return { count: 0, min: 0, max: 0, avg: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: sum / values.length,
  };
}

export function clearMetrics(): void {
  metrics.length = 0;
}
