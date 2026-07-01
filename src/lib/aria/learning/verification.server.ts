import type { Experience, Lesson, Pattern } from "./types";

export interface VerificationReport {
  readonly ok: boolean;
  readonly reasons: ReadonlyArray<string>;
}

export function verifyPatternEvidence(
  pattern: Pattern,
  experiences: ReadonlyArray<Experience>,
): VerificationReport {
  const reasons: string[] = [];
  const referenced = new Set(pattern.evidenceIds);
  const found = experiences.filter((e) => referenced.has(e.id));
  if (found.length !== pattern.evidenceIds.length) {
    reasons.push("evidence_missing");
  }
  if (pattern.occurrences < 3) reasons.push("insufficient_occurrences");
  if (pattern.avgConfidence < 0.2) reasons.push("confidence_too_low");
  return { ok: reasons.length === 0, reasons };
}

export function verifyLesson(
  lesson: Lesson,
  pattern: Pattern,
): VerificationReport {
  const reasons: string[] = [];
  if (lesson.patternId !== pattern.id) reasons.push("pattern_mismatch");
  if (lesson.evidenceIds.length === 0) reasons.push("no_evidence");
  for (const id of lesson.evidenceIds) {
    if (!pattern.evidenceIds.includes(id)) {
      reasons.push(`evidence_not_in_pattern:${id}`);
    }
  }
  if (lesson.evidenceStrength === "weak" && lesson.confidence > 0.6) {
    reasons.push("confidence_exceeds_strength");
  }
  return { ok: reasons.length === 0, reasons };
}

export function detectContradiction(
  incoming: Lesson,
  existing: ReadonlyArray<Lesson>,
): Lesson | null {
  for (const prior of existing) {
    if (
      prior.patternId === incoming.patternId &&
      prior.statement !== incoming.statement &&
      prior.confidence >= incoming.confidence
    ) {
      return prior;
    }
  }
  return null;
}
