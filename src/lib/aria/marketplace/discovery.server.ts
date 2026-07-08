/**
 * Runtime discovery engine.
 *
 * Automatically discovers installed agent packages via Vite's
 * `import.meta.glob` on `src/lib/aria/agent-packages/**\/index.ts`.
 * A developer installs a new agent by dropping a package folder — no
 * existing code changes required. Packages default-export or named-export
 * an `AgentPackage` (`{ manifest, agent }`).
 *
 * Also supports programmatic installation via `installPackage(pkg)` for
 * dynamic/plug-in scenarios (skills, external loaders, tests).
 */
import type { AgentPackage } from "./types";
import type { AgentId } from "../orchestrator/types";
import { validatePackage } from "./validator.server";
import { normalizeManifest } from "./manifest";
import { recordVersion } from "./version.server";
import { ensureLoaded } from "./loader.server";
import { capabilityOwner } from "./capability-index.server";
import { emitMarketplaceEvent } from "./events";
import { noteInstall } from "./telemetry.server";
import { hasAgent } from "../orchestrator/registry";
import { buildGraph, findCycle, topologicalOrder } from "./dependency.server";

// ---------------------------------------------------------------------------
// Programmatic install path (single source of truth for validation + record)
// ---------------------------------------------------------------------------

export interface InstallResult {
  ok: boolean;
  agentId?: AgentId;
  version?: string;
  reasons?: string[];
}

export function installPackage(pkg: AgentPackage): InstallResult {
  const normalized: AgentPackage = {
    manifest: normalizeManifest(pkg.manifest),
    agent: pkg.agent,
  };
  const report = validatePackage(normalized, {
    hasAgent,
    capabilityOwner,
  });
  emitMarketplaceEvent("AgentValidated", {
    agentId: normalized.manifest.id,
    version: normalized.manifest.version,
    detail: { issues: report.issues },
  });
  if (!report.ok) {
    emitMarketplaceEvent("AgentRejected", {
      agentId: normalized.manifest.id,
      version: normalized.manifest.version,
      detail: { issues: report.issues },
    });
    return {
      ok: false,
      agentId: normalized.manifest.id,
      version: normalized.manifest.version,
      reasons: report.issues.map((i) => `${i.code}:${i.message}`),
    };
  }
  recordVersion(normalized);
  noteInstall(1);
  emitMarketplaceEvent("AgentInstalled", {
    agentId: normalized.manifest.id,
    version: normalized.manifest.version,
  });
  ensureLoaded(normalized.manifest.id);
  return {
    ok: true,
    agentId: normalized.manifest.id,
    version: normalized.manifest.version,
  };
}

// ---------------------------------------------------------------------------
// Automatic package discovery via Vite glob
// ---------------------------------------------------------------------------

type PackageModule = {
  default?: AgentPackage;
  agentPackage?: AgentPackage;
};

const modules = import.meta.glob<PackageModule>("/src/lib/aria/agent-packages/*/index.ts", {
  eager: true,
});

function extractPackage(mod: PackageModule): AgentPackage | null {
  const pkg = mod.default ?? mod.agentPackage ?? null;
  if (!pkg || !pkg.manifest || !pkg.agent) return null;
  return pkg;
}

let discovered = false;

/** Discover + install every plug-in package found on disk. Idempotent. */
export function discoverInstalledAgents(): InstallResult[] {
  if (discovered) return [];
  discovered = true;

  const pkgs: AgentPackage[] = [];
  for (const path of Object.keys(modules)) {
    const p = extractPackage(modules[path]);
    if (p) pkgs.push({ manifest: normalizeManifest(p.manifest), agent: p.agent });
  }

  // Dependency-aware install order — cycles are rejected wholesale.
  const graph = buildGraph(pkgs.map((p) => p.manifest));
  const cycle = findCycle(graph);
  if (cycle) {
    for (const p of pkgs) {
      emitMarketplaceEvent("AgentRejected", {
        agentId: p.manifest.id,
        detail: { code: "DEPENDENCY_CYCLE", cycle },
      });
    }
    return pkgs.map((p) => ({
      ok: false,
      agentId: p.manifest.id,
      reasons: [`DEPENDENCY_CYCLE:${cycle.join(" -> ")}`],
    }));
  }

  const order = topologicalOrder(graph);
  const byId = new Map(pkgs.map((p) => [p.manifest.id, p] as const));
  const results: InstallResult[] = [];
  for (const id of order) {
    const p = byId.get(id);
    if (p) results.push(installPackage(p));
  }
  // Install any remaining packages not represented in topo (defensive).
  for (const p of pkgs) if (!order.includes(p.manifest.id)) results.push(installPackage(p));
  return results;
}

/** Test-only reset hook. Not used at runtime. */
export function __resetDiscoveryForTests(): void {
  discovered = false;
}
