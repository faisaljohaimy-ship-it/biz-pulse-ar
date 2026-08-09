/**
 * Priority engine — numeric ranks, escalation, and inheritance helpers.
 */
import type { TaskPriority } from "./types";

const RANK: Record<TaskPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  background: 0,
};

export function priorityRank(p: TaskPriority): number {
  return RANK[p];
}

export function comparePriority(a: TaskPriority, b: TaskPriority): number {
  return RANK[b] - RANK[a];
}

/** Priority escalation — bump one level toward critical. */
export function escalate(p: TaskPriority): TaskPriority {
  const order: TaskPriority[] = ["background", "low", "medium", "high", "critical"];
  const i = order.indexOf(p);
  return order[Math.min(order.length - 1, i + 1)];
}

/** Priority inheritance — a task inherits the max of its own and parent's. */
export function inherit(child: TaskPriority, parent: TaskPriority | undefined): TaskPriority {
  if (!parent) return child;
  return RANK[parent] > RANK[child] ? parent : child;
}
