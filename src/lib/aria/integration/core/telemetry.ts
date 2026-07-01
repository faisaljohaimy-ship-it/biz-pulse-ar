/**
 * Phase 9.1 — Per-connector telemetry, metrics, and error classification.
 * In-process. Additive to Phase 9.0 production metrics.
 */

import type { ConnectorId, ConnectorTelemetrySnapshot, HealthResult } from "./types";
import { circuitState } from "./circuit-breaker";

interface Counters {
  calls_total: number;
  errors_total: number;
  retries_total: number;
  latency_sum: number;
  latency_count: number;
  last_latency_ms: number | null;
  last_error_class?: string;
  last_health: HealthResult | null;
  success_window: boolean[]; // rolling window of last N calls
  window_size: number;
}

const REGISTRY = new Map<ConnectorId, Counters>();
const WINDOW_SIZE = 100;

function slot(id: ConnectorId): Counters {
  let s = REGISTRY.get(id);
  if (!s) {
    s = {
      calls_total: 0,
      errors_total: 0,
      retries_total: 0,
      latency_sum: 0,
      latency_count: 0,
      last_latency_ms: null,
      last_health: null,
      success_window: [],
      window_size: WINDOW_SIZE,
    };
    REGISTRY.set(id, s);
  }
  return s;
}

export function recordCall(id: ConnectorId, latencyMs: number, ok: boolean, errorClass?: string): void {
  const s = slot(id);
  s.calls_total += 1;
  s.last_latency_ms = latencyMs;
  s.latency_sum += latencyMs;
  s.latency_count += 1;
  if (!ok) {
    s.errors_total += 1;
    s.last_error_class = errorClass;
  }
  s.success_window.push(ok);
  if (s.success_window.length > s.window_size) {
    s.success_window.splice(0, s.success_window.length - s.window_size);
  }
}

export function recordRetry(id: ConnectorId): void {
  slot(id).retries_total += 1;
}

export function recordHealth(id: ConnectorId, h: HealthResult): void {
  slot(id).last_health = h;
}

export function snapshotTelemetry(id: ConnectorId): ConnectorTelemetrySnapshot {
  const s = slot(id);
  const avg = s.latency_count ? Math.round(s.latency_sum / s.latency_count) : 0;
  const wins = s.success_window.length;
  const successRate = wins ? s.success_window.filter(Boolean).length / wins : -1;
  const availability = s.last_health?.status === "healthy" ? 1
    : s.last_health?.status === "degraded" ? 0.5
      : s.last_health?.status === "unhealthy" ? 0 : -1;
  return {
    connector_id: id,
    calls_total: s.calls_total,
    errors_total: s.errors_total,
    retries_total: s.retries_total,
    last_latency_ms: s.last_latency_ms,
    avg_latency_ms: avg,
    success_rate: successRate,
    availability,
    last_health: s.last_health,
    circuit_state: circuitState(id),
    last_error_class: s.last_error_class,
    updated_at: new Date().toISOString(),
  };
}

export function snapshotAllTelemetry(): ConnectorTelemetrySnapshot[] {
  return [...REGISTRY.keys()].map(snapshotTelemetry);
}

export function classifyIntegrationError(err: unknown): string {
  const msg = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  if (!msg) return "unknown";
  if (msg.includes("timeout")) return "timeout";
  if (msg.includes("rate") && msg.includes("limit")) return "rate_limit";
  if (msg.includes("401") || msg.includes("unauthorized")) return "auth";
  if (msg.includes("403") || msg.includes("forbidden")) return "permission";
  if (msg.includes("404")) return "not_found";
  if (msg.includes("409")) return "conflict";
  if (msg.includes("5")) return "upstream_5xx";
  if (msg.includes("network") || msg.includes("econn") || msg.includes("fetch failed")) return "network";
  return "unknown";
}
