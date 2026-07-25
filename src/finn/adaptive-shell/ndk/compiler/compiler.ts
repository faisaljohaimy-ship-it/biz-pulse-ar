/**
 * NDK Compiler — artifacts in, Shell-compatible packages out.
 *
 * The pipeline is fail-closed: schema validation → documentation required →
 * metadata required (an empty metadata object is refused) → permission
 * coverage → dependency cycles → version consistency → runtime-descriptor
 * validation. Anything that fails any gate is REJECTED with exact problems
 * and never becomes a package. Compiled packages are deep-frozen and carry
 * their full validation result.
 */
import {
  NdkError,
  formatIssues,
  type Clock,
  type NdkPackage,
  type ValidationResult,
} from "../types";
import { ndkArtifactSchema, type NdkArtifact } from "../schemas/extended";
import {
  DependencyValidator,
  PermissionValidator,
  RuntimeValidator,
  VersionValidator,
} from "../validators/validators";
import {
  deriveCapabilities,
  derivePermissions,
  generateMetadata,
  generateRuntimeDescriptor,
  versionOf,
} from "../generators/generators";
import type { AnyManifest } from "../../schemas/manifests";

export interface CompileInput {
  readonly artifact: unknown;
  readonly documentation: string;
}

export type CompileResult =
  | { readonly ok: true; readonly pkg: NdkPackage }
  | { readonly ok: false; readonly problems: readonly string[] };

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.getOwnPropertyNames(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

const SHELL_KINDS = new Set(["skill", "agent", "tool", "capability"]);

export class NdkCompiler {
  private readonly versions = new VersionValidator();
  private readonly dependencies = new DependencyValidator();
  private readonly permissions = new PermissionValidator();
  private readonly runtime = new RuntimeValidator();

  constructor(private readonly clock: Clock) {}

  /** Compile ONE artifact against an optional context set. */
  compile(input: CompileInput, context: readonly NdkArtifact[] = []): CompileResult {
    const problems: string[] = [];

    const parsed = ndkArtifactSchema.safeParse(input.artifact);
    if (!parsed.success) {
      return { ok: false, problems: formatIssues(parsed.error.issues) };
    }
    const artifact = parsed.data;

    if (!input.documentation.trim()) {
      problems.push(`${artifact.kind} "${artifact.id}": documentation is required`);
    }
    if (Object.keys(artifact.metadata).length === 0) {
      problems.push(`${artifact.kind} "${artifact.id}": metadata is required — refused`);
    }

    const set = [...context, artifact];
    for (const verdict of [
      this.versions.validate(set),
      this.dependencies.validate(set),
      this.permissions.validate(set),
    ]) {
      problems.push(...verdict.problems);
    }

    const descriptor = generateRuntimeDescriptor(artifact);
    problems.push(...this.runtime.validate(descriptor).problems);

    if (problems.length > 0) return { ok: false, problems };

    const validationResult: ValidationResult = { ok: true, problems: [] };
    const pkg: NdkPackage = deepFreeze({
      manifest: { ...artifact },
      metadata: generateMetadata(artifact, this.clock),
      version: versionOf(artifact),
      dependencies: "dependencies" in artifact ? [...artifact.dependencies] : [],
      permissions: [...derivePermissions(artifact)],
      capabilities: [...deriveCapabilities(artifact)],
      runtimeDescriptor: descriptor,
      documentation: input.documentation,
      validationResult,
    });
    return { ok: true, pkg };
  }

  /** Compile a set together — cross-package validation over the whole set. */
  compileMany(inputs: readonly CompileInput[]): {
    readonly packages: readonly NdkPackage[];
    readonly rejected: readonly { index: number; problems: readonly string[] }[];
  } {
    // First pass: schema-parse everything for cross-set context.
    const parsedSet: NdkArtifact[] = [];
    for (const input of inputs) {
      const parsed = ndkArtifactSchema.safeParse(input.artifact);
      if (parsed.success) parsedSet.push(parsed.data);
    }
    const packages: NdkPackage[] = [];
    const rejected: { index: number; problems: readonly string[] }[] = [];
    inputs.forEach((input, index) => {
      const context = parsedSet.filter((a) => a !== (input.artifact as NdkArtifact));
      const result = this.compile(input, context);
      if (result.ok) packages.push(result.pkg);
      else rejected.push({ index, problems: result.problems });
    });
    return { packages, rejected };
  }

  /** Shell compatibility: core-kind packages become registry candidates. */
  toShellCandidate(pkg: NdkPackage): AnyManifest {
    const kind = pkg.runtimeDescriptor.kind;
    if (!SHELL_KINDS.has(kind)) {
      throw new NdkError(
        "compiler",
        `kind "${kind}" is an NDK artifact, not a Phase-1 Shell manifest`,
      );
    }
    return pkg.manifest as unknown as AnyManifest;
  }
}
