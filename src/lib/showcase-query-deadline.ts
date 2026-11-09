/** Stop tracking the display fallback deadline as soon as a database query settles. */
export const SHOWCASE_QUERY_DEADLINE_MS = 4_000;

export async function withShowcaseDeadline<T>(
  query: PromiseLike<T>,
  deadlineMs = SHOWCASE_QUERY_DEADLINE_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(query),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("showcase-timeout")), deadlineMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
