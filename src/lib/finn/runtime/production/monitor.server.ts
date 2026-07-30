/**
 * Phase 10.1 — Monitor: composes health + metrics + telemetry snapshot.
 */
import type { HealthReport, MetricSample } from "./types";
import type { HealthChecker } from "./health.server";
import type { RuntimeStateStore } from "./state.server";
import type { TelemetryBus, TelemetryEvent } from "./telemetry.server";
import { sampleMetrics } from "./metrics.server";

export interface MonitorReport {
  readonly health: HealthReport;
  readonly metrics: ReadonlyArray<MetricSample>;
  readonly recent_events: ReadonlyArray<TelemetryEvent>;
  readonly generated_at: string;
}

export class RuntimeMonitor {
  constructor(
    private readonly health: HealthChecker,
    private readonly store: RuntimeStateStore,
    private readonly telemetry: TelemetryBus,
  ) {}

  report(): MonitorReport {
    const health = this.health.check();
    const metrics = sampleMetrics(this.store.snapshot());
    for (const m of metrics) this.telemetry.recordMetric(m);
    return {
      health,
      metrics,
      recent_events: this.telemetry.recentEvents(32),
      generated_at: new Date().toISOString(),
    };
  }
}
