/**
 * Phase 9.0 — Production metrics snapshot.
 *
 * Rolls up in-process counters from logging, audit, and performance
 * modules. Additive: does not replace `src/lib/aria/os/metrics.server.ts`.
 */

import { countLogs, countErrorsSince } from "./logging.server";
import { auditCount } from "./audit.server";
import { sampleCount } from "./performance.server";
import type { ProductionMetrics } from "./types";

export function snapshotProductionMetrics(): ProductionMetrics {
  const since = new Date(Date.now() - 3_600_000);
  return {
    logs_captured: countLogs(),
    audits_recorded: auditCount(),
    performance_samples: sampleCount(),
    errors_last_hour: countErrorsSince(since),
    last_updated: new Date().toISOString(),
  };
}
