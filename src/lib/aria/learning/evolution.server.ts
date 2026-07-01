import { emitLearningEvent } from "./events";
import type {
  CapabilityScore,
  ConfidenceHistory,
  Experience,
  SkillEvolution,
  Trend,
} from "./types";

const scores = new Map<string, CapabilityScore>();
const history = new Map<string, Array<{ at: string; value: number }>>();

function computeScore(experiences: ReadonlyArray<Experience>): Omit<CapabilityScore, "capability" | "updatedAt"> {
  const samples = experiences.length;
  const successes = experiences.filter((e) => e.success).length;
  const successRate = samples === 0 ? 0 : successes / samples;
  const avgConfidence =
    samples === 0
      ? 0
      : experiences.reduce((s, e) => s + e.confidence, 0) / samples;
  const avgDurationMs =
    samples === 0
      ? 0
      : experiences.reduce((s, e) => s + e.durationMs, 0) / samples;
  const score = clamp01(successRate * 0.6 + avgConfidence * 0.4);
  return { score, samples, avgConfidence, successRate, avgDurationMs };
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function trendOf(delta: number): Trend {
  if (delta > 0.03) return "improving";
  if (delta < -0.03) return "regressing";
  return "stable";
}

export function updateCapabilityScores(
  experiences: ReadonlyArray<Experience>,
): ReadonlyArray<SkillEvolution> {
  const buckets = new Map<string, Experience[]>();
  for (const exp of experiences) {
    if (!exp.capability) continue;
    const arr = buckets.get(exp.capability) ?? [];
    arr.push(exp);
    buckets.set(exp.capability, arr);
  }
  const evolutions: SkillEvolution[] = [];
  const now = new Date().toISOString();
  for (const [capability, exps] of buckets.entries()) {
    const before = scores.get(capability) ?? null;
    const computed = computeScore(exps);
    const after: CapabilityScore = {
      capability,
      ...computed,
      updatedAt: now,
    };
    scores.set(capability, after);
    const track = history.get(capability) ?? [];
    track.push({ at: now, value: after.score });
    if (track.length > 200) track.shift();
    history.set(capability, track);
    const delta = after.score - (before?.score ?? after.score);
    const trend = trendOf(delta);
    evolutions.push({ capability, before, after, delta, trend, notedAt: now });
    if (trend === "improving") {
      emitLearningEvent("CapabilityImproved", { capability, delta, score: after.score });
    } else if (trend === "regressing") {
      emitLearningEvent("CapabilityRegressed", { capability, delta, score: after.score });
    }
  }
  return evolutions;
}

export function getCapabilityScore(capability: string): CapabilityScore | null {
  return scores.get(capability) ?? null;
}

export function listCapabilityScores(): ReadonlyArray<CapabilityScore> {
  return Array.from(scores.values());
}

export function getConfidenceHistory(capability: string): ConfidenceHistory {
  return { capability, points: history.get(capability) ?? [] };
}
