/**
 * Phase 9.1 — Aggregated metrics for the integration layer.
 */

import { snapshotAllTelemetry } from "./telemetry";

export interface IntegrationMetrics {
  taken_at: string;
  connectors_tracked: number;
  calls_total: number;
  errors_total: number;
  retries_total: number;
  avg_latency_ms: number;
  overall_success_rate: number; // -1 when unknown
}

export function snapshotIntegrationMetrics(): IntegrationMetrics {
  const items = snapshotAllTelemetry();
  const calls = items.reduce((a, i) => a + i.calls_total, 0);
  const errs = items.reduce((a, i) => a + i.errors_total, 0);
  const retries = items.reduce((a, i) => a + i.retries_total, 0);
  const latencies = items.map((i) => i.avg_latency_ms).filter((n) => n > 0);
  const avg = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const known = items.filter((i) => i.success_rate >= 0);
  const overall = known.length ? known.reduce((a, b) => a + b.success_rate, 0) / known.length : -1;
  return {
    taken_at: new Date().toISOString(),
    connectors_tracked: items.length,
    calls_total: calls,
    errors_total: errs,
    retries_total: retries,
    avg_latency_ms: avg,
    overall_success_rate: overall,
  };
}
