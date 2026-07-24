/**
 * Version Registry — one authoritative version per (kind, id).
 *
 * Registering the same object with a DIFFERENT version is a version conflict
 * and refused; re-registering the same version is a duplicate and refused.
 * Versions are strict semver (already schema-validated; re-checked here so
 * the registry is safe standalone).
 */
import { AdaptiveShellError, type ManifestKind } from "../types";

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export class VersionRegistry {
  private readonly versions = new Map<string, string>();

  private key(kind: ManifestKind, id: string): string {
    return `${kind}:${id}`;
  }

  register(kind: ManifestKind, id: string, version: string): void {
    if (!SEMVER.test(version)) {
      throw new AdaptiveShellError("versions", `"${version}" is not strict semver`);
    }
    const key = this.key(kind, id);
    const existing = this.versions.get(key);
    if (existing !== undefined) {
      throw new AdaptiveShellError(
        "versions",
        existing === version
          ? `duplicate registration for ${key}@${version}`
          : `version conflict for ${key}: registered ${existing}, offered ${version}`,
      );
    }
    this.versions.set(key, version);
  }

  versionOf(kind: ManifestKind, id: string): string | undefined {
    return this.versions.get(this.key(kind, id));
  }

  list(): readonly { kind: ManifestKind; id: string; version: string }[] {
    return [...this.versions.entries()].map(([key, version]) => {
      const [kind, id] = key.split(/:(.+)/) as [ManifestKind, string];
      return { kind, id, version };
    });
  }

  count(): number {
    return this.versions.size;
  }
}
