export type EventConsumerHealth = "healthy" | "warning" | "unknown";

/** Failed or missing backlog reads must never report the event consumer as healthy. */
export function eventConsumerHealth(
  pendingBacklog: number | null | undefined,
  queryFailed = false,
): EventConsumerHealth {
  if (
    queryFailed ||
    pendingBacklog == null ||
    !Number.isSafeInteger(pendingBacklog) ||
    pendingBacklog < 0
  ) {
    return "unknown";
  }
  return pendingBacklog > 100 ? "warning" : "healthy";
}
