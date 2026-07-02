// Hero Audit — append-only in-memory log of every hero state transition.
// Kept tiny (ring buffer) to stay memory-safe.

export type HeroAuditKind =
  | "presence"
  | "emotion"
  | "expression"
  | "gesture"
  | "gaze"
  | "welcome"
  | "greeting"
  | "camera"
  | "lighting"
  | "scheduler"
  | "reduced-motion";

export interface HeroAuditEntry {
  readonly id: number;
  readonly at: number;
  readonly kind: HeroAuditKind;
  readonly from: string;
  readonly to: string;
  readonly detail?: string;
}

export class HeroAudit {
  private readonly cap: number;
  private buf: HeroAuditEntry[] = [];
  private seq = 0;
  constructor(cap = 512) {
    this.cap = Math.max(32, cap);
  }
  append(entry: Omit<HeroAuditEntry, "id">): HeroAuditEntry {
    this.seq += 1;
    const rec: HeroAuditEntry = { id: this.seq, ...entry };
    this.buf.push(rec);
    if (this.buf.length > this.cap) this.buf.splice(0, this.buf.length - this.cap);
    return rec;
  }
  list(): ReadonlyArray<HeroAuditEntry> {
    return this.buf.slice();
  }
  clear(): void {
    this.buf = [];
  }
}
