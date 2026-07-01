/**
 * Phase 10.1 — Telemetry emitter (in-memory ring buffer).
 * Evidence-only; nothing fabricated.
 */
import type { EvidenceRef, MetricSample } from "./types";

export interface TelemetryEvent {
  readonly at: string;
  readonly channel: "runtime" | "worker" | "queue" | "session" | "health";
  readonly name: string;
  readonly detail: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export class TelemetryBus {
  private readonly events: TelemetryEvent[] = [];
  private readonly metrics: MetricSample[] = [];

  emit(
    channel: TelemetryEvent["channel"],
    name: string,
    detail: string,
    evidence: ReadonlyArray<EvidenceRef> = [],
  ): TelemetryEvent {
    const evt: TelemetryEvent = {
      at: new Date().toISOString(),
      channel,
      name,
      detail,
      evidence,
    };
    this.events.push(evt);
    if (this.events.length > 2048) this.events.shift();
    return evt;
  }

  recordMetric(m: MetricSample): void {
    this.metrics.push(m);
    if (this.metrics.length > 4096) this.metrics.shift();
  }

  recentEvents(limit = 128): ReadonlyArray<TelemetryEvent> {
    return this.events.slice(-limit);
  }

  recentMetrics(limit = 256): ReadonlyArray<MetricSample> {
    return this.metrics.slice(-limit);
  }
}
