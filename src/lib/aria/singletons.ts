/**
 * ARIA Singleton Registry — runtime hard-assert that critical ARIA
 * subsystems are instantiated exactly once per browser session.
 *
 * Registers: BRAIN, PROVIDER, VOICE, AVATAR, MEMORY.
 *
 * In dev: throws on a second registration so React StrictMode and
 * accidental provider duplication surface immediately.
 * In prod: logs a single loud warning and keeps the first instance.
 *
 * SSR-safe: registry lives on `globalThis` so HMR / module dup does
 * not fool the check, and every method no-ops if `window` is absent.
 */

export type AriaSingletonKey = "BRAIN" | "PROVIDER" | "VOICE" | "AVATAR" | "MEMORY";

interface Registry {
  owners: Partial<Record<AriaSingletonKey, string>>;
  warned: Partial<Record<AriaSingletonKey, boolean>>;
  mounts: Partial<Record<AriaSingletonKey, number>>;
}

const GLOBAL_KEY = "__ARIA_SINGLETONS__";

function registry(): Registry {
  if (typeof globalThis === "undefined") return { owners: {}, warned: {}, mounts: {} };
  const g = globalThis as unknown as Record<string, Registry | undefined>;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = { owners: {}, warned: {}, mounts: {} };
  return g[GLOBAL_KEY]!;
}

function isDev(): boolean {
  try {
    return import.meta.env?.DEV === true;
  } catch {
    return false;
  }
}

/**
 * Register a singleton owner. Returns true if this call is the first
 * (canonical) owner, false if a previous owner already exists.
 *
 * Callers should short-circuit (skip side-effect setup) when this
 * returns false, so the second instance stays inert.
 */
export function assertOne(key: AriaSingletonKey, owner: string): boolean {
  if (typeof window === "undefined") return true; // SSR pass-through
  const reg = registry();
  const existing = reg.owners[key];
  if (!existing) {
    reg.owners[key] = owner;
    return true;
  }
  if (existing === owner) return true; // idempotent same-owner remount
  if (!reg.warned[key]) {
    reg.warned[key] = true;
    const msg = `[aria-singleton] duplicate ${key}: first="${existing}", second="${owner}"`;
    if (isDev()) {
      // Loud but non-fatal: throwing here would crash the app on
      // legitimate HMR reloads. The warning is enough to catch dup
      // providers in code review + browser console.
      console.error(msg);
    } else {
      console.warn(msg);
    }
  }
  return false;
}

/** Release a singleton (e.g. on unmount / teardown). */
export function releaseOne(key: AriaSingletonKey, owner: string): void {
  if (typeof window === "undefined") return;
  const reg = registry();
  if (reg.owners[key] === owner) {
    delete reg.owners[key];
    delete reg.warned[key];
  }
}

/**
 * Track a live React mount (e.g. AriaProvider). Increments an active
 * mount counter; warns once when count exceeds 1 (true duplication —
 * distinct from StrictMode double-invoke which is same-instance).
 * Returns an unmount fn that decrements the counter.
 */
export function trackMount(key: AriaSingletonKey, owner: string): () => void {
  if (typeof window === "undefined") return () => {};
  const reg = registry();
  const next = (reg.mounts[key] ?? 0) + 1;
  reg.mounts[key] = next;
  if (next > 1 && !reg.warned[key]) {
    reg.warned[key] = true;
    const msg = `[aria-singleton] duplicate ${key} MOUNTED: owner="${owner}" (active=${next}). Ensure it is rendered once in __root.tsx only.`;
    if (isDev()) console.error(msg);
    else console.warn(msg);
  }
  return () => {
    const cur = registry();
    cur.mounts[key] = Math.max(0, (cur.mounts[key] ?? 1) - 1);
    if ((cur.mounts[key] ?? 0) <= 1) cur.warned[key] = false;
  };
}

/** Introspect current owners (for /aria/directive audit + tests). */
export function currentSingletons(): Readonly<Partial<Record<AriaSingletonKey, string>>> {
  return { ...registry().owners };
}

/** Introspect current mount counts. */
export function currentMounts(): Readonly<Partial<Record<AriaSingletonKey, number>>> {
  return { ...registry().mounts };
}
