/**
 * Freshness scoring for entities and relationships.
 *
 * Deterministic exponential decay by kind. Freshness state is derived
 * from the score, not stored as a magic number.
 */

import type { EntityKind, FreshnessState, RelationshipKind } from "./types";

const DAY_MS = 86_400_000;

const ENTITY_HALF_LIFE_DAYS: Record<EntityKind, number> = {
  person: 365,
  department: 365,
  site: 730,
  asset: 365,
  incident: 60,
  risk: 90,
  inspection: 60,
  task: 30,
  report: 90,
  policy: 730,
  sop: 730,
  decision: 180,
  recommendation: 120,
  system: 365,
  connector: 180,
  tool: 180,
  agent: 180,
  capability: 365,
  objective: 180,
  project: 180,
  evidence: 365,
};

const RELATIONSHIP_HALF_LIFE_DAYS: Record<RelationshipKind, number> = {
  owns: 365,
  belongs_to: 365,
  located_at: 365,
  caused_by: 180,
  related_to: 120,
  depends_on: 180,
  assigned_to: 90,
  reported_by: 180,
  approved_by: 365,
  violates: 180,
  mitigates: 180,
  supports: 180,
  contradicts: 180,
  replaces: 365,
  references: 365,
  requires: 365,
};

function score(halfLife: number, updated_at: string, now: Date): number {
  const updated = Date.parse(updated_at);
  if (!Number.isFinite(updated)) return -1;
  const ageDays = Math.max(0, (now.getTime() - updated) / DAY_MS);
  return Math.max(0, Math.min(1, Math.exp((-Math.LN2 * ageDays) / halfLife)));
}

export function entityFreshness(
  kind: EntityKind,
  updated_at: string,
  now: Date = new Date(),
): number {
  return score(ENTITY_HALF_LIFE_DAYS[kind], updated_at, now);
}

export function relationshipFreshness(
  kind: RelationshipKind,
  updated_at: string,
  now: Date = new Date(),
): number {
  return score(RELATIONSHIP_HALF_LIFE_DAYS[kind], updated_at, now);
}

export function toFreshnessState(scoreValue: number): FreshnessState {
  if (scoreValue < 0) return "unknown";
  if (scoreValue >= 0.5) return "fresh";
  if (scoreValue >= 0.15) return "aging";
  return "stale";
}
