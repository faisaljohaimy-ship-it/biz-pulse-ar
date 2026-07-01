/**
 * Phase 9.2 — Worker pool. Represents runtime workers coordinating agent
 * activity. Workers are cooperative; they do not execute business logic.
 */

import type { WorkerDescriptor } from "./types";

const workers = new Map<string, WorkerDescriptor>();

function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function spawnWorker(): WorkerDescriptor {
  const now = new Date().toISOString();
  const w: WorkerDescriptor = {
    worker_id: newId("wrk"),
    agent_id: null,
    started_at: now,
    last_seen_at: now,
    status: "idle",
  };
  workers.set(w.worker_id, w);
  return w;
}

export function assignWorker(workerId: string, agentId: string): WorkerDescriptor {
  const w = workers.get(workerId);
  if (!w) throw new Error(`runtime: worker not found ${workerId}`);
  if (w.status === "terminated") throw new Error(`runtime: worker terminated ${workerId}`);
  const next: WorkerDescriptor = {
    ...w,
    agent_id: agentId,
    status: "busy",
    last_seen_at: new Date().toISOString(),
  };
  workers.set(workerId, next);
  return next;
}

export function releaseWorker(workerId: string): WorkerDescriptor {
  const w = workers.get(workerId);
  if (!w) throw new Error(`runtime: worker not found ${workerId}`);
  const next: WorkerDescriptor = {
    ...w,
    agent_id: null,
    status: "idle",
    last_seen_at: new Date().toISOString(),
  };
  workers.set(workerId, next);
  return next;
}

export function heartbeat(workerId: string): void {
  const w = workers.get(workerId);
  if (!w) return;
  workers.set(workerId, { ...w, last_seen_at: new Date().toISOString() });
}

export function drainWorker(workerId: string): void {
  const w = workers.get(workerId);
  if (!w) return;
  workers.set(workerId, { ...w, status: "draining" });
}

export function terminateWorker(workerId: string): void {
  const w = workers.get(workerId);
  if (!w) return;
  workers.set(workerId, { ...w, status: "terminated", agent_id: null });
}

export function listWorkers(): WorkerDescriptor[] {
  return Array.from(workers.values());
}

export function orphanWorkers(maxIdleMs: number): WorkerDescriptor[] {
  const now = Date.now();
  return listWorkers().filter(
    (w) => w.status !== "terminated" && now - Date.parse(w.last_seen_at) > maxIdleMs,
  );
}

export function clearWorkers(): void {
  workers.clear();
}
