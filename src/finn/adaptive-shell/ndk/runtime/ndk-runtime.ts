/**
 * NDK Runtime — the SDK facade.
 *
 * One object that scaffolds from official templates, compiles through the
 * fail-closed pipeline, stores compiled packages versioned and discoverable
 * (list / find), and installs core-kind packages into the Phase-1 Shell
 * registry through its ordinary dynamic-registration path — never around it.
 */
import { NdkError, type Clock, type NdkPackage } from "../types";
import { NdkCompiler, type CompileInput, type CompileResult } from "../compiler/compiler";
import { scaffold } from "../scaffolds/scaffolder";
import { generatePackageManifest, type PackageManifestSummary } from "../generators/generators";
import type { TemplateSeed } from "../templates/templates";
import type { NdkArtifact } from "../schemas/extended";
import type { AdaptiveShellRegistry } from "../../registry/shell-registry";

export class NdkRuntime {
  readonly compiler: NdkCompiler;
  private readonly store = new Map<string, NdkPackage>(); // `${kind}:${id}@${version}`

  constructor(clock: Clock) {
    this.compiler = new NdkCompiler(clock);
  }

  /** New artifact from an official template (always valid or throws). */
  scaffold(
    kind: string,
    seed: TemplateSeed,
    overrides: Readonly<Record<string, unknown>> = {},
  ): NdkArtifact {
    return scaffold(kind, seed, overrides);
  }

  compile(input: CompileInput, context: readonly NdkArtifact[] = []): CompileResult {
    return this.compiler.compile(input, context);
  }

  /** Store a compiled package — versioned, duplicate refused. */
  install(pkg: NdkPackage): string {
    const key = `${pkg.runtimeDescriptor.kind}:${String(pkg.manifest.id)}@${pkg.version}`;
    if (this.store.has(key)) throw new NdkError("runtime", `package already installed: ${key}`);
    this.store.set(key, pkg);
    return key;
  }

  list(): readonly PackageManifestSummary[] {
    return [...this.store.values()].map(generatePackageManifest);
  }

  /** Discoverability: find packages by id/kind/entry substring. */
  find(text: string): readonly PackageManifestSummary[] {
    const needle = text.toLowerCase();
    return this.list().filter(
      (summary) =>
        summary.id.toLowerCase().includes(needle) ||
        summary.kind.toLowerCase().includes(needle) ||
        summary.entry.toLowerCase().includes(needle),
    );
  }

  /**
   * Install core-kind packages into the Phase-1 Shell registry via its
   * ordinary register() path; extended kinds stay NDK-hosted.
   */
  installIntoShell(
    registry: AdaptiveShellRegistry,
    packages: readonly NdkPackage[],
  ): { installed: readonly string[]; skipped: readonly string[] } {
    const installed: string[] = [];
    const skipped: string[] = [];
    for (const pkg of packages) {
      const id = String(pkg.manifest.id);
      try {
        registry.register(this.compiler.toShellCandidate(pkg));
        installed.push(id);
      } catch {
        skipped.push(id); // extended kind or registry refusal — never silent
      }
    }
    return { installed, skipped };
  }
}

/** Factory — one NDK per call site; no globals. */
export function createNdk(clock: Clock): NdkRuntime {
  return new NdkRuntime(clock);
}
