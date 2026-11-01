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

const buckets = new Map<string, IncidentBucket>();

export function allowIncidentDuringStorageOutage(bucketKey: string, now = Date.now()): boolean {
  const previous = buckets.get(bucketKey);
  const current =
    !previous || now - previous.startedAt >= INCIDENT_FALLBACK_WINDOW_MS
      ? { startedAt: now, count: 0 }
      : previous;

  current.count += 1;
  buckets.delete(bucketKey);
  buckets.set(bucketKey, current);

  while (buckets.size > INCIDENT_FALLBACK_MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) break;
    buckets.delete(oldest);
  }

  return current.count <= INCIDENT_FALLBACK_MAX_REQUESTS;
}

/** Unit tests only: reset the process-local counter state. */
export function resetIncidentOutageBucketsForTests(): void {
  buckets.clear();
}
