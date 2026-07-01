/**
 * Phase 9.3 — Execution metrics (bounded in-memory).
 */

import type { AdapterKind, ExecutionStatus, ToolExecutionMetric } from "./types";

const metrics: ToolExecutionMetric[] = [];
const MAX = 5000;

export function recordMetric(m: ToolExecutionMetric): ToolExecutionMetric {
  metrics.push(m);
  if (metrics.length > MAX) metrics.splice(0, metrics.length - MAX);
  return m;
}

export function listMetrics(toolId?: string): ToolExecutionMetric[] {
  return toolId ? metrics.filter((m) => m.tool_id === toolId) : [...metrics];
}

export interface MetricSummary {
  count: number;
  avg_ms: number;
  p95_ms: number;
  failures: number;
  by_status: Record<ExecutionStatus, number>;
  by_adapter: Record<string, number>;
}

const EMPTY_STATUSES: Record<ExecutionStatus, number> = {
  success: 0,
  failure: 0,
  timeout: 0,
  cancelled: 0,
  denied: 0,
  unauthenticated: 0,
  unauthorized: 0,
  budget_exceeded: 0,
  unconfigured: 0,
  unknown: 0,
};

export function summarizeMetrics(toolId?: string): MetricSummary {
  const src = listMetrics(toolId);
  if (src.length === 0) {
    return { count: 0, avg_ms: 0, p95_ms: 0, failures: 0, by_status: { ...EMPTY_STATUSES }, by_adapter: {} };
  }
  const durations = src.map((s) => s.duration_ms).sort((a, b) => a - b);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const p95 = durations[Math.floor(durations.length * 0.95)] ?? durations[durations.length - 1]!;
  const by_status: Record<ExecutionStatus, number> = { ...EMPTY_STATUSES };
  const by_adapter: Record<string, number> = {};
  let failures = 0;
  for (const s of src) {
    by_status[s.status] += 1;
    const key: AdapterKind = s.adapter;
    by_adapter[key] = (by_adapter[key] ?? 0) + 1;
    if (s.status !== "success") failures += 1;
  }
  return { count: src.length, avg_ms: avg, p95_ms: p95, failures, by_status, by_adapter };
}

export function clearMetrics(): void {
  metrics.length = 0;
}
