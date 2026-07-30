/**
 * Phase 10.1 — Runtime metrics.
 */
import type { MetricSample, RuntimeState } from "./types";

export function sampleMetrics(state: RuntimeState): ReadonlyArray<MetricSample> {
  const at = new Date().toISOString();
  const succeeded = state.history.filter((r) => r.status === "succeeded").length;
  const failed = state.history.filter((r) => r.status === "failed").length;
  const cancelled = state.history.filter((r) => r.status === "cancelled").length;
  return [
    {
      name: "runtime.workers.registered",
      value: state.workers.length,
      unit: "count",
      captured_at: at,
    },
    { name: "runtime.queue.depth", value: state.queue.length, unit: "count", captured_at: at },
    { name: "runtime.jobs.running", value: state.running.length, unit: "count", captured_at: at },
    { name: "runtime.jobs.succeeded", value: succeeded, unit: "count", captured_at: at },
    { name: "runtime.jobs.failed", value: failed, unit: "count", captured_at: at },
    { name: "runtime.jobs.cancelled", value: cancelled, unit: "count", captured_at: at },
    {
      name: "runtime.sessions.open",
      value: state.sessions.filter((s) => !s.closed_at).length,
      unit: "count",
      captured_at: at,
    },
  ];
}
