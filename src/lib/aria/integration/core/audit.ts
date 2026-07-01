/**
 * Phase 9.1 — Connector-scoped audit logger.
 * In-process buffer; additive to Phase 9.0 production audit.
 */

import type { ConnectorAuditEntry } from "./types";

const BUFFER_MAX = 4000;
const BUFFER: ConnectorAuditEntry[] = [];

export function auditConnector(entry: Omit<ConnectorAuditEntry, "ts"> & { ts?: string }): ConnectorAuditEntry {
  const rec: ConnectorAuditEntry = {
    ts: entry.ts ?? new Date().toISOString(),
    connector_id: entry.connector_id,
    action: entry.action,
    actor: entry.actor ?? null,
    org_id: entry.org_id ?? null,
    outcome: entry.outcome,
    detail: entry.detail,
    trace_id: entry.trace_id,
  };
  BUFFER.push(rec);
  if (BUFFER.length > BUFFER_MAX) BUFFER.splice(0, BUFFER.length - BUFFER_MAX);
  return rec;
}

export function listConnectorAudits(limit = 200): ConnectorAuditEntry[] {
  return BUFFER.slice(-limit);
}

export function connectorAuditCount(): number {
  return BUFFER.length;
}

export function clearConnectorAudits(): void {
  BUFFER.length = 0;
}
