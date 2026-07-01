/**
 * ARIA Executive Presence — Memory tiers.
 *
 * Five separated tiers, each with its own TTL, so ARIA can distinguish
 * short-term conversational state from long-lived organizational memory
 * without letting one bleed into another.
 *
 *   working      — current turn scratch (seconds)
 *   session      — one browser session (30 min)
 *   executive    — one executive across sessions (7 days)
 *   project      — one workspace/project (30 days)
 *   organization — organization-wide facts (90 days)
 *
 * Storage is in-process (Worker isolate lifetime). Callers should treat
 * this as a warm cache: if the isolate recycles the tier is empty, and
 * the caller must degrade to "no prior memory" rather than fabricating.
 */

export type MemoryTier = "working" | "session" | "executive" | "project" | "organization";

interface Entry<T> {
  value: T;
  expires: number; // epoch ms
}

const TIER_TTL_MS: Record<MemoryTier, number> = {
  working: 60_000,                // 60s
  session: 30 * 60_000,           // 30 min
  executive: 7 * 24 * 60 * 60_000, // 7 days
  project: 30 * 24 * 60 * 60_000, // 30 days
  organization: 90 * 24 * 60 * 60_000, // 90 days
};

const MAX_KEYS_PER_TIER = 512;

const STORES: Record<MemoryTier, Map<string, Entry<unknown>>> = {
  working: new Map(),
  session: new Map(),
  executive: new Map(),
  project: new Map(),
  organization: new Map(),
};

function scopedKey(tier: MemoryTier, scopeId: string, key: string): string {
  return `${tier}:${scopeId}:${key}`;
}

function prune(tier: MemoryTier): void {
  const store = STORES[tier];
  const now = Date.now();
  // Expire first
  for (const [k, v] of store) {
    if (v.expires <= now) store.delete(k);
  }
  // LRU-ish trim by insertion order
  while (store.size > MAX_KEYS_PER_TIER) {
    const first = store.keys().next().value as string | undefined;
    if (!first) break;
    store.delete(first);
  }
}

export function remember<T>(tier: MemoryTier, scopeId: string, key: string, value: T): void {
  if (!scopeId) return;
  prune(tier);
  STORES[tier].set(scopedKey(tier, scopeId, key), {
    value,
    expires: Date.now() + TIER_TTL_MS[tier],
  });
}

export function recall<T>(tier: MemoryTier, scopeId: string, key: string): T | null {
  if (!scopeId) return null;
  const entry = STORES[tier].get(scopedKey(tier, scopeId, key));
  if (!entry) return null;
  if (entry.expires <= Date.now()) {
    STORES[tier].delete(scopedKey(tier, scopeId, key));
    return null;
  }
  return entry.value as T;
}

export function forget(tier: MemoryTier, scopeId: string, key?: string): void {
  if (!scopeId) return;
  const store = STORES[tier];
  if (key) {
    store.delete(scopedKey(tier, scopeId, key));
    return;
  }
  for (const k of store.keys()) {
    if (k.startsWith(`${tier}:${scopeId}:`)) store.delete(k);
  }
}

export interface PresenceCursor {
  lastVisitAt: string;         // ISO
  lastSeenIncidentId?: string; // most-recent incident id observed
  lastSeenAlertAt?: string;    // ISO of most-recent alert observed
  lastGreetingAt?: string;     // ISO of last greeting shown (avoid repeats)
}

const CURSOR_KEY = "presence_cursor";

export function readCursor(sessionId: string): PresenceCursor | null {
  return recall<PresenceCursor>("executive", sessionId, CURSOR_KEY);
}

export function writeCursor(sessionId: string, cursor: PresenceCursor): void {
  remember("executive", sessionId, CURSOR_KEY, cursor);
}
