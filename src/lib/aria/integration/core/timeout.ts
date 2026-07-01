/**
 * Phase 9.1 — Timeout helper for connector calls.
 */

import type { TimeoutPolicy } from "./types";

export const DEFAULT_TIMEOUT: TimeoutPolicy = {
  connect_ms: 5_000,
  request_ms: 30_000,
};

export class TimeoutError extends Error {
  constructor(op: string, ms: number) {
    super(`Timeout: ${op} exceeded ${ms}ms`);
    this.name = "TimeoutError";
  }
}

export async function withTimeout<T>(
  op: string,
  ms: number,
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } catch (err) {
    if (controller.signal.aborted) throw new TimeoutError(op, ms);
    throw err;
  } finally {
    clearTimeout(t);
  }
}
