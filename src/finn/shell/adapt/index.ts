/**
 * SADEED FINN Shell — bounded self-adaptation.
 *
 * Adaptation may move ONLY the three scoped parameters (topK,
 * confidenceThreshold, maxTokens) inside their [min,max] bounds, and only when
 * evals do not regress. Any structural change is a proposal, never applied
 * automatically. A regression auto-reverts to the parameter default.
 */
import { SHELL_CONFIG, type BoundedParam } from "../config";

export interface EvalMetrics {
  readonly accuracy: number; // selection accuracy 0..1
  readonly hallucination: number; // count — must stay 0
  readonly gateCompliance: number; // 0..1 — must stay 1
}

export interface AdaptDecision {
  readonly accepted: boolean;
  readonly value: number;
  readonly reason: string;
  readonly proposalRequired: boolean;
}

/** Clamp a candidate into the parameter's [min,max] bounds. */
export function clampParam(param: BoundedParam, candidate: number): number {
  return Math.min(param.max, Math.max(param.min, candidate));
}

/** Only the explicitly-scoped parameters may be auto-adapted. */
export function isAdaptableScope(key: string): boolean {
  return (SHELL_CONFIG.adaptation.scope as readonly string[]).includes(key);
}

/** A regression is any drop in accuracy or gate-compliance, or any hallucination. */
export function isRegression(before: EvalMetrics, after: EvalMetrics): boolean {
  return (
    after.accuracy < before.accuracy ||
    after.gateCompliance < before.gateCompliance ||
    after.hallucination > before.hallucination ||
    after.hallucination > 0 ||
    after.gateCompliance < 1
  );
}

/**
 * Decide whether to apply a candidate parameter value.
 * - adaptation disabled            → keep current
 * - out of scope / structural      → proposal only (not applied)
 * - eval regression                → auto-revert to default
 * - within bounds, no regression   → accept the clamped candidate
 */
export function decideAdaptation(
  key: string,
  param: BoundedParam,
  candidate: number,
  before: EvalMetrics,
  after: EvalMetrics,
): AdaptDecision {
  if (!SHELL_CONFIG.adaptation.enabled) {
    return {
      accepted: false,
      value: param.value,
      reason: "adaptation disabled",
      proposalRequired: false,
    };
  }
  if (!isAdaptableScope(key)) {
    return {
      accepted: false,
      value: param.value,
      reason: `"${key}" is a structural change — proposal only`,
      proposalRequired: true,
    };
  }
  if (isRegression(before, after)) {
    return {
      accepted: false,
      value: param.default,
      reason: "eval regression → auto-revert to default",
      proposalRequired: false,
    };
  }
  return {
    accepted: true,
    value: clampParam(param, candidate),
    reason: "within bounds, no regression",
    proposalRequired: false,
  };
}
