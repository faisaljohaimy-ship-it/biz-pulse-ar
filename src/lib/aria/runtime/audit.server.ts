/**
 * Phase 9.2 — Runtime audit trail (in-memory ring buffer).
 * Distinct from Production audit; scoped to runtime actions.
 */

import type { RuntimeAuditEntry } from "./types";

const entries: RuntimeAuditEntry[] = [];
const MAX = 5000;

export function auditRuntime(entry: Omit<RuntimeAuditEntry, "ts">): RuntimeAuditEntry {
  const rec: RuntimeAuditEntry = { ...entry, ts: new Date().toISOString() };
  entries.push(rec);
  if (entries.length > MAX) entries.splice(0, entries.length - MAX);
  return rec;
}

export function listRuntimeAudit(subjectId?: string): RuntimeAuditEntry[] {
  return subjectId ? entries.filter((e) => e.subject_id === subjectId) : [...entries];
}

export function clearRuntimeAudit(): void {
  entries.length = 0;
}
