// Append-only audit log for identity-consumer decisions.
export type IdentityAuditKind =
  | "identity_read"
  | "consistency_check"
  | "profile_resolved"
  | "violation_detected";

export interface IdentityAuditEntry {
  readonly kind: IdentityAuditKind;
  readonly ts: number;
  readonly detail?: Record<string, unknown>;
}

const MAX = 500;

export class IdentityAudit {
  private entries: IdentityAuditEntry[] = [];

  log(kind: IdentityAuditKind, detail?: Record<string, unknown>): IdentityAuditEntry {
    const e: IdentityAuditEntry = { kind, ts: Date.now(), detail };
    this.entries.push(e);
    if (this.entries.length > MAX) this.entries.shift();
    return e;
  }

  recent(n = 100): readonly IdentityAuditEntry[] { return this.entries.slice(-n); }
  clear(): void { this.entries = []; }
}
