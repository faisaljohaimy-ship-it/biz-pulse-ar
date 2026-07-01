/**
 * Phase 9.2 — Retry policy. Coordinates retry counts against agent budget.
 */

import { requireAgent } from "./registry.server";
import { chargeBudget } from "./budget.server";

export interface RetryDecision {
  should_retry: boolean;
  attempt: number;
  max_retries: number;
  backoff_ms: number;
  reason: string;
}

export interface RetryOptions {
  base_backoff_ms?: number;
  max_backoff_ms?: number;
  jitter?: boolean;
}

export function planRetry(agentId: string, opts: RetryOptions = {}): RetryDecision {
  const rec = requireAgent(agentId);
  const attempt = rec.usage.retries_used + 1;
  const max = rec.spec.budget.max_retries;
  if (attempt > max) {
    return {
      should_retry: false,
      attempt,
      max_retries: max,
      backoff_ms: 0,
      reason: "retries exhausted",
    };
  }
  const base = opts.base_backoff_ms ?? 250;
  const cap = opts.max_backoff_ms ?? 15_000;
  const exp = Math.min(cap, base * Math.pow(2, attempt - 1));
  const jitter = opts.jitter === false ? 1 : 0.5 + Math.random();
  const backoff = Math.floor(exp * jitter);
  chargeBudget(agentId, { retries_used: 1 });
  return {
    should_retry: true,
    attempt,
    max_retries: max,
    backoff_ms: backoff,
    reason: "exponential backoff",
  };
}
