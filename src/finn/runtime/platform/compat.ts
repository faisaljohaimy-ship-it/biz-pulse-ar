/**
 * Compatibility — Runtime Version Manager · Compatibility Manager.
 *
 * Versions are strict semver. Negotiation picks the highest mutually
 * supported version (null when none). Capability negotiation reports exactly
 * what is missing. Upgrades are safe by construction: either backward
 * compatible (same major, non-decreasing) or covered by an explicit chain of
 * migration contracts — anything else is refused (zero compatibility
 * regressions). Deprecations are recorded and surfaced as warnings.
 */
import { PlatformError } from "./types";

export interface Semver {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

export function parseSemver(version: string): Semver {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new PlatformError("compat", `invalid version "${version}"`);
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

export function compareSemver(a: string, b: string): number {
  const va = parseSemver(a);
  const vb = parseSemver(b);
  return va.major - vb.major || va.minor - vb.minor || va.patch - vb.patch;
}

export class RuntimeVersionManager {
  private readonly versions = new Map<string, string>();

  setVersion(component: string, version: string): void {
    parseSemver(version); // validates
    this.versions.set(component, version);
  }

  versionOf(component: string): string | undefined {
    return this.versions.get(component);
  }

  snapshot(): Readonly<Record<string, string>> {
    return Object.fromEntries(this.versions);
  }
}

export interface MigrationContract {
  readonly component: string;
  readonly from: string;
  readonly to: string;
  migrate(state: unknown): unknown;
}

export class CompatibilityManager {
  private readonly support = new Map<string, readonly string[]>();
  private readonly migrations: MigrationContract[] = [];
  private readonly deprecations: { component: string; version: string; message: string }[] = [];

  declareSupport(component: string, versions: readonly string[]): void {
    for (const version of versions) parseSemver(version);
    this.support.set(component, [...versions]);
  }

  /** Version negotiation: highest version both sides support, else null. */
  negotiateVersion(component: string, clientAccepts: readonly string[]): string | null {
    const supported = this.support.get(component) ?? [];
    const common = supported.filter((version) => clientAccepts.includes(version));
    if (common.length === 0) return null;
    return [...common].sort(compareSemver).at(-1)!;
  }

  /** Capability negotiation: what is granted, and exactly what is missing. */
  negotiateCapabilities(
    offered: readonly string[],
    required: readonly string[],
  ): { granted: readonly string[]; missing: readonly string[] } {
    const granted = required.filter((capability) => offered.includes(capability));
    const missing = required.filter((capability) => !offered.includes(capability));
    return { granted, missing };
  }

  registerMigration(contract: MigrationContract): void {
    parseSemver(contract.from);
    parseSemver(contract.to);
    this.migrations.push(contract);
  }

  /** Safe upgrade path: a BFS chain of migration contracts, or refusal. */
  upgradePath(component: string, from: string, to: string): readonly MigrationContract[] {
    if (from === to) return [];
    const frontier: { at: string; chain: MigrationContract[] }[] = [{ at: from, chain: [] }];
    const seen = new Set<string>([from]);
    while (frontier.length > 0) {
      const { at, chain } = frontier.shift()!;
      for (const contract of this.migrations) {
        if (contract.component !== component || contract.from !== at) continue;
        if (contract.to === to) return [...chain, contract];
        if (!seen.has(contract.to)) {
          seen.add(contract.to);
          frontier.push({ at: contract.to, chain: [...chain, contract] });
        }
      }
    }
    throw new PlatformError(
      "compat",
      `no safe upgrade path for "${component}" ${from} → ${to} — refused`,
    );
  }

  /** Backward compatible = same major, non-decreasing version. */
  isBackwardCompatible(from: string, to: string): boolean {
    const a = parseSemver(from);
    const b = parseSemver(to);
    return b.major === a.major && compareSemver(to, from) >= 0;
  }

  /** Zero compatibility regressions: compatible OR migratable, else throws. */
  assertUpgradeSafe(component: string, from: string, to: string): void {
    if (this.isBackwardCompatible(from, to)) return;
    this.upgradePath(component, from, to); // throws when no path exists
  }

  deprecate(component: string, version: string, message: string): void {
    this.deprecations.push({ component, version, message });
  }

  warningsFor(component: string, version: string): readonly string[] {
    return this.deprecations
      .filter((d) => d.component === component && d.version === version)
      .map((d) => d.message);
  }

  status(): { components: number; migrations: number; deprecations: number } {
    return {
      components: this.support.size,
      migrations: this.migrations.length,
      deprecations: this.deprecations.length,
    };
  }
}
