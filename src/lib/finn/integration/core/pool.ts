/**
 * Phase 9.1 — Connection pool interface.
 *
 * Generic reusable pool for connector clients (DB drivers, HTTP clients,
 * streaming consumers). The pool never holds credential values; factories
 * receive a CredentialVault reference at build time.
 */

export interface Pool<T> {
  size(): number;
  acquire(): Promise<T>;
  release(client: T): void;
  drain(): Promise<void>;
}

export interface PoolOptions<T> {
  max: number;
  factory: () => Promise<T>;
  destroyer?: (client: T) => Promise<void> | void;
}

export function createPool<T>(opts: PoolOptions<T>): Pool<T> {
  const free: T[] = [];
  const busy = new Set<T>();
  const waiters: Array<(c: T) => void> = [];

  async function acquire(): Promise<T> {
    const cached = free.pop();
    if (cached) {
      busy.add(cached);
      return cached;
    }
    if (busy.size < opts.max) {
      const c = await opts.factory();
      busy.add(c);
      return c;
    }
    return new Promise<T>((resolve) => waiters.push(resolve));
  }

  function release(c: T): void {
    busy.delete(c);
    const w = waiters.shift();
    if (w) {
      busy.add(c);
      w(c);
      return;
    }
    free.push(c);
  }

  async function drain(): Promise<void> {
    const all = [...free, ...busy];
    free.length = 0;
    busy.clear();
    if (opts.destroyer) {
      for (const c of all) await opts.destroyer(c);
    }
  }

  return {
    size: () => free.length + busy.size,
    acquire,
    release,
    drain,
  };
}
