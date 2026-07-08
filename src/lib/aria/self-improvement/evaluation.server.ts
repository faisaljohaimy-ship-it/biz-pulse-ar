// Evaluate a subject against weighted criteria using real evidence samples.
import type {
  EvaluationCriterion,
  EvaluationOutcome,
  EvaluationReport,
  EvidenceSample,
  TriState,
} from "./types";
import { EvaluationInputZ } from "./contracts";

function compare(
  observed: number,
  target: number,
  comparator: EvaluationCriterion["comparator"],
): boolean {
  if (comparator === "lte") return observed <= target;
  if (comparator === "gte") return observed >= target;
  return observed === target;
}

export function evaluateSubject(input: {
  subject: string;
  criteria: ReadonlyArray<EvaluationCriterion>;
  samples: ReadonlyArray<EvidenceSample>;
  evaluatedAt: string;
}): EvaluationReport {
  const parsed = EvaluationInputZ.parse({
    subject: input.subject,
    criteria: [...input.criteria],
    samples: [...input.samples],
    evaluatedAt: input.evaluatedAt,
  });

  const outcomes: EvaluationOutcome[] = parsed.criteria.map((c) => {
    const sample = parsed.samples.find(
      (s) => s.subject === parsed.subject && s.metric === c.metric,
    );
    if (!sample) {
      return {
        criterionId: c.id,
        observed: null,
        target: c.target,
        comparator: c.comparator,
        state: "unknown",
        detail: "no_evidence",
        evidence: [],
      };
    }
    const ok = compare(sample.value, c.target, c.comparator);
    return {
      criterionId: c.id,
      observed: sample.value,
      target: c.target,
      comparator: c.comparator,
      state: ok ? "pass" : "fail",
      detail: `${sample.value} ${c.comparator} ${c.target}`,
      evidence: sample.evidence,
    };
  });

  let weightSum = 0;
  let weightedPass = 0;
  let anyUnknown = false;
  let anyFail = false;
  for (const o of outcomes) {
    const c = parsed.criteria.find((x) => x.id === o.criterionId)!;
    weightSum += c.weight;
    if (o.state === "pass") weightedPass += c.weight;
    if (o.state === "unknown") anyUnknown = true;
    if (o.state === "fail") anyFail = true;
  }
  const score = weightSum > 0 && !anyUnknown ? weightedPass / weightSum : 0;
  const overall: TriState = anyFail ? "fail" : anyUnknown ? "unknown" : "pass";

  const evidence = outcomes.flatMap((o) => o.evidence);
  return {
    subject: parsed.subject,
    outcomes,
    overall,
    score,
    evidence,
    evaluatedAt: parsed.evaluatedAt,
  };
}
