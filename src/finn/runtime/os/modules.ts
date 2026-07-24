/**
 * Module management — Module Validator · Dependency Manager · Module Loader ·
 * Upgrade Manager · Package Manager.
 *
 * The validator enforces the RuntimeModule contract (strict semver, complete
 * lifecycle). The dependency manager owns the graph: topological order,
 * cycles and missing dependencies refused, dependents tracked so unloading a
 * needed module fails closed. The upgrade manager composes the frozen
 * Phase-5 CompatibilityManager — unsafe upgrades are refused, never applied.
 */
import { OsError, type PerfNow } from "./types";
import type { RuntimeModule } from "../types";
import { parseSemver } from "../platform/compat";
import type { CompatibilityManager, RuntimeVersionManager } from "../platform/compat";
import { PackageRegistry, type PackageDefinition } from "../platform/extensions";
import type { OsCapabilityRegistry, OsModuleRegistry } from "./registries";

export class ModuleValidator {
  /** Validate the full RuntimeModule contract; returns every problem found. */
  validate(module: RuntimeModule): { valid: boolean; problems: readonly string[] } {
    const problems: string[] = [];
    if (!module.id?.trim()) problems.push("module id is required");
    try {
      parseSemver(module.version);
    } catch {
      problems.push(`version "${module.version}" is not strict semver`);
    }
    if (!Array.isArray(module.capabilities)) problems.push("capabilities must be an array");
    if (!Array.isArray(module.dependencies)) problems.push("dependencies must be an array");
    for (const fn of ["health", "initialize", "activate", "deactivate", "dispose"] as const) {
      if (typeof module[fn] !== "function") problems.push(`lifecycle ${fn}() is missing`);
    }
    return { valid: problems.length === 0, problems };
  }

  validateOrThrow(module: RuntimeModule): void {
    const { valid, problems } = this.validate(module);
    if (!valid) {
      throw new OsError("validator", `module "${module.id}" invalid: ${problems.join("; ")}`);
    }
  }
}

export class DependencyManager {
  constructor(private readonly registry: OsModuleRegistry) {}

  /** Topological order — missing dependencies and cycles are refused. */
  order(): readonly string[] {
    const order: string[] = [];
    const marks = new Map<string, "visiting" | "done">();
    const visit = (id: string, path: string[]): void => {
      const mark = marks.get(id);
      if (mark === "done") return;
      if (mark === "visiting") {
        throw new OsError("dependencies", `dependency cycle: ${[...path, id].join(" → ")}`);
      }
      const record = this.registry.get(id);
      if (!record) throw new OsError("dependencies", `missing dependency "${id}"`);
      marks.set(id, "visiting");
      for (const dep of record.module.dependencies) visit(dep, [...path, id]);
      marks.set(id, "done");
      order.push(id);
    };
    for (const record of this.registry.list()) visit(record.module.id, []);
    return order;
  }

  /** Missing dependencies for one module. */
  missingFor(id: string): readonly string[] {
    const record = this.registry.require(id);
    return record.module.dependencies.filter((dep) => !this.registry.get(dep));
  }

  /** Modules that (directly) depend on the given module. */
  dependentsOf(id: string): readonly string[] {
    return this.registry
      .list()
      .filter((r) => r.module.dependencies.includes(id))
      .map((r) => r.module.id);
  }

  audit(): { satisfied: boolean; problems: readonly string[] } {
    const problems: string[] = [];
    try {
      this.order();
    } catch (error) {
      problems.push(error instanceof Error ? error.message : String(error));
    }
    return { satisfied: problems.length === 0, problems };
  }
}

export class ModuleLoader {
  constructor(
    private readonly registry: OsModuleRegistry,
    private readonly validator: ModuleValidator,
    private readonly dependencies: DependencyManager,
    private readonly capabilities: OsCapabilityRegistry,
    private readonly perfNow: PerfNow,
  ) {}

  /** Register: contract-validated, capability conflicts refused. */
  registerModule(module: RuntimeModule): void {
    this.validator.validateOrThrow(module);
    for (const capability of module.capabilities) this.capabilities.claim(capability, module.id);
    this.registry.register(module);
  }

