/**
 * A recent failed run is evidence of degradation, not a healthy subsystem.
 * Only observed successful or actively running states can count as healthy;
 * queued, approval-gated and unrecognized statuses cannot prove operation.
 * Keep the existing 24-hour freshness rule and existing health vocabulary.
 */
export type RunHealth = "healthy" | "warning" | "unknown";

const FAILED_RUN_STATES = new Set([
  "failed",
  "error",
  "cancelled",
  "canceled",
  "timed_out",
  "timeout",
  "rejected",
  "rolled_back",
]);
const HEALTHY_RUN_STATES = new Set(["succeeded", "running"]);

export function recentExecutionHealth(
  minutesAgo: number | null,
  lastStatus: string | null | undefined,
  staleAfterMin: number,
): RunHealth {
  if (minutesAgo === null || !Number.isFinite(minutesAgo) || minutesAgo < 0) return "unknown";
  const status = lastStatus?.trim().toLowerCase();
  if (!status) return "unknown";
  if (FAILED_RUN_STATES.has(status)) return "warning";
  if (!Number.isFinite(staleAfterMin) || staleAfterMin <= 0) return "unknown";
  if (minutesAgo >= staleAfterMin) return "warning";
  return HEALTHY_RUN_STATES.has(status) ? "healthy" : "unknown";
}
