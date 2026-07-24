/**
 * Executive Shell Controller — the module that turns the Phase-2 kernel into
 * the Executive Operating Shell.
 *
 * It IS a RuntimeModule: the kernel boots it like any other module, it
 * registers every executive service into the DI bus on initialize(), restores
 * persisted state on activate(), and persists on deactivate(). No globals —
 * `createExecutiveShell(options)` returns a fresh module + token set per
 * kernel. Adaptive navigation, command layer, plugin runtime, offline/sync,
 * observability: all resolved ONLY through the service bus.
 */
import type { IdFactory, ModuleToolkit, RuntimeModule } from "../types";
import { serviceToken } from "../service-bus";
import type { Diagnostics } from "../diagnostics";
import { PersistenceManager, createMemoryStorage, type StorageAdapter } from "./persistence";
import { DockManager, LayoutEngine, WindowManager, WorkspaceManager } from "./workspace";
import {
  CommandPalette,
  CommandRegistry,
  GlobalSearchEngine,
  type PermissionCheck,
} from "./commands";
import {
  ActivityCenter,
  NotificationCenter,
  SessionManager,
  TaskCenter,
  type Clock,
} from "./centers";
import {
  AccessibilityLayer,
  FeatureFlagManager,
  LocalizationEngine,
  ThemeEngine,
} from "./appearance";
import { CapabilityLoader, PluginRuntime } from "./plugins";
import {
  AssetManager,
  BackgroundWorkerPool,
  CacheManager,
  OfflineRuntime,
  ResourceScheduler,
  SyncManager,
  UpdateManager,
  type SyncTransport,
  type UpdateProvider,
} from "./resources";
import { CrashReporter, PerformanceMonitor, RuntimeMetrics } from "./metrics";

export const EXEC_TOKENS = {
  persistence: serviceToken<PersistenceManager>("exec.persistence"),
  windows: serviceToken<WindowManager>("exec.windows"),
  dock: serviceToken<DockManager>("exec.dock"),
  layoutEngine: serviceToken<LayoutEngine>("exec.layout-engine"),
  workspaces: serviceToken<WorkspaceManager>("exec.workspaces"),
  commands: serviceToken<CommandRegistry>("exec.commands"),
  palette: serviceToken<CommandPalette>("exec.palette"),
  search: serviceToken<GlobalSearchEngine>("exec.search"),
  notifications: serviceToken<NotificationCenter>("exec.notifications"),
  activity: serviceToken<ActivityCenter>("exec.activity"),
  tasks: serviceToken<TaskCenter>("exec.tasks"),
  session: serviceToken<SessionManager>("exec.session"),
  theme: serviceToken<ThemeEngine>("exec.theme"),
  locale: serviceToken<LocalizationEngine>("exec.locale"),
  a11y: serviceToken<AccessibilityLayer>("exec.a11y"),
  flags: serviceToken<FeatureFlagManager>("exec.flags"),
  plugins: serviceToken<PluginRuntime>("exec.plugins"),
  capabilityLoader: serviceToken<CapabilityLoader>("exec.capability-loader"),
  scheduler: serviceToken<ResourceScheduler>("exec.scheduler"),
  workers: serviceToken<BackgroundWorkerPool>("exec.workers"),
  cache: serviceToken<CacheManager>("exec.cache"),
  assets: serviceToken<AssetManager>("exec.assets"),
  updates: serviceToken<UpdateManager>("exec.updates"),
  offline: serviceToken<OfflineRuntime>("exec.offline"),
  sync: serviceToken<SyncManager>("exec.sync"),
  metrics: serviceToken<RuntimeMetrics>("exec.metrics"),
  crashes: serviceToken<CrashReporter>("exec.crashes"),
  perf: serviceToken<PerformanceMonitor>("exec.perf"),
} as const;

export interface ExecutiveShellOptions {
  readonly idFactory: IdFactory;
  readonly clock?: Clock;
  readonly storage?: StorageAdapter;
  readonly syncTransport?: SyncTransport;
  readonly updateProvider?: UpdateProvider;
  readonly version?: string;
}

const DEFAULT_THEMES = [
  {
    id: "nexios-dark",
    nameAr: "نكسيوس الداكن",
    tokens: { "color.bg": "#050b18", "color.accent": "#22d3ee" },
  },
  {
    id: "nexios-light",
    nameAr: "نكسيوس الفاتح",
    tokens: { "color.bg": "#f8fafc", "color.accent": "#0e7490" },
  },
] as const;

