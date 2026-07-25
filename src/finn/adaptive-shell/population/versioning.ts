/**
 * Section 10 — Versioning: semver algebra, compatibility matrix,
 * upgrade rules, rollback rules.
 *
 * Rules of the house:
 *  - compatibility = same major AND offered ≥ required (minor/patch drift ok)
 *  - patch / minor upgrades are self-service; MAJOR upgrades demand approval
 *  - rollback only to a version this timeline has actually held, newest first
 */
import { PopulationError, type Clock } from "./types";

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export interface ParsedVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

export type VersionDiff = "none" | "patch" | "minor" | "major";

export function parseVersion(version: string): ParsedVersion {
  const match = SEMVER.exec(version);
  if (!match) throw new PopulationError("versioning", `"${version}" is not strict semver`);
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  return pa.major - pb.major || pa.minor - pb.minor || pa.patch - pb.patch;
}

export function versionDiff(from: string, to: string): VersionDiff {
  const pf = parseVersion(from);
  const pt = parseVersion(to);
  if (pf.major !== pt.major) return "major";
  if (pf.minor !== pt.minor) return "minor";
  if (pf.patch !== pt.patch) return "patch";
  return "none";
}

/** Same-major, no-downgrade compatibility. */
export function isCompatible(required: string, offered: string): boolean {
  return (
    parseVersion(required).major === parseVersion(offered).major &&
    compareVersions(offered, required) >= 0
  );
}

export interface VersionEntry {
  readonly version: string;
  readonly recordedAt: string;
  readonly change: VersionDiff | "initial" | "rollback";
}

export interface UpgradeDecision {
  readonly allowed: boolean;
  readonly diff: VersionDiff;
  readonly requiresApproval: boolean;
  readonly reason: string;
}

/** Per-subject version history enforcing upgrade & rollback rules. */
export class VersionTimeline {
  private readonly history = new Map<string, VersionEntry[]>();

  constructor(private readonly clock: Clock) {}

  record(subjectId: string, version: string): void {
    parseVersion(version);
    if (this.history.has(subjectId)) {
      throw new PopulationError("versioning", `"${subjectId}" already has a version timeline`);
    }
    this.history.set(subjectId, [{ version, recordedAt: this.clock(), change: "initial" }]);
  }

  currentOf(subjectId: string): string | undefined {
    const entries = this.history.get(subjectId);
    return entries?.[entries.length - 1]?.version;
  }

  historyOf(subjectId: string): readonly VersionEntry[] {
    return this.history.get(subjectId) ?? [];
  }

  evaluateUpgrade(subjectId: string, to: string, approved: boolean): UpgradeDecision {
    const current = this.currentOf(subjectId);
    if (current === undefined) {
      return { allowed: false, diff: "none", requiresApproval: false, reason: "unknown subject" };
    }
    if (compareVersions(to, current) <= 0) {
      return {
        allowed: false,
        diff: versionDiff(current, to),
        requiresApproval: false,
        reason: `"${to}" is not ahead of current "${current}" — use rollback for downgrades`,
      };
    }
    const diff = versionDiff(current, to);
    if (diff === "major" && !approved) {
      return {
        allowed: false,
        diff,
        requiresApproval: true,
        reason: "major upgrades require explicit approval",
      };
    }
    return {
      allowed: true,
      diff,
      requiresApproval: diff === "major",
      reason: "within upgrade rules",
    };
  }

  upgrade(subjectId: string, to: string, approved = false): VersionEntry {
    const decision = this.evaluateUpgrade(subjectId, to, approved);
    if (!decision.allowed) {
      throw new PopulationError(
        "versioning",
        `upgrade refused for "${subjectId}": ${decision.reason}`,
      );
    }
    const entry: VersionEntry = { version: to, recordedAt: this.clock(), change: decision.diff };
    this.history.get(subjectId)!.push(entry);
    return entry;
  }

  /** Rollback only to a version previously held on this timeline. */
  rollback(subjectId: string, to: string): VersionEntry {
    const entries = this.history.get(subjectId);
    if (!entries) throw new PopulationError("versioning", `unknown subject "${subjectId}"`);
    const current = entries[entries.length - 1].version;
    if (to === current) {
      throw new PopulationError("versioning", `"${subjectId}" is already at ${to}`);
    }
    if (!entries.some((e) => e.version === to)) {
      throw new PopulationError(
        "versioning",
        `rollback refused for "${subjectId}": ${to} was never held (held: ${entries
          .map((e) => e.version)
          .join(", ")})`,
      );
    }
    const entry: VersionEntry = { version: to, recordedAt: this.clock(), change: "rollback" };
    entries.push(entry);
    return entry;
  }
}

/** Compatibility matrix: subject@version → declared-compatible peer ranges. */
export class CompatibilityMatrix {
  private readonly declarations = new Map<string, Map<string, string>>();

  private key(subjectId: string, version: string): string {
    return `${subjectId}@${version}`;
  }

  declare(subjectId: string, version: string, peerId: string, minimumPeerVersion: string): void {
    parseVersion(version);
    parseVersion(minimumPeerVersion);
    const key = this.key(subjectId, version);
    const peers = this.declarations.get(key) ?? new Map<string, string>();
    if (peers.has(peerId)) {
      throw new PopulationError(
        "versioning",
        `${key} already declares compatibility with "${peerId}"`,
      );
    }
    peers.set(peerId, minimumPeerVersion);
    this.declarations.set(key, peers);
  }

  check(subjectId: string, version: string, peerId: string, peerVersion: string): boolean {
    const minimum = this.declarations.get(this.key(subjectId, version))?.get(peerId);
    /* Undeclared pairs are incompatible — the matrix is fail-closed. */
    if (minimum === undefined) return false;
    return isCompatible(minimum, peerVersion);
  }

  declaredPeers(
    subjectId: string,
    version: string,
  ): readonly { peerId: string; minimum: string }[] {
    const peers = this.declarations.get(this.key(subjectId, version));
    return peers ? [...peers.entries()].map(([peerId, minimum]) => ({ peerId, minimum })) : [];
  }
}
