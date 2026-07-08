import { snapshotMetrics } from "./metrics.server";
import type { LearningHealth, LearningHealthStatus } from "./types";

export function evaluateLearningHealth(): LearningHealth {
  const metrics = snapshotMetrics();
  const signals: string[] = [];
  let status: LearningHealthStatus = "healthy";

  if (metrics.experiencesIngested < 10) {
    signals.push("low_experience_volume");
    status = "starved";
  }
  if (metrics.rejectedByVerification > metrics.lessonsCreated * 2 && metrics.lessonsCreated > 0) {
    signals.push("high_verification_rejection");
    status = "noisy";
  }
  if (metrics.patternsDetected > 0 && metrics.lessonsCreated === 0) {
    signals.push("patterns_without_lessons");
    if (status === "healthy") status = "degraded";
  }
  if (metrics.lastRunAt === null && metrics.experiencesIngested > 50) {
    signals.push("learning_never_ran");
    status = "critical";
  }

  return {
    status,
    signals,
    evaluatedAt: new Date().toISOString(),
  };
}
