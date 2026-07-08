/**
 * Phase 9.3 — Timeout wrapper.
 */

export class ToolTimeoutError extends Error {
  constructor(
    public readonly ms: number,
    public readonly toolId: string,
  ) {
    super(`tools: timeout after ${ms}ms (${toolId})`);
    this.name = "ToolTimeoutError";
  }
}

export async function runWithTimeout<T>(
  work: () => Promise<T>,
  ms: number,
  toolId: string,
): Promise<T> {
  if (!Number.isFinite(ms) || ms <= 0) return work();
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await new Promise<T>((resolve, reject) => {
      timer = setTimeout(() => reject(new ToolTimeoutError(ms, toolId)), ms);
      work().then(resolve, reject);
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
}
