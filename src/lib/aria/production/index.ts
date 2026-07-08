/**
 * Phase 9.0 — Production Readiness Foundation (public server surface).
 *
 * Strictly additive. No new intelligence, no UI, no public API changes.
 * Import from callers:
 *   import { evaluateReadiness, evaluateRelease } from "@/lib/aria/production";
 */

// Types
export type {
  Gate,
  GateStatus,
  ReleaseDecision,
  Severity,
  ReadinessSection,
  ReadinessReport,
  TestRegistryEntry,
  TraceIds,
  StructuredLogEntry,
  AuditEntry,
  PerformanceSample,
  PerformanceSnapshot,
  ResilienceReport,
  SecurityBaseline,
  HealthSummary,
  ProductionMetrics,
  ReleaseDecisionReport,
} from "./types";

// Contracts
export {
  LogEntrySchema,
  AuditEntrySchema,
  PerformanceSampleSchema,
  TestRegistryEntrySchema,
  SeveritySchema,
  TraceIdsSchema,
} from "./contracts";

// Logging + observability
export {
  logger,
  log,
  makeTrace,
  newTraceId,
  subscribeLogs,
  tailLogs,
  countLogs,
  countErrorsSince,
  clearLogs,
} from "./logging.server";
export { beginTrace, traced, classifyError, recentActivity } from "./observability.server";
export type { ErrorClass } from "./observability.server";

// Audit
export { audit, recordAudit, listAudits, auditCount, clearAudits } from "./audit.server";

// Performance
export {
  recordSample,
  setQueueDepth,
  recordTaskLatency,
  snapshotPerformance,
  sampleCount,
  clearSamples,
} from "./performance.server";

// Security
export { evaluateSecurityBaseline, requiredSecretsList } from "./security.server";

// Resilience
export {
  registerResiliencePolicy,
  markDegraded,
  evaluateResilience,
  listResiliencePolicies,
} from "./resilience.server";

// Testing registry
export { registerTest, updateTestStatus, listTests, testingSummary } from "./testing.server";

// Health + metrics
export { evaluateHealth } from "./health.server";
export { snapshotProductionMetrics } from "./metrics.server";

// Readiness + release
export { evaluateReadiness } from "./readiness.server";
export { evaluateRelease } from "./release.server";
