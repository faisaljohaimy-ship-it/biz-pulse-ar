/**
 * Phase 9.2 — Timeout wrapper. Race a promise against a deadline.
 */

export class RuntimeTimeoutError extends Error {
  constructor(public readonly ms: number, public readonly label: string) {
    super(`runtime: timeout after ${ms}ms (${label})`);
    this.name = "RuntimeTimeoutError";
  }
}

export async function withTimeout<T>(
  work: () => Promise<T>,
  ms: number,
  label = "operation",
): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return work();
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await new Promise<T>((resolve, reject) => {
      timer = setTimeout(() => reject(new RuntimeTimeoutError(ms, label)), ms);
      work().then(resolve, reject);
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}
