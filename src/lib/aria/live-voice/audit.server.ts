// Append-only live voice audit log.
export type LiveVoiceAuditKind =
  | "session_open"
  | "session_close"
  | "state_change"
  | "stt_request"
  | "stt_result"
  | "tts_request"
  | "tts_chunk"
  | "interrupted"
  | "fallback"
  | "error";

export interface LiveVoiceAuditEntry {
  readonly kind: LiveVoiceAuditKind;
  readonly ts: number;
  readonly detail?: Record<string, unknown>;
}

const MAX = 500;

export class LiveVoiceAudit {
  private entries: LiveVoiceAuditEntry[] = [];
  log(kind: LiveVoiceAuditKind, detail?: Record<string, unknown>): LiveVoiceAuditEntry {
    const e: LiveVoiceAuditEntry = { kind, ts: Date.now(), detail };
    this.entries.push(e);
    if (this.entries.length > MAX) this.entries.shift();
    return e;
  }
  recent(n = 100): readonly LiveVoiceAuditEntry[] {
    return this.entries.slice(-n);
  }
  clear(): void {
    this.entries = [];
  }
}
