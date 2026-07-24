/**
 * Shell Diagnostics — bounded, structured runtime observability.
 *
 * Records boot timings, event flow, module lifecycle, errors and warnings into
 * a ring buffer, keeps counters per level/area, and produces a self-contained
 * snapshot. It never logs raw model output or secret material — callers pass
 * structured metadata only.
 */
export type DiagLevel = "debug" | "info" | "warn" | "error";

export interface DiagEntry {
  readonly seq: number;
  readonly level: DiagLevel;
  readonly area: string;
  readonly message: string;
  readonly data?: Record<string, unknown>;
}

export interface BootStageTiming {
  readonly stage: string;
  readonly ms: number;
}

export interface DiagnosticsSnapshot {
  readonly counters: Readonly<Record<DiagLevel, number>>;
  readonly areas: Readonly<Record<string, number>>;
  readonly bootTimeline: readonly BootStageTiming[];
  readonly entries: readonly DiagEntry[];
  readonly memory: { readonly heapUsedMB: number | null };
}

export class Diagnostics {
  private readonly entries: DiagEntry[] = [];
  private readonly bootTimeline: BootStageTiming[] = [];
  private counters: Record<DiagLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 };
  private areas: Record<string, number> = {};
  private seq = 0;

  constructor(private readonly limit = 500) {}

  record(level: DiagLevel, area: string, message: string, data?: Record<string, unknown>): void {
    this.entries.push({ seq: this.seq++, level, area, message, ...(data ? { data } : {}) });
    while (this.entries.length > this.limit) this.entries.shift();
    this.counters[level]++;
    this.areas[area] = (this.areas[area] ?? 0) + 1;
  }

  recordBootStage(stage: string, ms: number): void {
    this.bootTimeline.push({ stage, ms });
  }

  count(level: DiagLevel): number {
    return this.counters[level];
  }

  snapshot(): DiagnosticsSnapshot {
    const mem =
      typeof process !== "undefined" && typeof process.memoryUsage === "function"
        ? Math.round(process.memoryUsage().heapUsed / 1048576)
        : null;
    return {
      counters: { ...this.counters },
      areas: { ...this.areas },
      bootTimeline: [...this.bootTimeline],
      entries: [...this.entries],
      memory: { heapUsedMB: mem },
    };
  }

  clear(): void {
    this.entries.length = 0;
    this.bootTimeline.length = 0;
    this.counters = { debug: 0, info: 0, warn: 0, error: 0 };
    this.areas = {};
  }
}
