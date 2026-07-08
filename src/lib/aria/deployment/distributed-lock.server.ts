// In-process distributed lock coordinator with fencing tokens.
// Intended to back cluster-safe operations; the store is pluggable.
import type { DistributedLock } from "./types";
import { AcquireLockInputZ } from "./contracts";

export interface LockStore {
  get(key: string): DistributedLock | null;
  set(lock: DistributedLock): void;
  del(key: string): void;
}

export function createMemoryLockStore(): LockStore {
  const map = new Map<string, DistributedLock>();
  return {
    get: (k) => map.get(k) ?? null,
    set: (l) => {
      map.set(l.key, l);
    },
    del: (k) => {
      map.delete(k);
    },
  };
}

let fencingCounter = 0;

export function acquireLock(
  store: LockStore,
  input: { key: string; nodeId: string; ttlMs: number; now: string },
): { acquired: boolean; lock: DistributedLock | null; reason: string } {
  const parsed = AcquireLockInputZ.parse(input);
  const existing = store.get(parsed.key);
  const nowMs = Date.parse(parsed.now);
  if (
    existing &&
    Date.parse(existing.expiresAt) > nowMs &&
    existing.holderNodeId !== parsed.nodeId
  ) {
    return { acquired: false, lock: existing, reason: "held_by_other" };
  }
  fencingCounter += 1;
  const lock: DistributedLock = {
    key: parsed.key,
    holderNodeId: parsed.nodeId,
    acquiredAt: parsed.now,
    expiresAt: new Date(nowMs + parsed.ttlMs).toISOString(),
    fencingToken: fencingCounter,
  };
  store.set(lock);
  return { acquired: true, lock, reason: "acquired" };
}

export function releaseLock(
  store: LockStore,
  input: { key: string; nodeId: string; fencingToken: number },
): { released: boolean; reason: string } {
  const existing = store.get(input.key);
  if (!existing) return { released: false, reason: "not_held" };
  if (existing.holderNodeId !== input.nodeId) return { released: false, reason: "not_holder" };
  if (existing.fencingToken !== input.fencingToken)
    return { released: false, reason: "stale_token" };
  store.del(input.key);
  return { released: true, reason: "released" };
}
