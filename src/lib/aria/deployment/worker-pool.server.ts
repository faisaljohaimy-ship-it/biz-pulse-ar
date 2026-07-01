// Per-node worker pool.
import type { WorkerPool, WorkerSlot } from "./types";
import { WorkerPoolInputZ } from "./contracts";

export function createWorkerPool(input: {
  nodeId: string;
  size: number;
  now: string;
}): WorkerPool {
  const parsed = WorkerPoolInputZ.parse(input);
  const slots: WorkerSlot[] = Array.from({ length: parsed.size }).map((_, i) => ({
    id: `${parsed.nodeId}:w${i + 1}`,
    nodeId: parsed.nodeId,
    busy: false,
    startedAt: parsed.now,
  }));
  return { nodeId: parsed.nodeId, size: parsed.size, slots };
}

export function claimSlot(pool: WorkerPool): { pool: WorkerPool; slot: WorkerSlot | null } {
  const idx = pool.slots.findIndex((s) => !s.busy);
  if (idx < 0) return { pool, slot: null };
  const slot = { ...pool.slots[idx], busy: true };
  const slots = pool.slots.map((s, i) => (i === idx ? slot : s));
  return { pool: { ...pool, slots }, slot };
}

export function releaseSlot(pool: WorkerPool, slotId: string): WorkerPool {
  const slots = pool.slots.map((s) => (s.id === slotId ? { ...s, busy: false } : s));
  return { ...pool, slots };
}

export function utilization(pool: WorkerPool): number {
  if (pool.slots.length === 0) return 0;
  const busy = pool.slots.filter((s) => s.busy).length;
  return busy / pool.slots.length;
}
