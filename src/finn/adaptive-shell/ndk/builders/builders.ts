/**
 * NDK Builders — the fifteen official builders.
 *
 * Every builder starts from safe defaults, accumulates fields fluently and
 * VALIDATES on build(): an incomplete or inconsistent draft throws with the
 * exact problems (tryBuild() returns them instead). Nothing invalid can
 * leave a builder — this is the only sanctioned way to author Shell objects.
 */
import { NdkError, formatIssues, type SchemaLike } from "../types";
import {
  agentManifestSchema,
  anyManifestSchema,
  capabilityManifestSchema,
  skillManifestSchema,
  toolManifestSchema,
  type AgentManifest,
  type AnyManifest,
  type CapabilityManifest,
  type SkillManifest,
  type ToolManifest,
} from "../../schemas/manifests";
import {
  connectorArtifactSchema,
  knowledgePackArtifactSchema,
  memoryProfileArtifactSchema,
  playbookArtifactSchema,
  pluginArtifactSchema,
  policyArtifactSchema,
  promptArtifactSchema,
  templateArtifactSchema,
  workflowArtifactSchema,
  type ConnectorArtifact,
  type KnowledgePackArtifact,
  type MemoryProfileArtifact,
  type PlaybookArtifact,
  type PluginArtifact,
  type PolicyArtifact,
  type PromptArtifact,
  type TemplateArtifact,
  type WorkflowArtifact,
} from "../schemas/extended";

export interface BuilderSeed {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly owner?: string;
}

export abstract class ArtifactBuilder<T> {
  protected readonly draft: Record<string, unknown>;

  protected constructor(seed: Record<string, unknown>) {
    this.draft = { ...seed };
  }

  protected abstract schema(): SchemaLike<T>;

  set<K extends keyof T & string>(field: K, value: T[K]): this {
    this.draft[field] = value;
    return this;
  }

  merge(partial: Partial<T>): this {
    Object.assign(this.draft, partial);
    return this;
  }

  tryBuild(): { ok: true; value: T } | { ok: false; problems: readonly string[] } {
    const parsed = this.schema().safeParse(this.draft);
    if (!parsed.success) return { ok: false, problems: formatIssues(parsed.error.issues) };
    return { ok: true, value: parsed.data };
  }

  /** Validated build — an invalid draft never leaves the builder. */
  build(): T {
    const result = this.tryBuild();
    if (!result.ok) {
      throw new NdkError("builder", `invalid draft: ${result.problems.join("; ")}`);
    }
    return result.value;
  }
}

const NDK_METADATA = { source: "ndk", ndk: "1.0.0" } as const;

// ── Core Shell builders ─────────────────────────────────────────────────────

export class SkillBuilder extends ArtifactBuilder<SkillManifest> {
  constructor(seed: BuilderSeed) {
    super({
      kind: "skill",
      id: seed.id,
      name: seed.name,
      description: seed.description ?? seed.name,
      category: "general",
      inputs: [],
      outputs: [],
      requiredTools: [],
      requiredCapabilities: [],
      requiredPermissions: [],
      dependencies: [],
      version: "1.0.0",
      status: "draft",
      owner: seed.owner ?? "nexios",
      tags: [],
      metadata: { ...NDK_METADATA },
    });
  }

  protected schema(): SchemaLike<SkillManifest> {
    return skillManifestSchema;
  }

  /** Require a tool AND declare its permissions in one move (stays covered). */
  requiresTool(toolId: string, ...permissions: readonly string[]): this {
    this.draft.requiredTools = [...(this.draft.requiredTools as string[]), toolId];
    this.draft.requiredPermissions = [
      ...new Set([...(this.draft.requiredPermissions as string[]), ...permissions]),
    ];
    return this;
  }

  dependsOn(skillId: string): this {
    this.draft.dependencies = [...(this.draft.dependencies as string[]), skillId];
    return this;
  }
}

export class AgentBuilder extends ArtifactBuilder<AgentManifest> {
  constructor(seed: BuilderSeed) {
    super({
      kind: "agent",
      id: seed.id,
      name: seed.name,
      role: "specialist",
      description: seed.description ?? seed.name,
      systemPrompt: `أنت ${seed.name} ضمن نظام نكسيوس — استشر ولا تنفّذ.`,
      supportedSkills: [],
      supportedTools: [],
      supportedCapabilities: [],
      memoryProfile: "session",
      contextWindow: 64000,
      executionMode: "advisory",
      permissions: [],
      priority: 5,
      dependencies: [],
      metadata: { ...NDK_METADATA },
    });
  }

  protected schema(): SchemaLike<AgentManifest> {
    return agentManifestSchema;
  }

