// Append-only motion audit.
export type MotionAuditKind =
  | "state_transition"
  | "gesture_trigger"
  | "gesture_cancel"
  | "chunk_enqueued"
  | "chunk_flushed"
  | "emotion_cue"
  | "perf_degrade"
  | "error";

export interface MotionAuditEntry {
  readonly kind: MotionAuditKind;
  readonly ts: number;
  readonly detail?: Record<string, unknown>;
}

const MAX = 500;

export class MotionAudit {
  private entries: MotionAuditEntry[] = [];
  log(kind: MotionAuditKind, detail?: Record<string, unknown>): MotionAuditEntry {
    const e: MotionAuditEntry = { kind, ts: Date.now(), detail };
    this.entries.push(e);
    if (this.entries.length > MAX) this.entries.shift();
    return e;
  }
  recent(n = 100): readonly MotionAuditEntry[] {
    return this.entries.slice(-n);
  }
  clear(): void {
    this.entries = [];
  }
}
