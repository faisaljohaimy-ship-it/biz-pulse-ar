/**
 * Retry engine — exponential backoff with reason tracking + AbortSignal.
 */
import type { Task, TaskRetryPolicy } from "./types";

export const DEFAULT_RETRY: TaskRetryPolicy = {
  max_attempts: 2,
  base_backoff_ms: 500,
  factor: 2,
};

export function nextBackoffMs(policy: TaskRetryPolicy, attempt: number): number {
  const raw = policy.base_backoff_ms * Math.pow(policy.factor, Math.max(0, attempt));
  return Math.min(30_000, Math.round(raw));
}

export function shouldRetry(task: Task, policy: TaskRetryPolicy): boolean {
  return task.retryCount + 1 < policy.max_attempts;
}

export async function abortableDelay(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) return;
  await new Promise<void>((resolve) => {
    const t = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      resolve();
    };
    if (signal.aborted) {
      clearTimeout(t);
      resolve();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}
