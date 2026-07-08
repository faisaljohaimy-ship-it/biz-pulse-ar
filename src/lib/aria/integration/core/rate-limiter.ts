/**
 * Phase 9.1 — Token-bucket rate limiter.
 */

import type { RateLimitPolicy } from "./types";

export const DEFAULT_RATE_LIMIT: RateLimitPolicy = {
  requests_per_second: 10,
  burst: 20,
};

interface Bucket {
  tokens: number;
  last_refill: number;
  capacity: number;
  refill_per_ms: number;
}

const BUCKETS = new Map<string, Bucket>();

function bucket(id: string, policy: RateLimitPolicy): Bucket {
  let b = BUCKETS.get(id);
  if (!b) {
    b = {
      tokens: policy.burst,
      last_refill: Date.now(),
      capacity: policy.burst,
      refill_per_ms: policy.requests_per_second / 1000,
    };
    BUCKETS.set(id, b);
  }
  return b;
}

function refill(b: Bucket): void {
  const now = Date.now();
  const elapsed = now - b.last_refill;
  if (elapsed <= 0) return;
  b.tokens = Math.min(b.capacity, b.tokens + elapsed * b.refill_per_ms);
  b.last_refill = now;
}

export function tryConsume(id: string, policy: RateLimitPolicy = DEFAULT_RATE_LIMIT): boolean {
  const b = bucket(id, policy);
  refill(b);
  if (b.tokens >= 1) {
    b.tokens -= 1;
    return true;
  }
  return false;
}

export async function acquire(
  id: string,
  policy: RateLimitPolicy = DEFAULT_RATE_LIMIT,
): Promise<void> {
  const b = bucket(id, policy);
  while (true) {
    refill(b);
    if (b.tokens >= 1) {
      b.tokens -= 1;
      return;
    }
    const needed = (1 - b.tokens) / b.refill_per_ms;
    await new Promise((r) => setTimeout(r, Math.max(5, Math.ceil(needed))));
  }
}

export function resetRateLimiter(id?: string): void {
  if (id) BUCKETS.delete(id);
  else BUCKETS.clear();
}
