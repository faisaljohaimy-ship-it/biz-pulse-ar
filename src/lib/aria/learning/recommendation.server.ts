import type { Improvement, Lesson, Pattern } from "./types";

function nextId(): string {
  return `imp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function priorityFor(confidence: number): Improvement["priority"] {
  if (confidence >= 0.85) return "critical";
  if (confidence >= 0.7) return "high";
  if (confidence >= 0.5) return "medium";
  return "low";
}

export function recommendFromLesson(
  lesson: Lesson,
  pattern: Pattern,
): ReadonlyArray<Improvement> {
  const improvements: Improvement[] = [];
  const priority = priorityFor(lesson.confidence);
  const cap = pattern.capability ?? "generic";

  if (pattern.kind === "recurring_failure") {
    improvements.push({
      id: nextId(),
      lessonId: lesson.id,
      target: "marketplace",
      action: `Prefer alternative capability provider for "${cap}" — current failure rate ${(pattern.failureRate * 100).toFixed(0)}%.`,
      expectedImpact: "Reduce failure rate via provider substitution.",
      priority,
      confidence: lesson.confidence,
    });
    improvements.push({
      id: nextId(),
      lessonId: lesson.id,
      target: "recovery",
      action: `Enable adaptive recovery playbook for signature ${pattern.signature}.`,
      expectedImpact: "Higher recovery rate on repeated failures.",
      priority,
      confidence: lesson.confidence,
    });
  } else if (pattern.kind === "bottleneck") {
    improvements.push({
      id: nextId(),
      lessonId: lesson.id,
      target: "planner",
      action: `Split "${cap}" into parallelizable subtasks; average latency ${Math.round(pattern.avgDurationMs)}ms.`,
      expectedImpact: "Reduce critical-path delay.",
      priority,
      confidence: lesson.confidence,
    });
    improvements.push({
      id: nextId(),
      lessonId: lesson.id,
      target: "execution",
      action: `Pre-warm resources for "${cap}" before scheduling.`,
      expectedImpact: "Lower cold-start latency.",
      priority,
      confidence: lesson.confidence,
    });
  } else if (pattern.kind === "recurring_success") {
    improvements.push({
      id: nextId(),
      lessonId: lesson.id,
      target: "planner",
      action: `Promote "${cap}" as preferred capability for signature ${pattern.signature}.`,
      expectedImpact: "Stable outcomes on similar missions.",
      priority,
      confidence: lesson.confidence,
    });
  } else if (pattern.kind === "cluster") {
    improvements.push({
      id: nextId(),
      lessonId: lesson.id,
      target: "reasoning",
      action: `Investigate mixed outcomes for "${cap}" — introduce discriminating evidence.`,
      expectedImpact: "Improved decision quality on ambiguous cases.",
      priority,
      confidence: lesson.confidence,
    });
  } else if (pattern.kind === "capability_gap") {
    improvements.push({
      id: nextId(),
      lessonId: lesson.id,
      target: "marketplace",
      action: `Register additional providers to close capability gap in "${cap}".`,
      expectedImpact: "Broader coverage and resilience.",
      priority,
      confidence: lesson.confidence,
    });
  }
  return improvements;
}
