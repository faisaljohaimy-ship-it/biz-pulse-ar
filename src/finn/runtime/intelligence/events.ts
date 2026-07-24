/**
 * Executive Event Stream · Executive Timeline Engine.
 *
 * The event stream is ordered and append-only: filter, timeline windows,
 * bounded history, text search and deterministic replay (in sequence order,
 * from any offset). The timeline records the strategic narrative —
 * objectives, recommendations, approvals, incidents, changes, milestones —
 * ordered by time.
 */
import { IntelError, type Clock, type ImpactLevel } from "./types";

export interface ExecutiveEvent {
  readonly seq: number;
  readonly type: string;
  readonly severity: ImpactLevel;
  readonly message: string;
  readonly payload: unknown;
  readonly atISO: string;
}

export class ExecutiveEventStream {
  private readonly events: ExecutiveEvent[] = [];
  private seq = 0;

  constructor(
    private readonly clock: Clock,
    private readonly limit = 5000,
  ) {}

  append(input: {
    type: string;
    severity: ImpactLevel;
    message: string;
    payload?: unknown;
  }): ExecutiveEvent {
    const event: ExecutiveEvent = {
      seq: this.seq++,
      type: input.type,
      severity: input.severity,
      message: input.message,
      payload: input.payload ?? null,
      atISO: this.clock(),
    };
    this.events.push(event);
    while (this.events.length > this.limit) this.events.shift();
    return event;
  }

  all(): readonly ExecutiveEvent[] {
    return [...this.events];
  }

  filter(predicate: (event: ExecutiveEvent) => boolean): readonly ExecutiveEvent[] {
    return this.events.filter(predicate);
  }

  /** Events inside an ISO time window (inclusive). */
  timeline(fromISO: string, toISO: string): readonly ExecutiveEvent[] {
    return this.events.filter((e) => e.atISO >= fromISO && e.atISO <= toISO);
  }

  /** The most recent `count` events, oldest first. */
  history(count: number): readonly ExecutiveEvent[] {
    return this.events.slice(-count);
  }

  search(text: string): readonly ExecutiveEvent[] {
    const needle = text.toLowerCase();
    return this.events.filter(
      (e) => e.message.toLowerCase().includes(needle) || e.type.toLowerCase().includes(needle),
    );
  }

  /** Deterministic replay in sequence order from an offset; returns count. */
  replay(handler: (event: ExecutiveEvent) => void, options: { fromSeq?: number } = {}): number {
    const from = options.fromSeq ?? 0;
    let replayed = 0;
    for (const event of this.events) {
      if (event.seq < from) continue;
      handler(event);
      replayed++;
    }
    return replayed;
  }
}

export type TimelineKind =
  | "objective"
  | "recommendation"
  | "approval"
  | "incident"
  | "change"
  | "milestone";

export interface TimelineEntry {
  readonly kind: TimelineKind;
  readonly refId: string;
  readonly title: string;
  readonly atISO: string;
}

export class ExecutiveTimelineEngine {
  private readonly entries: TimelineEntry[] = [];

  add(entry: TimelineEntry): void {
    if (!entry.refId.trim() || !entry.title.trim()) {
      throw new IntelError("timeline", "timeline entries require refId and title");
    }
    this.entries.push(entry);
    this.entries.sort((a, b) => a.atISO.localeCompare(b.atISO));
  }

  all(): readonly TimelineEntry[] {
    return [...this.entries];
  }

  byKind(kind: TimelineKind): readonly TimelineEntry[] {
    return this.entries.filter((e) => e.kind === kind);
  }

  range(fromISO: string, toISO: string): readonly TimelineEntry[] {
    return this.entries.filter((e) => e.atISO >= fromISO && e.atISO <= toISO);
  }
}
