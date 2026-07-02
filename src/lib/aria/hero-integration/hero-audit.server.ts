// Hero append-only audit log.
import type { HeroEventKind } from "./types";

export interface HeroAuditEntry {
  readonly instanceId: string;
  readonly kind: HeroEventKind;
  readonly ts: number;
  readonly detail?: Record<string, unknown>;
}

const MAX = 500;
const LOG: HeroAuditEntry[] = [];

export function logHeroAudit(
  instanceId: string,
  kind: HeroEventKind,
  detail?: Record<string, unknown>,
): HeroAuditEntry {
  const e: HeroAuditEntry = { instanceId, kind, ts: Date.now(), detail };
  LOG.push(e);
  if (LOG.length > MAX) LOG.shift();
  return e;
}

export function heroAudit(instanceId?: string, n = 100): readonly HeroAuditEntry[] {
  const src = instanceId ? LOG.filter((e) => e.instanceId === instanceId) : LOG;
  return src.slice(-n);
}
