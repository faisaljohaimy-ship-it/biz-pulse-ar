/**
 * Runtime Discovery — automatic manifest scanning, zero hardcoded lists.
 *
 * `import.meta.glob` scans skills/, agents/, tools/ and capabilities/ for
 * `*.manifest.ts` modules at build time — dropping a new manifest file into
 * one of those directories registers it on the next boot with NO import
 * edits and NO Core changes. Each module exports `manifest`; everything else
 * is refused. Invalid manifests and registration conflicts land in the
 * discovery report, never silently.
 */
import { ManifestLoader } from "./manifest-loader";
import { AdaptiveShellRegistry } from "./shell-registry";
import type { ResolutionReport } from "./dependency-resolver";

/** Build-time scan of the four shell directories — the ONLY source list. */
const MANIFEST_MODULES = import.meta.glob<{ manifest?: unknown }>(
  [
    "/src/finn/adaptive-shell/skills/*.manifest.ts",
    "/src/finn/adaptive-shell/agents/*.manifest.ts",
    "/src/finn/adaptive-shell/tools/*.manifest.ts",
    "/src/finn/adaptive-shell/capabilities/*.manifest.ts",
  ],
  { eager: true },
);

export interface DiscoveryReport {
  readonly scanned: number;
  readonly registered: number;
  readonly rejected: readonly { source: string; problems: readonly string[] }[];
  readonly validation: ResolutionReport;
  readonly sources: readonly string[];
}

/** Extract candidate manifests from discovered modules. */
export function discoveredCandidates(): Readonly<Record<string, unknown>> {
  const candidates: Record<string, unknown> = {};
  for (const [path, module] of Object.entries(MANIFEST_MODULES)) {
    candidates[path] = module.manifest;
  }
  return candidates;
}

/** Populate a registry from candidates (discovered or injected for tests). */
export function populateRegistry(
  registry: AdaptiveShellRegistry,
  candidates: Readonly<Record<string, unknown>>,
): DiscoveryReport {
  const loader = new ManifestLoader();
  const { loaded, rejected } = loader.loadMany(candidates);
  const allRejected = [...rejected];
  let registered = 0;
  for (const { source, manifest } of loaded) {
    try {
      registry.register(manifest);
      registered++;
    } catch (error) {
      allRejected.push({
        source,
        problems: [error instanceof Error ? error.message : String(error)],
      });
    }
  }
  return {
    scanned: Object.keys(candidates).length,
    registered,
    rejected: allRejected,
    validation: registry.validate(),
    sources: Object.keys(candidates),
  };
}

/** Boot the Adaptive Shell: discover, load, register, validate. */
export function createAdaptiveShell(): {
  registry: AdaptiveShellRegistry;
  report: DiscoveryReport;
} {
  const registry = new AdaptiveShellRegistry();
  const report = populateRegistry(registry, discoveredCandidates());
  return { registry, report };
}
