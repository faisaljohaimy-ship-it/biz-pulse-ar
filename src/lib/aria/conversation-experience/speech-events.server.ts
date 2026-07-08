// Append-only speech event log with typed dispatch.
import { SpeechEventSchema } from "./contracts";
import type { SpeechEvent } from "./types";

const MAX = 500;

export class SpeechEventBus {
  private events: SpeechEvent[] = [];
  private listeners = new Set<(e: SpeechEvent) => void>();

  emit(evt: Omit<SpeechEvent, "ts"> & { ts?: number }): SpeechEvent {
    const complete = SpeechEventSchema.parse({ ...evt, ts: evt.ts ?? Date.now() });
    this.events.push(complete);
    if (this.events.length > MAX) this.events.shift();
    for (const l of this.listeners) {
      try {
        l(complete);
      } catch {
        /* isolated */
      }
    }
    return complete;
  }

  subscribe(l: (e: SpeechEvent) => void): () => void {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }

  recent(n = 50): readonly SpeechEvent[] {
    return this.events.slice(-n);
  }
}
