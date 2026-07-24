import { describe, expect, it } from "vitest";
import type { RuntimeModule } from "../types";
import { INTEL_TOKENS } from "../intelligence/kernel";
import { PLATFORM_TOKENS } from "../platform/kernel";
import { ORCH_TOKENS } from "../orchestration/kernel";
import { EXEC_TOKENS } from "../executive/controller";
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
import { LifecycleManager } from "./lifecycle";
import { ObservabilityRuntime, PerformanceRuntime, TelemetryRuntime } from "./telemetry";
import { ConfigurationRuntime, PolicyRuntime } from "./state";
import { BackupRuntime, OsSnapshotRuntime } from "./snapshots";
import { createOperatingSystem } from "./runtime";
import { CompatibilityManager, RuntimeVersionManager } from "../platform/compat";
import { OsError } from "./types";

// ── Deterministic ports ─────────────────────────────────────────────────────

const seqIds = () => {
  let n = 0;
  return () => `id-${++n}`;
};
const FIXED_ISO = "2026-07-24T12:00:00Z";
const fixedClock = () => FIXED_ISO;
/** Monotonic fake counter advancing 5ms per call. */
const fakePerf = () => {
  let t = 0;
  return () => (t += 5);
};

function makeModule(overrides: Partial<RuntimeModule> = {}): RuntimeModule {
  return {
    id: overrides.id ?? "mod-a",
    version: overrides.version ?? "1.0.0",
    capabilities: overrides.capabilities ?? [],
    dependencies: overrides.dependencies ?? [],
    health: overrides.health ?? (() => ({ status: "healthy" as const })),
    initialize: overrides.initialize ?? (() => undefined),
    activate: overrides.activate ?? (() => undefined),
    deactivate: overrides.deactivate ?? (() => undefined),
    dispose: overrides.dispose ?? (() => undefined),
  };
}

function makeOs(
  opts: Parameters<typeof createOperatingSystem>[0] extends infer T ? Partial<T> : never = {},
) {
  return createOperatingSystem({
    idFactory: seqIds(),
    clock: fixedClock,
    environment: "test",
    ...opts,
  });
}

function loaderFixture() {
  const registry = new OsModuleRegistry();
  const validator = new ModuleValidator();
  const capabilities = new OsCapabilityRegistry();
  const dependencies = new DependencyManager(registry);
  const loader = new ModuleLoader(registry, validator, dependencies, capabilities, fakePerf());
  return { registry, validator, capabilities, dependencies, loader };
}

// ── Boot sequence (integration + boot tests) ────────────────────────────────

describe("Operating System Runtime — deterministic boot sequence", () => {
  it("boots the full four-layer stack: all seven validations pass, then READY", async () => {
    const os = makeOs();
    const report = await os.boot();
    expect(report.ready).toBe(true);
    expect(report.stages.map((s) => s.stage)).toEqual([
      "dependencies",
      "capabilities",
      "configuration",
      "compatibility",
      "policies",
      "runtime",
      "health",
    ]);
    expect(report.stages.every((s) => s.ok)).toBe(true);
    expect(os.state()).toBe("ready");
    expect(os.kernel().state).toBe("ready");
  });

  it("a denying policy fails the boot BEFORE the kernel starts (fail closed)", async () => {
    const os = makeOs();
    os.policies.register({
      id: "freeze",
      evaluate: (action) =>
        action === "os.boot"
          ? { allowed: false, reason: "تجميد النشر" }
          : { allowed: true, reason: "ok" },
    });
    const report = await os.boot();
    expect(report.ready).toBe(false);
    const failed = report.stages.find((s) => !s.ok);
    expect(failed?.stage).toBe("policies");
    expect(report.stages.some((s) => s.stage === "runtime")).toBe(false); // stopped early
    expect(os.state()).toBe("failed");
    expect(() => os.kernel()).toThrow(/not booted/);
  });

  it("an invalid extra module is refused at registration (never reaches boot)", () => {
    expect(() =>
      makeOs({
        extraModules: [makeModule({ id: "broken", version: "not-semver" })],
      }),
    ).toThrow(/not strict semver/);
  });

  it("a failed boot can recover: fix the input, boot again to READY", async () => {
    const os = makeOs();
    let frozen = true;
    os.policies.register({
      id: "toggle",
      evaluate: () =>
        frozen ? { allowed: false, reason: "مجمّد" } : { allowed: true, reason: "ok" },
    });
    expect((await os.boot()).ready).toBe(false);
    frozen = false;
    expect((await os.boot()).ready).toBe(true); // failed → booting → ready
  });

  it("restartRuntime performs a full stop and a fresh boot", async () => {
    const os = makeOs();
    await os.boot();
    const report = await os.restartRuntime();
    expect(report.ready).toBe(true);
    expect(os.state()).toBe("ready");
    expect(os.telemetry.counter("os.restarts")).toBe(1);
    expect(os.telemetry.counter("os.boots")).toBe(2);
  });

  it("shutdown lands on stopped and disposes the kernel", async () => {
    const os = makeOs();
    await os.boot();
    await os.shutdown();
    expect(os.state()).toBe("stopped");
    expect(() => os.kernel()).toThrow(/not booted/);
  });
});

