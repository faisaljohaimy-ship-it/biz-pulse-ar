/**
 * NDK Validators — Schema · Manifest · Version · Dependency · Permission ·
 * Capability · Runtime. Each returns { ok, problems } and never mutates;
 * the compiler composes them fail-closed.
 */
import {
  formatIssues,
  type NdkKind,
  type RuntimeDescriptor,
  type ValidationResult,
} from "../types";
import { anyManifestSchema } from "../../schemas/manifests";
import { ndkArtifactSchema, type NdkArtifact } from "../schemas/extended";

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const ENTRY = /^shell:\/\/[a-z-]+\/[a-z][a-z0-9.-]*$/;

function ok(): ValidationResult {
  return { ok: true, problems: [] };
}

function fail(problems: readonly string[]): ValidationResult {
  return { ok: problems.length === 0, problems };
}

/** Any NDK artifact against the full 13-kind union. */
export class SchemaValidator {
  validate(candidate: unknown): ValidationResult {
    const parsed = ndkArtifactSchema.safeParse(candidate);
    return parsed.success ? ok() : fail(formatIssues(parsed.error.issues));
  }
}

/** The four Shell manifest kinds only (Phase-1 union). */
export class ManifestValidator {
  validate(candidate: unknown): ValidationResult {
    const parsed = anyManifestSchema.safeParse(candidate);
    return parsed.success ? ok() : fail(formatIssues(parsed.error.issues));
  }
}

/** Strict semver everywhere; one version per (kind, id) across a set. */
export class VersionValidator {
  validate(artifacts: readonly NdkArtifact[]): ValidationResult {
    const problems: string[] = [];
    const seen = new Map<string, string>();
    for (const artifact of artifacts) {
      const version = "version" in artifact ? artifact.version : "1.0.0";
      if (!SEMVER.test(version)) {
        problems.push(`${artifact.kind} "${artifact.id}": version "${version}" is not semver`);
      }
      const key = `${artifact.kind}:${artifact.id}`;
      const existing = seen.get(key);
      if (existing !== undefined && existing !== version) {
        problems.push(`version conflict for ${key}: ${existing} vs ${version}`);
      }
      seen.set(key, version);
    }
    return fail(problems);
  }
}

/** Same-kind dependencies must exist within the set; cycles refused. */
export class DependencyValidator {
  validate(artifacts: readonly NdkArtifact[]): ValidationResult {
    const problems: string[] = [];
    const byKey = new Map(artifacts.map((a) => [`${a.kind}:${a.id}`, a]));
    const depsOf = (artifact: NdkArtifact): readonly string[] =>
      "dependencies" in artifact ? artifact.dependencies : [];

    for (const artifact of artifacts) {
      for (const dep of depsOf(artifact)) {
        if (!byKey.has(`${artifact.kind}:${dep}`)) {
          problems.push(`${artifact.kind} "${artifact.id}": missing dependency "${dep}"`);
        }
      }
    }

    const marks = new Map<string, "visiting" | "done">();
    const visit = (key: string, path: readonly string[]): void => {
      const mark = marks.get(key);
      if (mark === "done") return;
      if (mark === "visiting") {
        problems.push(`dependency cycle: ${[...path, key].join(" → ")}`);
        return;
      }
      const artifact = byKey.get(key);
      if (!artifact) return;
      marks.set(key, "visiting");
      for (const dep of depsOf(artifact)) visit(`${artifact.kind}:${dep}`, [...path, key]);
      marks.set(key, "done");
    };
    for (const key of byKey.keys()) visit(key, []);
    return fail(problems);
  }
}

/** Skills must cover their tools' permissions; agents their skills'. */
export class PermissionValidator {
  validate(artifacts: readonly NdkArtifact[]): ValidationResult {
    const problems: string[] = [];
    const tools = new Map(artifacts.filter((a) => a.kind === "tool").map((a) => [a.id, a]));
    const skills = new Map(artifacts.filter((a) => a.kind === "skill").map((a) => [a.id, a]));
    for (const artifact of artifacts) {
      if (artifact.kind === "skill") {
        const declared = new Set(artifact.requiredPermissions);
        for (const toolId of artifact.requiredTools) {
          for (const permission of tools.get(toolId)?.permissions ?? []) {
            if (!declared.has(permission)) {
              problems.push(
                `skill "${artifact.id}": missing permission "${permission}" required by tool "${toolId}"`,
              );
            }
          }
        }
      }
      if (artifact.kind === "agent") {
        const granted = new Set(artifact.permissions);
        for (const skillId of artifact.supportedSkills) {
          for (const permission of skills.get(skillId)?.requiredPermissions ?? []) {
            if (!granted.has(permission)) {
              problems.push(
                `agent "${artifact.id}": missing permission "${permission}" required by skill "${skillId}"`,
              );
            }
          }
        }
      }
    }
    return fail(problems);
  }
}

/** Capability artifacts must reference skills/tools/agents within the set. */
export class CapabilityValidator {
  validate(artifacts: readonly NdkArtifact[]): ValidationResult {
    const problems: string[] = [];
    const ids = (kind: NdkKind) =>
      new Set(artifacts.filter((a) => a.kind === kind).map((a) => a.id));
    const skills = ids("skill");
    const tools = ids("tool");
    const agents = ids("agent");
    for (const artifact of artifacts) {
      if (artifact.kind !== "capability") continue;
      const owner = `capability "${artifact.id}"`;
      for (const id of artifact.requiredSkills) {
        if (!skills.has(id)) problems.push(`${owner}: unresolved skill "${id}"`);
      }
      for (const id of artifact.requiredTools) {
        if (!tools.has(id)) problems.push(`${owner}: unresolved tool "${id}"`);
      }
      for (const id of artifact.requiredAgents) {
        if (!agents.has(id)) problems.push(`${owner}: unresolved agent "${id}"`);
      }
    }
    return fail(problems);
  }
}

/** Runtime descriptors: entry format, isolation, activation, semver. */
export class RuntimeValidator {
  validate(descriptor: RuntimeDescriptor): ValidationResult {
    const problems: string[] = [];
    if (!ENTRY.test(descriptor.entry)) {
      problems.push(`entry "${descriptor.entry}" must match shell://<kind>/<id>`);
    }
    if (!["none", "advisory", "sandboxed"].includes(descriptor.isolation)) {
      problems.push(`unknown isolation "${descriptor.isolation}"`);
    }
    if (!["discovery", "manual"].includes(descriptor.activation)) {
      problems.push(`unknown activation "${descriptor.activation}"`);
    }
    if (!SEMVER.test(descriptor.version)) {
      problems.push(`descriptor version "${descriptor.version}" is not semver`);
    }
    return fail(problems);
  }
}
