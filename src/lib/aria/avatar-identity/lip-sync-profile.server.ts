// Lip-sync profile — declarative constraints for the mouth channel.
import { getAriaIdentity } from "./identity.server";
import type { LipSyncRule } from "./types";

export function getLipSyncProfile(): LipSyncRule {
  return getAriaIdentity().lip_sync;
}

export function isLipSyncCompliant(input: {
  readonly latency_ms: number;
  readonly overshoot: number;
}): boolean {
  const p = getLipSyncProfile();
  return input.latency_ms <= p.latency_ms_max && input.overshoot <= p.overshoot_max;
}
