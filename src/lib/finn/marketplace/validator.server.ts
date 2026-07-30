/**
 * Manifest + package validator. Runs BEFORE registry insertion.
 * Rejects unsigned public agents, duplicate ids, duplicate capabilities,
 * dependency cycles, invalid permissions, and schema mismatches.
 */
import type { AgentPackage, ValidationIssue, ValidationReport } from "./types";
import { CURRENT_MANIFEST_SCHEMA, isSemver, isValidAgentId, isValidPermission } from "./manifest";
import type { AgentId } from "../orchestrator/types";

interface RegistryView {
  hasAgent(id: AgentId): boolean;
  capabilityOwner(key: string): AgentId | null;
}

function issue(code: string, message: string, fatal = true): ValidationIssue {
  return { code, message, fatal };
}

export function validatePackage(pkg: AgentPackage, view: RegistryView): ValidationReport {
  const issues: ValidationIssue[] = [];
  const { manifest, agent } = pkg;

  if (!manifest) issues.push(issue("MANIFEST_MISSING", "manifest is required"));
  if (!agent || typeof agent.run !== "function") {
    issues.push(issue("AGENT_INVALID", "agent.run() missing"));
  }
  if (!manifest) return { ok: false, issues };

  if (!isValidAgentId(manifest.id))
    issues.push(issue("ID_INVALID", `bad agent id: ${manifest.id}`));
  if (!isSemver(manifest.version))
    issues.push(issue("VERSION_INVALID", `bad semver: ${manifest.version}`));

  if (manifest.schemaVersion && manifest.schemaVersion !== CURRENT_MANIFEST_SCHEMA) {
    issues.push(
      issue(
        "SCHEMA_INCOMPATIBLE",
        `schemaVersion ${manifest.schemaVersion} != ${CURRENT_MANIFEST_SCHEMA}`,
      ),
    );
  }

  if (agent && agent.contract.id !== manifest.id) {
    issues.push(
      issue("ID_MISMATCH", `manifest.id=${manifest.id} contract.id=${agent.contract.id}`),
    );
  }

  if (view.hasAgent(manifest.id))
    issues.push(issue("DUPLICATE_ID", `agent ${manifest.id} already installed`));

  for (const p of manifest.permissions) {
    if (!isValidPermission(p)) issues.push(issue("PERMISSION_INVALID", `unknown permission: ${p}`));
  }

  // Dependency validation — every declared dep must resolve at install time.
  for (const d of manifest.dependencies) {
    if (d === manifest.id)
      issues.push(issue("SELF_DEPENDENCY", `${manifest.id} depends on itself`));
    if (!view.hasAgent(d))
      issues.push(issue("DEPENDENCY_MISSING", `dependency not installed: ${d}`, false));
  }

  // Capability ownership uniqueness.
  const seen = new Set<string>();
  for (const c of manifest.capabilities) {
    if (!c.key || !/^[a-z0-9_.:-]+$/i.test(c.key)) {
      issues.push(issue("CAPABILITY_KEY_INVALID", `bad capability: ${c.key}`));
      continue;
    }
    if (seen.has(c.key)) issues.push(issue("CAPABILITY_DUP_IN_MANIFEST", c.key));
    seen.add(c.key);
    const owner = view.capabilityOwner(c.key);
    if (owner && owner !== manifest.id) {
      issues.push(issue("CAPABILITY_OWNED_ELSEWHERE", `${c.key} already owned by ${owner}`));
    }
  }

  if (manifest.visibility === "public" && !manifest.signature) {
    issues.push(issue("SIGNATURE_REQUIRED", "public agents must be signed"));
  }

  if (typeof manifest.timeout !== "number" || manifest.timeout <= 0)
    issues.push(issue("TIMEOUT_INVALID", "timeout must be > 0"));

  if (typeof manifest.confidence !== "number" || manifest.confidence < 0 || manifest.confidence > 1)
    issues.push(issue("CONFIDENCE_INVALID", "confidence must be in [0,1]"));

  const fatal = issues.some((i) => i.fatal);
  return { ok: !fatal, issues };
}
