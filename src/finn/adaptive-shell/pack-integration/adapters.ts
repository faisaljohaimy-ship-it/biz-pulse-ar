/**
 * Pack integration adapters — vendored descriptor → shell record.
 *
 * Pure mappings from the content-pack descriptor shapes (packs/*) to the
 * Adaptive Shell's governed record schemas. Faithful by law: identity,
 * versions, references and the disabled/descriptor-only posture are
 * preserved — every adapted record enters as a DRAFT with a BLOCKING
 * descriptor-only policy, so nothing adapted here can ever execute
 * without a configured adapter and the human activation protocol.
 *
 * One deliberate transformation: pack agent ids use underscores
 * (`nx_ai_model_router`) which the shell's id law rejects; they are
 * normalized to hyphens (`nx-ai-model-router`) with the canonical pack id
 * preserved in metadata.keywords (`packId:…`). Verified collision-free.
 */
import type { SkillManifest, ToolManifest } from "../schemas/manifests";
import type { RecordMetadata, SkillRecord } from "../population/records";
import type { AgentRecord } from "../agent-runtime/records";

/* ── Descriptor shapes (the packs' own JSON, loosely typed) ─────────────── */

export interface PackSkillDescriptor {
  readonly id: string;
  readonly slug: string;
  readonly titleEn: string;
  readonly titleAr: string;
  readonly category: string;
  readonly description: string;
  readonly risk: string;
  readonly recommendedTools?: readonly string[];
  readonly recommendedAgents?: readonly string[];
  readonly inputContract?: { readonly required?: readonly string[] };
  readonly outputContract?: { readonly required?: readonly string[] };
  readonly enabled: boolean;
  readonly version: number;
  readonly pack: string;
}

export interface PackAgentDescriptor {
  readonly id: string;
  readonly nameEn: string;
  readonly nameAr: string;
  readonly category: string;
  readonly mission: string;
  readonly systemPrompt: string;
  readonly authority: string;
  readonly memoryScope: string;
  readonly skills: readonly string[];
  readonly toolAllowlist: readonly string[];
  readonly handoffTargets: readonly string[];
  readonly permissions: readonly string[];
  readonly enabled: boolean;
  readonly implementationStatus: string;
  readonly version: number;
  readonly pack: string;
}

export interface PackToolDescriptor {
  readonly id: string;
  readonly nameEn: string;
  readonly nameAr: string;
  readonly description: string;
  readonly provider: string;
  readonly authType: string;
  readonly sideEffect: boolean;
  readonly permissions: readonly string[];
  readonly inputSchema?: {
    readonly required?: readonly string[];
    readonly properties?: Readonly<Record<string, { readonly type?: string }>>;
  };
  readonly outputSchema?: {
    readonly required?: readonly string[];
    readonly properties?: Readonly<Record<string, { readonly type?: string }>>;
  };
  readonly enabled: boolean;
  readonly implementationStatus: string;
  readonly version: number;
  readonly pack: string;
}

/* ── Shared building blocks ─────────────────────────────────────────────── */

/** Shell id law forbids underscores; canonical pack id kept in metadata. */
export function normalizeAgentId(packId: string): string {
  return packId.replace(/_/g, "-");
}

function semver(version: number): string {
  return `${version}.0.0`;
}

const PACK_DATE = "2026-07-24";

function packMetadata(
  descriptor: { id: string; category: string; risk?: string; pack: string },
  extraKeywords: readonly string[] = [],
): RecordMetadata {
  return {
    tags: [descriptor.risk ?? "descriptor", "descriptor-only"],
    keywords: [descriptor.id, `pack:${descriptor.pack}`, ...extraKeywords],
    sector: "enterprise",
    department: descriptor.category,
    language: "ar",
    owner: "nexios-packs",
    createdAt: PACK_DATE,
    updatedAt: PACK_DATE,
    compatibility: ["shell>=1"],
  };
}

const DESCRIPTOR_ONLY_POLICY = {
  id: "policy.descriptor-only",
  description:
    "Descriptor-only content: execution requires a configured connector adapter and the human activation protocol.",
  enforcement: "blocking",
} as const;

const SAFE_CONTRACT = {
  invocation: "synchronous",
  timeoutMs: 60_000,
  retryable: false,
  idempotent: false,
} as const;

function io(names: readonly string[] | undefined): { name: string; type: string }[] {
  return (names ?? []).map((name) => ({ name, type: "string" }));
}

/* ── Skill descriptor → population SkillRecord ──────────────────────────── */

