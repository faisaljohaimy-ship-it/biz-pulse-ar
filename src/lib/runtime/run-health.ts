/**
 * A recent failed run is evidence of degradation, not a healthy subsystem.
 * Queued, approval-gated, or unrecognized statuses are not proof of execution.
 * Keep the existing freshness rule and three-valued health vocabulary.
 */
export type RunHealth = "healthy" | "warning" | "unknown";

const FAILED_RUN_STATES = new Set([
  "failed",
  "error",
  "cancelled",
  "canceled",
  "timed_out",
  "timeout",
  "blocked",
  "rejected",
]);

// Only known success and live execution states can support a healthy reading.
// A newly introduced database status must not silently become green.
const EXECUTING_OR_SUCCESSFUL_STATES = new Set([
  "succeeded",
  "success",
  "completed",
  "done",
  "running",
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
  if (!EXECUTING_OR_SUCCESSFUL_STATES.has(status)) return "unknown";
  if (!Number.isFinite(staleAfterMin) || staleAfterMin <= 0) return "unknown";
  return minutesAgo < staleAfterMin ? "healthy" : "warning";
}
