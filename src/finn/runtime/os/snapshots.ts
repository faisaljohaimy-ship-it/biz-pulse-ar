/**
 * Snapshot Runtime · Backup Runtime · Recovery Runtime.
 *
 * Snapshots are deep-frozen, kind-tagged, immutable pictures of the system
 * (configuration, capabilities, modules, runtime, executive layer, platform
 * layer). Backups carry an integrity checksum — a tampered backup is refused
 * at restore. Recovery is layered: safe module recovery, rollback to a
 * backup, configuration recovery to an exact revision, and emergency
 * recovery that disables everything non-essential.
 */
import { OsError, type Clock } from "./types";
import type { IdFactory } from "../types";
import type { OsModuleRegistry } from "./registries";
import type { ConfigurationRuntime } from "./state";

export type OsSnapshotKind =
  | "configuration"
  | "capabilities"
  | "modules"
  | "runtime"
  | "executive-layer"
  | "platform-layer";

export interface OsSnapshot {
  readonly snapshotId: string;
  readonly kind: OsSnapshotKind;
  readonly atISO: string;
  readonly data: unknown;
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const key of Object.getOwnPropertyNames(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
  }
  return value;
}

export class OsSnapshotRuntime {
  private readonly snapshots = new Map<string, OsSnapshot>();

  constructor(
    private readonly idFactory: IdFactory,
    private readonly clock: Clock,
  ) {}

  capture(kind: OsSnapshotKind, data: unknown): OsSnapshot {
    const snapshot: OsSnapshot = deepFreeze({
      snapshotId: this.idFactory(),
      kind,
      atISO: this.clock(),
      data,
    });
    this.snapshots.set(snapshot.snapshotId, snapshot);
    return snapshot;
  }

  get(snapshotId: string): OsSnapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  list(kind?: OsSnapshotKind): readonly OsSnapshot[] {
    const all = [...this.snapshots.values()];
    return kind ? all.filter((s) => s.kind === kind) : all;
  }

  latest(kind: OsSnapshotKind): OsSnapshot | null {
    const of = this.list(kind);
    return of[of.length - 1] ?? null;
  }
}

/** djb2 over the canonical JSON — lightweight integrity checksum. */
function checksum(payload: string): string {
  let h = 5381;
  for (let i = 0; i < payload.length; i++) h = ((h << 5) + h + payload.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0");
}

export interface OsBackup {
  readonly backupId: string;
  readonly label: string;
  readonly atISO: string;
  readonly state: Readonly<Record<string, unknown>>;
  readonly checksum: string;
}

export class BackupRuntime {
  private readonly backups = new Map<string, OsBackup>();

  constructor(
    private readonly idFactory: IdFactory,
    private readonly clock: Clock,
  ) {}

  backup(label: string, state: Record<string, unknown>): OsBackup {
    const frozen = Object.freeze({ ...state });
    const backup: OsBackup = Object.freeze({
      backupId: this.idFactory(),
      label,
      atISO: this.clock(),
      state: frozen,
      checksum: checksum(JSON.stringify(frozen)),
    });
    this.backups.set(backup.backupId, backup);
    return backup;
  }

  /** Integrity-checked restore — a tampered backup is refused. */
  restore(backupId: string): Readonly<Record<string, unknown>> {
    const backup = this.backups.get(backupId);
    if (!backup) throw new OsError("backup", `unknown backup "${backupId}"`);
    if (checksum(JSON.stringify(backup.state)) !== backup.checksum) {
      throw new OsError("backup", `backup "${backupId}" failed integrity check — refused`);
    }
    return { ...backup.state };
  }

  list(): readonly { backupId: string; label: string; atISO: string }[] {
    return [...this.backups.values()].map(({ backupId, label, atISO }) => ({
      backupId,
      label,
      atISO,
    }));
  }
}

export interface RecoveryReport {
  readonly action: string;
  readonly ok: boolean;
  readonly detail: string;
}

export class RecoveryRuntime {
  constructor(
    private readonly deps: {
      registry: OsModuleRegistry;
      backups: BackupRuntime;
      config: ConfigurationRuntime;
      /** Restart hook — provided by the OS runtime, the only approved path. */
      restartModule: (id: string) => void;
      disableModule: (id: string) => void;
    },
  ) {}

  /** Safe recovery: restart one failed/loaded module through the loader. */
  safeRecover(moduleId: string): RecoveryReport {
    const record = this.deps.registry.get(moduleId);
    if (!record)
      return { action: "safe-recover", ok: false, detail: `unknown module "${moduleId}"` };
    if (record.state === "failed") record.state = "loaded"; // re-admit, then restart
    try {
      this.deps.restartModule(moduleId);
      return { action: "safe-recover", ok: true, detail: `module "${moduleId}" restarted` };
    } catch (error) {
      return {
        action: "safe-recover",
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /** Rollback: integrity-checked state restore from a named backup. */
  rollback(backupId: string): {
    report: RecoveryReport;
    state: Readonly<Record<string, unknown>> | null;
  } {
    try {
      const state = this.deps.backups.restore(backupId);
      return {
        report: { action: "rollback", ok: true, detail: `backup "${backupId}" restored` },
        state,
      };
    } catch (error) {
      return {
        report: {
          action: "rollback",
          ok: false,
          detail: error instanceof Error ? error.message : String(error),
        },
        state: null,
      };
    }
  }

  /** Configuration recovery: restore an exact configuration revision. */
  recoverConfiguration(revision: number): RecoveryReport {
    try {
      const next = this.deps.config.restore(revision);
      return {
        action: "config-recovery",
        ok: true,
        detail: `restored revision ${revision} → ${next}`,
      };
    } catch (error) {
      return {
        action: "config-recovery",
        ok: false,
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /** Emergency: disable every module outside the essential core set. */
  emergencyRecover(coreModuleIds: readonly string[]): RecoveryReport {
    const core = new Set(coreModuleIds);
    const disabled: string[] = [];
    // Disable leaves-first so dependency guards never block the sweep.
    const records = [...this.deps.registry.list()].reverse();
    for (const record of records) {
      if (core.has(record.module.id)) continue;
      try {
        this.deps.disableModule(record.module.id);
        disabled.push(record.module.id);
      } catch {
        record.state = "disabled"; // emergency overrides the polite path
        disabled.push(record.module.id);
      }
    }
    return {
      action: "emergency-recover",
      ok: true,
      detail: `disabled: ${disabled.join(", ") || "nothing"}`,
    };
  }
}