  /** Load: every dependency must already be loaded (fail closed). */
  load(id: string): void {
    const record = this.registry.require(id);
    if (record.state === "loaded") return;
    if (record.state === "disabled") {
      throw new OsError("loader", `module "${id}" is disabled — enable before loading`);
    }
    const notLoaded = record.module.dependencies.filter(
      (dep) => this.registry.get(dep)?.state !== "loaded",
    );
    if (notLoaded.length > 0) {
      throw new OsError(
        "loader",
        `module "${id}" needs loaded dependencies: ${notLoaded.join(", ")}`,
      );
    }
    const t0 = this.perfNow();
    record.state = "loaded";
    record.loadCount++;
    record.lastLoadMs = Math.max(0, Math.round(this.perfNow() - t0));
  }

  /** Unload: refused while loaded modules still depend on it (fail closed). */
  unload(id: string): void {
    const record = this.registry.require(id);
    const loadedDependents = this.dependencies
      .dependentsOf(id)
      .filter((dep) => this.registry.get(dep)?.state === "loaded");
    if (loadedDependents.length > 0) {
      throw new OsError(
        "loader",
        `cannot unload "${id}" — loaded dependents: ${loadedDependents.join(", ")}`,
      );
    }
    record.state = "unloaded";
  }

  /** Restart: only a loaded module restarts; the record tracks it. */
  restart(id: string): void {
    const record = this.registry.require(id);
    if (record.state !== "loaded") {
      throw new OsError("loader", `cannot restart "${id}" — state is "${record.state}"`);
    }
    record.restartCount++;
  }

  /** Disable: refused while loaded modules depend on it. */
  disable(id: string): void {
    const record = this.registry.require(id);
    const loadedDependents = this.dependencies
      .dependentsOf(id)
      .filter((dep) => this.registry.get(dep)?.state === "loaded");
    if (loadedDependents.length > 0) {
      throw new OsError(
        "loader",
        `cannot disable "${id}" — loaded dependents: ${loadedDependents.join(", ")}`,
      );
    }
    record.state = "disabled";
  }

  enable(id: string): void {
    const record = this.registry.require(id);
    if (record.state === "disabled") record.state = "registered";
  }

  /** Re-validate a registered module's contract. */
  validate(id: string): { valid: boolean; problems: readonly string[] } {
    return this.validator.validate(this.registry.require(id).module);
  }

  /** Version check: the record's declared version must match expectation. */
  versionCheck(id: string, expected: string): boolean {
    return this.registry.require(id).module.version === expected;
  }

  dependencyCheck(id: string): { satisfied: boolean; missing: readonly string[] } {
    const missing = this.dependencies.missingFor(id);
    return { satisfied: missing.length === 0, missing };
  }
}

export interface UpgradePlan {
  readonly component: string;
  readonly from: string;
  readonly to: string;
  readonly warnings: readonly string[];
}

/** Composes the frozen Phase-5 compatibility layer — regressions refused. */
export class UpgradeManager {
  constructor(
    private readonly versions: RuntimeVersionManager,
    private readonly compat: CompatibilityManager,
  ) {}

  planUpgrade(component: string, to: string): UpgradePlan {
    const from = this.versions.versionOf(component);
    if (!from) throw new OsError("upgrade", `unknown component "${component}"`);
    this.compat.assertUpgradeSafe(component, from, to); // throws on regression
    return { component, from, to, warnings: this.compat.warningsFor(component, to) };
  }

  /** Compatibility check without applying anything. */
  compatibilityCheck(component: string, to: string): boolean {
    try {
      this.planUpgrade(component, to);
      return true;
    } catch {
      return false;
    }
  }

  apply(plan: UpgradePlan): void {
    this.versions.setVersion(plan.component, plan.to);
  }
}

/** OS package manager — composes the frozen Phase-5 package registry. */
export class OsPackageManager {
  private readonly packages = new PackageRegistry();
  private installedCount = 0;

  registerPackage(pkg: PackageDefinition): void {
    this.packages.register(pkg);
  }

  /** Dependencies-first plan; missing deps and cycles refused upstream. */
  installOrder(id: string): readonly string[] {
    return this.packages.installOrder(id);
  }

  install(id: string): readonly string[] {
    const order = this.packages.installOrder(id);
    this.installedCount += order.length;
    return order;
  }

  stats(): { installed: number } {
    return { installed: this.installedCount };
  }
}
