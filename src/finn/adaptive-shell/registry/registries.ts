/**
 * Typed registries — Skill · Agent · Tool · Capability.
 *
 * Closed world: duplicate ids are refused at registration, lookups of
 * unknown ids return undefined, and every registry supports the queries the
 * runtime needs (status, tags, category) without any hardcoded lists.
 */
import { AdaptiveShellError } from "../types";
import type {
  AgentManifest,
  CapabilityManifest,
  SkillManifest,
  ToolManifest,
} from "../schemas/manifests";

class ManifestStore<T extends { readonly id: string }> {
  private readonly items = new Map<string, T>();

  constructor(private readonly kindLabel: string) {}

  register(manifest: T): void {
    if (this.items.has(manifest.id)) {
      throw new AdaptiveShellError(this.kindLabel, `duplicate id "${manifest.id}"`);
    }
    this.items.set(manifest.id, manifest);
  }

  get(id: string): T | undefined {
    return this.items.get(id);
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  list(): readonly T[] {
    return [...this.items.values()];
  }

  count(): number {
    return this.items.size;
  }
}

export class SkillRegistry extends ManifestStore<SkillManifest> {
  constructor() {
    super("skills");
  }

  byCategory(category: string): readonly SkillManifest[] {
    return this.list().filter((s) => s.category === category);
  }

  byTag(tag: string): readonly SkillManifest[] {
    return this.list().filter((s) => s.tags.includes(tag));
  }

  byStatus(status: SkillManifest["status"]): readonly SkillManifest[] {
    return this.list().filter((s) => s.status === status);
  }
}

export class AgentRegistry extends ManifestStore<AgentManifest> {
  constructor() {
    super("agents");
  }

  byRole(role: string): readonly AgentManifest[] {
    return this.list().filter((a) => a.role === role);
  }

  byExecutionMode(mode: AgentManifest["executionMode"]): readonly AgentManifest[] {
    return this.list().filter((a) => a.executionMode === mode);
  }

  supporting(skillId: string): readonly AgentManifest[] {
    return this.list().filter((a) => a.supportedSkills.includes(skillId));
  }
}

export class ToolRegistry extends ManifestStore<ToolManifest> {
  constructor() {
    super("tools");
  }

  byProvider(provider: string): readonly ToolManifest[] {
    return this.list().filter((t) => t.provider === provider);
  }

  byStatus(status: ToolManifest["status"]): readonly ToolManifest[] {
    return this.list().filter((t) => t.status === status);
  }
}

export class CapabilityRegistry extends ManifestStore<CapabilityManifest> {
  constructor() {
    super("capabilities");
  }

  requiringTool(toolId: string): readonly CapabilityManifest[] {
    return this.list().filter((c) => c.requiredTools.includes(toolId));
  }
}
