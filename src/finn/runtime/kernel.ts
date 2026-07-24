/**
 * Shell Kernel — the composition root and lifecycle owner of the NEXIOS
 * runtime shell.
 *
 * Deterministic boot (fail-closed):
 *   kernel → configuration → capability-registry → dependency-validation →
 *   service-bus → event-bus → module-registration → agent-runtime →
 *   navigation → ui-mount → READY.
 *
 * Any stage failure aborts the boot, tears down everything already started in
 * reverse order, and leaves the kernel in state "failed" — the shell NEVER
 * partially boots. No globals: everything lives on the kernel instance
 * returned by createKernel().
 */
import {
  ShellBootError,
  ShellError,
  type BootStage,
  type IdFactory,
  type KernelState,
  type ModuleToolkit,
  type RuntimeModule,
  type ShellConfig,
} from "./types";
import { ServiceBus, serviceToken } from "./service-bus";
import { EventBus } from "./event-bus";
import { Diagnostics } from "./diagnostics";
import { CapabilityRegistry, ModuleRegistry } from "./registry";
import { ShellHealthMonitor } from "./health";
import { ShellRecoveryEngine } from "./recovery";
import {
  ShellContextManager,
  ShellLayoutManager,
  ShellNavigationEngine,
  ShellStateManager,
  type NavigationAdapter,
} from "./managers";
import {
  ShellAgentBridge,
  ShellMemoryBridge,
  ShellOutputIntegration,
  ShellPermissionLayer,
  inertMemoryAdapter,
  type MemoryAdapter,
} from "./bridges";

// Canonical service tokens — resolution ONLY via the service bus.
export const TOKENS = {
  diagnostics: serviceToken<Diagnostics>("shell.diagnostics"),
  events: serviceToken<EventBus>("shell.events"),
  context: serviceToken<ShellContextManager>("shell.context"),
  state: serviceToken<ShellStateManager>("shell.state"),
  layout: serviceToken<ShellLayoutManager>("shell.layout"),
  navigation: serviceToken<ShellNavigationEngine>("shell.navigation"),
  permissions: serviceToken<ShellPermissionLayer>("shell.permissions"),
  memory: serviceToken<ShellMemoryBridge>("shell.memory"),
  output: serviceToken<ShellOutputIntegration>("shell.output"),
  agents: serviceToken<ShellAgentBridge>("shell.agents"),
} as const;

export interface KernelOptions {
  readonly modules: readonly RuntimeModule[];
  readonly navigationAdapter?: NavigationAdapter;
  readonly memoryAdapter?: MemoryAdapter;
  readonly uiMount?: () => void | Promise<void>;
  readonly idFactory?: IdFactory;
}

