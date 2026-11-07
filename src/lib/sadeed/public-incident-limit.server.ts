/**
 * Bounded local fallback for anonymous public incident telemetry when the
 * shared rate-limit store is unavailable.
 *
 * The normal 60 requests / 60 seconds quota stays in the shared store. During
 * outages this enforces the SAME per-isolate cap rather than silently allowing
 * unlimited anonymous traffic. It is not a cross-isolate/global guarantee.
 * Memory is bounded against many distinct bucket keys.
 */

export const INCIDENT_FALLBACK_WINDOW_MS = 60_000;
export const INCIDENT_FALLBACK_MAX_REQUESTS = 60;
export const INCIDENT_FALLBACK_MAX_BUCKETS = 2_000;

type IncidentBucket = { startedAt: number; count: number };

// Insertion order follows the start of each quota window, not last use.
// Never evict a LIVE window when an attacker sprays distinct IP buckets;
// evicting it resets that client's 60/60 allowance and bypasses throttling.
const buckets = new Map<string, IncidentBucket>();
let lastObservedNow: number | undefined;

export function allowIncidentDuringStorageOutage(bucketKey: string, now = Date.now()): boolean {
  // A host clock rollback must not leave exhausted buckets blocked until the
  // old wall-clock time returns. Rebase ALL windows by the same delta to keep
  // their ages, counts and oldest-first eviction order intact (fail closed).
  if (lastObservedNow !== undefined && now < lastObservedNow) {
    const delta = lastObservedNow - now;
    for (const bucket of buckets.values()) bucket.startedAt -= delta;
  }
  lastObservedNow = now;

  const previous = buckets.get(bucketKey);
  if (previous && now - previous.startedAt < INCIDENT_FALLBACK_WINDOW_MS) {
    previous.count += 1;
    return previous.count <= INCIDENT_FALLBACK_MAX_REQUESTS;
  }

  // An expired window may be replaced; a live one must not be evicted.
  // If all 2,000 slots are occupied by live windows, deny NEW clients until
  // a slot expires, preserving existing clients' quotas (fail closed).
  if (previous) buckets.delete(bucketKey);
  while (buckets.size >= INCIDENT_FALLBACK_MAX_BUCKETS) {
    const oldest = buckets.entries().next().value as [string, IncidentBucket] | undefined;
    if (!oldest) break;
    if (now - oldest[1].startedAt < INCIDENT_FALLBACK_WINDOW_MS) return false;
    buckets.delete(oldest[0]);
  }

  buckets.set(bucketKey, { startedAt: now, count: 1 });
  return true;
}

/** Unit tests only: reset the process-local counter state. */
export function resetIncidentOutageBucketsForTests(): void {
  buckets.clear();
  lastObservedNow = undefined;
}
