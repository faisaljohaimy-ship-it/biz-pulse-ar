/**
 * Phase 9.0 — Production Readiness Foundation: types.
 *
 * Strictly additive. No new intelligence layers. No public API changes.
 * These types describe readiness gates, observability records, and the
 * final release decision. They intentionally allow "unknown" — missing
 * data must never be fabricated as a pass.
 */

export type GateStatus = "pass" | "warn" | "fail" | "unknown";
export type ReleaseDecision = "GO" | "NO-GO" | "CONDITIONAL";
export type Severity = "info" | "notice" | "warn" | "error" | "critical";

export interface Gate {
  id: string;
  category:
    | "system"
    | "testing"
    | "observability"
    | "audit"
    | "security"
    | "performance"
    | "resilience";
  label: string;
  status: GateStatus;
  detail?: string;
  evidence?: Record<string, unknown>;
  weight?: number;
}

export interface ReadinessSection {
  id: string;
  label: string;
  gates: Gate[];
  status: GateStatus;
  score: number; // 0-100 or -1 when unknown
}

export interface ReadinessReport {
  taken_at: string;
  sections: ReadinessSection[];
  overall_status: GateStatus;
  overall_score: number;
  blockers: string[];
  warnings: string[];
  unknowns: string[];
}

export interface TestRegistryEntry {
  id: string;
  kind: "unit" | "integration" | "e2e" | "regression" | "smoke" | "failure";
  label: string;
  target: string;
  status: "planned" | "passing" | "failing" | "skipped" | "unknown";
  last_run_at?: string;
  notes?: string;
}

export interface TraceIds {
  trace_id: string;
  request_id?: string | null;
  session_id?: string | null;
  mission_id?: string | null;
  agent_id?: string | null;
  task_id?: string | null;
}

export interface StructuredLogEntry extends TraceIds {
  ts: string;
  level: Severity;
  source: string;
  message: string;
  data?: Record<string, unknown>;
  error_class?: string;
}

export interface AuditEntry {
  ts: string;
  category: "user_action" | "aria_decision" | "mission" | "task" | "security" | "approval";
  actor?: string | null;
  org_id?: string | null;
  action: string;
  subject_type?: string;
  subject_id?: string;
  metadata?: Record<string, unknown>;
  trace_id?: string;
}

export interface PerformanceSample {
  ts: string;
  route: string;
  duration_ms: number;
  status: number;
  slow: boolean;
}

export interface PerformanceSnapshot {
  taken_at: string;
  samples: number;
  avg_ms: number;
  p95_ms: number;
  slow_routes: Array<{ route: string; avg_ms: number; count: number }>;
  queue_depth: number;
  task_latency_ms: number | null;
  memory: { rss_mb: number | null; heap_mb: number | null };
}

export interface ResilienceReport {
  taken_at: string;
  graceful_failure: GateStatus;
  retry_policy: GateStatus;
  timeout_policy: GateStatus;
  fallback_policy: GateStatus;
  degraded_mode: boolean;
  notes: string[];
}

export interface SecurityBaseline {
  taken_at: string;
  rbac_ready: GateStatus;
  permission_checks: GateStatus;
  secrets_present: GateStatus;
  unsafe_config: GateStatus;
  public_routes_reviewed: GateStatus;
  admin_routes_protected: GateStatus;
  missing_secrets: string[];
  notes: string[];
}

export interface HealthSummary {
  taken_at: string;
  level: "healthy" | "degraded" | "unhealthy" | "unknown";
  os: GateStatus;
  runtime: GateStatus;
  database: GateStatus;
  notes: string[];
}

export interface ProductionMetrics {
  logs_captured: number;
  audits_recorded: number;
  performance_samples: number;
  errors_last_hour: number;
  last_updated: string;
}

export interface ReleaseDecisionReport {
  taken_at: string;
  decision: ReleaseDecision;
  overall_score: number;
  readiness: ReadinessReport;
  blockers: string[];
  warnings: string[];
  next_actions: string[];
}
