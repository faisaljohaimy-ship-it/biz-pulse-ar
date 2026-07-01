// Release channel policy — deterministic promotion rules.
import type { ReleaseChannel } from "./types";

const ORDER: ReleaseChannel[] = ["canary", "beta", "stable"];

export function nextChannel(current: ReleaseChannel): ReleaseChannel {
  const idx = ORDER.indexOf(current);
  if (idx < 0) return "unknown";
  if (idx === ORDER.length - 1) return current;
  return ORDER[idx + 1];
}

export function canPromote(
  current: ReleaseChannel,
  signals: { probesHealthy: boolean; errorRate: number; minSoakMinutes: number; observedSoakMinutes: number },
): { allowed: boolean; reason: string } {
  if (current === "unknown" || current === "rollback") {
    return { allowed: false, reason: `channel ${current} not promotable` };
  }
  if (!signals.probesHealthy) return { allowed: false, reason: "probes_unhealthy" };
  if (signals.errorRate > 0.01) return { allowed: false, reason: "error_rate_high" };
  if (signals.observedSoakMinutes < signals.minSoakMinutes) {
    return { allowed: false, reason: "soak_incomplete" };
  }
  return { allowed: true, reason: "criteria_met" };
}