const defaultIdFactory: IdFactory = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}`;

const noopNavigation: NavigationAdapter = { go: () => undefined };

export class ShellKernel {
  readonly diagnostics = new Diagnostics();
  readonly services = new ServiceBus();
  readonly registry = new ModuleRegistry();
  readonly capabilities = new CapabilityRegistry();
  readonly stateManager = new ShellStateManager();
  readonly layout = new ShellLayoutManager();
  readonly context: ShellContextManager;
  events!: EventBus;
  navigation!: ShellNavigationEngine;
  health!: ShellHealthMonitor;
  recovery!: ShellRecoveryEngine;

  private kernelState: KernelState = "created";
  private activatedIds: string[] = [];

  constructor(
    private readonly config: ShellConfig,
    private readonly options: KernelOptions,
  ) {
    this.context = new ShellContextManager();
  }

  get state(): KernelState {
    return this.kernelState;
  }

  private toolkit(): ModuleToolkit {
    return {
      services: this.services,
      events: this.events,
      diagnostics: this.diagnostics,
      context: this.context,
    };
  }

  /** Deterministic, fail-closed boot. Throws ShellBootError on any failure. */
  async boot(): Promise<void> {
    if (this.kernelState !== "created") {
      throw new ShellError("boot", `cannot boot from state "${this.kernelState}"`);
    }
    this.kernelState = "booting";
    const idFactory = this.options.idFactory ?? defaultIdFactory;
    let stage: BootStage = "kernel";
    const timed = async (next: BootStage, run: () => void | Promise<void>): Promise<void> => {
      stage = next;
      const t0 = performance.now();
      await run();
      this.diagnostics.recordBootStage(next, Math.round(performance.now() - t0));
    };

    try {
      await timed("kernel", () => {
        this.diagnostics.record("info", "boot", "kernel created", {
          name: this.config.name,
          version: this.config.version,
        });
      });

      await timed("configuration", () => {
        if (!this.config.boot.failClosed) {
          throw new Error("failClosed must be true");
        }
        if (this.config.eventBus.maxRetries < 0 || this.config.recovery.maxAttempts < 1) {
          throw new Error("invalid configuration bounds");
        }
      });

      await timed("capability-registry", () => {
        // Registry constructed; population happens after module registration.
        this.capabilities.clear();
      });

      await timed("dependency-validation", () => {
        for (const mod of this.options.modules) this.registry.register(mod);
        this.registry.bootOrder(); // throws on missing deps / cycles
        this.registry.declareCapabilities(this.capabilities); // throws on conflicts
        for (const cap of this.config.requiredCapabilities) {
          if (!this.capabilities.has(cap)) {
            throw new Error(`required capability "${cap}" has no provider`);
          }
        }
      });

      await timed("service-bus", () => {
        this.services.register(TOKENS.diagnostics, () => this.diagnostics);
        this.services.register(TOKENS.context, () => this.context);
        this.services.register(TOKENS.state, () => this.stateManager);
        this.services.register(TOKENS.layout, () => this.layout);
        this.services.register(TOKENS.permissions, (bus) => {
          return new ShellPermissionLayer(bus.resolve(TOKENS.diagnostics));
        });
        this.services.register(TOKENS.memory, (bus) => {
          return new ShellMemoryBridge(
            this.options.memoryAdapter ?? inertMemoryAdapter,
            bus.resolve(TOKENS.diagnostics),
          );
        });
        this.services.register(TOKENS.output, (bus) => {
          return new ShellOutputIntegration(bus.resolve(TOKENS.diagnostics));
        });
        this.services.register(TOKENS.agents, (bus) => {
          return new ShellAgentBridge(
            bus.resolve(TOKENS.permissions),
            bus.resolve(TOKENS.output),
            bus.resolve(TOKENS.diagnostics),
          );
        });
      });

      await timed("event-bus", () => {
        this.events = new EventBus({
          maxRetries: this.config.eventBus.maxRetries,
          deadLetterLimit: this.config.eventBus.deadLetterLimit,
          idFactory,
          diagnostics: this.diagnostics,
        });
        this.services.register(TOKENS.events, () => this.events);
        this.health = new ShellHealthMonitor(this.registry, this.diagnostics);
        this.recovery = new ShellRecoveryEngine(
          this.registry,
          this.services,
          this.events,
          this.stateManager,
          this.diagnostics,
          () => this.toolkit(),
          this.config.recovery.maxAttempts,
        );
        this.health.setUnhealthyHandler(async (moduleId) => {
          await this.recovery.recoverModule(moduleId);
        });
      });

      await timed("module-registration", async () => {
        for (const mod of this.registry.bootOrder()) {
          await mod.initialize(this.toolkit());
          this.registry.setState(mod.id, "initialized");
          await mod.activate();
          this.registry.setState(mod.id, "active");
          this.activatedIds.push(mod.id);
          this.diagnostics.record("info", "modules", "activated", {
            id: mod.id,
            version: mod.version,
          });
        }
      });

      await timed("agent-runtime", () => {
        // Constructing through DI proves the bridge graph resolves.
        this.services.resolve(TOKENS.agents);
      });

      await timed("navigation", () => {
        this.navigation = new ShellNavigationEngine(
          this.options.navigationAdapter ?? noopNavigation,
          this.context,
          this.diagnostics,
          this.config.navigation.fallbackPath,
        );
        this.navigation.registerRoute(this.config.navigation.fallbackPath);
        this.services.register(TOKENS.navigation, () => this.navigation);
      });

      await timed("ui-mount", async () => {
        if (this.options.uiMount) await this.options.uiMount();
      });

      await timed("ready", () => {
        this.kernelState = "ready";
      });
      await this.events.publish("shell.boot.ready", {
        name: this.config.name,
        version: this.config.version,
      });
    } catch (error) {
      // FAIL CLOSED: tear down whatever partially started, in reverse order.
      const message = error instanceof Error ? error.message : String(error);
      this.diagnostics.record("error", "boot", `stage "${stage}" failed`, { error: message });
      for (const id of [...this.activatedIds].reverse()) {
        const mod = this.registry.get(id);
        if (!mod) continue;
        try {
          await mod.deactivate();
          await mod.dispose();
          this.registry.setState(id, "disposed");
        } catch {
          this.registry.setState(id, "failed");
        }
      }
      this.activatedIds = [];
      this.kernelState = "failed";
      throw new ShellBootError(stage, message);
    }
  }

  /** Graceful shutdown — reverse deactivate/dispose of every active module. */
  async dispose(): Promise<void> {
    for (const id of [...this.activatedIds].reverse()) {
      const mod = this.registry.get(id);
      if (!mod) continue;
      try {
        await mod.deactivate();
        await mod.dispose();
        this.registry.setState(id, "disposed");
      } catch {
        this.registry.setState(id, "failed");
      }
    }
    this.activatedIds = [];
    this.services.clear();
    this.events?.clear();
    this.kernelState = "disposed";
  }
}

export function createKernel(config: ShellConfig, options: KernelOptions): ShellKernel {
  return new ShellKernel(config, options);
}

export const DEFAULT_SHELL_CONFIG: ShellConfig = {
  name: "nexios-shell",
  version: "2.0.0",
  environment: "production",
  boot: { failClosed: true },
  eventBus: { maxRetries: 2, deadLetterLimit: 100 },
  navigation: { fallbackPath: "/" },
  recovery: { maxAttempts: 2 },
  requiredCapabilities: [],
};
