export type ExecutiveAuditKind =
  | "presence" | "dialog" | "briefing" | "priorities" | "daily_summary"
  | "alerts" | "insights" | "recommendations" | "followup" | "memory" | "workflow";

export interface ExecutiveAuditEntry {
  readonly at: number;
  readonly kind: ExecutiveAuditKind;
  readonly scope: string;
  readonly meta?: Readonly<Record<string, unknown>>;
}

const LOG: ExecutiveAuditEntry[] = [];
const MAX = 500;

export function logExecutive(scope: string, kind: ExecutiveAuditKind, meta?: Record<string, unknown>): void {
  LOG.push({ at: Date.now(), kind, scope, meta });
  if (LOG.length > MAX) LOG.splice(0, LOG.length - MAX);
}

export function executiveAudit(scope?: string, n = 100): readonly ExecutiveAuditEntry[] {
  const src = scope ? LOG.filter((e) => e.scope === scope) : LOG;
  return src.slice(-n);
}
