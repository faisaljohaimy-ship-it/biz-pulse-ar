/**
 * Operating System Runtime — the top of the NEXIOS stack.
 *
 * Composes the frozen Phases 1-6 into one enterprise AI operating system:
 * a deterministic seven-stage boot sequence (dependencies → capabilities →
 * configuration → compatibility → policies → runtime → health) that only
 * declares READY after every validation passes; module management; global
 * health; immutable layer snapshots; layered recovery; telemetry and
 * performance. All execution still flows through the frozen chain
 * (Platform → Orchestrator → Agent Gateway → Output Gateway) — the OS layer
 * adds no new execution path and bypasses nothing.
 */
import type { IdFactory, RuntimeModule, ShellConfig } from "../types";
import { DEFAULT_SHELL_CONFIG, createKernel, type ShellKernel } from "../kernel";
import { createExecutiveShell } from "../executive/controller";
import { EXEC_TOKENS } from "../executive/controller";
import { createOrchestrationLayer } from "../orchestration/kernel";
import { instantSleep } from "../orchestration/types";
import { createPlatformRuntime } from "../platform/kernel";
import { PLATFORM_TOKENS } from "../platform/kernel";
import { createExecutiveIntelligence } from "../intelligence/kernel";
import { CompatibilityManager, RuntimeVersionManager } from "../platform/compat";
import { OsError, type Clock, type OsState, type PerfNow, type ResourceProbe } from "./types";
import {
  OsCapabilityRegistry,
  OsFeatureRegistry,
  OsModuleRegistry,
  OsPluginRegistry,
  OsServiceRegistry,
} from "./registries";
import {
  DependencyManager,
  ModuleLoader,
  ModuleValidator,
  OsPackageManager,
  UpgradeManager,
} from "./modules";
import {
  LifecycleManager,
  ShutdownManager,
  StartupManager,
  type BootStageReport,
} from "./lifecycle";
import { ObservabilityRuntime, PerformanceRuntime, TelemetryRuntime } from "./telemetry";
import {
  ConfigurationRuntime,
  PolicyRuntime,
  RuntimeHealthEngine,
  type OsHealthReport,
} from "./state";
import {
  BackupRuntime,
  OsSnapshotRuntime,
  RecoveryRuntime,
  type OsSnapshot,
  type OsSnapshotKind,
} from "./snapshots";

export interface OsOptions {
  readonly idFactory: IdFactory;
  readonly clock?: Clock;
  readonly perfNow?: PerfNow;
  readonly memoryProbe?: ResourceProbe;
  readonly storageProbe?: ResourceProbe;
  readonly environment?: ShellConfig["environment"];
  /** Additional runtime modules booted alongside the four standard layers. */
  readonly extraModules?: readonly RuntimeModule[];
}

export interface OsBootReport {
  readonly ready: boolean;
  readonly bootMs: number;
  readonly stages: readonly BootStageReport[];
}

/** The four standard NEXIOS layers, boot-ordered by their dependencies. */
const CORE_MODULE_IDS = [
  "executive-shell",
  "orchestration-layer",
  "platform-runtime",
  "executive-intelligence",
] as const;

export class OperatingSystemRuntime {
  readonly lifecycle = new LifecycleManager();
  readonly services = new OsServiceRegistry();
  readonly capabilities = new OsCapabilityRegistry();
  readonly modules = new OsModuleRegistry();
  readonly plugins = new OsPluginRegistry();
  readonly features = new OsFeatureRegistry();
  readonly validator = new ModuleValidator();
  readonly dependencies: DependencyManager;
  readonly loader: ModuleLoader;
  readonly versions = new RuntimeVersionManager();
  readonly compatibility = new CompatibilityManager();
  readonly upgrades: UpgradeManager;
  readonly packages = new OsPackageManager();
  readonly policies = new PolicyRuntime();
  readonly configuration = new ConfigurationRuntime();
  readonly telemetry: TelemetryRuntime;
  readonly performance: PerformanceRuntime;
  readonly observability: ObservabilityRuntime;
  readonly healthEngine: RuntimeHealthEngine;
  readonly snapshots: OsSnapshotRuntime;
  readonly backups: BackupRuntime;
  readonly recovery: RecoveryRuntime;

  private readonly startup = new StartupManager();
  private readonly shutdownManager = new ShutdownManager();
  private readonly clock: Clock;
  private readonly perfNow: PerfNow;
  private kernelInstance: ShellKernel | null = null;
  private lastBoot: OsBootReport | null = null;

