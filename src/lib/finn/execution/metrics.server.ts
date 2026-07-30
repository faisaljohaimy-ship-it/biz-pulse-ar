/**
 * Phase 8.5 — Internal execution telemetry.
 */
import type { ExecutionMetrics } from "./types";
import { getSession, listSessions } from "./session.server";

export function refreshMetrics(sessionId: string): ExecutionMetrics | null {
  const s = getSession(sessionId);
  if (!s) return null;
  const startMs = s.started_at ? new Date(s.started_at).getTime() : Date.now();
  const endMs = s.finished_at ? new Date(s.finished_at).getTime() : Date.now();
  const duration = Math.max(0, endMs - startMs);
  const completed = s.progress.completed;
  const failed = s.progress.failed;
  const attempts = completed + failed || 1;
  const throughput = duration > 0 ? completed / (duration / 1000) : 0;
  const critical = criticalPathDelay(s.progress.critical_path.length, completed);

  s.metrics = {
    ...s.metrics,
    duration_ms: duration,
    task_throughput: Math.round(throughput * 100) / 100,
    success_rate: Math.round((completed / attempts) * 100) / 100,
    critical_path_delay_ms: critical,
  };
  return s.metrics;
}

function criticalPathDelay(criticalLen: number, completed: number): number {
  const behind = Math.max(0, criticalLen - completed);
  return behind * 250;
}

export interface AggregateExecutionMetrics {
  active_sessions: number;
  completed_sessions: number;
  failed_sessions: number;
  average_success_rate: number;
  total_retries: number;
  total_rollbacks: number;
  total_recoveries: number;
}

export function aggregateMetrics(): AggregateExecutionMetrics {
  const all = listSessions();
  const active = all.filter(
    (s) => s.state === "running" || s.state === "paused" || s.state === "recovering",
  ).length;
  const completed = all.filter((s) => s.state === "completed").length;
  const failed = all.filter((s) => s.state === "failed").length;
  const rates = all.map((s) => s.metrics.success_rate).filter((n) => Number.isFinite(n) && n > 0);
  const avg = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
  return {
    active_sessions: active,
    completed_sessions: completed,
    failed_sessions: failed,
    average_success_rate: Math.round(avg * 100) / 100,
    total_retries: all.reduce((a, s) => a + s.metrics.retry_count, 0),
    total_rollbacks: all.reduce((a, s) => a + s.metrics.rollback_count, 0),
    total_recoveries: all.reduce((a, s) => a + s.metrics.recovery_count, 0),
  };
}
