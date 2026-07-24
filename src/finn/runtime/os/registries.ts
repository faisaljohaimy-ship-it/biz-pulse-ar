/**
 * OS registries — Service Registry · Capability Registry · Module Registry ·
 * Plugin Registry · Feature Registry.
 *
 * These are the operating system's catalogs: closed-world (duplicates and
 * conflicting claims refused), descriptive, and queried by the boot sequence
 * and health engine. The Module Registry stores the actual RuntimeModule
 * definitions with their OS-level lifecycle state.
 */
import { OsError } from "./types";
import type { RuntimeModule } from "../types";

export interface OsServiceDescriptor {
  readonly id: string;
  readonly layer: string;
  readonly description: string;
}

export class OsServiceRegistry {
  private readonly services = new Map<string, OsServiceDescriptor>();

  register(descriptor: OsServiceDescriptor): void {
    if (this.services.has(descriptor.id)) {
      throw new OsError("services", `duplicate service "${descriptor.id}"`);
    }
    this.services.set(descriptor.id, descriptor);
  }

  has(id: string): boolean {
    return this.services.has(id);
  }

  byLayer(layer: string): readonly OsServiceDescriptor[] {
    return [...this.services.values()].filter((s) => s.layer === layer);
  }

  list(): readonly OsServiceDescriptor[] {
    return [...this.services.values()];
  }

  count(): number {
    return this.services.size;
  }
}

/** capability → providing module; conflicting claims refused. */
export class OsCapabilityRegistry {
  private readonly providers = new Map<string, string>();

  claim(capability: string, moduleId: string): void {
    const existing = this.providers.get(capability);
    if (existing && existing !== moduleId) {
      throw new OsError(
        "capabilities",
        `capability "${capability}" already provided by "${existing}"`,
      );
    }
    this.providers.set(capability, moduleId);
  }

  providerOf(capability: string): string | undefined {
    return this.providers.get(capability);
  }

  list(): readonly { capability: string; moduleId: string }[] {
    return [...this.providers.entries()].map(([capability, moduleId]) => ({
      capability,
      moduleId,
    }));
  }

  /** Every capability has exactly one provider by construction — verify it. */
  verify(): { ok: boolean; problems: readonly string[] } {
    const problems: string[] = [];
    for (const [capability, moduleId] of this.providers) {
      if (!capability.trim() || !moduleId.trim()) {
        problems.push(`capability "${capability}" has an invalid provider "${moduleId}"`);
      }
    }
    return { ok: problems.length === 0, problems };
  }
}

export type OsModuleState = "registered" | "loaded" | "disabled" | "unloaded" | "failed";

export interface OsModuleRecord {
  readonly module: RuntimeModule;
  state: OsModuleState;
  loadCount: number;
  restartCount: number;
  lastLoadMs: number | null;
}

export class OsModuleRegistry {
  private readonly records = new Map<string, OsModuleRecord>();

  register(module: RuntimeModule): void {
    if (this.records.has(module.id)) {
      throw new OsError("modules", `duplicate module "${module.id}"`);
    }
    this.records.set(module.id, {
      module,
      state: "registered",
      loadCount: 0,
      restartCount: 0,
      lastLoadMs: null,
    });
  }

  get(id: string): OsModuleRecord | undefined {
    return this.records.get(id);
  }

  require(id: string): OsModuleRecord {
    const record = this.records.get(id);
    if (!record) throw new OsError("modules", `unknown module "${id}"`);
    return record;
  }

  list(): readonly OsModuleRecord[] {
    return [...this.records.values()];
  }

  byState(state: OsModuleState): readonly OsModuleRecord[] {
    return this.list().filter((r) => r.state === state);
  }
}

export interface OsPlugin {
  readonly id: string;
  readonly version: string;
  readonly forModule: string;
}

export class OsPluginRegistry {
  private readonly plugins = new Map<string, OsPlugin>();
  private readonly enabled = new Map<string, boolean>();

  register(plugin: OsPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new OsError("plugins", `duplicate plugin "${plugin.id}"`);
    }
    this.plugins.set(plugin.id, plugin);
    this.enabled.set(plugin.id, true);
  }

  setEnabled(id: string, value: boolean): void {
    if (!this.plugins.has(id)) throw new OsError("plugins", `unknown plugin "${id}"`);
    this.enabled.set(id, value);
  }

  isEnabled(id: string): boolean {
    return this.enabled.get(id) ?? false; // unknown → disabled (fail closed)
  }

  list(): readonly (OsPlugin & { enabled: boolean })[] {
    return [...this.plugins.values()].map((p) => ({ ...p, enabled: this.isEnabled(p.id) }));
  }
}

export interface OsFeature {
  readonly id: string;
  readonly description: string;
  readonly defaultEnabled: boolean;
}

export class OsFeatureRegistry {
  private readonly features = new Map<string, OsFeature>();
  private readonly overrides = new Map<string, boolean>();

  register(feature: OsFeature): void {
    if (this.features.has(feature.id)) {
      throw new OsError("features", `duplicate feature "${feature.id}"`);
    }
    this.features.set(feature.id, feature);
  }

  setEnabled(id: string, value: boolean): void {
    if (!this.features.has(id)) throw new OsError("features", `unknown feature "${id}"`);
    this.overrides.set(id, value);
  }

  enabled(id: string): boolean {
    const feature = this.features.get(id);
    if (!feature) throw new OsError("features", `unknown feature "${id}"`);
    return this.overrides.get(id) ?? feature.defaultEnabled;
  }

  list(): readonly (OsFeature & { enabled: boolean })[] {
    return [...this.features.values()].map((f) => ({ ...f, enabled: this.enabled(f.id) }));
  }
}
