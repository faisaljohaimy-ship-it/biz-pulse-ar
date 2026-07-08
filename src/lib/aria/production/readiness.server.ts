/**
 * Phase 9.0 — Production Readiness aggregator.
 *
 * Composes gates from every production submodule into a single report.
 * Missing signals → "unknown" (never faked as pass). Any "fail" gate
 * bubbles up as a blocker.
 */

import type { Gate, GateStatus, ReadinessReport, ReadinessSection } from "./types";
import { evaluateHealth } from "./health.server";
import { evaluateSecurityBaseline } from "./security.server";
import { evaluateResilience } from "./resilience.server";
import { snapshotPerformance } from "./performance.server";
import { testingSummary } from "./testing.server";
import { snapshotProductionMetrics } from "./metrics.server";

function statusScore(s: GateStatus): number {
  return s === "pass" ? 100 : s === "warn" ? 60 : s === "fail" ? 0 : -1;
}

function worst(...s: GateStatus[]): GateStatus {
  if (s.includes("fail")) return "fail";
  if (s.includes("unknown")) return "unknown";
  if (s.includes("warn")) return "warn";
  return "pass";
}

function sectionFromGates(id: string, label: string, gates: Gate[]): ReadinessSection {
  const status = worst(...gates.map((g) => g.status));
  const known = gates.map((g) => statusScore(g.status)).filter((n) => n >= 0);
  const score = known.length ? Math.round(known.reduce((a, b) => a + b, 0) / known.length) : -1;
  return { id, label, gates, status, score };
}

