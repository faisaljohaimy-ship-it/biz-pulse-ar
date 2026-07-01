/**
 * Phase 9.3 — Execution audit (in-memory ring buffer).
 */

import type { ToolAuditEntry } from "./types";

const entries: ToolAuditEntry[] = [];
const MAX = 5000;

export function auditExecution(entry: Omit<ToolAuditEntry, "ts">): ToolAuditEntry {
  const rec: ToolAuditEntry = { ...entry, ts: new Date().toISOString() };
  entries.push(rec);
  if (entries.length > MAX) entries.splice(0, entries.length - MAX);
  return rec;
}

export function listAudit(executionId?: string): ToolAuditEntry[] {
  return executionId ? entries.filter((e) => e.execution_id === executionId) : [...entries];
}

export function clearAudit(): void {
  entries.length = 0;
}
