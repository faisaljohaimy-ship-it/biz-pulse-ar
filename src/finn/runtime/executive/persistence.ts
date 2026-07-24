/**
 * Executive Shell — persistence port.
 *
 * All durable shell state (workspaces, theme, locale, preferences, recents)
 * flows through this namespaced, versioned, FAIL-SAFE persistence manager.
 * The storage backend is an injected adapter (browser localStorage, server KV,
 * or the in-memory default) — the shell never touches a storage API directly,
 * and a corrupt or missing record never throws: readers get their fallback.
 */

export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

/** In-memory default — used for boot, tests, and non-DOM environments. */
export function createMemoryStorage(): StorageAdapter {
  const store = new Map<string, string>();
  return {
    get: (key) => store.get(key) ?? null,
    set: (key, value) => void store.set(key, value),
    remove: (key) => void store.delete(key),
  };
}

const SCHEMA_VERSION = 1;

interface Persisted<T> {
  readonly v: number;
  readonly data: T;
}

export class PersistenceManager {
  constructor(
    private readonly adapter: StorageAdapter,
    private readonly prefix = "nexios.shell",
  ) {}

  private key(namespace: string): string {
    return `${this.prefix}.${namespace}`;
  }

  save<T>(namespace: string, data: T): boolean {
    try {
      const record: Persisted<T> = { v: SCHEMA_VERSION, data };
      this.adapter.set(this.key(namespace), JSON.stringify(record));
      return true;
    } catch {
      return false; // persistence is best-effort; the shell never crashes on it
    }
  }

  load<T>(namespace: string, fallback: T, validate?: (data: T) => boolean): T {
    try {
      const raw = this.adapter.get(this.key(namespace));
      if (!raw) return fallback;
      const record = JSON.parse(raw) as Persisted<T>;
      if (record.v !== SCHEMA_VERSION) return fallback; // unknown schema ⇒ fallback
      if (validate && !validate(record.data)) return fallback; // corrupt ⇒ fallback
      return record.data;
    } catch {
      return fallback;
    }
  }

  clear(namespace: string): void {
    try {
      this.adapter.remove(this.key(namespace));
    } catch {
      /* fail-safe */
    }
  }
}
