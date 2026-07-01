/**
 * Internal metrics collector. No dashboards, no external export.
 */
import type { BusMetricsSnapshot, Task } from "./types";

interface Counters {
  wait_samples: number[];
  exec_samples: number[];
  completed: number;
  failed: number;
  cancelled: number;
  timed_out: number;
  merged: number;
  dead_letter: number;
}

const counters: Counters = {
  wait_samples: [],
  exec_samples: [],
  completed: 0,
  failed: 0,
  cancelled: 0,
  timed_out: 0,
  merged: 0,
  dead_letter: 0,
};

function push(arr: number[], v: number, cap = 200) {
  arr.push(v);
  while (arr.length > cap) arr.shift();
}

export function recordTaskStart(task: Task) {
  if (!task.startedAt) return;
  const wait = Date.parse(task.startedAt) - Date.parse(task.createdAt);
  if (wait >= 0) push(counters.wait_samples, wait);
}

export function recordTaskEnd(task: Task) {
  if (task.startedAt && task.completedAt) {
    const exec = Date.parse(task.completedAt) - Date.parse(task.startedAt);
    if (exec >= 0) push(counters.exec_samples, exec);
  }
  switch (task.status) {
    case "completed":
      counters.completed += 1;
      break;
    case "failed":
      counters.failed += 1;
      break;
    case "cancelled":
      counters.cancelled += 1;
      break;
    case "timed_out":
      counters.timed_out += 1;
      break;
    case "merged":
      counters.merged += 1;
      break;
    case "dead_letter":
      counters.dead_letter += 1;
      break;
  }
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((s, x) => s + x, 0) / arr.length);
}

export function snapshotMetrics(live: {
  queued: number;
  delayed: number;
  retry: number;
  waiting_approval: number;
  running: number;
}): BusMetricsSnapshot {
  const total = counters.completed + counters.failed + counters.timed_out;
  const success_ratio = total > 0 ? counters.completed / total : 0;
  return {
    queue_depth: live.queued,
    delayed_depth: live.delayed,
    retry_depth: live.retry,
    waiting_approval: live.waiting_approval,
    running: live.running,
    completed: counters.completed,
    failed: counters.failed,
    cancelled: counters.cancelled,
    timed_out: counters.timed_out,
    merged: counters.merged,
    dead_letter: counters.dead_letter,
    avg_wait_ms: avg(counters.wait_samples),
    avg_exec_ms: avg(counters.exec_samples),
    success_ratio,
  };
}
