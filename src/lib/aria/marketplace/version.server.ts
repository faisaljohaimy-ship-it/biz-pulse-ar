/**
 * Version registry — supports multiple installed versions per agent id
 * with newest-compatible selection and rollback. Only one version is
 * "active" at a time and exposed to the orchestrator registry.
 */
import type { AgentId } from "../orchestrator/types";
import type { AgentPackage } from "./types";
import { compareSemverDesc, parseSemver } from "./manifest";

interface VersionEntry {
  version: string;
  pkg: AgentPackage;
  installedAt: string;
}

const versions = new Map<AgentId, VersionEntry[]>();
const activeVersion = new Map<AgentId, string>();

export function recordVersion(pkg: AgentPackage): void {
  const list = versions.get(pkg.manifest.id) ?? [];
  if (list.some((v) => v.version === pkg.manifest.version)) return;
  list.push({
    version: pkg.manifest.version,
    pkg,
    installedAt: new Date().toISOString(),
  });
  list.sort((a, b) => compareSemverDesc(a.version, b.version));
  versions.set(pkg.manifest.id, list);
}

export function removeVersion(id: AgentId, version: string): void {
  const list = versions.get(id) ?? [];
  versions.set(
    id,
    list.filter((v) => v.version !== version),
  );
  if (activeVersion.get(id) === version) activeVersion.delete(id);
}

export function listVersions(id: AgentId): string[] {
  return (versions.get(id) ?? []).map((v) => v.version);
}

export function getVersion(id: AgentId, version: string): AgentPackage | null {
  return versions.get(id)?.find((v) => v.version === version)?.pkg ?? null;
}

export function setActive(id: AgentId, version: string): void {
  activeVersion.set(id, version);
}

export function getActive(id: AgentId): AgentPackage | null {
  const v = activeVersion.get(id);
  if (!v) return null;
  return getVersion(id, v);
}

/** Newest-installed version compatible with the given majorRange (e.g. "1"). */
export function pickNewestCompatible(
  id: AgentId,
  majorRange?: string,
): AgentPackage | null {
  const list = versions.get(id) ?? [];
  for (const entry of list) {
    if (!majorRange) return entry.pkg;
    const p = parseSemver(entry.version);
    if (p && String(p[0]) === majorRange) return entry.pkg;
  }
  return null;
}
