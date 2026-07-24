/**
 * Executive Snapshot Engine — immutable point-in-time executive pictures.
 *
 * A snapshot captures current KPIs, system health, strategic risks, active
 * decisions, open recommendations, critical events and executive alerts.
 * Snapshots are DEEP-FROZEN at capture: any later mutation attempt throws.
 */
import type { Clock, ImpactLevel } from "./types";
import type { IdFactory } from "../types";
import type { RiskRecord } from "./context";
import type { ExecutiveEvent } from "./events";

export interface ExecutiveAlert {
  readonly id: string;
  readonly severity: ImpactLevel;
  readonly message: string;
}

export interface SnapshotInput {
  readonly kpis: Readonly<Record<string, number>>;
  readonly systemHealth: "healthy" | "degraded" | "unhealthy";
  readonly strategicRisks: readonly RiskRecord[];
  readonly activeDecisions: readonly string[];
  readonly openRecommendations: readonly string[];
  readonly criticalEvents: readonly ExecutiveEvent[];
  readonly alerts: readonly ExecutiveAlert[];
}

export interface ExecutiveSnapshot extends SnapshotInput {
  readonly snapshotId: string;
  readonly atISO: string;
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

export class ExecutiveSnapshotEngine {
  private readonly snapshots = new Map<string, ExecutiveSnapshot>();

  constructor(
    private readonly idFactory: IdFactory,
    private readonly clock: Clock,
  ) {}

  /** Capture an immutable snapshot — deep-frozen, tamper attempts throw. */
  capture(input: SnapshotInput): ExecutiveSnapshot {
    const snapshot: ExecutiveSnapshot = deepFreeze({
      snapshotId: this.idFactory(),
      atISO: this.clock(),
      kpis: { ...input.kpis },
      systemHealth: input.systemHealth,
      strategicRisks: [...input.strategicRisks],
      activeDecisions: [...input.activeDecisions],
      openRecommendations: [...input.openRecommendations],
      criticalEvents: [...input.criticalEvents],
      alerts: [...input.alerts],
    });
    this.snapshots.set(snapshot.snapshotId, snapshot);
    return snapshot;
  }

  get(snapshotId: string): ExecutiveSnapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  list(): readonly ExecutiveSnapshot[] {
    return [...this.snapshots.values()];
  }

  latest(): ExecutiveSnapshot | null {
    const all = this.list();
    return all[all.length - 1] ?? null;
  }
}
