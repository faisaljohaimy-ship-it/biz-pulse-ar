/**
 * Executive Shell — Plugin Runtime · Module Sandbox · Capability Loader.
 *
 * Plugins are self-contained, versioned, PERMISSION-scoped and CRASH-ISOLATED:
 * every plugin entrypoint runs inside the sandbox guard, so a throwing plugin
 * can never take down the shell, a workspace, the kernel, or either bus. The
 * host API a plugin receives is scoped — each call checks the granted
 * permission set, and everything a plugin registered (commands, subscriptions)
 * is torn down automatically on hot-unload. Repeated crashes quarantine the
 * plugin. The capability loader lazy-loads heavy capabilities once and caches.
 */
import { ShellError } from "../types";
import type { EventBus, Subscription } from "../event-bus";
import type { Diagnostics } from "../diagnostics";
import type { CommandRegistry, CommandDefinition } from "./commands";
import type { NotificationCenter, Severity } from "./centers";
import type { CrashReporter } from "./metrics";

export type PluginPermission =
  | "events:publish"
  | "events:subscribe"
  | "commands:register"
  | "notifications:post";

export interface PluginHost {
  publish(topic: string, payload: unknown): Promise<unknown>;
  subscribe(topic: string, handler: (payload: unknown) => void): void;
  registerCommand(def: CommandDefinition): void;
  notify(severity: Severity, title: string): Promise<unknown>;
}

export interface PluginInstance {
  start?(host: PluginHost): void | Promise<void>;
  stop?(): void | Promise<void>;
}

export interface PluginManifest {
  readonly id: string;
  readonly version: string;
  readonly permissions: readonly PluginPermission[];
  readonly dependencies: readonly string[]; // other plugin ids
  readonly capabilities: readonly string[]; // provided capability ids
  factory(): PluginInstance;
}

export type PluginState = "loaded" | "active" | "stopped" | "quarantined";

const SEMVER = /^\d+\.\d+\.\d+$/;
const CRASH_QUARANTINE_THRESHOLD = 3;

/**
 * Module Sandbox — the crash-isolation primitive. Runs any plugin-supplied
 * function; a sync or async throw is captured, reported, and converted into a
 * failure result. Nothing propagates to the caller.
 */
export async function sandboxed<T>(
  area: string,
  run: () => T | Promise<T>,
  crashes: CrashReporter,
): Promise<{ ok: true; value: T } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    crashes.report(area, message);
    return { ok: false, error: message };
  }
}

interface LoadedPlugin {
  manifest: PluginManifest;
  instance: PluginInstance;
  state: PluginState;
  crashCount: number;
  subscriptions: Subscription[];
}

export class PluginRuntime {
  private readonly plugins = new Map<string, LoadedPlugin>();
  private readonly providedCapabilities = new Map<string, string>(); // capability → plugin id

  constructor(
    private readonly events: EventBus,
    private readonly commands: CommandRegistry,
    private readonly notifications: NotificationCenter,
    private readonly crashes: CrashReporter,
    private readonly diagnostics: Diagnostics,
  ) {}

  /** Hot-load a plugin at runtime. Validation is fail-closed. */
  async load(manifest: PluginManifest): Promise<PluginState> {
    if (!SEMVER.test(manifest.version)) {
      throw new ShellError("plugins", `plugin "${manifest.id}" has invalid version`);
    }
    const existing = this.plugins.get(manifest.id);
    if (existing) {
      throw new ShellError(
        "plugins",
        existing.manifest.version === manifest.version
          ? `duplicate plugin "${manifest.id}"`
          : `version conflict for "${manifest.id}": ${existing.manifest.version} vs ${manifest.version}`,
      );
    }
    for (const dep of manifest.dependencies) {
      if (!this.plugins.has(dep)) {
        throw new ShellError("plugins", `plugin "${manifest.id}" requires missing plugin "${dep}"`);
      }
    }
    for (const cap of manifest.capabilities) {
      const provider = this.providedCapabilities.get(cap);
      if (provider) {
        throw new ShellError(
          "plugins",
          `capability "${cap}" already provided by plugin "${provider}"`,
        );
      }
    }

    const loaded: LoadedPlugin = {
      manifest,
      instance: manifest.factory(),
      state: "loaded",
      crashCount: 0,
      subscriptions: [],
    };
    this.plugins.set(manifest.id, loaded);
    for (const cap of manifest.capabilities) this.providedCapabilities.set(cap, manifest.id);

    const host = this.buildHost(loaded);
    const started = await sandboxed(
      `plugin:${manifest.id}:start`,
      () => loaded.instance.start?.(host),
      this.crashes,
    );
    if (!started.ok) {
      loaded.crashCount++;
      loaded.state = "quarantined";
      this.teardownRegistrations(loaded);
      this.diagnostics.record("error", "plugins", "plugin crashed on start — quarantined", {
        id: manifest.id,
      });
      await this.events.publish("shell.plugin.quarantined", { id: manifest.id });
      return loaded.state;
    }
    loaded.state = "active";
    this.diagnostics.record("info", "plugins", "plugin active", {
      id: manifest.id,
      version: manifest.version,
    });
    await this.events.publish("shell.plugin.loaded", { id: manifest.id });
    return loaded.state;
  }

