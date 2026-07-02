export type ShowcaseAuditKind =
  | "start" | "intro" | "welcome" | "step" | "highlight" | "kpi"
  | "qa" | "pause" | "resume" | "interrupt" | "recover" | "mode_change" | "end";

export interface ShowcaseAuditEntry {
  readonly at: number;
  readonly kind: ShowcaseAuditKind;
  readonly instanceId: string;
  readonly meta?: Readonly<Record<string, unknown>>;
}

const LOG: ShowcaseAuditEntry[] = [];
const MAX = 500;

export function logShowcase(instanceId: string, kind: ShowcaseAuditKind, meta?: Record<string, unknown>): void {
  LOG.push({ at: Date.now(), kind, instanceId, meta });
  if (LOG.length > MAX) LOG.splice(0, LOG.length - MAX);
}

export function showcaseAudit(instanceId?: string, n = 100): readonly ShowcaseAuditEntry[] {
  const src = instanceId ? LOG.filter((e) => e.instanceId === instanceId) : LOG;
  return src.slice(-n);
}