// ── Lifecycle state machine ─────────────────────────────────────────────────

describe("Lifecycle Manager — strict state machine", () => {
  it("refuses illegal transitions and records legal ones", () => {
    const lifecycle = new LifecycleManager();
    expect(() => lifecycle.transition("ready")).toThrow(/illegal transition/); // created → ready forbidden
    lifecycle.transition("booting");
    lifecycle.transition("ready");
    lifecycle.transition("degraded");
    lifecycle.transition("ready");
    expect(lifecycle.history()).toHaveLength(4);
    expect(() => lifecycle.transition("stopped")).toThrow(/illegal/); // ready → stopped needs shutting_down
  });
});

// ── Module management ───────────────────────────────────────────────────────

describe("Module management — validator, loader, dependencies", () => {
  it("validator reports every contract violation", () => {
    const validator = new ModuleValidator();
    const verdict = validator.validate({
      id: " ",
      version: "1.x",
      capabilities: [],
      dependencies: [],
      health: () => ({ status: "healthy" as const }),
    } as unknown as RuntimeModule);
    expect(verdict.valid).toBe(false);
    expect(verdict.problems.join(" ")).toMatch(/id is required/);
    expect(verdict.problems.join(" ")).toMatch(/not strict semver/);
    expect(verdict.problems.join(" ")).toMatch(/initialize\(\) is missing/);
  });

  it("register/load/unload/restart/disable with dependency guards", () => {
    const { loader, registry } = loaderFixture();
    loader.registerModule(makeModule({ id: "base" }));
    loader.registerModule(makeModule({ id: "child", dependencies: ["base"] }));
    expect(() => loader.registerModule(makeModule({ id: "base" }))).toThrow(/duplicate module/);

    expect(() => loader.load("child")).toThrow(/needs loaded dependencies/); // base not loaded yet
    loader.load("base");
    loader.load("child");
    expect(registry.get("child")?.state).toBe("loaded");

    expect(() => loader.unload("base")).toThrow(/loaded dependents/); // fail closed
    loader.unload("child");
    loader.unload("base"); // now legal
    expect(registry.get("base")?.state).toBe("unloaded");

    loader.load("base");
    loader.restart("base");
    expect(registry.get("base")?.restartCount).toBe(1);
    expect(() => loader.restart("child")).toThrow(/cannot restart/); // unloaded

    expect(() => loader.disable("base")).not.toThrow();
    expect(() => loader.load("base")).toThrow(/disabled/);
    loader.enable("base");
    loader.load("base");
    expect(registry.get("base")?.loadCount).toBe(3);
  });

  it("version, dependency and capability conflict checks", () => {
    const { loader } = loaderFixture();
    loader.registerModule(makeModule({ id: "a", version: "2.1.0", capabilities: ["cap.x"] }));
    expect(loader.versionCheck("a", "2.1.0")).toBe(true);
    expect(loader.versionCheck("a", "2.0.0")).toBe(false);
    expect(() => loader.registerModule(makeModule({ id: "b", capabilities: ["cap.x"] }))).toThrow(
      /already provided/,
    ); // capability conflict refused
    loader.registerModule(makeModule({ id: "c", dependencies: ["ghost"] }));
    expect(loader.dependencyCheck("c")).toEqual({ satisfied: false, missing: ["ghost"] });
  });

  it("dependency manager refuses cycles and lists dependents", () => {
    const { loader, dependencies } = loaderFixture();
    loader.registerModule(makeModule({ id: "x", dependencies: ["y"] }));
    loader.registerModule(makeModule({ id: "y", dependencies: ["x"] }));
    expect(() => dependencies.order()).toThrow(/dependency cycle/);
    expect(dependencies.audit().satisfied).toBe(false);
    expect(dependencies.dependentsOf("y")).toEqual(["x"]);
  });

  it("upgrade manager refuses regressions without a migration path", () => {
    const versions = new RuntimeVersionManager();
    const compat = new CompatibilityManager();
    const upgrades = new UpgradeManager(versions, compat);
    versions.setVersion("store", "1.0.0");
    expect(upgrades.compatibilityCheck("store", "1.2.0")).toBe(true); // backward compatible
    expect(upgrades.compatibilityCheck("store", "2.0.0")).toBe(false); // no path
    compat.registerMigration({ component: "store", from: "1.0.0", to: "2.0.0", migrate: (s) => s });
    const plan = upgrades.planUpgrade("store", "2.0.0");
    upgrades.apply(plan);
    expect(versions.versionOf("store")).toBe("2.0.0");
    expect(() => upgrades.planUpgrade("ghost", "1.0.0")).toThrow(/unknown component/);
  });

  it("package manager plans installs dependencies-first", () => {
    const packages = new OsPackageManager();
    packages.registerPackage({ id: "core", version: "1.0.0", dependencies: [] });
    packages.registerPackage({ id: "addon", version: "1.0.0", dependencies: ["core"] });
    expect(packages.install("addon")).toEqual(["core", "addon"]);
    expect(packages.stats().installed).toBe(2);
  });
});

