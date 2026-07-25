/**
 * NDK Generators — derive everything mechanical from an artifact:
 * metadata, runtime descriptors, dependency graphs, version information and
 * package manifests. Deterministic: timestamps come from an injected clock.
 */
import { NdkError, type Clock, type RuntimeDescriptor } from "../types";
import type { NdkArtifact } from "../schemas/extended";
import type { NdkPackage } from "../types";

/** Artifact version — kinds without a version field default to 1.0.0. */
export function versionOf(artifact: NdkArtifact): string {
  return "version" in artifact ? artifact.version : "1.0.0";
}

/** Provenance metadata every generated package carries. */
export function generateMetadata(
  artifact: NdkArtifact,
  clock: Clock,
): Readonly<Record<string, unknown>> {
  return {
    ...artifact.metadata,
    generatedBy: "ndk@1.0.0",
    generatedAtISO: clock(),
    kind: artifact.kind,
    artifactId: artifact.id,
  };
}

const ISOLATION: Readonly<Record<string, RuntimeDescriptor["isolation"]>> = {
  agent: "advisory",
  tool: "sandboxed",
  plugin: "sandboxed",
  connector: "sandboxed",
};

/** How the Shell should host this artifact at runtime. */
export function generateRuntimeDescriptor(artifact: NdkArtifact): RuntimeDescriptor {
  return {
    kind: artifact.kind,
    entry: `shell://${artifact.kind}/${artifact.id}`,
    isolation: ISOLATION[artifact.kind] ?? "none",
    activation: "discovery",
    version: versionOf(artifact),
  };
}

export interface DependencyGraph {
  readonly nodes: readonly string[]; // `${kind}:${id}`
  readonly edges: readonly { from: string; to: string }[];
  readonly order: readonly string[]; // dependencies-first
}

/** Same-kind dependency graph with a topological order; cycles refused. */
export function generateDependencyGraph(artifacts: readonly NdkArtifact[]): DependencyGraph {
  const nodes = artifacts.map((a) => `${a.kind}:${a.id}`);
  const known = new Set(nodes);
  const edges: { from: string; to: string }[] = [];
  for (const artifact of artifacts) {
    const deps = "dependencies" in artifact ? artifact.dependencies : [];
    for (const dep of deps) {
      const to = `${artifact.kind}:${dep}`;
      if (known.has(to)) edges.push({ from: `${artifact.kind}:${artifact.id}`, to });
    }
  }
  const order: string[] = [];
  const marks = new Map<string, "visiting" | "done">();
  const visit = (node: string, path: readonly string[]): void => {
    const mark = marks.get(node);
    if (mark === "done") return;
    if (mark === "visiting") {
      throw new NdkError("generator", `dependency cycle: ${[...path, node].join(" → ")}`);
    }
    marks.set(node, "visiting");
    for (const edge of edges) {
      if (edge.from === node) visit(edge.to, [...path, node]);
    }
    marks.set(node, "done");
    order.push(node);
  };
  for (const node of nodes) visit(node, []);
  return { nodes, edges, order };
}

export interface VersionInfo {
  readonly versions: Readonly<Record<string, string>>;
  readonly conflicts: readonly string[];
}

/** One version per (kind, id) with conflict detection. */
export function generateVersionInfo(artifacts: readonly NdkArtifact[]): VersionInfo {
  const versions: Record<string, string> = {};
  const conflicts: string[] = [];
  for (const artifact of artifacts) {
    const key = `${artifact.kind}:${artifact.id}`;
    const version = versionOf(artifact);
    if (versions[key] !== undefined && versions[key] !== version) {
      conflicts.push(`${key}: ${versions[key]} vs ${version}`);
    }
    versions[key] = version;
  }
  return { versions, conflicts };
}

export interface PackageManifestSummary {
  readonly id: string;
  readonly kind: string;
  readonly version: string;
  readonly dependencies: readonly string[];
  readonly permissions: readonly string[];
  readonly capabilities: readonly string[];
  readonly entry: string;
  readonly documented: boolean;
}

/** Compact, serializable package manifest for catalogs and marketplaces. */
export function generatePackageManifest(pkg: NdkPackage): PackageManifestSummary {
  return {
    id: String(pkg.manifest.id),
    kind: pkg.runtimeDescriptor.kind,
    version: pkg.version,
    dependencies: pkg.dependencies,
    permissions: pkg.permissions,
    capabilities: pkg.capabilities,
    entry: pkg.runtimeDescriptor.entry,
    documented: pkg.documentation.length > 0,
  };
}

/** The capabilities a compiled artifact exposes or exercises. */
export function deriveCapabilities(artifact: NdkArtifact): readonly string[] {
  switch (artifact.kind) {
    case "capability":
      return [artifact.id];
    case "connector":
      return artifact.capabilities;
    case "agent":
      return artifact.supportedCapabilities;
    case "skill":
      return artifact.requiredCapabilities;
    case "tool":
      return artifact.requiredCapabilities;
    default:
      return [];
  }
}

/** The permissions a compiled artifact declares. */
export function derivePermissions(artifact: NdkArtifact): readonly string[] {
  if (artifact.kind === "skill") return artifact.requiredPermissions;
  if ("permissions" in artifact) return artifact.permissions;
  return [];
}
