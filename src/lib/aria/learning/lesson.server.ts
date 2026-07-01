import { emitLearningEvent } from "./events";
import type { EvidenceStrength, Lesson, Pattern } from "./types";
import { detectContradiction, verifyLesson } from "./verification.server";

const lessons = new Map<string, Lesson>();

function nextId(): string {
  return `lesson_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function strengthFor(pattern: Pattern): EvidenceStrength {
  if (pattern.occurrences >= 12 && pattern.avgConfidence >= 0.75) {
    return "conclusive";
  }
  if (pattern.occurrences >= 8) return "strong";
  if (pattern.occurrences >= 5) return "moderate";
  return "weak";
}

function statementFor(pattern: Pattern): { statement: string; rationale: string } {
  const cap = pattern.capability ?? "generic capability";
  switch (pattern.kind) {
    case "recurring_failure":
      return {
        statement: `Capability "${cap}" fails repeatedly under signature ${pattern.signature}.`,
        rationale: `Observed ${pattern.occurrences} failures with average confidence ${pattern.avgConfidence.toFixed(2)}.`,
      };
    case "recurring_success":
      return {
        statement: `Capability "${cap}" is reliable under signature ${pattern.signature}.`,
        rationale: `Observed ${pattern.occurrences} successes with average duration ${Math.round(pattern.avgDurationMs)}ms.`,
      };
    case "bottleneck":
      return {
        statement: `Capability "${cap}" shows persistent latency under signature ${pattern.signature}.`,
        rationale: `Average duration ${Math.round(pattern.avgDurationMs)}ms across ${pattern.occurrences} runs.`,
      };
    case "capability_gap":
      return {
        statement: `Coverage gap detected for capability "${cap}".`,
        rationale: `Insufficient successful executions across ${pattern.occurrences} runs.`,
      };
    case "cluster":
      return {
        statement: `Mixed outcomes cluster detected for capability "${cap}".`,
        rationale: `Failure rate ${(pattern.failureRate * 100).toFixed(1)}% across ${pattern.occurrences} runs.`,
      };
  }
}

export function createLesson(pattern: Pattern): Lesson | null {
  const { statement, rationale } = statementFor(pattern);
  const strength = strengthFor(pattern);
  const confidence = Math.min(
    0.95,
    (pattern.avgConfidence * 0.6 + Math.min(pattern.occurrences / 20, 1) * 0.4),
  );
  const draft: Lesson = {
    id: nextId(),
    patternId: pattern.id,
    statement,
    rationale,
    evidenceStrength: strength,
    confidence,
    createdAt: new Date().toISOString(),
    evidenceIds: pattern.evidenceIds,
    appliesTo: pattern.capability ? [pattern.capability] : [],
  };
  const verification = verifyLesson(draft, pattern);
  if (!verification.ok) return null;
  const contradicts = detectContradiction(draft, Array.from(lessons.values()));
  if (contradicts) return null;
  lessons.set(draft.id, draft);
  emitLearningEvent("LessonCreated", {
    lessonId: draft.id,
    patternId: pattern.id,
    confidence: draft.confidence,
    strength: draft.evidenceStrength,
  });
  return draft;
}

export function listLessons(): ReadonlyArray<Lesson> {
  return Array.from(lessons.values());
}

export function getLesson(id: string): Lesson | null {
  return lessons.get(id) ?? null;
}
