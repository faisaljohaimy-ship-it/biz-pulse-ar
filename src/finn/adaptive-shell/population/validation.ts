/**
 * Section 11 — Validation pipeline.
 *
 * Seven checks, all fail-closed, all reported (the pipeline never stops at
 * the first issue — a rejected record explains everything wrong with it):
 * manifest/record shape · category existence · dependency declarations ·
 * execution contract sanity · metadata coherence · permission vocabulary ·
 * version + capability references.
 */
import type { ZodType } from "zod";
import {
  capabilityRecordSchema,
  skillRecordSchema,
  type AnyPopulationRecord,
  type CapabilityRecord,
  type SkillRecord,
} from "./records";
import { parseVersion } from "./versioning";
import type { CategoryRegistry } from "./categories";
import type { PermissionModel } from "./permissions";

export interface ValidationIssue {
  readonly check:
    | "manifest"
    | "category"
    | "dependencies"
    | "contract"
    | "metadata"
    | "permissions"
    | "version"
    | "capability-references";
  readonly detail: string;
}

export interface ValidationReport {
  readonly subjectId: string;
  readonly valid: boolean;
  readonly issues: readonly ValidationIssue[];
}

export interface ValidationContext {
  readonly categories: CategoryRegistry;
  readonly permissions: PermissionModel;
  /** Capability ids known to the registry (for skill → capability references). */
  readonly knownCapabilityIds: readonly string[];
}

function shapeIssues(schema: ZodType, candidate: unknown): ValidationIssue[] {
  const parsed = schema.safeParse(candidate);
  if (parsed.success) return [];
  return parsed.error.issues.map((i) => ({
    check: "manifest" as const,
    detail: `${i.path.join(".") || "(root)"}: ${i.message}`,
  }));
}

function sharedIssues(record: AnyPopulationRecord, context: ValidationContext): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!context.categories.has(record.category)) {
    issues.push({
      check: "category",
      detail: `category "${record.category}" is not registered`,
    });
  }

  const selfDep = record.dependencies.find((d) => d.target === record.id);
  if (selfDep) {
    issues.push({ check: "dependencies", detail: `"${record.id}" depends on itself` });
  }
  const seen = new Set<string>();
  for (const dep of record.dependencies) {
    if (seen.has(dep.target)) {
      issues.push({ check: "dependencies", detail: `duplicate dependency "${dep.target}"` });
    }
    seen.add(dep.target);
  }

  const unknownActions = context.permissions.unknownActions(record.permissions);
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

  if (record.metadata.updatedAt < record.metadata.createdAt) {
    issues.push({ check: "metadata", detail: "updatedAt precedes createdAt" });
  }
  if (record.metadata.owner.trim() === "") {
    issues.push({ check: "metadata", detail: "owner must be non-empty" });
  }

  return issues;
}

export class RecordValidator {
  constructor(private readonly context: ValidationContext) {}

  validateCapability(candidate: unknown): ValidationReport {
    const shape = shapeIssues(capabilityRecordSchema, candidate);
    if (shape.length > 0) {
      const id =
        typeof candidate === "object" && candidate !== null && "id" in candidate
          ? String((candidate as { id: unknown }).id)
          : "(unknown)";
      return { subjectId: id, valid: false, issues: shape };
    }
    const record = candidate as CapabilityRecord;
    const issues = sharedIssues(record, this.context);
    return { subjectId: record.id, valid: issues.length === 0, issues };
  }

  validateSkill(candidate: unknown): ValidationReport {
    const shape = shapeIssues(skillRecordSchema, candidate);
    if (shape.length > 0) {
      const id =
        typeof candidate === "object" && candidate !== null && "id" in candidate
          ? String((candidate as { id: unknown }).id)
          : "(unknown)";
      return { subjectId: id, valid: false, issues: shape };
    }
    const record = candidate as SkillRecord;
    const issues = [...sharedIssues(record, this.context)];

    if (record.manifest.id !== record.id) {
      issues.push({
        check: "manifest",
        detail: `record id "${record.id}" ≠ manifest id "${record.manifest.id}"`,
      });
    }
    if (record.manifest.version !== record.version) {
      issues.push({
        check: "version",
        detail: `record version ${record.version} ≠ manifest version ${record.manifest.version}`,
      });
    }

    if (record.executionContract.timeoutMs > 300_000) {
      issues.push({
        check: "contract",
        detail: `timeoutMs ${record.executionContract.timeoutMs} exceeds the 300000ms ceiling`,
      });
    }
    if (record.executionContract.retryable && !record.executionContract.idempotent) {
      issues.push({
        check: "contract",
        detail: "a retryable contract must be idempotent (fail-closed retry law)",
      });
    }

    for (const capId of record.requiredCapabilities) {
      if (!this.context.knownCapabilityIds.includes(capId)) {
        issues.push({
          check: "capability-references",
          detail: `required capability "${capId}" is not registered`,
        });
      }
    }

    return { subjectId: record.id, valid: issues.length === 0, issues };
  }
}
