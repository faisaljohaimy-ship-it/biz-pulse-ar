/**
 * Phase 8.5 — Progress calculator. Derives progress from Task Bus
 * task snapshots (read-only) and the session's own accounting.
 */
import type { ExecutionProgress } from "./types";
import { listTasks } from "../task-bus";
import type { Task } from "../task-bus";
import { getSession } from "./session.server";
import { emitExecutionEvent } from "./events";

export function computeProgress(sessionId: string, missionId: string): ExecutionProgress {
  const tasks: Task[] = listTasks(missionId);
  const total = tasks.length;
  const counts = {
    completed: 0,
    running: 0,
    blocked: 0,
    failed: 0,
    cancelled: 0,
    skipped: 0,
    remaining: 0,
  };

  for (const t of tasks) {
    switch (t.status) {
      case "completed":
        counts.completed += 1;
        break;
      case "running":
      case "dispatched":
        counts.running += 1;
        break;
      case "waiting_dependency":
      case "waiting_approval":
      case "delayed":
        counts.blocked += 1;
        counts.remaining += 1;
        break;
      case "failed":
      case "timed_out":
      case "dead_letter":
        counts.failed += 1;
        break;
      case "cancelled":
        counts.cancelled += 1;
        break;
      case "merged":
        counts.skipped += 1;
        break;
      case "queued":
        counts.remaining += 1;
        break;
    }
  }

  // Estimate ETA from running average duration of completed tasks.
  const completedWithDuration = tasks.filter(
    (t) => t.status === "completed" && t.startedAt && t.completedAt,
  );
  const avgMs =
    completedWithDuration.length > 0
      ? completedWithDuration.reduce((sum, t) => {
          const start = new Date(t.startedAt!).getTime();
          const end = new Date(t.completedAt!).getTime();
          return sum + Math.max(0, end - start);
        }, 0) / completedWithDuration.length
      : 0;

  const remainingWork = counts.remaining + counts.running;
  const eta_ms = avgMs > 0 && remainingWork > 0 ? Math.round(avgMs * remainingWork) : null;

  // Critical path proxy: longest chain of dependencies among not-yet-completed tasks.
  const critical = criticalPath(tasks);

  const percent = total === 0 ? 0 : Math.round((counts.completed / total) * 100);

  const progress: ExecutionProgress = {
    ...counts,
    total,
    critical_path: critical,
    eta_ms,
    percent,
  };

  const s = getSession(sessionId);
  if (s) {
    s.progress = progress;
    emitExecutionEvent("ProgressUpdated", sessionId, missionId, {
      percent,
      completed: counts.completed,
      total,
    });
  }
  return progress;
}

function criticalPath(tasks: Task[]): string[] {
  if (!tasks.length) return [];
  const byId = new Map(tasks.map((t) => [t.taskId, t]));
  const memo = new Map<string, string[]>();
  const walk = (id: string, seen: Set<string>): string[] => {
    if (memo.has(id)) return memo.get(id)!;
    if (seen.has(id)) return [];
    seen.add(id);
    const t = byId.get(id);
    if (!t) return [];
    let best: string[] = [];
    for (const dep of t.dependencies) {
      const path = walk(dep, new Set(seen));
      if (path.length > best.length) best = path;
    }
    const result = [...best, id];
    memo.set(id, result);
    return result;
  };
  let longest: string[] = [];
  for (const t of tasks) {
    const p = walk(t.taskId, new Set());
    if (p.length > longest.length) longest = p;
  }
  return longest;
}