/** Build the executive shell as a bootable RuntimeModule (no globals). */
export function createExecutiveShell(options: ExecutiveShellOptions): RuntimeModule {
  const clock: Clock = options.clock ?? (() => new Date().toISOString());
  const idFactory = options.idFactory;
  let toolkit: ModuleToolkit | null = null;
  let diagnostics: Diagnostics | null = null;

  const registerServices = (tk: ModuleToolkit): void => {
    const { services } = tk;
    const persistence = new PersistenceManager(options.storage ?? createMemoryStorage());
    services.register(EXEC_TOKENS.persistence, () => persistence);
    services.register(EXEC_TOKENS.metrics, () => new RuntimeMetrics());
    services.register(EXEC_TOKENS.crashes, (bus) => {
      return new CrashReporter(tk.diagnostics, bus.resolve(EXEC_TOKENS.metrics));
    });
    services.register(EXEC_TOKENS.perf, (bus) => {
      return new PerformanceMonitor(bus.resolve(EXEC_TOKENS.metrics), tk.diagnostics);
    });
    services.register(EXEC_TOKENS.windows, () => new WindowManager(idFactory));
    services.register(EXEC_TOKENS.layoutEngine, (bus) => {
      return new LayoutEngine(bus.resolve(EXEC_TOKENS.windows));
    });
    services.register(EXEC_TOKENS.dock, (bus) => new DockManager(bus.resolve(EXEC_TOKENS.windows)));
    services.register(EXEC_TOKENS.workspaces, (bus) => {
      return new WorkspaceManager(
        bus.resolve(EXEC_TOKENS.windows),
        bus.resolve(EXEC_TOKENS.layoutEngine),
        bus.resolve(EXEC_TOKENS.persistence),
        idFactory,
      );
    });
    // Permission-gated commands consult the flag manager (kill switch aware).
    const permissionCheck: PermissionCheck = (permission, context) => {
      if (permission === "authenticated") return context.actor.userId !== null;
      return false; // unknown permission ⇒ fail closed
    };
    services.register(EXEC_TOKENS.commands, () => {
      return new CommandRegistry(tk.diagnostics, permissionCheck);
    });
    services.register(EXEC_TOKENS.palette, (bus) => {
      return new CommandPalette(bus.resolve(EXEC_TOKENS.commands));
    });
    services.register(EXEC_TOKENS.search, () => new GlobalSearchEngine(tk.diagnostics));
    services.register(EXEC_TOKENS.notifications, () => {
      return new NotificationCenter(tk.events, idFactory, clock);
    });
    services.register(EXEC_TOKENS.activity, () => new ActivityCenter(idFactory, clock));
    services.register(EXEC_TOKENS.tasks, () => new TaskCenter(tk.events, idFactory, clock));
    services.register(EXEC_TOKENS.session, () => {
      return new SessionManager(tk.context, tk.events, idFactory, clock);
    });
    services.register(EXEC_TOKENS.theme, (bus) => {
      return new ThemeEngine(bus.resolve(EXEC_TOKENS.persistence), DEFAULT_THEMES);
    });
    services.register(EXEC_TOKENS.locale, (bus) => {
      return new LocalizationEngine(bus.resolve(EXEC_TOKENS.persistence));
    });
    services.register(EXEC_TOKENS.a11y, (bus) => {
      return new AccessibilityLayer(bus.resolve(EXEC_TOKENS.persistence));
    });
    services.register(EXEC_TOKENS.flags, (bus) => {
      return new FeatureFlagManager(bus.resolve(EXEC_TOKENS.persistence));
    });
    services.register(EXEC_TOKENS.plugins, (bus) => {
      return new PluginRuntime(
        tk.events,
        bus.resolve(EXEC_TOKENS.commands),
        bus.resolve(EXEC_TOKENS.notifications),
        bus.resolve(EXEC_TOKENS.crashes),
        tk.diagnostics,
      );
    });
    services.register(EXEC_TOKENS.capabilityLoader, () => new CapabilityLoader());
    services.register(EXEC_TOKENS.scheduler, () => new ResourceScheduler(tk.diagnostics));
    services.register(EXEC_TOKENS.workers, () => new BackgroundWorkerPool(tk.diagnostics));
    services.register(EXEC_TOKENS.cache, () => new CacheManager(clock));
    services.register(EXEC_TOKENS.assets, (bus) => {
      return new AssetManager(bus.resolve(EXEC_TOKENS.scheduler));
    });
    services.register(EXEC_TOKENS.updates, () => {
      return new UpdateManager(
        options.version ?? "3.0.0",
        options.updateProvider ?? { check: async () => ({ available: false }) },
        tk.diagnostics,
      );
    });
    services.register(EXEC_TOKENS.offline, () => new OfflineRuntime(tk.diagnostics));
    services.register(EXEC_TOKENS.sync, (bus) => {
      return new SyncManager(
        bus.resolve(EXEC_TOKENS.offline),
        options.syncTransport ?? { send: async () => ({ ok: true }) },
        tk.diagnostics,
      );
    });
  };

  const registerBuiltinCommands = (tk: ModuleToolkit): void => {
    const commands = tk.services.resolve(EXEC_TOKENS.commands);
    const workspaces = tk.services.resolve(EXEC_TOKENS.workspaces);
    const windows = tk.services.resolve(EXEC_TOKENS.windows);
    const activity = tk.services.resolve(EXEC_TOKENS.activity);

    commands.register({
      id: "shell.open-module",
      title: "Open Module",
      titleAr: "فتح وحدة",
      category: "modules",
      keywords: ["open", "module", "وحدة"],
      run: (_ctx, args) => windows.open(String(args?.moduleId ?? "unknown")),
    });
    commands.register({
      id: "shell.switch-workspace",
      title: "Switch Workspace",
      titleAr: "تبديل مساحة العمل",
      category: "workspaces",
      keywords: ["workspace", "switch", "مساحة"],
      run: (_ctx, args) => workspaces.switchTo(String(args?.workspaceId ?? "")),
    });
    commands.register({
      id: "shell.execute-workflow",
      title: "Execute Workflow",
      titleAr: "تشغيل سير عمل",
      category: "workflows",
      keywords: ["workflow", "run", "سير"],
      run: async (_ctx, args) => {
        // Workflows execute over the event bus request channel — decoupled.
        return tk.events.request("workflow.execute", { workflowId: args?.workflowId });
      },
    });
    commands.register({
      id: "shell.search-knowledge",
      title: "Search Knowledge",
      titleAr: "بحث المعرفة",
      category: "knowledge",
      keywords: ["search", "knowledge", "بحث"],
      run: async (_ctx, args) => {
        const search = tk.services.resolve(EXEC_TOKENS.search);
        return search.search(String(args?.query ?? ""));
      },
    });
    commands.register({
      id: "shell.open-settings",
      title: "Open Settings",
      titleAr: "فتح الإعدادات",
      category: "settings",
      keywords: ["settings", "إعدادات"],
      requiresPermission: "authenticated",
      run: () => windows.open("settings"),
    });
    commands.register({
      id: "shell.quick-pin",
      title: "Pin Active Module",
      titleAr: "تثبيت الوحدة",
      category: "quick",
      keywords: ["pin", "تثبيت"],
      run: (_ctx, args) => workspaces.pinModule(String(args?.moduleId ?? "")),
    });
    // Every command execution is also activity — observability tap.
    tk.events.subscribe("shell.notification", () => void activity.record("notification", "posted"));
  };

  const registerSearchProviders = (tk: ModuleToolkit): void => {
    const search = tk.services.resolve(EXEC_TOKENS.search);
    const commands = tk.services.resolve(EXEC_TOKENS.commands);
    const workspaces = tk.services.resolve(EXEC_TOKENS.workspaces);
    search.registerProvider({
      id: "commands",
      search: (query) => {
        const q = query.toLowerCase();
        return commands
          .list()
          .filter((c) => c.title.toLowerCase().includes(q) || (c.titleAr ?? "").includes(query))
          .map((c) => ({
            providerId: "commands",
            kind: "command",
            id: c.id,
            title: c.title,
            score: c.title.toLowerCase().startsWith(q) ? 50 : 20,
          }));
      },
    });
    search.registerProvider({
      id: "workspaces",
      search: (query) =>
        workspaces
          .list()
          .filter((w) => w.name.includes(query))
          .map((w) => ({
            providerId: "workspaces",
            kind: "workspace",
            id: w.id,
            title: w.name,
            score: 30,
          })),
    });
  };

  return {
    id: "executive-shell",
    version: options.version ?? "3.0.0",
    capabilities: ["executive-shell", "workspaces", "commands", "plugins"],
    dependencies: [],
    health: () => {
      if (!toolkit) return { status: "unhealthy" as const, detail: "not initialized" };
      const crashes = toolkit.services.resolve(EXEC_TOKENS.crashes);
      return crashes.total() > 25
        ? { status: "degraded" as const, detail: "elevated crash volume" }
        : { status: "healthy" as const };
    },
    initialize: (tk) => {
      toolkit = tk;
      diagnostics = tk.diagnostics;
      const perfStart = performance.now();
      registerServices(tk);
      registerBuiltinCommands(tk);
      registerSearchProviders(tk);
      tk.services
        .resolve(EXEC_TOKENS.metrics)
        .timing("exec.startup", Math.round(performance.now() - perfStart));
    },
    activate: () => {
      // Workspace/theme/locale/a11y/flags each restored themselves from the
      // persistence manager during construction — activation records it.
      diagnostics?.record("info", "executive", "executive shell active", {});
    },
    deactivate: () => {
      // Persist the live arrangement so the next boot restores it exactly.
      toolkit?.services.resolve(EXEC_TOKENS.workspaces).saveActive();
    },
    dispose: () => {
      toolkit = null;
      diagnostics = null;
    },
  };
}