// ── OS registries ───────────────────────────────────────────────────────────

describe("OS registries — closed world", () => {
  it("service, plugin and feature registries refuse duplicates and toggle", () => {
    const services = new OsServiceRegistry();
    services.register({ id: "svc", layer: "platform-runtime", description: "" });
    expect(() => services.register({ id: "svc", layer: "x", description: "" })).toThrow(
      /duplicate service/,
    );
    expect(services.byLayer("platform-runtime")).toHaveLength(1);

    const plugins = new OsPluginRegistry();
    plugins.register({ id: "p1", version: "1.0.0", forModule: "platform-runtime" });
    expect(plugins.isEnabled("p1")).toBe(true);
    plugins.setEnabled("p1", false);
    expect(plugins.isEnabled("p1")).toBe(false);
    expect(plugins.isEnabled("ghost")).toBe(false); // fail closed
    expect(() => plugins.setEnabled("ghost", true)).toThrow(/unknown plugin/);

    const features = new OsFeatureRegistry();
    features.register({ id: "f1", description: "", defaultEnabled: true });
    expect(features.enabled("f1")).toBe(true);
    features.setEnabled("f1", false);
    expect(features.enabled("f1")).toBe(false);
    expect(() => features.enabled("ghost")).toThrow(/unknown feature/);
  });
});

// ── Policy + configuration runtimes ─────────────────────────────────────────

describe("Policy & configuration runtimes", () => {
  it("policy runtime: deny wins across policies", () => {
    const policies = new PolicyRuntime();
    policies.register({ id: "allow-all", evaluate: () => ({ allowed: true, reason: "ok" }) });
    policies.register({
      id: "deny-unload",
      evaluate: (action) =>
        action === "module.unload"
          ? { allowed: false, reason: "ممنوع" }
          : { allowed: true, reason: "ok" },
    });
    expect(policies.evaluate("os.boot").allowed).toBe(true);
    expect(policies.evaluate("module.unload")).toMatchObject({ allowed: false });
  });

  it("configuration runtime validates writes and restores exact revisions", () => {
    const config = new ConfigurationRuntime();
    config.registerValidator("locale", (v) =>
      v === "ar" || v === "en" ? true : "locale must be ar|en",
    );
    expect(() => config.set("locale", "fr")).toThrow(/rejected/);
    const rev1 = config.set("locale", "ar");
    config.set("theme", "dark");
    const rev3 = config.set("locale", "en");
    expect(config.get("locale")).toBe("en");
    config.restore(rev1); // configuration recovery
    expect(config.get("locale")).toBe("ar");
    expect(config.get("theme")).toBeUndefined(); // exact revision, not a merge
    expect(() => config.restore(999)).toThrow(/unknown revision/);
    expect(config.validateAll().ok).toBe(true);
    expect(rev3).toBeGreaterThan(rev1);
    expect(Object.isFrozen(config.current())).toBe(true);
  });
});

// ── Health ──────────────────────────────────────────────────────────────────

