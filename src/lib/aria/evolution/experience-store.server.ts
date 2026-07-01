/**
 * Append-only experience store.
 *
 * The store is process-local, deterministic per input, and never mutates
 * or deletes previous records. Historical evidence is preserved as-is.
 */

import type { ExperienceRecord } from "./types";

const RECORDS: ExperienceRecord[] = [];

export function appendExperience(record: ExperienceRecord): ExperienceRecord {
  // Defensive copy freezes provenance at insert time.
  const frozen: ExperienceRecord = Object.freeze({
    ...record,
    actions: Object.freeze([...record.actions]) as readonly string[],
    evidence: Object.freeze([...record.evidence]) as ExperienceRecord["evidence"],
    failures: Object.freeze([...record.failures]) as readonly string[],
    successes: Object.freeze([...record.successes]) as readonly string[],
    lessons: Object.freeze([...record.lessons]) as readonly string[],
    recommendations: Object.freeze([
      ...record.recommendations,
    ]) as readonly string[],
    metrics: Object.freeze({ ...record.metrics }),
  });
  RECORDS.push(frozen);
  return frozen;
}

export function listExperiences(): readonly ExperienceRecord[] {
  return RECORDS.slice();
}

export function findExperience(id: string): ExperienceRecord | undefined {
  return RECORDS.find((r) => r.id === id);
}

export function experienceCount(): number {
  return RECORDS.length;
}
