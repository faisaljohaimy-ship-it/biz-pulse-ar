/**
 * Critical urgent tasks are ordered by urgency, then by the earliest valid due date.
 * An invalid date must not leave a NaN comparator result (which sort treats as a tie).
 */
type UrgentSortRow = { priority: string; due_at: string | null };

const priorityRank = (priority: string) =>
  priority === "عاجل جدًا" ? 0 : priority === "عاجل" ? 1 : 2;

function dueDateRank(value: string | null): number {
  // Date.parse accepts malformed strings such as "2026-11-08junk" as a
  // completely different valid date. Database deadlines must be ISO-shaped.
  // Realtime/database payloads may violate the declared nullable-string type.
  // Malformed values must sort last instead of crashing the urgent-task panel.
  if (typeof value !== "string") return Number.MAX_SAFE_INTEGER;
  const match = value.match(
    /^(\d{4}-\d{2}-\d{2})(?:[T ]((?:[01]\d|2[0-3]):\d{2}:\d{2}(?:\.\d+)?)(Z|[+-]\d{2}(?::?\d{2})?)?)?$/,
  );
  if (!match) return Number.MAX_SAFE_INTEGER;
  const calendarDate = new Date(`${match[1]}T00:00:00Z`);
  if (
    !Number.isFinite(calendarDate.getTime()) ||
    calendarDate.toISOString().slice(0, 10) !== match[1]
  ) {
    return Number.MAX_SAFE_INTEGER;
  }
  // RFC 3339 hours stop at 23; Date.parse silently rolls 24:00 into the next day.
  // Offset-free timestamps must not be interpreted in the host local zone.
  // Keep the same instant regardless of where the app or CI runner executes.
  const normalized = match[2] ? `${match[1]}T${match[2]}${match[3] ?? "Z"}` : match[1];
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

export function compareUrgentTasks(a: UrgentSortRow, b: UrgentSortRow): number {
  return (
    priorityRank(a.priority) - priorityRank(b.priority) ||
    dueDateRank(a.due_at) - dueDateRank(b.due_at)
  );
}
