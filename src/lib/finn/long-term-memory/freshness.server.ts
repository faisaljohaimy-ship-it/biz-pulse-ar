/**
 * Deterministic freshness score.
 *
 * Freshness = exp(-age_days / half_life_days), clamped to [0,1].
 * Half-life differs per memory kind. Fully deterministic given
 * (now, record.updated_at).
 */

import type { MemoryKind } from "./types";

const HALF_LIFE_DAYS: Record<MemoryKind, number> = {
  episodic: 14,
  semantic: 180,
  procedural: 120,
  decision: 60,
  experience: 90,
};

const DAY_MS = 86_400_000;

export function freshnessOf(kind: MemoryKind, updated_at: string, now: Date = new Date()): number {
  const updated = Date.parse(updated_at);
  if (!Number.isFinite(updated)) return -1;
  const ageDays = Math.max(0, (now.getTime() - updated) / DAY_MS);
  const halfLife = HALF_LIFE_DAYS[kind];
  const score = Math.exp((-Math.LN2 * ageDays) / halfLife);
  return Math.max(0, Math.min(1, score));
}

export function halfLifeFor(kind: MemoryKind): number {
  return HALF_LIFE_DAYS[kind];
}
