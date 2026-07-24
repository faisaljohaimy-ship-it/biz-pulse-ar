/**
 * Manifest schemas — the validation contract for every shell object.
 *
 * Four zod schemas (skill / agent / tool / capability) discriminated by
 * `kind`. Every mandated field is REQUIRED — a manifest missing any field is
 * invalid and never registers (fail closed). Ids are kebab identifiers with
 * a kind prefix; versions are strict semver.
 */
import { z } from "zod";

const ID = /^[a-z][a-z0-9.-]*$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

const idField = z.string().regex(ID, "id must be a lowercase kebab identifier");
const versionField = z.string().regex(SEMVER, "version must be strict semver");
const statusField = z.enum(["active", "draft", "deprecated", "disabled"]);
const metadataField = z.record(z.string(), z.unknown());

const ioField = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  required: z.boolean().optional(),
});

export const skillManifestSchema = z
  .object({
    kind: z.literal("skill"),
    id: idField,
    name: z.string().min(1),
    description: z.string().min(1),
    category: z.string().min(1),
    inputs: z.array(ioField),
    outputs: z.array(ioField),
    requiredTools: z.array(idField),
    requiredCapabilities: z.array(idField),
    requiredPermissions: z.array(z.string().min(1)),
    dependencies: z.array(idField),
    version: versionField,
    status: statusField,
    owner: z.string().min(1),
    tags: z.array(z.string().min(1)),
    metadata: metadataField,
  })
  .strict();

export const agentManifestSchema = z
  .object({
    kind: z.literal("agent"),
    id: idField,
    name: z.string().min(1),
    role: z.string().min(1),
    description: z.string().min(1),
    systemPrompt: z.string().min(1),
    supportedSkills: z.array(idField),
    supportedTools: z.array(idField),
    supportedCapabilities: z.array(idField),
    memoryProfile: z.enum(["none", "session", "persistent"]),
    contextWindow: z.number().int().positive(),
    executionMode: z.enum(["advisory", "supervised", "autonomous-gated"]),
    permissions: z.array(z.string().min(1)),
    priority: z.number().int(),
    dependencies: z.array(idField),
    metadata: metadataField,
  })
  .strict();

export const toolManifestSchema = z
  .object({
    kind: z.literal("tool"),
    id: idField,
    name: z.string().min(1),
    provider: z.string().min(1),
    description: z.string().min(1),
    inputs: z.array(ioField),
    outputs: z.array(ioField),
    permissions: z.array(z.string().min(1)),
    requiredCapabilities: z.array(idField),
    authentication: z.enum(["none", "bearer", "service-account"]),
    sandboxPolicy: z.enum(["none", "readonly", "isolated"]),
    status: statusField,
    metadata: metadataField,
  })
  .strict();

export const capabilityManifestSchema = z
  .object({
    kind: z.literal("capability"),
    id: idField,
    name: z.string().min(1),
    description: z.string().min(1),
    requiredSkills: z.array(idField),
    requiredTools: z.array(idField),
    requiredAgents: z.array(idField),
    runtimeRequirements: z.array(z.string().min(1)),
    permissions: z.array(z.string().min(1)),
    dependencies: z.array(idField),
    metadata: metadataField,
  })
  .strict();

export const anyManifestSchema = z.discriminatedUnion("kind", [
  skillManifestSchema,
  agentManifestSchema,
  toolManifestSchema,
  capabilityManifestSchema,
]);

export type SkillManifest = z.infer<typeof skillManifestSchema>;
export type AgentManifest = z.infer<typeof agentManifestSchema>;
export type ToolManifest = z.infer<typeof toolManifestSchema>;
export type CapabilityManifest = z.infer<typeof capabilityManifestSchema>;
export type AnyManifest = z.infer<typeof anyManifestSchema>;