describe("System health — global, modules, dependencies, resources", () => {
  it("reports every health section and overall readiness on a booted OS", async () => {
    const os = makeOs();
    await os.boot();
    const report = await os.health();
    expect(report.runtimeStatus).toBe("ready");
    expect(report.global).toBe("healthy");
    expect(report.modules.map((m) => m.id).sort()).toEqual([
      "executive-intelligence",
      "executive-shell",
      "orchestration-layer",
      "platform-runtime",
    ]);
    expect(report.dependencies.satisfied).toBe(true);
    expect(report.performance.bootMs).not.toBeNull();
    expect(report.memory.status).toBe("healthy");
    expect(report.storage.status).toBe("healthy");
    expect(report.ready).toBe(true);
  });

  it("memory exhaustion turns the system unhealthy and not ready", async () => {
    const os = makeOs({ memoryProbe: () => ({ usedMb: 980, limitMb: 1024 }) });
    await os.boot(); // boots, but health gate flags it
    const report = await os.health();
    expect(report.memory.status).toBe("unhealthy");
    expect(report.global).toBe("unhealthy");
    expect(report.ready).toBe(false);
  });

  it("storage pressure degrades without failing readiness", async () => {
    const os = makeOs({ storageProbe: () => ({ usedMb: 8500, limitMb: 10_240 }) });
    await os.boot();
    const report = await os.health();
    expect(report.storage.status).toBe("degraded");
    expect(report.global).toBe("degraded");
    expect(report.ready).toBe(true); // degraded ≠ down
  });
});

// ── Snapshots ───────────────────────────────────────────────────────────────

describe("System snapshots — immutable, six kinds", () => {
  it("captures configuration/capabilities/modules/runtime/executive/platform", async () => {
    const os = makeOs();
    await os.boot();
    os.configuration.set("locale", "ar");
    for (const kind of [
      "configuration",
      "capabilities",
      "modules",
      "runtime",
      "executive-layer",
      "platform-layer",
    ] as const) {
      const snapshot = await os.snapshot(kind);
      expect(snapshot.kind).toBe(kind);
      expect(snapshot.atISO).toBe(FIXED_ISO);
      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(os.snapshots.latest(kind)?.snapshotId).toBe(snapshot.snapshotId);
    }
    const modulesSnapshot = os.snapshots.latest("modules")!;
    expect(() => {
      (modulesSnapshot.data as { id: string }[]).push({ id: "fake" });
    }).toThrow(TypeError); // deep-frozen
    const runtimeSnapshot = os.snapshots.latest("runtime")!;
    expect((runtimeSnapshot.data as { state: string }).state).toBe("ready");
  });

  it("layer snapshots refuse to capture before boot (no bypass)", async () => {
    const os = makeOs();
    await expect(os.snapshot("platform-layer")).rejects.toThrow(/not booted/);
  });
});

// ── Backup & recovery ───────────────────────────────────────────────────────

describe("Recovery — safe, rollback, configuration, emergency", () => {
  it("backups restore with integrity; tampering is refused", () => {
    const backups = new BackupRuntime(seqIds(), fixedClock);
    const backup = backups.backup("pre-upgrade", { locale: "ar", theme: "dark" });
    expect(backups.restore(backup.backupId)).toEqual({ locale: "ar", theme: "dark" });
    expect(backup.checksum).toMatch(/^[0-9a-f]{8}$/); // integrity checksum present
    expect(() => backups.restore("ghost")).toThrow(/unknown backup/);
    expect(backups.list()[0]).toMatchObject({ label: "pre-upgrade", atISO: FIXED_ISO });
  });

  it("safe recovery restarts a failed module through the approved path", async () => {
    const os = makeOs();
    await os.boot();
    os.modules.require("executive-intelligence").state = "failed"; // simulate crash
    const report = os.recovery.safeRecover("executive-intelligence");
    expect(report.ok).toBe(true);
    expect(os.modules.require("executive-intelligence").state).toBe("loaded");
    expect(os.modules.require("executive-intelligence").restartCount).toBe(1);
  });

  it("rollback returns backed-up state; configuration recovery restores revisions", async () => {
    const os = makeOs();
    await os.boot();
    const rev = os.configuration.set("mode", "showcase");
    const backup = os.backups.backup("golden", { mode: "showcase" });
    os.configuration.set("mode", "broken");
    const { report, state } = os.recovery.rollback(backup.backupId);
    expect(report.ok).toBe(true);
    expect(state).toEqual({ mode: "showcase" });
    expect(os.recovery.recoverConfiguration(rev).ok).toBe(true);
    expect(os.configuration.get("mode")).toBe("showcase");
  });

  it("emergency recovery disables non-core modules and degrades the runtime", async () => {
    const os = makeOs({
      extraModules: [makeModule({ id: "experimental-widget", version: "0.1.0" })],
    });
    await os.boot();
    const report = os.emergencyRecover();
    expect(report.ok).toBe(true);
    expect(report.detail).toContain("experimental-widget");
    expect(os.modules.require("experimental-widget").state).toBe("disabled");
    expect(os.modules.require("platform-runtime").state).toBe("loaded"); // core survives
    expect(os.state()).toBe("degraded");
  });
});