  constructor(private readonly options: OsOptions) {
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.perfNow = options.perfNow ?? (() => performance.now());
    const memoryProbe = options.memoryProbe ?? (() => ({ usedMb: 0, limitMb: 1024 }));
    const storageProbe = options.storageProbe ?? (() => ({ usedMb: 0, limitMb: 10_240 }));

    this.dependencies = new DependencyManager(this.modules);
    this.loader = new ModuleLoader(
      this.modules,
      this.validator,
      this.dependencies,
      this.capabilities,
      this.perfNow,
    );
    this.upgrades = new UpgradeManager(this.versions, this.compatibility);
    this.telemetry = new TelemetryRuntime(this.clock);
    this.performance = new PerformanceRuntime(this.perfNow);
    this.observability = new ObservabilityRuntime(this.telemetry, this.performance, this.perfNow);
    this.healthEngine = new RuntimeHealthEngine({
      registry: this.modules,
      dependencies: this.dependencies,
      performance: this.performance,
      memoryProbe,
      storageProbe,
    });
    this.snapshots = new OsSnapshotRuntime(options.idFactory, this.clock);
    this.backups = new BackupRuntime(options.idFactory, this.clock);
    this.recovery = new RecoveryRuntime({
      registry: this.modules,
      backups: this.backups,
      config: this.configuration,
      restartModule: (id) => this.restartModule(id),
      disableModule: (id) => this.loader.disable(id),
    });

    // Register the four standard layers + extras (contract-validated).
    const layers: readonly RuntimeModule[] = [
      createExecutiveShell({ idFactory: options.idFactory, clock: this.clock }),
      createOrchestrationLayer({
        idFactory: options.idFactory,
        clock: this.clock,
        sleep: instantSleep,
      }),
      createPlatformRuntime({ idFactory: options.idFactory, clock: this.clock }),
      createExecutiveIntelligence({ idFactory: options.idFactory, clock: this.clock }),
      ...(options.extraModules ?? []),
    ];
    for (const layer of layers) {
      this.loader.registerModule(layer);
      this.versions.setVersion(layer.id, layer.version);
      this.compatibility.declareSupport(layer.id, [layer.version]);
      this.services.register({
        id: `module:${layer.id}`,
        layer: layer.id,
        description: `runtime module ${layer.id}@${layer.version}`,
      });
    }
    this.versions.setVersion("nexios-os", "7.0.0");
    this.compatibility.declareSupport("nexios-os", ["7.0.0"]);
  }

  kernel(): ShellKernel {
    if (!this.kernelInstance) throw new OsError("runtime", "kernel is not booted");
    return this.kernelInstance;
  }

  state(): OsState {
    return this.lifecycle.state();
  }

  lastBootReport(): OsBootReport | null {
    return this.lastBoot;
  }

  /** Deterministic boot: seven validations, READY only after all pass. */
  async boot(): Promise<OsBootReport> {
    this.lifecycle.transition("booting");
    const t0 = this.perfNow();
    const span = this.observability.startSpan("os.boot");

    const result = await this.startup.run([
      { name: "dependencies", run: () => void this.dependencies.order() },
      {
        name: "capabilities",
        run: () => {
          const verdict = this.capabilities.verify();
          if (!verdict.ok) throw new OsError("boot", verdict.problems.join("; "));
        },
      },
      {
        name: "configuration",
        run: () => {
          const verdict = this.configuration.validateAll();
          if (!verdict.ok) throw new OsError("boot", verdict.problems.join("; "));
        },
      },
      {
        name: "compatibility",
        run: () => {
          for (const record of this.modules.list()) {
            const recorded = this.versions.versionOf(record.module.id);
            if (recorded !== record.module.version) {
              throw new OsError(
                "boot",
                `version drift for "${record.module.id}": recorded ${recorded}, module ${record.module.version}`,
              );
            }
          }
        },
      },
      {
        name: "policies",
        run: () => {
          const verdict = this.policies.evaluate("os.boot");
          if (!verdict.allowed) throw new OsError("boot", verdict.reasons.join("; "));
        },
      },
      {
        name: "runtime",
        run: async () => {
          const config: ShellConfig = {
            ...DEFAULT_SHELL_CONFIG,
            environment: this.options.environment ?? "production",
          };
          const bootable = this.modules
            .list()
            .filter((r) => r.state !== "disabled")
            .map((r) => r.module);
          const kernel = createKernel(config, {
            idFactory: this.options.idFactory,
            modules: bootable,
          });
          const kernelT0 = this.perfNow();
          await kernel.boot();
          this.performance.record("os.kernel-boot", Math.max(0, this.perfNow() - kernelT0));
          this.kernelInstance = kernel;
          for (const record of this.modules.list()) {
            if (record.state !== "disabled") {
              record.state = "loaded";
              record.loadCount++;
              record.lastLoadMs = 0;
            }
          }
        },
      },
      {
        name: "health",
        run: async () => {
          const report = this.healthEngine.report("booting", await this.kernel().health.tick());
          if (report.global === "unhealthy") {
            throw new OsError("boot", "post-boot health is unhealthy — refusing READY");
          }
        },
      },
    ]);

    const bootMs = Math.max(0, this.perfNow() - t0);
    this.performance.record("os.boot", bootMs);
    span.end();

    if (!result.ok) {
      if (this.kernelInstance) {
        await this.kernelInstance.dispose().catch(() => undefined);
        this.kernelInstance = null;
      }
      this.lifecycle.transition("failed");
      this.telemetry.event("os.boot", "FAILED");
      this.lastBoot = { ready: false, bootMs, stages: result.reports };
      return this.lastBoot;
    }

    this.lifecycle.transition("ready");
    this.telemetry.event("os.boot", "READY");
    this.telemetry.increment("os.boots");
    this.lastBoot = { ready: true, bootMs, stages: result.reports };
    return this.lastBoot;
  }

