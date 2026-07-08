import type { HeroEntranceDirective } from "./types";
import { assertEntrance, HERO_CONTRACTS } from "./contracts";

const ROWS = new Map<string, { startedAt: number; durationMs: number }>();

export function beginEntrance(id: string, durationMs = 1200): HeroEntranceDirective {
  const d = Math.min(HERO_CONTRACTS.ENTRANCE_MAX_MS, Math.max(400, durationMs));
  ROWS.set(id, { startedAt: Date.now(), durationMs: d });
  const e: HeroEntranceDirective = {
    phase: "reveal",
    progress: 0,
    durationMs: d,
    startedAt: Date.now(),
  };
  assertEntrance(e);
  return e;
}

export function sampleEntrance(id: string, now = Date.now()): HeroEntranceDirective {
  const row = ROWS.get(id);
  if (!row) return { phase: "off", progress: 0, durationMs: 0, startedAt: null };
  const t = Math.min(1, (now - row.startedAt) / row.durationMs);
  const phase: HeroEntranceDirective["phase"] = t < 0.5 ? "reveal" : t < 1 ? "settle" : "ready";
  const e: HeroEntranceDirective = {
    phase,
    progress: t,
    durationMs: row.durationMs,
    startedAt: row.startedAt,
  };
  assertEntrance(e);
  return e;
}

export function resetEntrance(id: string): void {
  ROWS.delete(id);
}
