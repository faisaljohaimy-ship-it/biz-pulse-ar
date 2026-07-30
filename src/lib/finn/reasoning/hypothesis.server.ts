/**
 * Phase 8.6 — Hypothesis generation, ranking, and rejection.
 */
import type { Evidence, Hypothesis, ReasoningContext } from "./types";
import { clamp01, confidence, nowIso, shortId } from "./util";
import { scoreEvidenceAgainstClaim } from "./evidence.server";

export interface HypothesisReport {
  hypotheses: Hypothesis[];
  rejected: Hypothesis[];
  reasoning: string;
}

const MODE_LENS: Record<string, string[]> = {
  strategic: [
    "Long-horizon investment yields the strongest position",
    "A defensive posture preserves optionality",
    "Partnership accelerates market coverage",
  ],
  analytical: [
    "Metric decomposition isolates the primary driver",
    "The observed variance is explained by a leading indicator",
  ],
  critical: ["The stated assumption does not survive challenge", "The framing itself is biased"],
  creative: [
    "A reframing unlocks a lower-cost path",
    "Combining existing capabilities produces a novel option",
  ],
  systems: ["A feedback loop dominates the outcome", "A hidden coupling explains the failure mode"],
  root_cause: [
    "The immediate symptom is downstream of a policy gap",
    "A single upstream failure cascades through the chain",
  ],
  first_principles: [
    "Removing accreted constraints exposes a simpler solution",
    "The core physical/economic limit dictates the ceiling",
  ],
  scenario: [
    "Base case remains the most probable outcome",
    "The downside scenario is materially likely and under-planned",
  ],
  risk: ["The top risk is concentration exposure", "The most damaging risk is regulatory drift"],
  opportunity: [
    "An under-exploited capability offers asymmetric upside",
    "Adjacency expansion is achievable with existing assets",
  ],
  executive_advisory: [
    "Recommend proceed with staged commitment",
    "Recommend defer pending additional evidence",
  ],
};

export function generateHypotheses(
  context: ReasoningContext,
  evidence: Evidence[],
): HypothesisReport {
  const lens = MODE_LENS[context.mode] ?? MODE_LENS.executive_advisory ?? [];
  const contextHooks = deriveContextHypotheses(context);
  const candidates = [...contextHooks, ...lens].slice(0, 6);

  const scored: Hypothesis[] = candidates.map((statement) => {
    const { supporting, opposing, weight } = scoreEvidenceAgainstClaim(evidence, statement);
    const value = clamp01(0.25 + 0.75 * weight);
    return {
      id: shortId("hy"),
      statement,
      rationale: rationaleFor(statement, context),
      supporting_evidence_ids: supporting.map((e) => e.id),
      opposing_evidence_ids: opposing.map((e) => e.id),
      confidence: confidence(
        value,
        `weight from evidence overlap = ${weight.toFixed(2)}`,
        supporting.map((e) => e.id),
      ),
      status: "candidate",
      rejection_reason: null,
    };
  });

  scored.sort((a, b) => b.confidence.value - a.confidence.value);
  const supported: Hypothesis[] = [];
  const rejected: Hypothesis[] = [];
  for (const h of scored) {
    if (h.confidence.value < 0.25) {
      rejected.push({ ...h, status: "rejected", rejection_reason: "confidence below floor 0.25" });
    } else if (h.confidence.value < 0.4) {
      supported.push({ ...h, status: "inconclusive" });
    } else {
      supported.push({ ...h, status: "supported" });
    }
  }

  return {
    hypotheses: supported,
    rejected,
    reasoning:
      `Generated ${scored.length} hypotheses via mode=${context.mode}; ` +
      `retained ${supported.length}, rejected ${rejected.length}.`,
  };
}

function deriveContextHypotheses(ctx: ReasoningContext): string[] {
  const out: string[] = [];
  for (const goal of ctx.goals) {
    out.push(`Achieving "${goal}" is the highest-leverage action in the current window`);
  }
  for (const constraint of ctx.constraints) {
    out.push(`The binding constraint "${constraint}" narrows the option space`);
  }
  return out.slice(0, 4);
}

function rationaleFor(statement: string, ctx: ReasoningContext): string {
  return (
    `Derived under mode=${ctx.mode} for domain=${ctx.domain}. ` +
    `Statement is evaluated against seeded evidence and constraints, not asserted a priori.`
  );
}
