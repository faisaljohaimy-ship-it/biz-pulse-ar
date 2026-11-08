/**
 * Critical urgent tasks are ordered by urgency, then by the earliest valid due date.
 * An invalid date must not leave a NaN comparator result (which sort treats as a tie).
 */
type UrgentSortRow = { priority: string; due_at: string | null };

const priorityRank = (priority: string) =>
  priority === "عاجل جدًا" ? 0 : priority === "عاجل" ? 1 : 2;

function dueDateRank(value: string | null): number {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

export function compareUrgentTasks(a: UrgentSortRow, b: UrgentSortRow): number {
  return (
    priorityRank(a.priority) - priorityRank(b.priority) ||
    dueDateRank(a.due_at) - dueDateRank(b.due_at)
  );
}
