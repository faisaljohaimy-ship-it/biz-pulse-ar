/**
 * Phase 9.0 — Local production audit trail.
 *
 * Additive to the existing enterprise audit_logs table. This in-process
 * buffer captures fine-grained decisions (user action, ARIA decision,
 * mission, task, security, approval) that don't warrant a DB write but
 * are needed for release verification and post-incident review.
 */

import type { AuditEntry } from "./types";
import { AuditEntrySchema } from "./contracts";

const BUFFER_MAX = 5000;
const BUFFER: AuditEntry[] = [];

export function recordAudit(entry: Omit<AuditEntry, "ts"> & { ts?: string }): AuditEntry {
  const full: AuditEntry = {
    ts: entry.ts ?? new Date().toISOString(),
    category: entry.category,
    actor: entry.actor ?? null,
    org_id: entry.org_id ?? null,
    action: entry.action,
    subject_type: entry.subject_type,
    subject_id: entry.subject_id,
    metadata: entry.metadata,
    trace_id: entry.trace_id,
  };
  const parsed = AuditEntrySchema.safeParse(full);
  const rec = parsed.success ? parsed.data : full;
  BUFFER.push(rec);
  if (BUFFER.length > BUFFER_MAX) BUFFER.splice(0, BUFFER.length - BUFFER_MAX);
  return rec;
}

export const audit = {
  userAction: (action: string, extras?: Partial<AuditEntry>) =>
    recordAudit({ ...extras, category: "user_action", action }),
  ariaDecision: (action: string, extras?: Partial<AuditEntry>) =>
    recordAudit({ ...extras, category: "aria_decision", action }),
  mission: (action: string, extras?: Partial<AuditEntry>) =>
    recordAudit({ ...extras, category: "mission", action }),
  task: (action: string, extras?: Partial<AuditEntry>) =>
    recordAudit({ ...extras, category: "task", action }),
  security: (action: string, extras?: Partial<AuditEntry>) =>
    recordAudit({ ...extras, category: "security", action }),
  approval: (action: string, extras?: Partial<AuditEntry>) =>
    recordAudit({ ...extras, category: "approval", action }),
};

export function listAudits(limit = 200): AuditEntry[] {
  return BUFFER.slice(-limit);
}

export function auditCount(): number {
  return BUFFER.length;
}

export function clearAudits(): void {
  BUFFER.length = 0;
}
