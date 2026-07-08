export type HeroAuditKind =
  | "entrance"
  | "state_change"
  | "transition"
  | "caption"
  | "overlay"
  | "budget_downgrade"
  | "performance_warning"
  | "reset";

export interface HeroAuditEntry {
  readonly at: number;
  readonly kind: HeroAuditKind;
  readonly instanceId: string;
  readonly meta?: Readonly<Record<string, unknown>>;
}

const LOG: HeroAuditEntry[] = [];
const MAX = 500;

export function logHero(
  instanceId: string,
  kind: HeroAuditKind,
  meta?: Record<string, unknown>,
): void {
  LOG.push({ at: Date.now(), kind, instanceId, meta });
  if (LOG.length > MAX) LOG.splice(0, LOG.length - MAX);
}

export function heroAudit(instanceId?: string, n = 100): readonly HeroAuditEntry[] {
  const src = instanceId ? LOG.filter((e) => e.instanceId === instanceId) : LOG;
  return src.slice(-n);
}
