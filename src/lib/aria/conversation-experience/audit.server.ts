// Append-only conversation audit log.
export type ConversationAuditKind =
  | "state_transition"
  | "turn_created"
  | "turn_interrupted"
  | "stream_chunk"
  | "stream_aborted"
  | "voice_session"
  | "speech_event"
  | "fallback"
  | "error";

export interface ConversationAuditEntry {
  readonly kind: ConversationAuditKind;
  readonly ts: number;
  readonly detail?: Record<string, unknown>;
}

const MAX = 1000;

export class ConversationAudit {
  private entries: ConversationAuditEntry[] = [];

  log(kind: ConversationAuditKind, detail?: Record<string, unknown>): ConversationAuditEntry {
    const e: ConversationAuditEntry = { kind, ts: Date.now(), detail };
    this.entries.push(e);
    if (this.entries.length > MAX) this.entries.shift();
    return e;
  }

  recent(n = 100): readonly ConversationAuditEntry[] { return this.entries.slice(-n); }
  clear(): void { this.entries = []; }
}