  /** Support a skill AND absorb its permissions (stays covered). */
  supports(skillId: string, ...skillPermissions: readonly string[]): this {
    this.draft.supportedSkills = [...(this.draft.supportedSkills as string[]), skillId];
    this.draft.permissions = [
      ...new Set([...(this.draft.permissions as string[]), ...skillPermissions]),
    ];
    return this;
  }
}

export class ToolBuilder extends ArtifactBuilder<ToolManifest> {
  constructor(seed: BuilderSeed) {
    super({
      kind: "tool",
      id: seed.id,
      name: seed.name,
      provider: seed.owner ?? "nexios",
      description: seed.description ?? seed.name,
      inputs: [],
      outputs: [],
      permissions: [],
      requiredCapabilities: [],
      authentication: "none",
      sandboxPolicy: "readonly",
      status: "draft",
      metadata: { ...NDK_METADATA },
    });
  }

  protected schema(): SchemaLike<ToolManifest> {
    return toolManifestSchema;
  }

  permission(permission: string): this {
    this.draft.permissions = [...new Set([...(this.draft.permissions as string[]), permission])];
    return this;
  }
}

export class CapabilityBuilder extends ArtifactBuilder<CapabilityManifest> {
  constructor(seed: BuilderSeed) {
    super({
      kind: "capability",
      id: seed.id,
      name: seed.name,
      description: seed.description ?? seed.name,
      requiredSkills: [],
      requiredTools: [],
      requiredAgents: [],
      runtimeRequirements: [],
      permissions: [],
      dependencies: [],
      metadata: { ...NDK_METADATA },
    });
  }

  protected schema(): SchemaLike<CapabilityManifest> {
    return capabilityManifestSchema;
  }

  requires(refs: {
    skills?: readonly string[];
    tools?: readonly string[];
    agents?: readonly string[];
  }): this {
    if (refs.skills) {
      this.draft.requiredSkills = [...(this.draft.requiredSkills as string[]), ...refs.skills];
    }
    if (refs.tools) {
      this.draft.requiredTools = [...(this.draft.requiredTools as string[]), ...refs.tools];
    }
    if (refs.agents) {
      this.draft.requiredAgents = [...(this.draft.requiredAgents as string[]), ...refs.agents];
    }
    return this;
  }
}

/** Generic manifest builder for any of the four Shell kinds. */
export class ManifestBuilder extends ArtifactBuilder<AnyManifest> {
  constructor(draft: Record<string, unknown>) {
    super(draft);
  }

  protected schema(): SchemaLike<AnyManifest> {
    return anyManifestSchema;
  }
}

// ── Extended builders ───────────────────────────────────────────────────────

export class WorkflowBuilder extends ArtifactBuilder<WorkflowArtifact> {
  constructor(seed: BuilderSeed) {
    super({
      kind: "workflow",
      id: seed.id,
      name: seed.name,
      description: seed.description ?? seed.name,
      trigger: "manual",
      approvalRequired: true,
      steps: [],
      version: "1.0.0",
      owner: seed.owner ?? "nexios",
      permissions: [],
      dependencies: [],
      metadata: { ...NDK_METADATA },
    });
  }

  protected schema(): SchemaLike<WorkflowArtifact> {
    return workflowArtifactSchema;
  }

  step(step: WorkflowArtifact["steps"][number]): this {
    this.draft.steps = [...(this.draft.steps as unknown[]), step];
    return this;
  }
}

export class PluginBuilder extends ArtifactBuilder<PluginArtifact> {
  constructor(seed: BuilderSeed & { forModule: string; entry: string }) {
    super({
      kind: "plugin",
      id: seed.id,
      name: seed.name,
      description: seed.description ?? seed.name,
      forModule: seed.forModule,
      entry: seed.entry,
      sandbox: "isolated",
      version: "1.0.0",
      permissions: [],
      dependencies: [],
      metadata: { ...NDK_METADATA },
    });
  }

  protected schema(): SchemaLike<PluginArtifact> {
    return pluginArtifactSchema;
  }
}

export class PolicyBuilder extends ArtifactBuilder<PolicyArtifact> {
  constructor(seed: BuilderSeed) {
    super({
      kind: "policy",
      id: seed.id,
      name: seed.name,
      description: seed.description ?? seed.name,
      appliesTo: "shell",
      effect: "deny",
      actions: [],
      condition: "always",
      version: "1.0.0",
      dependencies: [],
      metadata: { ...NDK_METADATA },
    });
  }

  protected schema(): SchemaLike<PolicyArtifact> {
    return policyArtifactSchema;
  }

