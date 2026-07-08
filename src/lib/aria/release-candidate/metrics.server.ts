/**
 * Phase 10.0 — RC1 metric samples.
 */
import type { GateResult, MetricSample } from "./types";

export function computeMetrics(gates: ReadonlyArray<GateResult>): ReadonlyArray<MetricSample> {
  const total = gates.length;
  const pass = gates.filter((g) => g.status === "pass").length;
  const fail = gates.filter((g) => g.status === "fail").length;
  const unknown = gates.filter((g) => g.status === "unknown").length;
  const warn = gates.filter((g) => g.status === "warn").length;
  const capturedAt = new Date().toISOString();
  return [
    { name: "rc1.gates.total", value: total, unit: "count", captured_at: capturedAt },
    { name: "rc1.gates.pass", value: pass, unit: "count", captured_at: capturedAt },
    { name: "rc1.gates.fail", value: fail, unit: "count", captured_at: capturedAt },
    { name: "rc1.gates.warn", value: warn, unit: "count", captured_at: capturedAt },
    { name: "rc1.gates.unknown", value: unknown, unit: "count", captured_at: capturedAt },
    {
      name: "rc1.readiness.pct",
      value: total === 0 ? 0 : Math.round((pass / total) * 100),
      unit: "percent",
      captured_at: capturedAt,
    },
  ];
}
