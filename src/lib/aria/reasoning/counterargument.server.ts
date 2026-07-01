/**
 * Phase 8.6 — Counter-argument generation. For each supported
 * hypothesis, generate the strongest opposing case and evaluate
 * whether a rebuttal holds against the evidence.
 */
import type { CounterArgument, Evidence, Hypothesis } from "./types";
import { nowIso, shortId } from "./util";
import { scoreEvidenceAgainstClaim } from "./evidence.server";

export interface CounterReport {
  counterarguments: CounterArgument[];
  reasoning: string;
}

export function generateCounterArguments(
  hypotheses: Hypothesis[],
  evidence: Evidence[],
): CounterReport {
  const out: CounterArgument[] = [];
  for (const h of hypotheses) {
    if (h.status === "rejected") continue;
    const negated = negate(h.statement);
    const { supporting, weight } = scoreEvidenceAgainstClaim(evidence, negated);
    const strength = strengthFor(weight);
    const rebuttal = supporting.length === 0
      ? "No evidence supports the counterposition; original hypothesis stands."
      : "Counterposition draws support from evidence; original hypothesis must be re-weighted.";
    const rebuttalHolds = supporting.length === 0 || h.confidence.value > 0.5 + weight;
    out.push({
      id: shortId("ca"),
      target_hypothesis_id: h.id,
      statement: negated,
      strength,
      evidence_ids: supporting.map((e) => e.id),
      rebuttal,
      rebuttal_holds: rebuttalHolds,
      reasoning: `Counterweight = ${weight.toFixed(2)}; rebuttal ${rebuttalHolds ? "holds" : "does not fully hold"}.`,
    });
  }
  return {
    counterarguments: out,
    reasoning: `Generated ${out.length} counter-arguments and evaluated rebuttals at ${nowIso()}.`,
  };
}

function negate(statement: string): string {
  const trimmed = statement.trim();
  if (/^not\s+/i.test(trimmed)) return trimmed.replace(/^not\s+/i, "");
  if (/\sis\s/i.test(trimmed)) return trimmed.replace(/\sis\s/i, " is not ");
  if (/\sare\s/i.test(trimmed)) return trimmed.replace(/\sare\s/i, " are not ");
  return `It is not the case that: ${trimmed}`;
}

function strengthFor(weight: number): CounterArgument["strength"] {
  if (weight >= 0.6) return "strong";
  if (weight >= 0.3) return "moderate";
  return "weak";
}
