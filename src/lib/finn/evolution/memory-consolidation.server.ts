/**
 * Memory consolidation report.
 *
 * Produces an advisory summary of what the Executive Brain could
 * consider promoting into long-term memory. This layer never writes
 * to Memory — it only reports candidates.
 */

import { distillLessons, type DistilledLesson } from "./knowledge-distillation.server";
import { experienceCount } from "./experience-store.server";

export interface ConsolidationReport {
  readonly created_at: string;
  readonly experience_count: number;
  readonly candidates: readonly DistilledLesson[];
}

export function consolidate(): ConsolidationReport {
  return Object.freeze({
    created_at: new Date().toISOString(),
    experience_count: experienceCount(),
    candidates: distillLessons(),
  });
}
