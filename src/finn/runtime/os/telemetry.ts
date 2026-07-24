/**
 * Telemetry Runtime · Performance Runtime · Observability Runtime · Runtime
 * Diagnostics.
 *
 * Telemetry holds counters, gauges and typed events. Performance measures
 * boot time, latencies, module load time and throughput through an injected
 * monotonic counter (deterministic in tests). Observability composes
 * telemetry + tracing spans + the frozen Phase-2 Diagnostics into one
 * runtime-statistics view.
 */
import { OsError, type Clock, type PerfNow } from "./types";
import { Diagnostics } from "../diagnostics";

export interface TelemetryEvent {
  readonly name: string;
  readonly detail: string;
  readonly atISO: string;
}

export class TelemetryRuntime {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly events: TelemetryEvent[] = [];

  constructor(
    private readonly clock: Clock,
    private readonly eventLimit = 2000,
  ) {}

  increment(name: string, by = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + by);
  }

  gauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  event(name: string, detail: string): TelemetryEvent {
    const event: TelemetryEvent = { name, detail, atISO: this.clock() };
    this.events.push(event);
    while (this.events.length > this.eventLimit) this.events.shift();
    return event;
  }

  counter(name: string): number {
    return this.counters.get(name) ?? 0;
  }

  eventsOf(name: string): readonly TelemetryEvent[] {
    return this.events.filter((e) => e.name === name);
  }

  snapshot(): {
    counters: Readonly<Record<string, number>>;
    gauges: Readonly<Record<string, number>>;
    events: number;
  } {
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      events: this.events.length,
    };
  }
}

export class PerformanceRuntime {
  private readonly measures = new Map<string, number[]>();
  private readonly open = new Map<string, number>();

  constructor(private readonly perfNow: PerfNow) {}

  begin(name: string): void {
    this.open.set(name, this.perfNow());
  }

  end(name: string): number {
    const start = this.open.get(name);
    if (start === undefined) throw new OsError("performance", `no open measure "${name}"`);
    this.open.delete(name);
    const ms = Math.max(0, this.perfNow() - start);
    this.record(name, ms);
    return ms;
  }

  record(name: string, ms: number): void {
    const list = this.measures.get(name) ?? [];
    list.push(ms);
    this.measures.set(name, list);
  }

  stats(name: string): { count: number; totalMs: number; avgMs: number; maxMs: number } | null {
    const list = this.measures.get(name);
    if (!list || list.length === 0) return null;
    const totalMs = list.reduce((a, b) => a + b, 0);
    return {
      count: list.length,
      totalMs: Math.round(totalMs * 1000) / 1000,
      avgMs: Math.round((totalMs / list.length) * 1000) / 1000,
      maxMs: Math.max(...list),
    };
  }

  /** Operations per second for a measured batch. */
  throughput(operations: number, elapsedMs: number): number {
    if (elapsedMs <= 0) throw new OsError("performance", "elapsedMs must be > 0");
    return Math.round((operations / elapsedMs) * 1000 * 1000) / 1000;
  }
}

export interface TraceSpan {
  readonly name: string;
  readonly startedAt: number;
  readonly durationMs: number;
}

export class ObservabilityRuntime {
  private readonly spans: TraceSpan[] = [];
  readonly diagnostics: Diagnostics;

  constructor(
    private readonly telemetry: TelemetryRuntime,
    private readonly performance: PerformanceRuntime,
    private readonly perfNow: PerfNow,
    diagnosticsLimit = 500,
  ) {
    this.diagnostics = new Diagnostics(diagnosticsLimit);
  }

  /** Tracing: start a span, end it to record duration + telemetry count. */
  startSpan(name: string): { end: () => TraceSpan } {
    const startedAt = this.perfNow();
    return {
      end: () => {
        const span: TraceSpan = {
          name,
          startedAt,
          durationMs: Math.max(0, this.perfNow() - startedAt),
        };
        this.spans.push(span);
        this.telemetry.increment(`trace.${name}`);
        return span;
      },
    };
  }

  traces(name?: string): readonly TraceSpan[] {
    return name ? this.spans.filter((s) => s.name === name) : [...this.spans];
  }

  /** One view over metrics, tracing, diagnostics and events. */
  runtimeStatistics(): {
    spans: number;
    counters: Readonly<Record<string, number>>;
    gauges: Readonly<Record<string, number>>;
    events: number;
    diagnostics: number;
    measures: { boot: ReturnType<PerformanceRuntime["stats"]> };
  } {
    const snapshot = this.telemetry.snapshot();
    return {
      spans: this.spans.length,
      counters: snapshot.counters,
      gauges: snapshot.gauges,
      events: snapshot.events,
      diagnostics: this.diagnostics.snapshot().entries.length,
      measures: { boot: this.performance.stats("os.boot") },
    };
  }
}
