/**
 * Executive Shell — Runtime Metrics · Crash Reporter · Performance Monitor.
 *
 * Bounded, structured, dependency-free observability. The crash reporter is
 * the sink the plugin sandbox and command layer feed; it never stores raw
 * model output or secrets — areas and messages only.
 */
import type { Diagnostics } from "../diagnostics";

export class RuntimeMetrics {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly timings = new Map<string, number[]>();

  increment(name: string, by = 1): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + by);
  }

  gauge(name: string, value: number): void {
    this.gauges.set(name, value);
  }

  timing(name: string, ms: number): void {
    const list = this.timings.get(name) ?? [];
    list.push(ms);
    while (list.length > 100) list.shift();
    this.timings.set(name, list);
  }

  counter(name: string): number {
    return this.counters.get(name) ?? 0;
  }

  snapshot(): {
    counters: Record<string, number>;
    gauges: Record<string, number>;
    timings: Record<string, { count: number; avgMs: number; maxMs: number }>;
  } {
    const timings: Record<string, { count: number; avgMs: number; maxMs: number }> = {};
    for (const [name, list] of this.timings) {
      const sum = list.reduce((a, b) => a + b, 0);
      timings[name] = {
        count: list.length,
        avgMs: list.length ? Math.round(sum / list.length) : 0,
        maxMs: list.length ? Math.max(...list) : 0,
      };
    }
    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      timings,
    };
  }
}

export interface CrashRecord {
  readonly seq: number;
  readonly area: string;
  readonly message: string;
}

export class CrashReporter {
  private readonly records: CrashRecord[] = [];
  private seq = 0;

  constructor(
    private readonly diagnostics: Diagnostics,
    private readonly metrics: RuntimeMetrics,
    private readonly limit = 100,
  ) {}

  report(area: string, message: string): CrashRecord {
    const record: CrashRecord = { seq: this.seq++, area, message: message.slice(0, 300) };
    this.records.push(record);
    while (this.records.length > this.limit) this.records.shift();
    this.metrics.increment("crashes.total");
    this.diagnostics.record("error", "crash", `crash in ${area}`, { message: record.message });
    return record;
  }

  list(area?: string): readonly CrashRecord[] {
    return area ? this.records.filter((r) => r.area.startsWith(area)) : [...this.records];
  }

  total(): number {
    return this.records.length;
  }
}

export class PerformanceMonitor {
  private readonly marks = new Map<string, number>();

  constructor(
    private readonly metrics: RuntimeMetrics,
    private readonly diagnostics: Diagnostics,
    private readonly slowThresholdMs = 200,
  ) {}

  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  /** Close a mark → timing metric; slow spans get a diagnostics warning. */
  measure(name: string): number | null {
    const start = this.marks.get(name);
    if (start === undefined) return null;
    this.marks.delete(name);
    const ms = Math.round(performance.now() - start);
    this.metrics.timing(`perf.${name}`, ms);
    if (ms > this.slowThresholdMs) {
      this.diagnostics.record("warn", "performance", `slow span "${name}"`, { ms });
    }
    return ms;
  }

  async measureFn<T>(name: string, fn: () => T | Promise<T>): Promise<T> {
    this.mark(name);
    try {
      return await fn();
    } finally {
      this.measure(name);
    }
  }
}
