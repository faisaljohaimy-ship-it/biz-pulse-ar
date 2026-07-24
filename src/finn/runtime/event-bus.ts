/**
 * Shell Event Bus — publish/subscribe/request-response with priority dispatch,
 * bounded retry, a dead-letter queue, and trace/correlation ids on every event.
 *
 * Deterministic by construction: retries are sequential (no timers), handler
 * order is priority-desc then registration order, and the id source is
 * injected so tests can pin ids.
 */
import { ShellError, type IdFactory } from "./types";
import type { Diagnostics } from "./diagnostics";

export interface ShellEvent<T = unknown> {
  readonly topic: string;
  readonly payload: T;
  readonly priority: number;
  readonly traceId: string;
  readonly correlationId: string;
  readonly broadcast: boolean;
}

export type EventHandler<T = unknown> = (event: ShellEvent<T>) => void | Promise<void>;

export interface Subscription {
  unsubscribe(): void;
}

export interface DeadLetter {
  readonly id: string;
  readonly event: ShellEvent;
  readonly error: string;
  readonly attempts: number;
}

export interface PublishResult {
  readonly delivered: number;
  readonly failed: number;
  readonly deadLettered: number;
  readonly traceId: string;
}

interface HandlerEntry {
  id: number;
  topic: string;
  priority: number;
  handler: EventHandler;
}

/** Wildcard topic — receives every event (observability taps). */
export const WILDCARD_TOPIC = "*";

export class EventBus {
  private handlers: HandlerEntry[] = [];
  private responders = new Map<string, (event: ShellEvent) => unknown | Promise<unknown>>();
  private readonly deadLetters: DeadLetter[] = [];
  private seq = 0;

  constructor(
    private readonly opts: {
      maxRetries: number;
      deadLetterLimit: number;
      idFactory: IdFactory;
      diagnostics: Diagnostics;
    },
  ) {}

  subscribe<T = unknown>(
    topic: string,
    handler: EventHandler<T>,
    options: { priority?: number } = {},
  ): Subscription {
    const entry: HandlerEntry = {
      id: this.seq++,
      topic,
      priority: options.priority ?? 0,
      handler: handler as EventHandler,
    };
    this.handlers.push(entry);
    return { unsubscribe: () => this.unsubscribe(entry) };
  }

  private unsubscribe(entry: HandlerEntry): void {
    this.handlers = this.handlers.filter((h) => h !== entry);
  }

  /** Deliver to exact-topic + wildcard subscribers, priority-desc. */
  async publish<T>(
    topic: string,
    payload: T,
    options: { priority?: number; correlationId?: string; retries?: number } = {},
  ): Promise<PublishResult> {
    return this.dispatch(topic, payload, { ...options, broadcast: false });
  }

  /** Deliver to EVERY subscriber regardless of topic (system-wide notice). */
  async broadcast<T>(payload: T, options: { priority?: number } = {}): Promise<PublishResult> {
    return this.dispatch("broadcast", payload, { ...options, broadcast: true });
  }

  private async dispatch<T>(
    topic: string,
    payload: T,
    options: { priority?: number; correlationId?: string; retries?: number; broadcast: boolean },
  ): Promise<PublishResult> {
    const traceId = this.opts.idFactory();
    const event: ShellEvent<T> = {
      topic,
      payload,
      priority: options.priority ?? 0,
      traceId,
      correlationId: options.correlationId ?? traceId,
      broadcast: options.broadcast,
    };
    const targets = this.handlers
      .filter((h) => options.broadcast || h.topic === topic || h.topic === WILDCARD_TOPIC)
      .sort((a, b) => b.priority - a.priority || a.id - b.id);

    let delivered = 0;
    let failed = 0;
    let deadLettered = 0;
    const maxAttempts = 1 + (options.retries ?? this.opts.maxRetries);

    for (const target of targets) {
      let lastError = "";
      let ok = false;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await target.handler(event as ShellEvent);
          ok = true;
          break;
        } catch (error) {
          lastError = error instanceof Error ? error.message : String(error);
        }
      }
      if (ok) delivered++;
      else {
        failed++;
        deadLettered++;
        this.pushDeadLetter(event as ShellEvent, lastError, maxAttempts);
        this.opts.diagnostics.record("error", "events", `handler failed on "${topic}"`, {
          traceId,
          error: lastError,
        });
      }
    }
    this.opts.diagnostics.record("debug", "events", `published "${topic}"`, {
      traceId,
      delivered,
      failed,
    });
    return { delivered, failed, deadLettered, traceId };
  }

  private pushDeadLetter(event: ShellEvent, error: string, attempts: number): void {
    this.deadLetters.push({ id: this.opts.idFactory(), event, error, attempts });
    while (this.deadLetters.length > this.opts.deadLetterLimit) this.deadLetters.shift();
  }

  getDeadLetters(): readonly DeadLetter[] {
    return [...this.deadLetters];
  }

  /** Recovery: re-deliver one dead letter; drop it when redelivery succeeds. */
  async redeliver(deadLetterId: string): Promise<boolean> {
    const idx = this.deadLetters.findIndex((d) => d.id === deadLetterId);
    if (idx === -1) return false;
    const dead = this.deadLetters[idx];
    const result = await this.publish(dead.event.topic, dead.event.payload, {
      priority: dead.event.priority,
      correlationId: dead.event.correlationId,
      retries: 0,
    });
    if (result.failed === 0) {
      this.deadLetters.splice(idx, 1);
      return true;
    }
    return false;
  }

  /** Register the single responder for a request topic. */
  respond<TReq, TRes>(
    topic: string,
    responder: (event: ShellEvent<TReq>) => TRes | Promise<TRes>,
  ): Subscription {
    if (this.responders.has(topic)) {
      throw new ShellError("events", `duplicate responder for "${topic}"`);
    }
    this.responders.set(topic, responder as (event: ShellEvent) => unknown);
    return { unsubscribe: () => void this.responders.delete(topic) };
  }

  /** Request/response, correlated; throws if no responder is registered. */
  async request<TReq, TRes>(
    topic: string,
    payload: TReq,
    options: { correlationId?: string } = {},
  ): Promise<{ response: TRes; correlationId: string }> {
    const responder = this.responders.get(topic);
    if (!responder) throw new ShellError("events", `no responder for "${topic}"`);
    const correlationId = options.correlationId ?? this.opts.idFactory();
    const event: ShellEvent<TReq> = {
      topic,
      payload,
      priority: 0,
      traceId: this.opts.idFactory(),
      correlationId,
      broadcast: false,
    };
    const response = (await responder(event as ShellEvent)) as TRes;
    return { response, correlationId };
  }

  clear(): void {
    this.handlers = [];
    this.responders.clear();
    this.deadLetters.length = 0;
  }
}
