/**
 * Section 08 — Observability: tracing, metrics, structured logs.
 *
 * Latency and execution time come from an injected monotonic tick source —
 * the runtime never reads wall time. Everything is queryable in-memory
 * infrastructure; exporters belong to later phases.
 */
import { AgentRuntimeError, type Clock, type Monotonic } from "./types";

/* ── Tracing ────────────────────────────────────────────────────────────── */
export interface TraceSpan {
  readonly traceId: string;
  readonly name: string;
  readonly subjectId: string;
  readonly parentTraceId?: string;
  readonly startedAtTick: number;
  endedAtTick?: number;
  status: "open" | "ok" | "error";
  readonly attributes: Record<string, unknown>;
}

export class TraceCollector {
  private readonly spans = new Map<string, TraceSpan>();

  constructor(private readonly monotonic: Monotonic) {}

  start(
    traceId: string,
    name: string,
    subjectId: string,
    parentTraceId?: string,
    attributes: Record<string, unknown> = {},
  ): TraceSpan {
    if (this.spans.has(traceId)) {
      throw new AgentRuntimeError("tracing", `span "${traceId}" already started`);
    }
    const span: TraceSpan = {
      traceId,
      name,
      subjectId,
      parentTraceId,
      startedAtTick: this.monotonic(),
      status: "open",
      attributes,
    };
    this.spans.set(traceId, span);
    return span;
  }

  end(traceId: string, status: "ok" | "error"): TraceSpan {
    const span = this.spans.get(traceId);
    if (!span) throw new AgentRuntimeError("tracing", `unknown span "${traceId}"`);
    if (span.status !== "open") {
      throw new AgentRuntimeError("tracing", `span "${traceId}" already ended`);
    }
    span.endedAtTick = this.monotonic();
    span.status = status;
    return span;
  }

  durationOf(traceId: string): number | undefined {
    const span = this.spans.get(traceId);
    if (!span || span.endedAtTick === undefined) return undefined;
    return span.endedAtTick - span.startedAtTick;
  }

  get(traceId: string): TraceSpan | undefined {
    return this.spans.get(traceId);
  }

  /** All spans sharing a root trace lineage (parent chains). */
  childrenOf(traceId: string): readonly TraceSpan[] {
    return [...this.spans.values()].filter((s) => s.parentTraceId === traceId);
  }

  list(): readonly TraceSpan[] {
    return [...this.spans.values()];
  }
}

/* ── Metrics ────────────────────────────────────────────────────────────── */
export interface AgentMetricsSnapshot {
  readonly started: number;
  readonly finished: number;
  readonly failed: number;
  readonly latencies: readonly number[];
  readonly meanLatency: number;
  readonly maxLatency: number;
}

export class MetricsRegistry {
  private readonly counters = new Map<
    string,
    { started: number; finished: number; failed: number }
  >();
  private readonly latencies = new Map<string, number[]>();

  private bucket(agentId: string) {
    const existing = this.counters.get(agentId);
    if (existing) return existing;
    const created = { started: 0, finished: 0, failed: 0 };
    this.counters.set(agentId, created);
    return created;
  }

  recordStart(agentId: string): void {
    this.bucket(agentId).started += 1;
  }

  recordFinish(agentId: string, latency: number): void {
    this.bucket(agentId).finished += 1;
    const list = this.latencies.get(agentId) ?? [];
    list.push(latency);
    this.latencies.set(agentId, list);
  }

  recordFailure(agentId: string, latency: number): void {
    this.bucket(agentId).failed += 1;
    const list = this.latencies.get(agentId) ?? [];
    list.push(latency);
    this.latencies.set(agentId, list);
  }

  snapshotOf(agentId: string): AgentMetricsSnapshot {
    const counters = this.counters.get(agentId) ?? { started: 0, finished: 0, failed: 0 };
    const latencies = this.latencies.get(agentId) ?? [];
    const meanLatency =
      latencies.length === 0 ? 0 : latencies.reduce((a, b) => a + b, 0) / latencies.length;
    return {
      ...counters,
      latencies: [...latencies],
      meanLatency,
      maxLatency: latencies.length === 0 ? 0 : Math.max(...latencies),
    };
  }
}

/* ── Structured logs ────────────────────────────────────────────────────── */
export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  readonly level: LogLevel;
  readonly message: string;
  readonly subjectId: string;
  readonly at: string;
  readonly traceId?: string;
  readonly fields: Readonly<Record<string, unknown>>;
}

export class LogJournal {
  private readonly entries: LogEntry[] = [];

  constructor(private readonly clock: Clock) {}

  log(
    level: LogLevel,
    subjectId: string,
    message: string,
    fields: Record<string, unknown> = {},
    traceId?: string,
  ): LogEntry {
    const entry: LogEntry = { level, message, subjectId, at: this.clock(), traceId, fields };
    this.entries.push(entry);
    return entry;
  }

  list(filter?: { level?: LogLevel; subjectId?: string }): readonly LogEntry[] {
    return this.entries.filter(
      (e) =>
        (filter?.level === undefined || e.level === filter.level) &&
        (filter?.subjectId === undefined || e.subjectId === filter.subjectId),
    );
  }
}
