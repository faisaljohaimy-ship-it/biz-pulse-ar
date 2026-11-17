/**
 * Deduplicate simultaneous health probes within one server isolate.
 * Cache the exact availability result for the caller's existing TTL.
 * No change to rate limits, fail-closed policy, or storage deadlines.
 */
export function createHealthProbeCache(
  probe: () => Promise<boolean>,
  ttlMs: number,
  now: () => number = Date.now,
): () => Promise<boolean> {
  let memo: { at: number; unavailable: boolean } | null = null;
  let inFlight: Promise<boolean> | null = null;

  return () => {
    const checkedAt = now();
    if (memo && checkedAt >= memo.at && checkedAt - memo.at < ttlMs) {
      return Promise.resolve(memo.unavailable);
    }
    if (inFlight) return inFlight;

    inFlight = Promise.resolve()
      .then(probe)
      .then((unavailable) => {
        // Storage availability must fail closed even if a runtime probe
        // violates its TypeScript boolean contract (undefined/null/0/etc.).
        // Only an explicit false proves that storage is available.
        const failClosed = unavailable !== false;
        memo = { at: now(), unavailable: failClosed };
        return failClosed;
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };
}
