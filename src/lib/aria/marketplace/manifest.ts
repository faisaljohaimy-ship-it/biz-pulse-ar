/**
 * Manifest helpers — pure, isomorphic. Every agent package exports a
 * manifest of this exact shape. No runtime dependencies.
 */
import type {
  AgentManifest,
  AgentPermission,
  CapabilityDefinition,
} from "./types";

export const CURRENT_MANIFEST_SCHEMA = "1.0.0";

const SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const ID_RE = /^[a-z][a-z0-9_]*$/;

export function isSemver(v: string): boolean {
  return SEMVER_RE.test(v);
}

export function parseSemver(v: string): [number, number, number] | null {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Newest-first semver comparator. */
export function compareSemverDesc(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return 0;
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pb[i] - pa[i];
  }
  return 0;
}

export function isValidAgentId(id: string): boolean {
  return ID_RE.test(id);
}

const PERMISSIONS: readonly AgentPermission[] = [
  "memory",
  "storage",
  "filesystem",
  "network",
  "external_api",
  "secrets",
  "simulation",
  "analytics",
  "reports",
];

export function isValidPermission(p: string): p is AgentPermission {
  return (PERMISSIONS as readonly string[]).includes(p);
}

export function normalizeCapability(
  c: CapabilityDefinition,
): CapabilityDefinition {
  return {
    ...c,
    key: c.key.trim().toLowerCase(),
    synonyms: (c.synonyms ?? []).map((s) => s.trim().toLowerCase()),
    tags: (c.tags ?? []).map((s) => s.trim().toLowerCase()),
  };
}

export function normalizeManifest(m: AgentManifest): AgentManifest {
  return {
    ...m,
    schemaVersion: m.schemaVersion ?? CURRENT_MANIFEST_SCHEMA,
    capabilities: m.capabilities.map(normalizeCapability),
    supportedLanguages: m.supportedLanguages.map((s) => s.toLowerCase()),
  };
}