  /** Permission-scoped host facade; every call re-checks the grant. */
  private buildHost(loaded: LoadedPlugin): PluginHost {
    const require = (permission: PluginPermission): void => {
      if (!loaded.manifest.permissions.includes(permission)) {
        throw new ShellError(
          "plugins",
          `plugin "${loaded.manifest.id}" lacks permission "${permission}"`,
        );
      }
    };
    return {
      publish: async (topic, payload) => {
        require("events:publish");
        return this.events.publish(topic, payload);
      },
      subscribe: (topic, handler) => {
        require("events:subscribe");
        // Plugin handlers are sandboxed too — a crash inside a subscriber
        // increments the crash count and can quarantine the plugin.
        const subscription = this.events.subscribe(topic, async (event) => {
          const outcome = await sandboxed(
            `plugin:${loaded.manifest.id}:handler:${topic}`,
            () => handler(event.payload),
            this.crashes,
          );
          if (!outcome.ok) await this.registerCrash(loaded);
        });
        loaded.subscriptions.push(subscription);
      },
      registerCommand: (def) => {
        require("commands:register");
        this.commands.register(def, `plugin:${loaded.manifest.id}`);
      },
      notify: async (severity, title) => {
        require("notifications:post");
        return this.notifications.post({ severity, title });
      },
    };
  }

  private async registerCrash(loaded: LoadedPlugin): Promise<void> {
    loaded.crashCount++;
    if (loaded.crashCount >= CRASH_QUARANTINE_THRESHOLD && loaded.state === "active") {
      loaded.state = "quarantined";
      this.teardownRegistrations(loaded);
      this.diagnostics.record("error", "plugins", "plugin quarantined after repeated crashes", {
        id: loaded.manifest.id,
        crashes: loaded.crashCount,
      });
      await this.events.publish("shell.plugin.quarantined", { id: loaded.manifest.id });
    }
  }

  private teardownRegistrations(loaded: LoadedPlugin): void {
    for (const sub of loaded.subscriptions) sub.unsubscribe();
    loaded.subscriptions = [];
    this.commands.unregisterOwner(`plugin:${loaded.manifest.id}`);
  }

  /** Hot-unload: sandboxed stop + full teardown of everything it registered. */
  async unload(pluginId: string): Promise<boolean> {
    const loaded = this.plugins.get(pluginId);
    if (!loaded) return false;
    const dependents = [...this.plugins.values()].filter(
      (p) => p !== loaded && p.manifest.dependencies.includes(pluginId),
    );
    if (dependents.length > 0) {
      throw new ShellError(
        "plugins",
        `cannot unload "${pluginId}" — required by ${dependents.map((d) => d.manifest.id).join(", ")}`,
      );
    }
    await sandboxed(`plugin:${pluginId}:stop`, () => loaded.instance.stop?.(), this.crashes);
    this.teardownRegistrations(loaded);
    for (const cap of loaded.manifest.capabilities) this.providedCapabilities.delete(cap);
    this.plugins.delete(pluginId);
    this.diagnostics.record("info", "plugins", "plugin unloaded", { id: pluginId });
    await this.events.publish("shell.plugin.unloaded", { id: pluginId });
    return true;
  }

  stateOf(pluginId: string): PluginState | undefined {
    return this.plugins.get(pluginId)?.state;
  }

  crashCountOf(pluginId: string): number {
    return this.plugins.get(pluginId)?.crashCount ?? 0;
  }

  list(): readonly { id: string; version: string; state: PluginState }[] {
    return [...this.plugins.values()].map((p) => ({
      id: p.manifest.id,
      version: p.manifest.version,
      state: p.state,
    }));
  }
}

// ── Capability Loader ───────────────────────────────────────────────────────

/**
 * Lazy capability loading: heavy capabilities register an async factory and
 * are constructed at most once, on first demand (startup stays lean). A
 * failing load is NOT cached — the next request retries.
 */
export class CapabilityLoader {
  private readonly factories = new Map<string, () => Promise<unknown>>();
  private readonly cache = new Map<string, unknown>();
  private loadCounts = new Map<string, number>();

  register(capabilityId: string, factory: () => Promise<unknown>): void {
    if (this.factories.has(capabilityId)) {
      throw new ShellError("capabilities", `duplicate lazy capability "${capabilityId}"`);
    }
    this.factories.set(capabilityId, factory);
  }

  async loadCapability<T>(capabilityId: string): Promise<T> {
    if (this.cache.has(capabilityId)) return this.cache.get(capabilityId) as T;
    const factory = this.factories.get(capabilityId);
    if (!factory) throw new ShellError("capabilities", `unknown capability "${capabilityId}"`);
    this.loadCounts.set(capabilityId, (this.loadCounts.get(capabilityId) ?? 0) + 1);
    const value = await factory();
    this.cache.set(capabilityId, value);
    return value as T;
  }

  loadCount(capabilityId: string): number {
    return this.loadCounts.get(capabilityId) ?? 0;
  }
}