  denies(...actions: readonly string[]): this {
    this.draft.effect = "deny";
    this.draft.actions = [...(this.draft.actions as string[]), ...actions];
    return this;
  }

  allows(...actions: readonly string[]): this {
    this.draft.effect = "allow";
    this.draft.actions = [...(this.draft.actions as string[]), ...actions];
    return this;
  }
}

export class KnowledgeBuilder extends ArtifactBuilder<KnowledgePackArtifact> {
  constructor(seed: BuilderSeed & { domain: string }) {
    super({
      kind: "knowledge-pack",
      id: seed.id,
      name: seed.name,
      description: seed.description ?? seed.name,
      domain: seed.domain,
      sources: [],
      refreshPolicy: "static",
      version: "1.0.0",
      permissions: [],
      dependencies: [],
      metadata: { ...NDK_METADATA },
    });
  }

  protected schema(): SchemaLike<KnowledgePackArtifact> {
    return knowledgePackArtifactSchema;
  }

  source(source: KnowledgePackArtifact["sources"][number]): this {
    this.draft.sources = [...(this.draft.sources as unknown[]), source];
    return this;
  }
}

export class ConnectorBuilder extends ArtifactBuilder<ConnectorArtifact> {
  constructor(seed: BuilderSeed & { provider: string }) {
    super({
      kind: "connector",
      id: seed.id,
      name: seed.name,
      description: seed.description ?? seed.name,
      provider: seed.provider,
      capabilities: [],
      authentication: "none",
      operations: [],
      rateLimitPerWindow: 60,
      timeoutMs: 5000,
      version: "1.0.0",
      permissions: [],
      dependencies: [],
      metadata: { ...NDK_METADATA },
    });
  }

  protected schema(): SchemaLike<ConnectorArtifact> {
    return connectorArtifactSchema;
  }

  operation(name: string, description: string): this {
    this.draft.operations = [...(this.draft.operations as unknown[]), { name, description }];
    return this;
  }

  capability(capabilityId: string): this {
    this.draft.capabilities = [...(this.draft.capabilities as string[]), capabilityId];
    return this;
  }
}

export class PromptBuilder extends ArtifactBuilder<PromptArtifact> {
  constructor(seed: BuilderSeed) {
    super({
      kind: "prompt",
      id: seed.id,
      name: seed.name,
      description: seed.description ?? seed.name,
      role: "system",
      template: seed.name,
      variables: [],
      locale: "ar",
      version: "1.0.0",
      metadata: { ...NDK_METADATA },
    });
  }

  protected schema(): SchemaLike<PromptArtifact> {
    return promptArtifactSchema;
  }

  template(template: string, ...variables: readonly string[]): this {
    this.draft.template = template;
    this.draft.variables = [...new Set([...(this.draft.variables as string[]), ...variables])];
    return this;
  }
}

export class MemoryBuilder extends ArtifactBuilder<MemoryProfileArtifact> {
  constructor(seed: BuilderSeed) {
    super({
      kind: "memory-profile",
      id: seed.id,
      name: seed.name,
      description: seed.description ?? seed.name,
      scope: "session",
      retentionDays: 30,
      maxEntries: 1000,
      namespaces: ["default"],
      version: "1.0.0",
      metadata: { ...NDK_METADATA },
    });
  }

  protected schema(): SchemaLike<MemoryProfileArtifact> {
    return memoryProfileArtifactSchema;
  }
}

export class PlaybookBuilder extends ArtifactBuilder<PlaybookArtifact> {
  constructor(seed: BuilderSeed & { scenario: string; audience: string }) {
    super({
      kind: "playbook",
      id: seed.id,
      name: seed.name,
      description: seed.description ?? seed.name,
      scenario: seed.scenario,
      audience: seed.audience,
      plays: [],
      version: "1.0.0",
      permissions: [],
      dependencies: [],
      metadata: { ...NDK_METADATA },
    });
  }

  protected schema(): SchemaLike<PlaybookArtifact> {
    return playbookArtifactSchema;
  }

  play(play: PlaybookArtifact["plays"][number]): this {
    this.draft.plays = [...(this.draft.plays as unknown[]), play];
    return this;
  }
}

export class TemplateBuilder extends ArtifactBuilder<TemplateArtifact> {
  constructor(seed: BuilderSeed & { targetKind: TemplateArtifact["targetKind"] }) {
    super({
      kind: "template",
      id: seed.id,
      name: seed.name,
      description: seed.description ?? seed.name,
      targetKind: seed.targetKind,
      blueprint: {},
      version: "1.0.0",
      metadata: { ...NDK_METADATA },
    });
  }

  protected schema(): SchemaLike<TemplateArtifact> {
    return templateArtifactSchema;
  }
}