export function adaptSkill(descriptor: PackSkillDescriptor): SkillRecord {
  const version = semver(descriptor.version);
  const manifest: SkillManifest = {
    kind: "skill",
    id: descriptor.id,
    name: descriptor.titleEn,
    description: descriptor.description,
    category: descriptor.category,
    inputs: io(descriptor.inputContract?.required).map((entry) => ({ ...entry, required: true })),
    outputs: io(descriptor.outputContract?.required),
    requiredTools: [...(descriptor.recommendedTools ?? [])],
    requiredCapabilities: [],
    requiredPermissions: ["execution"],
    dependencies: [],
    version,
    status: "draft",
    owner: "nexios-packs",
    tags: [descriptor.category, descriptor.risk],
    metadata: { titleAr: descriptor.titleAr, slug: descriptor.slug, enabled: descriptor.enabled },
  };
  return {
    id: descriptor.id,
    manifest,
    version,
    category: descriptor.category,
    requiredCapabilities: [],
    dependencies: [],
    executionContract: { ...SAFE_CONTRACT },
    permissions: ["execution"],
    policies: [{ ...DESCRIPTOR_ONLY_POLICY }],
    health: "unknown",
    lifecycle: "draft",
    metadata: packMetadata(descriptor),
  };
}

/* ── Agent descriptor → agent-runtime AgentRecord ───────────────────────── */

const AUTHORITY_TO_MODE = {
  advisory: "advisory",
  bounded_action: "supervised",
  control: "autonomous-gated",
} as const;

export function adaptAgent(descriptor: PackAgentDescriptor): AgentRecord {
  const id = normalizeAgentId(descriptor.id);
  const version = semver(descriptor.version);
  const executionMode =
    AUTHORITY_TO_MODE[descriptor.authority as keyof typeof AUTHORITY_TO_MODE] ?? "autonomous-gated";
  return {
    id,
    name: descriptor.nameEn,
    description: descriptor.mission,
    version,
    category: descriptor.category,
    capabilities: [],
    dependencies: [],
    owner: "nexios-packs",
    permissions: ["execution"],
    policies: [{ ...DESCRIPTOR_ONLY_POLICY }],
    metadata: packMetadata(descriptor, [`packId:${descriptor.id}`]),
    lifecycle: "draft",
    health: "unknown",
    supportedModes: ["single", "approval-driven"],
    manifest: {
      base: {
        kind: "agent",
        id,
        name: descriptor.nameEn,
        role: descriptor.category,
        description: descriptor.mission,
        systemPrompt: descriptor.systemPrompt,
        supportedSkills: [...descriptor.skills],
        supportedTools: [...descriptor.toolAllowlist],
        supportedCapabilities: [],
        memoryProfile:
          descriptor.memoryScope === "none"
            ? "none"
            : descriptor.memoryScope === "session"
              ? "session"
              : "persistent",
        contextWindow: 128_000,
        executionMode,
        permissions: [...descriptor.permissions],
        priority: 1,
        dependencies: [],
        metadata: {
          nameAr: descriptor.nameAr,
          authority: descriptor.authority,
          implementationStatus: descriptor.implementationStatus,
          enabled: descriptor.enabled,
          handoffTargets: descriptor.handoffTargets.map(normalizeAgentId),
        },
      },
      version,
      capabilities: [],
      requiredSkills: [...descriptor.skills],
      requiredKnowledge: [],
      requiredTools: [...descriptor.toolAllowlist],
      dependencies: [],
      executionContract: { ...SAFE_CONTRACT },
      inputs: [],
      outputs: [],
      policies: [{ ...DESCRIPTOR_ONLY_POLICY }],
    },
  };
}

/* ── Tool descriptor → Phase-1 ToolManifest ─────────────────────────────── */

function schemaIo(schema: PackToolDescriptor["inputSchema"]): {
  name: string;
  type: string;
  required?: boolean;
}[] {
  const properties = schema?.properties ?? {};
  const required = schema?.required ?? [];
  return Object.entries(properties).map(([name, definition]) => ({
    name,
    type: definition.type ?? "object",
    required: required.includes(name),
  }));
}

export function adaptTool(descriptor: PackToolDescriptor): ToolManifest {
  return {
    kind: "tool",
    id: descriptor.id,
    name: descriptor.nameEn,
    provider: descriptor.provider,
    description: descriptor.description,
    inputs: schemaIo(descriptor.inputSchema),
    outputs: schemaIo(descriptor.outputSchema),
    permissions: [...descriptor.permissions],
    requiredCapabilities: [],
    authentication: descriptor.authType.includes("service-role") ? "service-account" : "bearer",
    sandboxPolicy: descriptor.sideEffect ? "isolated" : "readonly",
    status: "draft",
    metadata: {
      nameAr: descriptor.nameAr,
      implementationStatus: descriptor.implementationStatus,
      enabled: descriptor.enabled,
      pack: descriptor.pack,
      /* original auth vocabulary preserved — the enum above is a coarse map */
      authType: descriptor.authType,
    },
  };
}
