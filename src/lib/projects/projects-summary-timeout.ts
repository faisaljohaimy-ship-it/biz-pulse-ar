/**
 * Bound the live project-summary query without retaining a 4-second timer after
 * the database has already settled. A rejected query also clears the timer.
 */
const TIMEOUT_MS = 4_000;

export async function withProjectsSummaryTimeout<T>(operation: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("projects-summary-timeout")), TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
