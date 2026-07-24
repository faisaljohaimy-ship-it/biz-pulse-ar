/**
 * Shell Module Registry + Capability Registry + Dependency Graph.
 *
 * Registration is EXPLICIT (no import side effects). "Automatic discovery" is
 * implemented as validation-collection over an explicit candidate list the
 * composition root supplies (e.g. a glob result) — discoverModules() filters
 * well-formed RuntimeModules and reports rejects; registration remains a
 * deliberate kernel act.
 */
import { ShellError, type ModuleState, type RuntimeModule } from "./types";

const SEMVER = /^\d+\.\d+\.\d+$/;
const wellFormed = (m: unknown): m is RuntimeModule => {
  const x = m as RuntimeModule;
  return (
    !!x &&
    typeof x.id === "string" &&
    x.id.length > 0 &&
    typeof x.version === "string" &&
    SEMVER.test(x.version) &&
    Array.isArray(x.capabilities) &&
    Array.isArray(x.dependencies) &&
    typeof x.health === "function" &&
    typeof x.initialize === "function" &&
    typeof x.activate === "function" &&
    typeof x.deactivate === "function" &&
    typeof x.dispose === "function"
  );
};

export interface DiscoveryResult {
  readonly modules: readonly RuntimeModule[];
  readonly rejected: readonly { index: number; reason: string }[];
}

/** Validate an explicit candidate list into well-formed modules. */
export function discoverModules(candidates: readonly unknown[]): DiscoveryResult {
  const modules: RuntimeModule[] = [];
  const rejected: { index: number; reason: string }[] = [];
  candidates.forEach((candidate, index) => {
    if (wellFormed(candidate)) modules.push(candidate);
    else rejected.push({ index, reason: "does not satisfy the RuntimeModule contract" });
  });
  return { modules, rejected };
}

export class CapabilityRegistry {
  private readonly providers = new Map<string, string>(); // capability → module id

  declare(capability: string, moduleId: string): void {
    const existing = this.providers.get(capability);
    if (existing && existing !== moduleId) {
      throw new ShellError(
        "capabilities",
        `capability "${capability}" provided by both "${existing}" and "${moduleId}"`,
      );
    }
    this.providers.set(capability, moduleId);
  }

  providerOf(capability: string): string | undefined {
    return this.providers.get(capability);
  }

  has(capability: string): boolean {
    return this.providers.has(capability);
  }

  list(): readonly { capability: string; moduleId: string }[] {
    return [...this.providers.entries()].map(([capability, moduleId]) => ({
      capability,
      moduleId,
    }));
  }

  clear(): void {
    this.providers.clear();
  }
}

export class ModuleRegistry {
  private readonly modules = new Map<string, RuntimeModule>();
  private readonly states = new Map<string, ModuleState>();

  register(module: RuntimeModule): void {
    if (!wellFormed(module)) {
      throw new ShellError("modules", `module rejected: contract violation`);
    }
    const existing = this.modules.get(module.id);
    if (existing) {
      if (existing.version !== module.version) {
        throw new ShellError(
          "modules",
          `version conflict for "${module.id}": ${existing.version} vs ${module.version}`,
        );
      }
      throw new ShellError("modules", `duplicate module "${module.id}"`);
    }
    this.modules.set(module.id, module);
    this.states.set(module.id, "registered");
  }

  get(id: string): RuntimeModule | undefined {
    return this.modules.get(id);
  }

  stateOf(id: string): ModuleState | undefined {
    return this.states.get(id);
  }

  setState(id: string, state: ModuleState): void {
    if (!this.modules.has(id)) throw new ShellError("modules", `unknown module "${id}"`);
    this.states.set(id, state);
  }

  all(): readonly RuntimeModule[] {
    return [...this.modules.values()];
  }

  /** Validate all dependencies exist, then topologically sort (cycle ⇒ error). */
  bootOrder(): readonly RuntimeModule[] {
    for (const m of this.modules.values()) {
      for (const dep of m.dependencies) {
        if (!this.modules.has(dep)) {
          throw new ShellError("dependencies", `"${m.id}" depends on missing module "${dep}"`);
        }
      }
    }
    const order: RuntimeModule[] = [];
    const marks = new Map<string, "visiting" | "done">();
    const visit = (id: string, path: string[]): void => {
      const mark = marks.get(id);
      if (mark === "done") return;
      if (mark === "visiting") {
        throw new ShellError("dependencies", `cycle detected: ${[...path, id].join(" → ")}`);
      }
      marks.set(id, "visiting");
      const mod = this.modules.get(id)!;
      for (const dep of mod.dependencies) visit(dep, [...path, id]);
      marks.set(id, "done");
      order.push(mod);
    };
    for (const id of [...this.modules.keys()].sort()) visit(id, []);
    return order;
  }

  /** Register every provided capability; conflict detection lives in the registry. */
  declareCapabilities(capabilities: CapabilityRegistry): void {
    for (const m of this.modules.values()) {
      for (const cap of m.capabilities) capabilities.declare(cap, m.id);
    }
  }

  clear(): void {
    this.modules.clear();
    this.states.clear();
  }
}
