/**
 * Deterministic secondary index over the experience store.
 *
 * The index is rebuilt on demand from the append-only store, so it is
 * always consistent with the underlying evidence.
 */

import { listExperiences } from "./experience-store.server";
import type { EvolutionOutcome, ExperienceRecord } from "./types";

export function indexByOutcome(): Readonly<
  Record<EvolutionOutcome, readonly ExperienceRecord[]>
> {
  const out: Record<EvolutionOutcome, ExperienceRecord[]> = {
    success: [],
    partial: [],
    failure: [],
    unknown: [],
  };
  for (const r of listExperiences()) out[r.outcome].push(r);
  return Object.freeze({
    success: Object.freeze(out.success),
    partial: Object.freeze(out.partial),
    failure: Object.freeze(out.failure),
    unknown: Object.freeze(out.unknown),
  });
}

export function indexByProblem(): ReadonlyMap<string, readonly ExperienceRecord[]> {
  const map = new Map<string, ExperienceRecord[]>();
  for (const r of listExperiences()) {
    const list = map.get(r.problem) ?? [];
    list.push(r);
    map.set(r.problem, list);
  }
  return map;
}

export function successRate(): number {
  const all = listExperiences();
  if (all.length === 0) return -1;
  const success = all.filter((r) => r.outcome === "success").length;
  return success / all.length;
}
