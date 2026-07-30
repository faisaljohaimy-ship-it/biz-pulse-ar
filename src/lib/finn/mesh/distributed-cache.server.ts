// Distributed cache — pluggable store with TTL and versioning.
import type { CacheEntry } from "./types";
import { CacheSetInputZ } from "./contracts";

export interface CacheStore {
  get(key: string): CacheEntry | null;
  set(entry: CacheEntry): void;
  del(key: string): void;
  keys(): ReadonlyArray<string>;
}

export function createMemoryCacheStore(): CacheStore {
  const map = new Map<string, CacheEntry>();
  return {
    get: (k) => map.get(k) ?? null,
    set: (e) => {
      map.set(e.key, e);
    },
    del: (k) => {
      map.delete(k);
    },
    keys: () => [...map.keys()],
  };
}

export function cacheSet(
  store: CacheStore,
  input: { key: string; valueRef: string; ownerNodeId: string; ttlMs: number; now: string },
): CacheEntry {
  const parsed = CacheSetInputZ.parse(input);
  const previous = store.get(parsed.key);
  const version = (previous?.version ?? 0) + 1;
  const entry: CacheEntry = {
    key: parsed.key,
    valueRef: parsed.valueRef,
    ownerNodeId: parsed.ownerNodeId,
    expiresAt: new Date(Date.parse(parsed.now) + parsed.ttlMs).toISOString(),
    version,
  };
  store.set(entry);
  return entry;
}

export function cacheGet(store: CacheStore, key: string, now: string): CacheEntry | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.parse(entry.expiresAt) <= Date.parse(now)) {
    store.del(key);
    return null;
  }
  return entry;
}
