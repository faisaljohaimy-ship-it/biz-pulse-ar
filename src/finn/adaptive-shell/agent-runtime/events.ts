/**
 * Section 06 — Agent event bus.
 *
 * The eight runtime events, journaled and handler-isolated (a throwing
 * listener never breaks the runtime; the journal is the audit authority).
 * Same construction law as the population bus — separate closed vocabulary.
 */
import {
  AGENT_EVENTS,
  AgentRuntimeError,
  type AgentEvent,
  type AgentEventName,
  type Clock,
} from "./types";

export type AgentEventHandler = (event: AgentEvent) => void;

export class AgentEventBus {
  private readonly handlers = new Map<AgentEventName, Set<AgentEventHandler>>();
  private readonly journal: AgentEvent[] = [];

  constructor(private readonly clock: Clock) {}

  on(event: AgentEventName, handler: AgentEventHandler): () => void {
    if (!AGENT_EVENTS.includes(event)) {
      throw new AgentRuntimeError("events", `unknown event "${event}"`);
    }
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler);
    this.handlers.set(event, set);
    return () => set.delete(handler);
  }

  emit(
    event: AgentEventName,
    subjectId: string,
    detail: Readonly<Record<string, unknown>> = {},
  ): AgentEvent {
    if (!AGENT_EVENTS.includes(event)) {
      throw new AgentRuntimeError("events", `unknown event "${event}"`);
    }
    const record: AgentEvent = { event, subjectId, at: this.clock(), detail };
    this.journal.push(record);
    for (const handler of this.handlers.get(event) ?? []) {
      try {
        handler(record);
      } catch {
        /* listener isolation — the journal stays authoritative */
      }
    }
    return record;
  }

  log(): readonly AgentEvent[] {
    return [...this.journal];
  }

  logFor(subjectId: string): readonly AgentEvent[] {
    return this.journal.filter((e) => e.subjectId === subjectId);
  }
}
