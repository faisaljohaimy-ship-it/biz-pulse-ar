/**
 * NDK schemas — the nine extended artifact kinds, plus the full artifact
 * union that includes the four Phase-1 Shell kinds (reused, not redefined).
 * All strict: unknown fields refused; ids and versions validated; prompts
 * refuse undeclared template variables.
 */
import { z } from "zod";
import {
  agentManifestSchema,
  capabilityManifestSchema,
  skillManifestSchema,
  toolManifestSchema,
} from "../../schemas/manifests";

const ID = /^[a-z][a-z0-9.-]*$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

const idField = z.string().regex(ID, "id must be a lowercase kebab identifier");
const versionField = z.string().regex(SEMVER, "version must be strict semver");
const metadataField = z.record(z.string(), z.unknown());

export const workflowArtifactSchema = z
  .object({
    kind: z.literal("workflow"),
    id: idField,
    name: z.string().min(1),
    description: z.string().min(1),
    trigger: z.enum(["manual", "event", "schedule"]),
    approvalRequired: z.boolean(),
    steps: z
      .array(
        z.object({
          id: z.string().min(1),
          stepKind: z.enum(["skill", "approval", "condition"]),
          skillId: idField.optional(),
          note: z.string().min(1),
        }),
      )
      .min(1),
    version: versionField,
    owner: z.string().min(1),
    permissions: z.array(z.string().min(1)),
    dependencies: z.array(idField),
    metadata: metadataField,
  })
  .strict();

export const pluginArtifactSchema = z
  .object({
    kind: z.literal("plugin"),
    id: idField,
    name: z.string().min(1),
    description: z.string().min(1),
    forModule: z.string().min(1),
    entry: z.string().min(1),
    sandbox: z.enum(["readonly", "isolated"]),
    version: versionField,
    permissions: z.array(z.string().min(1)),
    dependencies: z.array(idField),
    metadata: metadataField,
  })
  .strict();

export const policyArtifactSchema = z
  .object({
    kind: z.literal("policy"),
    id: idField,
    name: z.string().min(1),
    description: z.string().min(1),
    appliesTo: z.enum(["shell", "skill", "agent", "tool", "workflow"]),
    effect: z.enum(["allow", "deny"]),
    actions: z.array(z.string().min(1)).min(1),
    condition: z.string().min(1),
    version: versionField,
    dependencies: z.array(idField),
    metadata: metadataField,
  })
  .strict();

export const knowledgePackArtifactSchema = z
  .object({
    kind: z.literal("knowledge-pack"),
    id: idField,
    name: z.string().min(1),
    description: z.string().min(1),
    domain: z.string().min(1),
    sources: z
      .array(
        z.object({
          id: z.string().min(1),
          type: z.enum(["document", "reference", "dataset"]),
          uri: z.string().min(1),
        }),
      )
      .min(1),
    refreshPolicy: z.enum(["static", "scheduled", "live"]),
    version: versionField,
    permissions: z.array(z.string().min(1)),
    dependencies: z.array(idField),
    metadata: metadataField,
  })
  .strict();

export const connectorArtifactSchema = z
  .object({
    kind: z.literal("connector"),
    id: idField,
    name: z.string().min(1),
    description: z.string().min(1),
    provider: z.string().min(1),
    capabilities: z.array(idField).min(1),
    authentication: z.enum(["none", "bearer", "service-account"]),
    operations: z
      .array(z.object({ name: z.string().min(1), description: z.string().min(1) }))
      .min(1),
    rateLimitPerWindow: z.number().int().positive(),
    timeoutMs: z.number().int().positive(),
    version: versionField,
    permissions: z.array(z.string().min(1)),
    dependencies: z.array(idField),
    metadata: metadataField,
  })
  .strict();

const promptArtifactBaseSchema = z
  .object({
    kind: z.literal("prompt"),
    id: idField,
    name: z.string().min(1),
    description: z.string().min(1),
    role: z.enum(["system", "user", "assistant"]),
    template: z.string().min(1),
    variables: z.array(z.string().min(1)),
    locale: z.enum(["ar", "en"]),
    version: versionField,
    metadata: metadataField,
  })
  .strict();

