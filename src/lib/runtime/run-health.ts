/**
 * A recent failed run is evidence of degradation, not a healthy subsystem.
 * Keep the existing 24-hour freshness rule and the existing health vocabulary.
 */
export type RunHealth = "healthy" | "warning" | "unknown";

const FAILED_RUN_STATES = new Set([
  "failed",
  "error",
  "cancelled",
  "canceled",
  "timed_out",
  "timeout",
]);

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
  return minutesAgo < staleAfterMin ? "healthy" : "warning";
}
