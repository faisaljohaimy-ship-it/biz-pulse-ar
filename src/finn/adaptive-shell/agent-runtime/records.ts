/**
 * Sections 01 & 02 — the agent record and runtime manifest.
 *
 * The runtime manifest WRAPS the frozen Phase-1 agent manifest and adds the
 * execution-facing declarations (required skills/knowledge/tools, IO,
 * execution contract, policies). The record is the registry's governed view.
 * All schemas zod-strict, fail-closed. Generic metadata / dependency /
 * contract / policy shapes are reused from the population layer.
 */
import { z } from "zod";
import { agentManifestSchema } from "../schemas/manifests";
import {
  dependencyDeclarationSchema,
  executionContractSchema,
  recordMetadataSchema,
  skillPolicySchema as policySchema,
} from "../population/records";
import { HEALTH_STATUSES, PERMISSION_ACTIONS } from "../population/types";
import { AGENT_EXECUTION_MODES, AGENT_LIFECYCLE_STATES } from "./types";

const ID = /^[a-z][a-z0-9.-]*$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

const idField = z.string().regex(ID, "id must be a lowercase kebab identifier");
const versionField = z.string().regex(SEMVER, "version must be strict semver");

const ioField = z
  .object({
    name: z.string().min(1),
    type: z.string().min(1),
    required: z.boolean().optional(),
  })
  .strict();

/* ── Section 02 · Runtime manifest (wraps the frozen base manifest) ─────── */
export const agentRuntimeManifestSchema = z
  .object({
    base: agentManifestSchema,
    version: versionField,
    capabilities: z.array(idField),
    requiredSkills: z.array(idField),
    requiredKnowledge: z.array(idField),
    requiredTools: z.array(idField),
    dependencies: z.array(dependencyDeclarationSchema),
    executionContract: executionContractSchema,
    inputs: z.array(ioField),
    outputs: z.array(ioField),
    policies: z.array(policySchema),
  })
  .strict();

/* ── Section 01 · Agent record ──────────────────────────────────────────── */
export const agentRecordSchema = z
  .object({
    id: idField,
    name: z.string().min(1),
    description: z.string().min(1),
    version: versionField,
    category: z.string().min(1),
    capabilities: z.array(idField),
    dependencies: z.array(dependencyDeclarationSchema),
    owner: z.string().min(1),
    permissions: z.array(z.enum(PERMISSION_ACTIONS)),
    policies: z.array(policySchema),
    metadata: recordMetadataSchema,
    lifecycle: z.enum(AGENT_LIFECYCLE_STATES),
    health: z.enum(HEALTH_STATUSES),
    supportedModes: z.array(z.enum(AGENT_EXECUTION_MODES)).min(1),
    manifest: agentRuntimeManifestSchema,
  })
  .strict();

export type AgentRuntimeManifest = z.infer<typeof agentRuntimeManifestSchema>;
export type AgentRecord = z.infer<typeof agentRecordSchema>;
export { policySchema as agentPolicySchema };
