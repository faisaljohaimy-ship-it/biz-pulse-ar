/**
 * Shell Context Manager · State Manager · Layout Manager · Navigation Engine.
 *
 * Framework-free runtime models. Navigation talks to an injected adapter
 * (production: the app router; tests: an in-memory adapter) — the shell never
 * imports a UI library. The layout manager is a runtime model of named
 * regions, NOT a UI redesign.
 */
import type { Actor } from "@/finn/shell";
import { ShellError } from "./types";
import type { Diagnostics } from "./diagnostics";

// ── Context ─────────────────────────────────────────────────────────────────

export interface ShellContext {
  readonly requestId: string;
  readonly actor: Actor;
  readonly locale: "ar" | "en";
}

const ANONYMOUS: Actor = { userId: null, appRoles: [], orgRole: null, orgId: null };

export class ShellContextManager {
  private context: ShellContext;

  constructor(initial?: Partial<ShellContext>) {
    this.context = {
      requestId: initial?.requestId ?? "boot",
      actor: initial?.actor ?? ANONYMOUS,
      locale: initial?.locale ?? "ar",
    };
  }

  current(): ShellContext {
    return this.context;
  }

  /** Server-derived updates only — callers pass verified values, never client claims. */
  update(patch: Partial<ShellContext>): ShellContext {
    this.context = { ...this.context, ...patch };
    return this.context;
  }

  reset(): void {
    this.context = { requestId: "boot", actor: ANONYMOUS, locale: "ar" };
  }
}

// ── State ───────────────────────────────────────────────────────────────────

export interface ShellStore<T> {
  get(): T;
  set(next: T): void;
  subscribe(listener: (value: T) => void): () => void;
  snapshot(): T;
  restore(snapshot: T): void;
}

export class ShellStateManager {
  private readonly stores = new Map<
    string,
    {
      value: unknown;
      lastGood: unknown;
      validator?: (v: unknown) => boolean;
      listeners: Set<(v: unknown) => void>;
    }
  >();

  createStore<T>(namespace: string, initial: T, validator?: (value: T) => boolean): ShellStore<T> {
    if (this.stores.has(namespace)) {
      throw new ShellError("state", `duplicate store "${namespace}"`);
    }
    if (validator && !validator(initial)) {
      throw new ShellError("state", `initial value for "${namespace}" fails validation`);
    }
    const entry = {
      value: initial as unknown,
      lastGood: initial as unknown,
      validator: validator as ((v: unknown) => boolean) | undefined,
      listeners: new Set<(v: unknown) => void>(),
    };
    this.stores.set(namespace, entry);
    return {
      get: () => entry.value as T,
      set: (next: T) => {
        if (entry.validator && !entry.validator(next)) {
          throw new ShellError("state", `rejected corrupt write to "${namespace}"`);
        }
        entry.value = next;
        entry.lastGood = next;
        for (const l of entry.listeners) l(next);
      },
      subscribe: (listener: (value: T) => void) => {
        const l = listener as (v: unknown) => void;
        entry.listeners.add(l);
        return () => entry.listeners.delete(l);
      },
      snapshot: () => entry.lastGood as T,
      restore: (snapshot: T) => {
        if (entry.validator && !entry.validator(snapshot)) {
          throw new ShellError("state", `refused corrupt snapshot for "${namespace}"`);
        }
        entry.value = snapshot;
        entry.lastGood = snapshot;
        for (const l of entry.listeners) l(snapshot);
      },
    };
  }

  /** Memory-corruption recovery: roll a namespace back to its last good value. */
  recover(namespace: string): boolean {
    const entry = this.stores.get(namespace);
    if (!entry) return false;
    entry.value = entry.lastGood;
    for (const l of entry.listeners) l(entry.value);
    return true;
  }

  clear(): void {
    this.stores.clear();
  }
}

// ── Layout ──────────────────────────────────────────────────────────────────

export interface LayoutRegion {
  readonly id: string;
  readonly slot: "header" | "sidebar" | "main" | "footer" | "overlay";
}

export class ShellLayoutManager {
  private readonly regions = new Map<string, LayoutRegion>();
  private active = "default";

  registerRegion(region: LayoutRegion): void {
    if (this.regions.has(region.id)) {
      throw new ShellError("layout", `duplicate region "${region.id}"`);
    }
    this.regions.set(region.id, region);
  }

  regionsFor(slot: LayoutRegion["slot"]): readonly LayoutRegion[] {
    return [...this.regions.values()].filter((r) => r.slot === slot);
  }

  setActiveLayout(name: string): void {
    this.active = name;
  }

  activeLayout(): string {
    return this.active;
  }

  clear(): void {
    this.regions.clear();
    this.active = "default";
  }
}

// ── Navigation ──────────────────────────────────────────────────────────────

/** Injected by the composition root; production wraps the app router. */
export interface NavigationAdapter {
  go(path: string): void | Promise<void>;
}

export type NavigationGuard = (path: string, context: ShellContext) => boolean;

export class ShellNavigationEngine {
  private readonly routes = new Map<string, { guard?: NavigationGuard }>();
  private currentPath = "/";

  constructor(
    private readonly adapter: NavigationAdapter,
    private readonly contextManager: ShellContextManager,
    private readonly diagnostics: Diagnostics,
    private readonly fallbackPath: string,
  ) {}

  registerRoute(path: string, options: { guard?: NavigationGuard } = {}): void {
    if (this.routes.has(path)) throw new ShellError("navigation", `duplicate route "${path}"`);
    this.routes.set(path, options);
  }

  /** Guarded navigation with fail-safe fallback — a failure never strands the shell. */
  async navigate(path: string): Promise<{ ok: boolean; path: string; reason?: string }> {
    const route = this.routes.get(path);
    const ctx = this.contextManager.current();
    if (!route) {
      return this.fallback(path, "unknown-route");
    }
    if (route.guard && !route.guard(path, ctx)) {
      return this.fallback(path, "guard-denied");
    }
    try {
      await this.adapter.go(path);
      this.currentPath = path;
      this.diagnostics.record("info", "navigation", `navigated`, { path });
      return { ok: true, path };
    } catch (error) {
      return this.fallback(path, error instanceof Error ? error.message : String(error));
    }
  }

  private async fallback(
    requested: string,
    reason: string,
  ): Promise<{ ok: boolean; path: string; reason: string }> {
    this.diagnostics.record("warn", "navigation", `fallback engaged`, { requested, reason });
    try {
      await this.adapter.go(this.fallbackPath);
      this.currentPath = this.fallbackPath;
    } catch {
      // Adapter completely down: keep last known path; shell stays alive.
    }
    return { ok: false, path: this.currentPath, reason };
  }

  current(): string {
    return this.currentPath;
  }

  clear(): void {
    this.routes.clear();
    this.currentPath = "/";
  }
}
