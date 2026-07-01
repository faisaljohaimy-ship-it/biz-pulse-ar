/**
 * Phase 8.5 — Adaptive retry engine. Retry decisions consult the
 * failure classification (transient/timeout only), a per-session
 * budget, and exponential backoff. Alternative-capability fallback
 * is delegated to the recovery module (which queries the Marketplace).
 */
import type { ExecutionFailure } from "./types";
import { getSession } from "./session.server";

export interface RetryPolicy {
  max_attempts: number;
  base_backoff_ms: number;
  factor: number;
  jitter_ms: number;
  budget_per_session: number;
}

export const DEFAULT_RETRY: RetryPolicy = {
  max_attempts: 3,
  base_backoff_ms: 750,
  factor: 2,
  jitter_ms: 250,
  budget_per_session: 24,
};

export interface RetryDecision {
  retry: boolean;
  attempt: number;
  delay_ms: number;
  reason: string;
}

export function decideRetry(
  sessionId: string,
  failure: ExecutionFailure,
  attempt: number,
  policy: RetryPolicy = DEFAULT_RETRY,
): RetryDecision {
  const session = getSession(sessionId);
  if (!session) {
    return { retry: false, attempt, delay_ms: 0, reason: "session missing" };
  }
  if (!failure.retryable) {
    return { retry: false, attempt, delay_ms: 0, reason: `failure kind ${failure.kind} is not retryable` };
  }
  if (attempt >= policy.max_attempts) {
    return { retry: false, attempt, delay_ms: 0, reason: "attempts exhausted" };
  }
  if (session.metrics.retry_count >= policy.budget_per_session) {
    return { retry: false, attempt, delay_ms: 0, reason: "retry budget exhausted" };
  }
  const base = policy.base_backoff_ms * Math.pow(policy.factor, Math.max(0, attempt));
  const jitter = Math.floor(Math.random() * policy.jitter_ms);
  const delay = Math.min(30_000, Math.round(base + jitter));
  return { retry: true, attempt: attempt + 1, delay_ms: delay, reason: `transient backoff #${attempt + 1}` };
}
