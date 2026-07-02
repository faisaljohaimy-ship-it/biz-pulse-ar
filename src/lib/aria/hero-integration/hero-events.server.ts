// Hero event bus (append-only, per-instance ring buffer).
import type { HeroEvent, HeroEventKind } from "./types";

const EVENTS = new Map<string, HeroEvent[]>();
const MAX = 200;

export function emitHeroEvent(
  instanceId: string,
  kind: HeroEventKind,
  detail?: Record<string, unknown>,
): HeroEvent {
  const ev: HeroEvent = { kind, ts: Date.now(), detail };
  const list = EVENTS.get(instanceId) ?? [];
  list.push(ev);
  if (list.length > MAX) list.shift();
  EVENTS.set(instanceId, list);
  return ev;
}

export function heroEvents(instanceId: string, n = 50): readonly HeroEvent[] {
  const list = EVENTS.get(instanceId);
  if (!list) return [];
  return list.slice(-n);
}

export function clearHeroEvents(instanceId: string): void {
  EVENTS.delete(instanceId);
}
