/**
 * Queue subsystem — a set of in-memory sub-queues per mission:
 * FIFO / Priority / Delayed / Retry / Cancelled / Completed / Dead Letter.
 *
 * Not durable. Bounded to the lifetime of the mission run, matching the
 * orchestrator's process model.
 */
import type { Task, TaskPriority } from "./types";
import { comparePriority } from "./priority.server";

interface MissionQueues {
  main: Task[]; // priority queue (sorted on insert)
  delayed: { task: Task; readyAt: number }[];
  retry: { task: Task; readyAt: number }[];
  cancelled: Task[];
  completed: Task[];
  dead_letter: Task[];
  running: Set<string>;
  waiting_approval: Task[];
  all: Map<string, Task>;
}

const missions = new Map<string, MissionQueues>();

function forMission(missionId: string): MissionQueues {
  let q = missions.get(missionId);
  if (!q) {
    q = {
      main: [],
      delayed: [],
      retry: [],
      cancelled: [],
      completed: [],
      dead_letter: [],
      running: new Set(),
      waiting_approval: [],
      all: new Map(),
    };
    missions.set(missionId, q);
  }
  return q;
}

export function registerTask(task: Task): void {
  forMission(task.missionId).all.set(task.taskId, task);
}

export function getTask(missionId: string, taskId: string): Task | undefined {
  return missions.get(missionId)?.all.get(taskId);
}

export function listTasks(missionId: string): Task[] {
  return Array.from(missions.get(missionId)?.all.values() ?? []);
}

/** Priority-ordered insert into the main queue. */
export function enqueueMain(task: Task): void {
  const q = forMission(task.missionId);
  q.main.push(task);
  q.main.sort((a, b) => comparePriority(a.priority, b.priority));
}

export function enqueueDelayed(task: Task, readyAt: number): void {
  forMission(task.missionId).delayed.push({ task, readyAt });
}

export function enqueueRetry(task: Task, readyAt: number): void {
  forMission(task.missionId).retry.push({ task, readyAt });
}

export function enqueueApproval(task: Task): void {
  forMission(task.missionId).waiting_approval.push(task);
}

export function markRunning(task: Task): void {
  forMission(task.missionId).running.add(task.taskId);
}

export function markFinishedFromRunning(task: Task): void {
  forMission(task.missionId).running.delete(task.taskId);
}

export function pushCompleted(task: Task): void {
  forMission(task.missionId).completed.push(task);
}

export function pushCancelled(task: Task): void {
  forMission(task.missionId).cancelled.push(task);
}

export function pushDeadLetter(task: Task): void {
  forMission(task.missionId).dead_letter.push(task);
}

/**
 * Pull all tasks whose dependencies are met AND that are ready-in-time.
 * Also promotes delayed/retry entries that have crossed their readyAt.
 */
export function drainReady(missionId: string, now: number): Task[] {
  const q = forMission(missionId);
  // Promote delayed → main
  q.delayed = q.delayed.filter(({ task, readyAt }) => {
    if (readyAt <= now) {
      enqueueMain(task);
      return false;
    }
    return true;
  });
  // Promote retry → main
  q.retry = q.retry.filter(({ task, readyAt }) => {
    if (readyAt <= now) {
      enqueueMain(task);
      return false;
    }
    return true;
  });

  const depsMet = (t: Task) =>
    t.dependencies.every((depId) => {
      const dep = q.all.get(depId);
      return !!dep && (dep.status === "completed" || dep.status === "merged");
    });

  const ready: Task[] = [];
  q.main = q.main.filter((t) => {
    if (depsMet(t)) {
      ready.push(t);
      return false;
    }
    return true;
  });
  ready.sort((a, b) => comparePriority(a.priority, b.priority));
  return ready;
}

export function hasWork(missionId: string): boolean {
  const q = missions.get(missionId);
  if (!q) return false;
  return (
    q.main.length > 0 ||
    q.delayed.length > 0 ||
    q.retry.length > 0 ||
    q.waiting_approval.length > 0 ||
    q.running.size > 0
  );
}

export interface QueueDepths {
  queued: number;
  delayed: number;
  retry: number;
  waiting_approval: number;
  running: number;
}

export function depths(missionId?: string): QueueDepths {
  let queued = 0,
    delayed = 0,
    retry = 0,
    waiting = 0,
    running = 0;
  const iter = missionId
    ? missions.has(missionId)
      ? [missions.get(missionId)!]
      : []
    : Array.from(missions.values());
  for (const q of iter) {
    queued += q.main.length;
    delayed += q.delayed.length;
    retry += q.retry.length;
    waiting += q.waiting_approval.length;
    running += q.running.size;
  }
  return { queued, delayed, retry, waiting_approval: waiting, running };
}

export function disposeMission(missionId: string): void {
  missions.delete(missionId);
}

/** Detect a cycle in the current mission's dependency graph. */
export function detectCycle(missionId: string): string[] | null {
  const q = missions.get(missionId);
  if (!q) return null;
  const WHITE = 0,
    GRAY = 1,
    BLACK = 2;
  const color = new Map<string, number>();
  const stack: string[] = [];
  const visit = (id: string): string[] | null => {
    color.set(id, GRAY);
    stack.push(id);
    const t = q.all.get(id);
    for (const dep of t?.dependencies ?? []) {
      const c = color.get(dep) ?? WHITE;
      if (c === GRAY) return [...stack, dep];
      if (c === WHITE) {
        const found = visit(dep);
        if (found) return found;
      }
    }
    stack.pop();
    color.set(id, BLACK);
    return null;
  };
  for (const id of q.all.keys()) {
    if ((color.get(id) ?? WHITE) === WHITE) {
      const found = visit(id);
      if (found) return found;
    }
  }
  return null;
}
