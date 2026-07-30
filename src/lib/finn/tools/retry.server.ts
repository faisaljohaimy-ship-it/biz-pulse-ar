/**
 * Phase 9.3 — Retry policy for tool executions.
 */

export interface RetryPlan {
  attempts_allowed: number;
  base_backoff_ms: number;
  max_backoff_ms: number;
  jitter: boolean;
}

export function backoffFor(plan: RetryPlan, attempt: number): number {
  const exp = Math.min(plan.max_backoff_ms, plan.base_backoff_ms * Math.pow(2, attempt - 1));
  const jitter = plan.jitter ? 0.5 + Math.random() : 1;
  return Math.floor(exp * jitter);
}

export function shouldRetry(plan: RetryPlan, attemptsUsed: number, err: unknown): boolean {
  if (attemptsUsed >= plan.attempts_allowed) return false;
  // Retry only on transient categories.
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  if (msg.includes("timeout")) return true;
  if (msg.includes("network")) return true;
  if (msg.includes("temporarily") || msg.includes("temporary")) return true;
  if (msg.includes("rate limit")) return true;
  if (msg.includes("503") || msg.includes("504") || msg.includes("502")) return true;
  return false;
}

export function defaultRetryPlan(maxRetries: number): RetryPlan {
  return {
    attempts_allowed: Math.max(1, maxRetries + 1),
    base_backoff_ms: 200,
    max_backoff_ms: 10_000,
    jitter: true,
  };
}
