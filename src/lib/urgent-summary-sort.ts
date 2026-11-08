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
  const match = value?.match(
    /^(\d{4}-\d{2}-\d{2})(?:[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}(?::?\d{2})?)?)?$/,
  );
  if (!match) return Number.MAX_SAFE_INTEGER;
  const calendarDate = new Date(`${match[1]}T00:00:00Z`);
  if (
    !Number.isFinite(calendarDate.getTime()) ||
    calendarDate.toISOString().slice(0, 10) !== match[1]
  ) {
    return Number.MAX_SAFE_INTEGER;
  }
  const parsed = Date.parse(value!);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

export function compareUrgentTasks(a: UrgentSortRow, b: UrgentSortRow): number {
  return (
    priorityRank(a.priority) - priorityRank(b.priority) ||
    dueDateRank(a.due_at) - dueDateRank(b.due_at)
  );
}
