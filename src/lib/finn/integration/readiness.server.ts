/**
 * Phase 9.1 — Integration readiness report.
 *
 * Composes per-connector auth readiness + credential-health probe into a
 * single report. Missing credentials → status `unknown` (never faked).
 */

import { ensureConnectorsRegistered } from "./connectors";
import { listConnectors } from "./core/registry";
import { evaluateAuth } from "./core/auth";
import { probeCredentialHealth } from "./core/health";
import type { IntegrationReadinessGate, IntegrationReadinessReport } from "./core/types";

export function evaluateIntegrationReadiness(): IntegrationReadinessReport {
  ensureConnectorsRegistered();
  const gates: IntegrationReadinessGate[] = [];
  for (const desc of listConnectors()) {
    const auth = evaluateAuth(desc.id);
    const health = probeCredentialHealth(desc);
    const status: IntegrationReadinessGate["status"] = !auth
      ? "fail"
      : !auth.ready
        ? "unknown"
        : health.status === "healthy"
          ? "pass"
          : health.status === "unhealthy"
            ? "fail"
            : health.status === "degraded"
              ? "warn"
              : "unknown";
    gates.push({
      connector_id: desc.id,
      status,
      reason:
        status === "pass"
          ? "credentials present"
          : status === "unknown"
            ? auth && !auth.ready
              ? "credentials not configured"
              : "upstream reachability not verified"
            : status === "warn"
              ? "degraded"
              : status === "fail"
                ? "unreachable"
                : "unknown",
      missing_credentials: auth?.missing ?? [],
    });
  }
  const summary = {
    total: gates.length,
    pass: gates.filter((g) => g.status === "pass").length,
    warn: gates.filter((g) => g.status === "warn").length,
    fail: gates.filter((g) => g.status === "fail").length,
    unknown: gates.filter((g) => g.status === "unknown").length,
  };
  return {
    taken_at: new Date().toISOString(),
    gates,
    summary,
  };
}