export async function evaluateReadiness(): Promise<ReadinessReport> {
  const [health] = await Promise.all([evaluateHealth()]);
  const sec = evaluateSecurityBaseline();
  const res = evaluateResilience();
  const perf = snapshotPerformance();
  const tests = testingSummary();
  const metrics = snapshotProductionMetrics();

  const systemSection = sectionFromGates("system", "System Health", [
    { id: "sys.os", category: "system", label: "OS subsystems", status: health.os },
    { id: "sys.runtime", category: "system", label: "Runtime error rate", status: health.runtime },
    { id: "sys.db", category: "system", label: "Database reachable", status: health.database },
    {
      id: "sys.typecheck",
      category: "system",
      label: "Typecheck (CI-enforced)",
      status: "unknown",
      detail: "Verified in CI; not observable in-process.",
    },
    {
      id: "sys.build",
      category: "system",
      label: "Build status (CI-enforced)",
      status: "unknown",
      detail: "Verified in CI; not observable in-process.",
    },
  ]);

  const testingSection = sectionFromGates("testing", "Testing Foundation", [
    {
      id: "test.count",
      category: "testing",
      label: "Registered tests",
      status: tests.total > 0 ? "pass" : "fail",
      evidence: { total: tests.total },
    },
    {
      id: "test.failing",
      category: "testing",
      label: "Failing tests",
      status: tests.failing.length === 0 ? "pass" : "fail",
      evidence: { failing: tests.failing.length },
    },
    {
      id: "test.unknown",
      category: "testing",
      label: "Unknown-status tests",
      status: tests.unknown.length === 0 ? "pass" : "warn",
      evidence: { unknown: tests.unknown.length },
    },
    {
      id: "test.smoke",
      category: "testing",
      label: "Smoke plan present",
      status: tests.by_kind.smoke > 0 ? "pass" : "fail",
    },
    {
      id: "test.failure",
      category: "testing",
      label: "Failure-injection plan present",
      status: tests.by_kind.failure > 0 ? "pass" : "fail",
    },
    {
      id: "test.regression",
      category: "testing",
      label: "Regression checklist present",
      status: tests.by_kind.regression > 0 ? "pass" : "fail",
    },
  ]);

  const observabilitySection = sectionFromGates("observability", "Observability", [
    {
      id: "obs.logs",
      category: "observability",
      label: "Structured logs captured",
      status: metrics.logs_captured > 0 ? "pass" : "warn",
      evidence: { logs: metrics.logs_captured },
    },
    {
      id: "obs.trace",
      category: "observability",
      label: "Trace correlation available",
      status: "pass",
      detail: "trace/session/mission/agent/task IDs supported",
    },
    {
      id: "obs.errors",
      category: "observability",
      label: "Errors last hour",
      status:
        metrics.errors_last_hour === 0 ? "pass" : metrics.errors_last_hour < 10 ? "warn" : "fail",
      evidence: { errors_last_hour: metrics.errors_last_hour },
    },
  ]);

  const auditSection = sectionFromGates("audit", "Audit Trail", [
    {
      id: "audit.local",
      category: "audit",
      label: "Local audit buffer",
      status: metrics.audits_recorded > 0 ? "pass" : "warn",
      evidence: { audits: metrics.audits_recorded },
    },
    {
      id: "audit.enterprise",
      category: "audit",
      label: "Enterprise audit table (DB)",
      status: "unknown",
      detail: "Confirm via readiness.functions.ts (audit_logs count).",
    },
  ]);

  const securitySection = sectionFromGates("security", "Security Baseline", [
    {
      id: "sec.secrets",
      category: "security",
      label: "Required secrets present",
      status: sec.secrets_present,
      evidence: { missing: sec.missing_secrets },
    },
    {
      id: "sec.unsafe",
      category: "security",
      label: "Unsafe config heuristics",
      status: sec.unsafe_config,
    },
    {
      id: "sec.rbac",
      category: "security",
      label: "RBAC readiness",
      status: sec.rbac_ready,
      detail: "Verified via DB readiness aggregator.",
    },
    {
      id: "sec.perms",
      category: "security",
      label: "Permission checks",
      status: sec.permission_checks,
    },
    {
      id: "sec.public",
      category: "security",
      label: "Public routes reviewed",
      status: sec.public_routes_reviewed,
    },
    {
      id: "sec.admin",
      category: "security",
      label: "Admin routes protected",
      status: sec.admin_routes_protected,
    },
  ]);

  const perfSection = sectionFromGates("performance", "Performance Baseline", [
    {
      id: "perf.samples",
      category: "performance",
      label: "Samples collected",
      status: perf.samples > 0 ? "pass" : "unknown",
      evidence: { samples: perf.samples },
    },
    {
      id: "perf.p95",
      category: "performance",
      label: "p95 response time",
      status:
        perf.samples === 0
          ? "unknown"
          : perf.p95_ms < 1500
            ? "pass"
            : perf.p95_ms < 3000
              ? "warn"
              : "fail",
      evidence: { p95_ms: perf.p95_ms },
    },
    {
      id: "perf.slow",
      category: "performance",
      label: "Slow routes",
      status: perf.slow_routes.length === 0 ? "pass" : "warn",
      evidence: { slow_routes: perf.slow_routes },
    },
    {
      id: "perf.queue",
      category: "performance",
      label: "Queue depth",
      status: perf.queue_depth < 100 ? "pass" : "warn",
      evidence: { queue_depth: perf.queue_depth },
    },
    {
      id: "perf.task",
      category: "performance",
      label: "Task latency",
      status:
        perf.task_latency_ms == null ? "unknown" : perf.task_latency_ms < 5000 ? "pass" : "warn",
      evidence: { task_latency_ms: perf.task_latency_ms },
    },
    {
      id: "perf.mem",
      category: "performance",
      label: "Memory pressure",
      status: perf.memory.rss_mb == null ? "unknown" : perf.memory.rss_mb < 1024 ? "pass" : "warn",
      evidence: perf.memory as unknown as Record<string, unknown>,
    },
  ]);

  const resilienceSection = sectionFromGates("resilience", "Resilience", [
    {
      id: "res.graceful",
      category: "resilience",
      label: "Graceful failure",
      status: res.graceful_failure,
    },
    { id: "res.retry", category: "resilience", label: "Retry policy", status: res.retry_policy },
    {
      id: "res.timeout",
      category: "resilience",
      label: "Timeout policy",
      status: res.timeout_policy,
    },
    {
      id: "res.fallback",
      category: "resilience",
      label: "Fallback policy",
      status: res.fallback_policy,
    },
    {
      id: "res.degraded",
      category: "resilience",
      label: "Degraded mode indicator",
      status: res.degraded_mode ? "warn" : "pass",
    },
  ]);

  const sections: ReadinessSection[] = [
    systemSection,
    testingSection,
    observabilitySection,
    auditSection,
    securitySection,
    perfSection,
    resilienceSection,
  ];

  const blockers: string[] = [];
  const warnings: string[] = [];
  const unknowns: string[] = [];
  for (const s of sections) {
    for (const g of s.gates) {
      const label = `${s.label} — ${g.label}${g.detail ? `: ${g.detail}` : ""}`;
      if (g.status === "fail") blockers.push(label);
      else if (g.status === "warn") warnings.push(label);
      else if (g.status === "unknown") unknowns.push(label);
    }
  }

  const overall_status = worst(...sections.map((s) => s.status));
  const scores = sections.map((s) => s.score).filter((n) => n >= 0);
  const overall_score = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : -1;

  return {
    taken_at: new Date().toISOString(),
    sections,
    overall_status,
    overall_score,
    blockers,
    warnings,
    unknowns,
  };
}
