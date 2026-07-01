/**
 * Phase 9.0 — Performance baseline sampling.
 * In-memory rolling window. No external metrics service.
 */

import type { PerformanceSample, PerformanceSnapshot } from "./types";

const SAMPLE_MAX = 2000;
const SAMPLES: PerformanceSample[] = [];
const SLOW_THRESHOLD_MS = 800;
let QUEUE_DEPTH = 0;
let LAST_TASK_LATENCY_MS: number | null = null;

export function recordSample(input: {
  route: string;
  duration_ms: number;
  status: number;
}): PerformanceSample {
  const s: PerformanceSample = {
    ts: new Date().toISOString(),
    route: input.route,
    duration_ms: Math.max(0, input.duration_ms),
    status: input.status,
    slow: input.duration_ms >= SLOW_THRESHOLD_MS,
  };
  SAMPLES.push(s);
  if (SAMPLES.length > SAMPLE_MAX) SAMPLES.splice(0, SAMPLES.length - SAMPLE_MAX);
  return s;
}

export function setQueueDepth(n: number): void {
  QUEUE_DEPTH = Math.max(0, Math.floor(n));
}

export function recordTaskLatency(ms: number): void {
  LAST_TASK_LATENCY_MS = Math.max(0, ms);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function readMemory(): { rss_mb: number | null; heap_mb: number | null } {
  try {
    // process.memoryUsage may be unavailable in Worker runtime — degrade to null.
    const mu = (globalThis as unknown as { process?: { memoryUsage?: () => NodeJS.MemoryUsage } })
      .process?.memoryUsage?.();
    if (!mu) return { rss_mb: null, heap_mb: null };
    return {
      rss_mb: Math.round(mu.rss / 1024 / 1024),
      heap_mb: Math.round(mu.heapUsed / 1024 / 1024),
    };
  } catch {
    return { rss_mb: null, heap_mb: null };
  }
}

export function snapshotPerformance(): PerformanceSnapshot {
  const durations = SAMPLES.map((s) => s.duration_ms);
  const avg = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;
  const p95 = Math.round(percentile(durations, 95));

  const perRoute = new Map<string, { total: number; count: number }>();
  for (const s of SAMPLES) {
    const prev = perRoute.get(s.route) ?? { total: 0, count: 0 };
    prev.total += s.duration_ms;
    prev.count += 1;
    perRoute.set(s.route, prev);
  }
  const slowRoutes = [...perRoute.entries()]
    .map(([route, v]) => ({ route, avg_ms: Math.round(v.total / v.count), count: v.count }))
    .filter((r) => r.avg_ms >= SLOW_THRESHOLD_MS)
    .sort((a, b) => b.avg_ms - a.avg_ms)
    .slice(0, 10);

  return {
    taken_at: new Date().toISOString(),
    samples: SAMPLES.length,
    avg_ms: avg,
    p95_ms: p95,
    slow_routes: slowRoutes,
    queue_depth: QUEUE_DEPTH,
    task_latency_ms: LAST_TASK_LATENCY_MS,
    memory: readMemory(),
  };
}

export function sampleCount(): number {
  return SAMPLES.length;
}

export function clearSamples(): void {
  SAMPLES.length = 0;
}
