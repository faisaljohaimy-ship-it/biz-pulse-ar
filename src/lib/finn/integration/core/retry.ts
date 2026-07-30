/**
 * Phase 9.1 — Retry engine with exponential backoff + jitter.
 */

import type { RetryPolicy } from "./types";

export const DEFAULT_RETRY: RetryPolicy = {
  max_attempts: 3,
  initial_delay_ms: 200,
  max_delay_ms: 5_000,
  jitter: true,
};

export function nextDelay(policy: RetryPolicy, attempt: number): number {
  const base = Math.min(policy.max_delay_ms, policy.initial_delay_ms * 2 ** attempt);
  if (!policy.jitter) return base;
  return Math.floor(base / 2 + Math.random() * (base / 2));
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  policy: RetryPolicy = DEFAULT_RETRY,
  isRetryable: (err: unknown) => boolean = () => true,
  onRetry?: (attempt: number, err: unknown, delayMs: number) => void,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < policy.max_attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt === policy.max_attempts - 1 || !isRetryable(err)) throw err;
      const delay = nextDelay(policy, attempt);
      onRetry?.(attempt + 1, err, delay);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
