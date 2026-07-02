// Stakeholder mapping.
import type { Stakeholder } from "./types";
import { StakeholderZ } from "./contracts";

export function validateStakeholder(s: Stakeholder): Stakeholder {
  const parsed = StakeholderZ.parse(s);
  return { ...parsed, interests: parsed.interests ?? [] };
}

export function summarizeStakeholders(all: ReadonlyArray<Stakeholder>): {
  total: number;
  champions: number;
  blockers: number;
  criticalInfluence: number;
} {
  return {
    total: all.length,
    champions: all.filter((s) => s.stance === "champion").length,
    blockers: all.filter((s) => s.stance === "blocker").length,
    criticalInfluence: all.filter((s) => s.influence === "critical").length,
  };
}
