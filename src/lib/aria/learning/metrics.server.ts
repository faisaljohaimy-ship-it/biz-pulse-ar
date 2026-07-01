import { experienceCount } from "./experience.server";
import { artifactCount } from "./knowledge.server";
import type { LearningMetrics } from "./types";

const counters = {
  patternsDetected: 0,
  lessonsCreated: 0,
  recommendationsProposed: 0,
  rejectedByVerification: 0,
  capabilityUpdates: 0,
  lastRunAt: null as string | null,
};

export function bumpPatterns(n: number): void {
  counters.patternsDetected += n;
}
export function bumpLessons(n: number): void {
  counters.lessonsCreated += n;
}
export function bumpRecommendations(n: number): void {
  counters.recommendationsProposed += n;
}
export function bumpRejected(n: number): void {
  counters.rejectedByVerification += n;
}
export function bumpCapabilityUpdates(n: number): void {
  counters.capabilityUpdates += n;
}
export function markRun(): void {
  counters.lastRunAt = new Date().toISOString();
}

export function snapshotMetrics(): LearningMetrics {
  return {
    experiencesIngested: experienceCount(),
    patternsDetected: counters.patternsDetected,
    lessonsCreated: counters.lessonsCreated,
    artifactsPublished: artifactCount(),
    recommendationsProposed: counters.recommendationsProposed,
    rejectedByVerification: counters.rejectedByVerification,
    capabilityUpdates: counters.capabilityUpdates,
    lastRunAt: counters.lastRunAt,
  };
}
