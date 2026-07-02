// Deterministic FSM for ARIA conversation lifecycle.
import type { ConversationState } from "./types";

const TRANSITIONS: Record<ConversationState, readonly ConversationState[]> = {
  idle: ["greeting", "listening", "thinking"],
  greeting: ["listening", "idle"],
  listening: ["thinking", "interrupted", "idle"],
  thinking: ["speaking", "interrupted", "idle"],
  speaking: ["interrupted", "idle", "listening"],
  interrupted: ["resuming", "listening", "idle"],
  resuming: ["speaking", "idle"],
};

export class ConversationStateMachine {
  private state: ConversationState = "idle";
  private history: { from: ConversationState; to: ConversationState; ts: number }[] = [];
  private listeners = new Set<(s: ConversationState) => void>();

  get current(): ConversationState { return this.state; }

  canTransition(to: ConversationState): boolean {
    return TRANSITIONS[this.state].includes(to);
  }

  transition(to: ConversationState, ts: number = Date.now()): boolean {
    if (!this.canTransition(to)) return false;
    const from = this.state;
    this.state = to;
    this.history.push({ from, to, ts });
    if (this.history.length > 200) this.history.shift();
    for (const l of this.listeners) { try { l(to); } catch { /* isolated */ } }
    return true;
  }

  subscribe(l: (s: ConversationState) => void): () => void {
    this.listeners.add(l);
    return () => { this.listeners.delete(l); };
  }

  getHistory(): readonly { from: ConversationState; to: ConversationState; ts: number }[] {
    return this.history;
  }

  reset(): void { this.state = "idle"; this.history = []; }
}
