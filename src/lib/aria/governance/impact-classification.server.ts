/**
 * Impact classification — deterministic scoring from action kind + params.
 * Never guesses; unknown remains UNKNOWN.
 */
import type { ImpactAssessment, ProposedAction } from "./types";

const KIND_SCORE: Record<string, number> = {
  read: 0.05,
  notify: 0.15,
  recommend: 0.2,
  write: 0.55,
  external_call: 0.6,
  user_facing: 0.5,
  security_change: 0.85,
  financial: 0.9,
  policy_change: 0.95,
  unknown: -1,
};

function levelFromScore(score: number): ImpactAssessment["level"] {
  if (score < 0) return "unknown";
  if (score >= 0.85) return "critical";
  if (score >= 0.6) return "high";
  if (score >= 0.3) return "medium";
  return "low";
}

export function classifyImpact(action: ProposedAction): ImpactAssessment {
  const factors: string[] = [];
  let score = KIND_SCORE[action.kind] ?? -1;
  if (score < 0) {
    return {
      level: "unknown",
      score: 0,
      factors: ["kind:unknown"],
      unknown_reason: "action kind not classified",
    };
  }
  factors.push(`kind:${action.kind}=${score.toFixed(2)}`);

  const params = action.params ?? {};
  const amountRaw = (params as Record<string, unknown>).amount;
  if (typeof amountRaw === "number" && Number.isFinite(amountRaw)) {
    if (amountRaw >= 100_000) {
      score = Math.max(score, 0.9);
      factors.push("amount>=100k");
    } else if (amountRaw >= 10_000) {
      score = Math.max(score, 0.7);
      factors.push("amount>=10k");
    } else if (amountRaw >= 1_000) {
      score = Math.max(score, 0.5);
      factors.push("amount>=1k");
    }
  }

  const scope = (params as Record<string, unknown>).scope;
  if (scope === "all_tenants" || scope === "org_wide") {
    score = Math.max(score, 0.85);
    factors.push(`scope:${scope}`);
  }

  const reversible = (params as Record<string, unknown>).reversible;
  if (reversible === false) {
    score = Math.min(1, score + 0.1);
    factors.push("irreversible");
  }

  if (action.evidence.length === 0) {
    factors.push("no_evidence");
  }

  score = Math.max(0, Math.min(1, score));
  return { level: levelFromScore(score), score: Number(score.toFixed(4)), factors };
}
