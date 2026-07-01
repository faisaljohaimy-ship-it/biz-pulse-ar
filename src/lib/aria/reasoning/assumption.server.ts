/**
 * Phase 8.6 — Assumption challenge. Wraps seeded assumptions into
 * fully-typed Assumption records and challenges each against the
 * available evidence.
 */
import type { Assumption, Evidence } from "./types";
import type { ReasonInputParsed } from "./contracts";
import { clamp01, confidence, shortId } from "./util";
import { scoreEvidenceAgainstClaim } from "./evidence.server";

export interface AssumptionReport {
  assumptions: Assumption[];
  challenged_count: number;
  reasoning: string;
}

export function challengeAssumptions(
  input: ReasonInputParsed,
  evidence: Evidence[],
): AssumptionReport {
  const out: Assumption[] = [];
  for (const seed of input.seed_assumptions) {
    const { supporting, opposing, weight } = scoreEvidenceAgainstClaim(evidence, seed.statement);
    const value = clamp01(
      0.4 + 0.6 * weight - 0.05 * opposing.length + necessityBoost(seed.necessity),
    );
    const challenged = opposing.length > 0 || value < 0.5;
    out.push({
      id: shortId("as"),
      statement: seed.statement,
      necessity: seed.necessity,
      risk_if_wrong: seed.risk_if_wrong,
      challenged,
      challenge_reasoning: challenged
        ? `Assumption weakened: ${opposing.length} opposing evidence item(s); support weight ${weight.toFixed(2)}.`
        : null,
      confidence: confidence(
        value,
        `necessity=${seed.necessity}, support=${supporting.length}, opposing=${opposing.length}`,
        supporting.map((e) => e.id),
      ),
    });
  }
  const challenged = out.filter((a) => a.challenged).length;
  return {
    assumptions: out,
    challenged_count: challenged,
    reasoning: `Reviewed ${out.length} assumptions; ${challenged} require explicit tracking.`,
  };
}

function necessityBoost(n: Assumption["necessity"]): number {
  switch (n) {
    case "must_hold":
      return 0.05;
    case "should_hold":
      return 0;
    case "nice_to_hold":
      return -0.05;
  }
}
