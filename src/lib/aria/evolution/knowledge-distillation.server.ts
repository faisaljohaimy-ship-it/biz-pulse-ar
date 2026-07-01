/**
 * Knowledge distillation.
 *
 * Extracts distinct lessons across successful experiences into a
 * de-duplicated, ordered list. Does not mutate memory.
 */

import { listExperiences } from "./experience-store.server";

export interface DistilledLesson {
  readonly text: string;
  readonly source_ids: readonly string[];
  readonly weight: number;
}

export function distillLessons(): readonly DistilledLesson[] {
  const map = new Map<string, { sources: string[]; weight: number }>();
  for (const exp of listExperiences()) {
    if (exp.outcome !== "success") continue;
    for (const lesson of exp.lessons) {
      const key = lesson.trim().toLowerCase();
      if (!key) continue;
      const bucket = map.get(key) ?? { sources: [], weight: 0 };
      bucket.sources.push(exp.id);
      bucket.weight += 1;
      map.set(key, bucket);
    }
  }
  return Object.freeze(
    [...map.entries()]
      .map(([text, { sources, weight }]) =>
        Object.freeze({ text, source_ids: Object.freeze([...sources]), weight }),
      )
      .sort((a, b) => b.weight - a.weight),
  ) as readonly DistilledLesson[];
}
