import { emitLearningEvent } from "./events";
import type { Experience, FailurePattern, Pattern, SuccessPattern } from "./types";

const MIN_OCCURRENCES = 3;

function signatureFor(exp: Experience): string {
  return [
    exp.capability ?? "unknown",
    exp.success ? "ok" : `fail:${exp.failureClass ?? "unknown"}`,
  ].join("|");
}

function nextId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

interface Bucket {
  readonly signature: string;
  readonly experiences: Experience[];
  readonly capability: string | null;
}

function bucketize(experiences: ReadonlyArray<Experience>): Map<string, Bucket> {
  const buckets = new Map<string, Bucket>();
  for (const exp of experiences) {
    const sig = signatureFor(exp);
    const existing = buckets.get(sig);
    if (existing) {
      existing.experiences.push(exp);
    } else {
      buckets.set(sig, {
        signature: sig,
        experiences: [exp],
        capability: exp.capability,
      });
    }
  }
  return buckets;
}

function summarize(bucket: Bucket): Omit<Pattern, "id" | "kind"> {
  const exps = bucket.experiences;
  const totalConf = exps.reduce((s, e) => s + e.confidence, 0);
  const totalDur = exps.reduce((s, e) => s + e.durationMs, 0);
  const failures = exps.filter((e) => !e.success).length;
  const times = exps.map((e) => e.capturedAt).sort();
  return {
    signature: bucket.signature,
    occurrences: exps.length,
    firstSeen: times[0],
    lastSeen: times[times.length - 1],
    avgConfidence: totalConf / exps.length,
    avgDurationMs: totalDur / exps.length,
    failureRate: failures / exps.length,
    capability: bucket.capability,
    evidenceIds: exps.map((e) => e.id),
  };
}

export function detectPatterns(experiences: ReadonlyArray<Experience>): ReadonlyArray<Pattern> {
  const buckets = bucketize(experiences);
  const patterns: Pattern[] = [];
  for (const bucket of buckets.values()) {
    if (bucket.experiences.length < MIN_OCCURRENCES) continue;
    const base = summarize(bucket);
    const isFailure = bucket.experiences.every((e) => !e.success);
    const isSuccess = bucket.experiences.every((e) => e.success);
    let pattern: Pattern;
    if (isFailure) {
      const failureClass = bucket.experiences[0].failureClass ?? "unknown_failure";
      const retryEffective =
        bucket.experiences.some((e) => e.retries > 0 && e.success) === false ? false : true;
      const failurePattern: FailurePattern = {
        ...base,
        id: nextId("pat"),
        kind: "recurring_failure",
        failureClass,
        retryEffective,
      };
      pattern = failurePattern;
    } else if (isSuccess) {
      const stability = 1 - varianceOf(bucket.experiences.map((e) => e.confidence));
      const successPattern: SuccessPattern = {
        ...base,
        id: nextId("pat"),
        kind: "recurring_success",
        stability: clamp01(stability),
      };
      pattern = successPattern;
    } else {
      pattern = {
        ...base,
        id: nextId("pat"),
        kind: "cluster",
      };
    }
    patterns.push(pattern);
    emitLearningEvent("PatternDetected", {
      patternId: pattern.id,
      signature: pattern.signature,
      kind: pattern.kind,
      occurrences: pattern.occurrences,
    });
  }
  return patterns;
}

export function detectBottlenecks(
  experiences: ReadonlyArray<Experience>,
  slowThresholdMs = 5000,
): ReadonlyArray<Pattern> {
  const slow = experiences.filter((e) => e.durationMs >= slowThresholdMs);
  if (slow.length < MIN_OCCURRENCES) return [];
  const buckets = bucketize(slow);
  const patterns: Pattern[] = [];
  for (const bucket of buckets.values()) {
    if (bucket.experiences.length < MIN_OCCURRENCES) continue;
    const base = summarize(bucket);
    patterns.push({ ...base, id: nextId("pat"), kind: "bottleneck" });
  }
  return patterns;
}

function varianceOf(values: ReadonlyArray<number>): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const sq = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return sq;
}

function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
