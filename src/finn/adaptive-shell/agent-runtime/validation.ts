/**
 * Agent admission validation — same fail-closed law as the population
 * layer: every check runs, every issue is reported, nothing partial lands.
 */
import { agentRecordSchema, type AgentRecord } from "./records";
import { parseVersion } from "../population/versioning";
import type { CategoryRegistry } from "../population/categories";
import type { PermissionModel } from "../population/permissions";

export interface AgentValidationIssue {
  readonly check:
    | "manifest"
    | "category"
    | "dependencies"
    | "contract"
    | "permissions"
    | "version"
    | "capability-references";
  readonly detail: string;
}

export interface AgentValidationReport {
  readonly subjectId: string;
  readonly valid: boolean;
  readonly issues: readonly AgentValidationIssue[];
}

export interface AgentValidationContext {
  readonly categories: CategoryRegistry;
  readonly permissions: PermissionModel;
  /**
   * Optional capability resolver (wired when a population capability
   * registry exists). Absent resolver = references recorded, not resolved —
   * honest deferral, documented in the admission report.
   */
  readonly knownCapabilityIds?: () => readonly string[];
}

export class AgentRecordValidator {
  constructor(private readonly context: AgentValidationContext) {}

  validate(candidate: unknown): AgentValidationReport {
    const parsed = agentRecordSchema.safeParse(candidate);
    if (!parsed.success) {
      const id =
        typeof candidate === "object" && candidate !== null && "id" in candidate
          ? String((candidate as { id: unknown }).id)
          : "(unknown)";
      return {
        subjectId: id,
        valid: false,
        issues: parsed.error.issues.map((i) => ({
          check: "manifest" as const,
          detail: `${i.path.join(".") || "(root)"}: ${i.message}`,
        })),
      };
    }

    const record = parsed.data as AgentRecord;
    const issues: AgentValidationIssue[] = [];

    if (!this.context.categories.has(record.category)) {
      issues.push({ check: "category", detail: `category "${record.category}" is not registered` });
    }

    if (record.manifest.base.id !== record.id) {
      issues.push({
        check: "manifest",
        detail: `record id "${record.id}" ≠ manifest base id "${record.manifest.base.id}"`,
      });
    }
    if (record.manifest.version !== record.version) {
      issues.push({
        check: "version",
        detail: `record version ${record.version} ≠ manifest version ${record.manifest.version}`,
      });
    }

    if (record.dependencies.some((d) => d.target === record.id)) {
      issues.push({ check: "dependencies", detail: `"${record.id}" depends on itself` });
    }
    const seen = new Set<string>();
    for (const dep of record.dependencies) {
      if (seen.has(dep.target)) {
        issues.push({ check: "dependencies", detail: `duplicate dependency "${dep.target}"` });
      }
      seen.add(dep.target);
    }

    const contract = record.manifest.executionContract;
    if (contract.timeoutMs > 300_000) {
      issues.push({
        check: "contract",
        detail: `timeoutMs ${contract.timeoutMs} exceeds the 300000ms ceiling`,
      });
    }
    if (contract.retryable && !contract.idempotent) {
      issues.push({
        check: "contract",
        detail: "a retryable contract must be idempotent (fail-closed retry law)",
      });
    }

    const unknownActions = this.context.permissions.unknownActions(record.permissions);
    if (unknownActions.length > 0) {
      issues.push({
        check: "permissions",
        detail: `unknown permission action(s): ${unknownActions.join(", ")}`,
      });
    }

    try {
      parseVersion(record.version);
    } catch (error) {
      issues.push({ check: "version", detail: (error as Error).message });
    }

    if (this.context.knownCapabilityIds) {
      const known = this.context.knownCapabilityIds();
      for (const capId of record.capabilities) {
        if (!known.includes(capId)) {
          issues.push({
            check: "capability-references",
            detail: `capability "${capId}" is not registered`,
          });
        }
      }
    }

    return { subjectId: record.id, valid: issues.length === 0, issues };
  }
}
