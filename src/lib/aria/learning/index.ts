/**
 * Phase 8.7 — Autonomous Learning & Knowledge Evolution
 *
 * Public API. Strictly additive:
 *   - Consumes execution/reasoning/marketplace/human signals via feedback.
 *   - Detects patterns, generates evidence-backed lessons.
 *   - Publishes versioned knowledge artifacts.
 *   - Proposes improvements (never applies them).
 *   - Tracks capability evolution.
 *
 * The Brain decides. The Planner consumes. Learning only proposes.
 */

import { emitLearningEvent } from "./events";
import {
  buildLearningCase,
  listExperiences,
} from "./experience.server";
import { updateCapabilityScores } from "./evolution.server";
import { publishLesson, queryKnowledge } from "./knowledge.server";
import { createLesson, listLessons } from "./lesson.server";
import {
  bumpCapabilityUpdates,
  bumpLessons,
  bumpPatterns,
  bumpRecommendations,
  bumpRejected,
  markRun,
  snapshotMetrics,
} from "./metrics.server";
import { detectBottlenecks, detectPatterns } from "./pattern.server";
import { recommendFromLesson } from "./recommendation.server";
import type {
  Improvement,
  KnowledgeArtifact,
  LearningCase,
  LearningMetrics,
  Lesson,
  Pattern,
  SkillEvolution,
} from "./types";
import { verifyPatternEvidence } from "./verification.server";

export interface LearnOptions {
  readonly missionId?: string;
  readonly capability?: string;
  readonly since?: string;
  readonly mode?: LearningCase["mode"];
  readonly title?: string;
}

export interface LearnResult {
  readonly case: LearningCase;
  readonly patterns: ReadonlyArray<Pattern>;
  readonly lessons: ReadonlyArray<Lesson>;
  readonly artifacts: ReadonlyArray<KnowledgeArtifact>;
  readonly improvements: ReadonlyArray<Improvement>;
  readonly evolutions: ReadonlyArray<SkillEvolution>;
  readonly metrics: LearningMetrics;
}

export function learn(options: LearnOptions = {}): LearnResult {
  emitLearningEvent("LearningStarted", {
    missionId: options.missionId ?? null,
    capability: options.capability ?? null,
    mode: options.mode ?? "periodic",
  });

  const experiences = listExperiences({
    missionId: options.missionId,
    capability: options.capability,
    since: options.since,
  });

  if (experiences.length === 0) {
    markRun();
    const empty: LearnResult = {
      case: {
        id: `case_empty_${Date.now().toString(36)}`,
        title: options.title ?? "Empty learning cycle",
        experiences: [],
        createdAt: new Date().toISOString(),
        mode: options.mode ?? "periodic",
      } as LearningCase,
      patterns: [],
      lessons: [],
      artifacts: [],
      improvements: [],
      evolutions: [],
      metrics: snapshotMetrics(),
    };
    emitLearningEvent("LearningCompleted", { patterns: 0, lessons: 0 });
    return empty;
  }

  const learningCase = buildLearningCase(
    experiences,
    options.mode ?? "periodic",
    options.title ?? `Learning cycle @ ${new Date().toISOString()}`,
  );

  const patterns = [
    ...detectPatterns(experiences),
    ...detectBottlenecks(experiences),
  ];
  bumpPatterns(patterns.length);

  const lessons: Lesson[] = [];
  const artifacts: KnowledgeArtifact[] = [];
  const improvements: Improvement[] = [];

  for (const pattern of patterns) {
    const verification = verifyPatternEvidence(pattern, experiences);
    if (!verification.ok) {
      bumpRejected(1);
      continue;
    }
    const lesson = createLesson(pattern);
    if (!lesson) {
      bumpRejected(1);
      continue;
    }
    lessons.push(lesson);
    bumpLessons(1);
    artifacts.push(publishLesson(lesson));
    const recs = recommendFromLesson(lesson, pattern);
    improvements.push(...recs);
    bumpRecommendations(recs.length);
  }

  const evolutions = updateCapabilityScores(experiences);
  bumpCapabilityUpdates(evolutions.length);

  markRun();
  emitLearningEvent("LearningCompleted", {
    patterns: patterns.length,
    lessons: lessons.length,
    artifacts: artifacts.length,
    improvements: improvements.length,
  });

  return {
    case: learningCase,
    patterns,
    lessons,
    artifacts,
    improvements,
    evolutions,
    metrics: snapshotMetrics(),
  };
}

export function extractLessons(options: LearnOptions = {}): ReadonlyArray<Lesson> {
  return learn(options).lessons;
}

export function recommendImprovements(
  options: LearnOptions = {},
): ReadonlyArray<Improvement> {
  return learn(options).improvements;
}

export { queryKnowledge };
export { listLessons };
export { snapshotMetrics as learningMetrics };
export { evaluateLearningHealth as learningHealth } from "./health.server";
export {
  ingestExecutionSignal,
  ingestHumanFeedback,
  ingestMarketplaceMetric,
  ingestPlannerEstimate,
  ingestReasoningSignal,
} from "./feedback.server";
export {
  getCapabilityScore,
  getConfidenceHistory,
  listCapabilityScores,
} from "./evolution.server";
export { onLearningEvent } from "./events";
export type {
  Experience,
  Improvement,
  KnowledgeArtifact,
  LearningCase,
  LearningHealth,
  LearningMetrics,
  Lesson,
  Pattern,
  SkillEvolution,
} from "./types";
