import { recordExperience } from "./experience.server";
import type { Experience } from "./types";

export interface HumanFeedback {
  readonly missionId: string | null;
  readonly capability: string | null;
  readonly agentId: string | null;
  readonly rating: number;
  readonly accepted: boolean;
  readonly notes: string;
}

export interface ExecutionSignal {
  readonly missionId: string;
  readonly capability: string | null;
  readonly agentId: string | null;
  readonly durationMs: number;
  readonly success: boolean;
  readonly retries: number;
  readonly rollbacks: number;
  readonly failureClass: string | null;
  readonly confidence: number;
}

export interface ReasoningSignal {
  readonly missionId: string | null;
  readonly capability: string | null;
  readonly confidence: number;
  readonly evidenceStrength: number;
}

export interface PlannerEstimate {
  readonly missionId: string;
  readonly capability: string | null;
  readonly estimatedMs: number;
  readonly actualMs: number;
}

export interface MarketplaceMetric {
  readonly capability: string;
  readonly agentId: string;
  readonly healthScore: number;
  readonly latencyMs: number;
}

export function ingestHumanFeedback(feedback: HumanFeedback): Experience {
  return recordExperience({
    missionId: feedback.missionId,
    source: "feedback",
    capability: feedback.capability,
    agentId: feedback.agentId,
    durationMs: 0,
    success: feedback.accepted,
    confidence: clamp01(feedback.rating / 5),
    retries: 0,
    rollbacks: 0,
    failureClass: feedback.accepted ? null : "human_rejected",
    context: {
      rating: feedback.rating,
      accepted: feedback.accepted,
      notes: feedback.notes.slice(0, 240),
    },
  });
}

export function ingestExecutionSignal(signal: ExecutionSignal): Experience {
  return recordExperience({
    missionId: signal.missionId,
    source: "execution",
    capability: signal.capability,
    agentId: signal.agentId,
    durationMs: signal.durationMs,
    success: signal.success,
    confidence: clamp01(signal.confidence),
    retries: signal.retries,
    rollbacks: signal.rollbacks,
    failureClass: signal.failureClass,
    context: {},
  });
}

export function ingestReasoningSignal(signal: ReasoningSignal): Experience {
  return recordExperience({
    missionId: signal.missionId,
    source: "reasoning",
    capability: signal.capability,
    agentId: null,
    durationMs: 0,
    success: signal.confidence >= 0.5,
    confidence: clamp01(signal.confidence),
    retries: 0,
    rollbacks: 0,
    failureClass: null,
    context: { evidenceStrength: clamp01(signal.evidenceStrength) },
  });
}

export function ingestPlannerEstimate(estimate: PlannerEstimate): Experience {
  const ratio = estimate.estimatedMs === 0 ? 1 : estimate.actualMs / estimate.estimatedMs;
  const accuracy = clamp01(1 - Math.min(Math.abs(1 - ratio), 1));
  return recordExperience({
    missionId: estimate.missionId,
    source: "decision",
    capability: estimate.capability,
    agentId: null,
    durationMs: estimate.actualMs,
    success: accuracy >= 0.6,
    confidence: accuracy,
    retries: 0,
    rollbacks: 0,
    failureClass: accuracy >= 0.6 ? null : "estimate_drift",
    context: { estimatedMs: estimate.estimatedMs, actualMs: estimate.actualMs },
  });
}

export function ingestMarketplaceMetric(metric: MarketplaceMetric): Experience {
  return recordExperience({
    missionId: null,
    source: "decision",
    capability: metric.capability,
    agentId: metric.agentId,
    durationMs: metric.latencyMs,
    success: metric.healthScore >= 0.5,
    confidence: clamp01(metric.healthScore),
    retries: 0,
    rollbacks: 0,
    failureClass: metric.healthScore >= 0.5 ? null : "marketplace_degraded",
    context: { healthScore: clamp01(metric.healthScore) },
  });
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
