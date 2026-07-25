/**
 * Section 06 — Health model.
 *
 * Per-record health with severity ordering and worst-of aggregation.
 * "unknown" is honest absence, never assumed healthy.
 */
import { PopulationError, HEALTH_STATUSES, type Clock, type HealthStatus } from "./types";

const SEVERITY: Record<HealthStatus, number> = {
  healthy: 0,
  unknown: 1,
  warning: 2,
  critical: 3,
  offline: 4,
};

export interface HealthSample {
  readonly status: HealthStatus;
  readonly reportedAt: string;
  readonly note?: string;
}

export class HealthModel {
  private readonly samples = new Map<string, HealthSample>();

  constructor(private readonly clock: Clock) {}

  report(subjectId: string, status: HealthStatus, note?: string): HealthSample {
    if (!HEALTH_STATUSES.includes(status)) {
      throw new PopulationError("health", `unknown health status "${status}"`);
    }
    const sample: HealthSample = { status, reportedAt: this.clock(), note };
    this.samples.set(subjectId, sample);
    return sample;
  }

  statusOf(subjectId: string): HealthStatus {
    return this.samples.get(subjectId)?.status ?? "unknown";
  }

  sampleOf(subjectId: string): HealthSample | undefined {
    return this.samples.get(subjectId);
  }

  /** Worst-of aggregation across a set of subjects (empty set = unknown). */
  aggregate(subjectIds: readonly string[]): HealthStatus {
    if (subjectIds.length === 0) return "unknown";
    return subjectIds
      .map((id) => this.statusOf(id))
      .reduce((worst, s) => (SEVERITY[s] > SEVERITY[worst] ? s : worst), "healthy");
  }

  compare(a: HealthStatus, b: HealthStatus): number {
    return SEVERITY[a] - SEVERITY[b];
  }
}