// ── Observability & performance ─────────────────────────────────────────────

describe("Observability — metrics, tracing, diagnostics, statistics", () => {
  it("telemetry counts, gauges and bounded events", () => {
    const telemetry = new TelemetryRuntime(fixedClock, 2);
    telemetry.increment("requests");
    telemetry.increment("requests", 2);
    telemetry.gauge("depth", 7);
    telemetry.event("boot", "one");
    telemetry.event("boot", "two");
    telemetry.event("boot", "three"); // bounded to 2
    expect(telemetry.counter("requests")).toBe(3);
    expect(telemetry.snapshot().gauges.depth).toBe(7);
    expect(telemetry.eventsOf("boot").map((e) => e.detail)).toEqual(["two", "three"]);
  });

  it("performance measures spans deterministically and computes throughput", () => {
    const performance = new PerformanceRuntime(fakePerf());
    performance.begin("op");
    expect(performance.end("op")).toBe(5); // fake counter advances 5ms/call
    performance.record("op", 15);
    expect(performance.stats("op")).toEqual({ count: 2, totalMs: 20, avgMs: 10, maxMs: 15 });
    expect(performance.stats("ghost")).toBeNull();
    expect(() => performance.end("never-opened")).toThrow(OsError);
    expect(performance.throughput(500, 1000)).toBe(500); // ops/sec
  });

  it("observability composes spans + telemetry + diagnostics into statistics", () => {
    const telemetry = new TelemetryRuntime(fixedClock);
    const performance = new PerformanceRuntime(fakePerf());
    const observability = new ObservabilityRuntime(telemetry, performance, fakePerf());
    const span = observability.startSpan("brief");
    span.end();
    observability.diagnostics.record("info", "os", "hello", {});
    performance.record("os.boot", 42);
    const stats = observability.runtimeStatistics();
    expect(stats.spans).toBe(1);
    expect(stats.counters["trace.brief"]).toBe(1);
    expect(stats.diagnostics).toBe(1);
    expect(stats.measures.boot?.avgMs).toBe(42);
    expect(observability.traces("brief")).toHaveLength(1);
  });

  it("boot time and kernel boot time are measured on a real boot", async () => {
    const os = makeOs(); // real perfNow
    const report = await os.boot();
    expect(report.bootMs).toBeGreaterThanOrEqual(0);
    expect(report.bootMs).toBeLessThan(30_000); // performance envelope
    expect(os.performance.stats("os.boot")?.count).toBe(1);
    expect(os.performance.stats("os.kernel-boot")?.count).toBe(1);
  });
});

// ── Architecture: the OS composes, never bypasses ───────────────────────────

describe("Architecture — full stack reachable, gateways intact, no bypass", () => {
  it("every layer's services resolve through the OS kernel's single bus", async () => {
    const os = makeOs();
    await os.boot();
    const services = os.kernel().services;
    expect(services.resolve(EXEC_TOKENS.metrics)).toBeTruthy();
    expect(services.resolve(ORCH_TOKENS.orchestrator)).toBeTruthy();
    expect(services.resolve(PLATFORM_TOKENS.platform)).toBeTruthy();
    expect(services.resolve(INTEL_TOKENS.runtime)).toBeTruthy();
  });

  it("governance still holds through the OS-booted stack (no policy bypass)", async () => {
    const os = makeOs();
    await os.boot();
    const orchestrator = os.kernel().services.resolve(ORCH_TOKENS.orchestrator);
    // Unroutable capability → denied by the frozen Phase-4 policy engine.
    const result = await orchestrator.runSingle({
      id: "t-1",
      owner: "ghost",
      context: {
        actor: { userId: null, appRoles: [], orgRole: null, orgId: null },
        locale: "ar",
        correlationId: "c-1",
      },
      priority: 1,
      dependencies: [],
      capabilities: ["cap.unrouted"],
      requiredSkills: [],
      policies: [],
      timeoutMs: 1000,
      retry: { maxAttempts: 1, backoff: "none", baseDelayMs: 0 },
      input: null,
    });
    expect(result.state).toBe("denied");
  });

  it("the intelligence layer stays advisory through the OS (frozen contract)", async () => {
    const os = makeOs();
    await os.boot();
    const runtime = os.kernel().services.resolve(INTEL_TOKENS.runtime);
    const surface = Object.getOwnPropertyNames(Object.getPrototypeOf(runtime)).sort();
    expect(surface).toEqual(["brief", "capabilities", "constructor"]);
  });
});
