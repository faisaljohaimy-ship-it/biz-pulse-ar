/**
 * Section 12 — Event model.
 *
 * A synchronous, typed event log + subscription bus for the eight
 * population events. Handlers never break the emitter (errors are
 * collected, not thrown through) and every emission is journaled so
 * later phases can audit exactly what the Shell did.
 */
import {
  POPULATION_EVENTS,
  PopulationError,
  type Clock,
  type PopulationEvent,
  type PopulationEventName,
} from "./types";

export type PopulationEventHandler = (event: PopulationEvent) => void;

export class PopulationEventBus {
  private readonly handlers = new Map<PopulationEventName, Set<PopulationEventHandler>>();
  private readonly journal: PopulationEvent[] = [];

  constructor(private readonly clock: Clock) {}

  on(event: PopulationEventName, handler: PopulationEventHandler): () => void {
    if (!POPULATION_EVENTS.includes(event)) {
      throw new PopulationError("events", `unknown event "${event}"`);
    }
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler);
    this.handlers.set(event, set);
    return () => set.delete(handler);
  }

  emit(
    event: PopulationEventName,
    subjectId: string,
    detail: Readonly<Record<string, unknown>> = {},
  ): PopulationEvent {
    if (!POPULATION_EVENTS.includes(event)) {
      throw new PopulationError("events", `unknown event "${event}"`);
    }
    const record: PopulationEvent = { event, subjectId, at: this.clock(), detail };
    this.journal.push(record);
    for (const handler of this.handlers.get(event) ?? []) {
      try {
        handler(record);
      } catch {
        /* a listener may never break the shell — the journal stays authoritative */
      }
    }
    return record;
  }

  log(): readonly PopulationEvent[] {
    return [...this.journal];
  }

  logFor(subjectId: string): readonly PopulationEvent[] {
    return this.journal.filter((e) => e.subjectId === subjectId);
  }
}
