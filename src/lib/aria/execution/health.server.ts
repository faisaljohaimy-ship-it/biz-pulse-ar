/**
 * Phase 8.5 — Execution health probe. Derives a coarse health signal
 * from the session's failures, retries, blocked tasks, and pending
 * approvals.
 */
import type { ExecutionHealth } from "./types";
import { getSession, setHealth } from "./session.server";
import { evaluatePolicies } from "./policy.server";
import { pendingApprovals } from "./approval.server";

export function assessHealth(sessionId: string): ExecutionHealth {
  const s = getSession(sessionId);
  if (!s) return "critical";

  const violations = evaluatePolicies(sessionId);
  const hard = violations.some((v) => v.hard);
  if (hard) {
    setHealth(sessionId, "critical", "hard policy violation");
    return "critical";
  }

  if (s.state === "recovering" || s.state === "rolling_back") {
    setHealth(sessionId, "recovering", "recovery in progress");
    return "recovering";
  }

  const pending = pendingApprovals(sessionId);
  if (pending.length && s.progress.running === 0) {
    setHealth(sessionId, "blocked", `waiting on ${pending.length} approval(s)`);
    return "blocked";
  }

  const total = s.progress.total || 1;
  const failedRatio = s.progress.failed / total;
  if (failedRatio > 0.25 || s.metrics.retry_count >= 6) {
    setHealth(
      sessionId,
      "degraded",
      `failed ${s.progress.failed}/${s.progress.total}, retries ${s.metrics.retry_count}`,
    );
    return "degraded";
  }

  setHealth(sessionId, "healthy", "nominal");
  return "healthy";
}
