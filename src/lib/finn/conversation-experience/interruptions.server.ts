// Interruption controller — coordinates barge-in requests deterministically.
import type { ConversationStateMachine } from "./conversation-state.server";

export interface InterruptionRecord {
  readonly turnId: string | null;
  readonly ts: number;
  readonly reason: "user_voice" | "user_text" | "manual" | "timeout";
  readonly resumed: boolean;
}

export class InterruptionController {
  private records: InterruptionRecord[] = [];
  private aborters = new Map<string, AbortController>();
  private listeners = new Set<(rec: InterruptionRecord) => void>();

  registerAborter(turnId: string, ctrl: AbortController): void {
    this.aborters.set(turnId, ctrl);
  }

  unregister(turnId: string): void {
    this.aborters.delete(turnId);
  }

  interrupt(
    fsm: ConversationStateMachine,
    turnId: string | null,
    reason: InterruptionRecord["reason"],
  ): boolean {
    const cur = fsm.current;
    if (cur !== "speaking" && cur !== "thinking") return false;
    if (turnId) {
      const a = this.aborters.get(turnId);
      if (a && !a.signal.aborted) {
        try {
          a.abort();
        } catch {
          /* isolated */
        }
      }
      this.aborters.delete(turnId);
    }
    fsm.transition("interrupted");
    const rec: InterruptionRecord = { turnId, ts: Date.now(), reason, resumed: false };
    this.records.push(rec);
    if (this.records.length > 100) this.records.shift();
    for (const l of this.listeners) {
      try {
        l(rec);
      } catch {
        /* isolated */
      }
    }
    return true;
  }

  markResumed(turnId: string | null): void {
    const idx = this.records.findIndex((r) => r.turnId === turnId && !r.resumed);
    if (idx >= 0) this.records[idx] = { ...this.records[idx], resumed: true };
  }

  subscribe(l: (rec: InterruptionRecord) => void): () => void {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }

  recent(n = 10): readonly InterruptionRecord[] {
    return this.records.slice(-n);
  }
}
