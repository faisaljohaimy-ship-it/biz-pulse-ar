// Presence tracker — online/offline classification.
import type { PresenceReport } from "./types";
import { PresenceInputZ } from "./contracts";

export function observePresence(input: {
  nodeId: string;
  lastSeenAt: string | null;
  rttMs: number | null;
  now: string;
  offlineAfterMs?: number;
}): PresenceReport {
  const parsed = PresenceInputZ.parse({
    nodeId: input.nodeId,
    lastSeenAt: input.lastSeenAt,
    rttMs: input.rttMs,
    now: input.now,
  });
  const threshold = input.offlineAfterMs ?? 20_000;
  let online = false;
  if (parsed.lastSeenAt) {
    online = Date.parse(parsed.now) - Date.parse(parsed.lastSeenAt) <= threshold;
  }
  return {
    nodeId: parsed.nodeId,
    online,
    lastSeenAt: parsed.lastSeenAt,
    rttMs: parsed.rttMs,
  };
}
