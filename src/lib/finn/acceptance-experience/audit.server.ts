// Append-only acceptance audit log.
export type AcceptanceAuditKind =
  | "first_impression"
  | "greeting"
  | "flow_step"
  | "quality"
  | "discipline"
  | "trust"
  | "handoff"
  | "delight";

export interface AcceptanceAuditEntry {
  readonly instanceId: string;
  readonly kind: AcceptanceAuditKind;
  readonly ts: number;
  readonly detail?: Record<string, unknown>;
}

const MAX = 500;
const LOG: AcceptanceAuditEntry[] = [];

export function logAcceptance(
  instanceId: string,
  kind: AcceptanceAuditKind,
  detail?: Record<string, unknown>,
): AcceptanceAuditEntry {
  const e: AcceptanceAuditEntry = { instanceId, kind, ts: Date.now(), detail };
  LOG.push(e);
  if (LOG.length > MAX) LOG.shift();
  return e;
}

export function acceptanceAudit(instanceId?: string, n = 100): readonly AcceptanceAuditEntry[] {
  const src = instanceId ? LOG.filter((e) => e.instanceId === instanceId) : LOG;
  return src.slice(-n);
}
