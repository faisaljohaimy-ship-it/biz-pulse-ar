// Lease coordinator for missions. Fencing token; single active holder per mission.
import type { Lease } from "./types";
import { LeaseInputZ } from "./contracts";

export interface LeaseStore {
  get(missionId: string): Lease | null;
  set(lease: Lease): void;
  del(missionId: string): void;
  list(): ReadonlyArray<Lease>;
}

export function createMemoryLeaseStore(): LeaseStore {
  const map = new Map<string, Lease>();
  return {
    get: (m) => map.get(m) ?? null,
    set: (l) => {
      map.set(l.missionId, l);
    },
    del: (m) => {
      map.delete(m);
    },
    list: () => [...map.values()],
  };
}

let counter = 0;

export function acquireLease(
  store: LeaseStore,
  input: {
    missionId: string;
    holderNodeId: string;
    holderAgentId: string;
    ttlMs: number;
    now: string;
  },
): { acquired: boolean; lease: Lease | null; reason: string } {
  const parsed = LeaseInputZ.parse({
    missionId: input.missionId,
    holderNodeId: input.holderNodeId,
    holderAgentId: input.holderAgentId,
    ttlMs: input.ttlMs,
    now: input.now,
  });
  const existing = store.get(parsed.missionId);
  const nowMs = Date.parse(parsed.now);
  if (existing && Date.parse(existing.expiresAt) > nowMs && existing.holderNodeId !== parsed.holderNodeId) {
    return { acquired: false, lease: existing, reason: "held_by_other" };
  }
  counter += 1;
  const lease: Lease = {
    missionId: parsed.missionId,
    holderNodeId: parsed.holderNodeId,
    holderAgentId: parsed.holderAgentId,
    acquiredAt: parsed.now,
    expiresAt: new Date(nowMs + parsed.ttlMs).toISOString(),
    fencingToken: counter,
  };
  store.set(lease);
  return { acquired: true, lease, reason: "acquired" };
}

export function releaseLease(
  store: LeaseStore,
  input: { missionId: string; holderNodeId: string; fencingToken: number },
): { released: boolean; reason: string } {
  const existing = store.get(input.missionId);
  if (!existing) return { released: false, reason: "not_held" };
  if (existing.holderNodeId !== input.holderNodeId) return { released: false, reason: "not_holder" };
  if (existing.fencingToken !== input.fencingToken) return { released: false, reason: "stale_token" };
  store.del(input.missionId);
  return { released: true, reason: "released" };
}