/** Every {{variable}} used in a prompt template must be declared. */
function checkPromptVariables(
  prompt: { template: string; variables: readonly string[] },
  ctx: z.RefinementCtx,
): void {
  const declared = new Set(prompt.variables);
  for (const match of prompt.template.matchAll(/\{\{([a-zA-Z0-9_.-]+)\}\}/g)) {
    if (!declared.has(match[1])) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["template"],
        message: `undeclared variable "${match[1]}"`,
      });
    }
  }
}

export const promptArtifactSchema = promptArtifactBaseSchema.superRefine(checkPromptVariables);

export const memoryProfileArtifactSchema = z
  .object({
    kind: z.literal("memory-profile"),
    id: idField,
    name: z.string().min(1),
    description: z.string().min(1),
    scope: z.enum(["none", "session", "persistent"]),
    retentionDays: z.number().int().min(0),
    maxEntries: z.number().int().positive(),
    namespaces: z.array(z.string().min(1)).min(1),
    version: versionField,
    metadata: metadataField,
  })
  .strict();

export const playbookArtifactSchema = z
  .object({
    kind: z.literal("playbook"),
    id: idField,
    name: z.string().min(1),
    description: z.string().min(1),
    scenario: z.string().min(1),
    audience: z.string().min(1),
    plays: z
      .array(
        z.object({
          order: z.number().int().positive(),
          title: z.string().min(1),
          skillId: idField.optional(),
          agentId: idField.optional(),
          note: z.string().min(1),
        }),
      )
      .min(1),
    version: versionField,
    permissions: z.array(z.string().min(1)),
    dependencies: z.array(idField),
    metadata: metadataField,
  })
  .strict();

export const templateArtifactSchema = z
  .object({
    kind: z.literal("template"),
    id: idField,
    name: z.string().min(1),
    description: z.string().min(1),
    targetKind: z.enum([
      "skill",
      "agent",
      "tool",
      "capability",
      "workflow",
      "plugin",
      "policy",
      "knowledge-pack",
      "connector",
      "prompt",
      "memory-profile",
      "playbook",
    ]),
    blueprint: z.record(z.string(), z.unknown()),
    version: versionField,
    metadata: metadataField,
  })
  .strict();

/** The full artifact union: 4 Shell kinds + 9 NDK kinds. */
export const ndkArtifactSchema = z
  .discriminatedUnion("kind", [
    skillManifestSchema,
    agentManifestSchema,
    toolManifestSchema,
    capabilityManifestSchema,
    workflowArtifactSchema,
    pluginArtifactSchema,
    policyArtifactSchema,
    knowledgePackArtifactSchema,
    connectorArtifactSchema,
    promptArtifactBaseSchema,
    memoryProfileArtifactSchema,
    playbookArtifactSchema,
    templateArtifactSchema,
  ])
  .superRefine((artifact, ctx) => {
    if (artifact.kind === "prompt") checkPromptVariables(artifact, ctx);
  });

export type WorkflowArtifact = z.infer<typeof workflowArtifactSchema>;
export type PluginArtifact = z.infer<typeof pluginArtifactSchema>;
export type PolicyArtifact = z.infer<typeof policyArtifactSchema>;
export type KnowledgePackArtifact = z.infer<typeof knowledgePackArtifactSchema>;
export type ConnectorArtifact = z.infer<typeof connectorArtifactSchema>;
export type PromptArtifact = z.infer<typeof promptArtifactSchema>;
export type MemoryProfileArtifact = z.infer<typeof memoryProfileArtifactSchema>;
export type PlaybookArtifact = z.infer<typeof playbookArtifactSchema>;
export type TemplateArtifact = z.infer<typeof templateArtifactSchema>;
export type NdkArtifact = z.infer<typeof ndkArtifactSchema>;
