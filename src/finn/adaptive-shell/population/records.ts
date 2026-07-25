/**
 * Registry records — Sections 01 (Capability) & 02 (Skill) + Section 09
 * (metadata block).
 *
 * A record is the registry's view of an object: the Phase-1 manifest plus
 * everything population governance needs — lifecycle, health, activation
 * rules, visibility, structured metadata. Zod-strict and fail-closed:
 * a record missing any mandated field never registers.
 */
import { z } from "zod";
import { skillManifestSchema } from "../schemas/manifests";
import {
  ACTIVATION_RULES,
  DEACTIVATION_RULES,
  DEPENDENCY_BINDINGS,
  DEPENDENCY_NECESSITIES,
  EXECUTION_MODES,
  HEALTH_STATUSES,
  LIFECYCLE_STATES,
  PERMISSION_ACTIONS,
  VISIBILITIES,
} from "./types";

const ID = /^[a-z][a-z0-9.-]*$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/;

const idField = z.string().regex(ID, "id must be a lowercase kebab identifier");
const versionField = z.string().regex(SEMVER, "version must be strict semver");

export const dependencyDeclarationSchema = z
  .object({
    target: idField,
    necessity: z.enum(DEPENDENCY_NECESSITIES),
    binding: z.enum(DEPENDENCY_BINDINGS),
  })
  .strict();

/* ── Section 09 · structured metadata (every record carries it) ─────────── */
export const recordMetadataSchema = z
  .object({
    tags: z.array(z.string().min(1)),
    keywords: z.array(z.string().min(1)),
    sector: z.string().min(1),
    department: z.string().min(1),
    language: z.string().min(1),
    owner: z.string().min(1),
    createdAt: z.string().regex(ISO_DATE, "createdAt must be an ISO date"),
    updatedAt: z.string().regex(ISO_DATE, "updatedAt must be an ISO date"),
    compatibility: z.array(z.string().min(1)),
  })
  .strict();

/* ── Section 01 · Capability record ─────────────────────────────────────── */
export const capabilityRecordSchema = z
  .object({
    id: idField,
    name: z.string().min(1),
    description: z.string().min(1),
    category: z.string().min(1),
    version: versionField,
    owner: z.string().min(1),
    dependencies: z.array(dependencyDeclarationSchema),
    permissions: z.array(z.enum(PERMISSION_ACTIONS)),
    executionMode: z.enum(EXECUTION_MODES),
    health: z.enum(HEALTH_STATUSES),
    lifecycle: z.enum(LIFECYCLE_STATES),
    activationRules: z.array(z.enum(ACTIVATION_RULES)),
    deactivationRules: z.array(z.enum(DEACTIVATION_RULES)),
    visibility: z.enum(VISIBILITIES),
    metadata: recordMetadataSchema,
  })
  .strict();

/* ── Section 02 · Skill record (wraps the frozen Phase-1 manifest) ──────── */
export const executionContractSchema = z
  .object({
    invocation: z.enum(["synchronous", "streamed", "queued"]),
    timeoutMs: z.number().int().positive(),
    retryable: z.boolean(),
    idempotent: z.boolean(),
  })
  .strict();

export const skillPolicySchema = z
  .object({
    id: idField,
    description: z.string().min(1),
    enforcement: z.enum(["blocking", "advisory"]),
  })
  .strict();

export const skillRecordSchema = z
  .object({
    id: idField,
    manifest: skillManifestSchema,
    version: versionField,
    category: z.string().min(1),
    requiredCapabilities: z.array(idField),
    dependencies: z.array(dependencyDeclarationSchema),
    executionContract: executionContractSchema,
    permissions: z.array(z.enum(PERMISSION_ACTIONS)),
    policies: z.array(skillPolicySchema),
    health: z.enum(HEALTH_STATUSES),
    lifecycle: z.enum(LIFECYCLE_STATES),
    metadata: recordMetadataSchema,
  })
  .strict();

export type RecordMetadata = z.infer<typeof recordMetadataSchema>;
export type CapabilityRecord = z.infer<typeof capabilityRecordSchema>;
export type ExecutionContract = z.infer<typeof executionContractSchema>;
export type SkillPolicy = z.infer<typeof skillPolicySchema>;
export type SkillRecord = z.infer<typeof skillRecordSchema>;
export type AnyPopulationRecord = CapabilityRecord | SkillRecord;
