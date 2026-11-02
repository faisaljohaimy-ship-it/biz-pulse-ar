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
        memo = { at: now(), unavailable };
        return unavailable;
      })
      .finally(() => {
        inFlight = null;
      });
    return inFlight;
  };
}