  /** Graceful shutdown — reverse module disposal via the frozen kernel. */
  async shutdown(): Promise<void> {
    await this.shutdownManager.shutdown(this.lifecycle, this.kernelInstance);
    this.kernelInstance = null;
    for (const record of this.modules.list()) {
      if (record.state === "loaded") record.state = "registered";
    }
    this.telemetry.event("os.shutdown", "stopped");
  }

  /** Restart Runtime — full stop, then a fresh deterministic boot. */
  async restartRuntime(): Promise<OsBootReport> {
    if (this.lifecycle.state() === "ready" || this.lifecycle.state() === "degraded") {
      await this.shutdown();
    }
    this.telemetry.increment("os.restarts");
    return this.boot();
  }

  /** Module restart: OS bookkeeping + the frozen Phase-2 recovery engine. */
  restartModule(id: string): void {
    this.loader.restart(id);
    if (this.kernelInstance) {
      void this.kernelInstance.recovery.recoverModule(id);
    }
    this.telemetry.increment(`os.module.restart.${id}`);
  }

  /** Global health across runtime, modules, dependencies and resources. */
  async health(): Promise<OsHealthReport> {
    const kernelReport =
      this.kernelInstance && this.kernelInstance.state === "ready"
        ? await this.kernelInstance.health.tick()
        : null;
    return this.healthEngine.report(this.lifecycle.state(), kernelReport);
  }

  /** Immutable system snapshots, layer snapshots included. */
  async snapshot(kind: OsSnapshotKind): Promise<OsSnapshot> {
    switch (kind) {
      case "configuration":
        return this.snapshots.capture(kind, this.configuration.current());
      case "capabilities":
        return this.snapshots.capture(kind, this.capabilities.list());
      case "modules":
        return this.snapshots.capture(
          kind,
          this.modules.list().map((r) => ({
            id: r.module.id,
            version: r.module.version,
            state: r.state,
            loadCount: r.loadCount,
            restartCount: r.restartCount,
          })),
        );
      case "runtime":
        return this.snapshots.capture(kind, {
          state: this.lifecycle.state(),
          bootMs: this.lastBoot?.bootMs ?? null,
          telemetry: this.telemetry.snapshot(),
        });
      case "executive-layer": {
        const metrics = this.kernel().services.resolve(EXEC_TOKENS.metrics);
        return this.snapshots.capture(kind, metrics.snapshot());
      }
      case "platform-layer": {
        const platform = this.kernel().services.resolve(PLATFORM_TOKENS.platform);
        return this.snapshots.capture(kind, await platform.observe());
      }
    }
  }

  /** Emergency recovery: keep the core layers, disable everything else. */
  emergencyRecover(): ReturnType<RecoveryRuntime["emergencyRecover"]> {
    const report = this.recovery.emergencyRecover(CORE_MODULE_IDS);
    if (this.lifecycle.state() === "ready") this.lifecycle.transition("degraded");
    this.telemetry.event("os.recovery", report.detail);
    return report;
  }
}

/** Factory — the OS runtime is constructed per call site; no globals. */
export function createOperatingSystem(options: OsOptions): OperatingSystemRuntime {
  return new OperatingSystemRuntime(options);
}
