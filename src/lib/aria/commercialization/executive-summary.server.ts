import type { BusinessCase, ExecutiveSummary } from "./types";

export function buildExecutiveSummary(input: {
  businessCase: BusinessCase;
  headline: string;
  outcomes: ReadonlyArray<string>;
  investment: number;
  annualValue: number;
}): ExecutiveSummary {
  if (input.outcomes.length === 0) {
    throw new Error("executive summary requires at least one outcome");
  }
  const { roi, evidence, assumptions } = input.businessCase;
  return {
    businessCaseId: input.businessCase.id,
    headline: input.headline,
    outcomes: [...input.outcomes],
    investment: input.investment,
    annualValue: input.annualValue,
    roiPct: roi.roiPct,
    paybackYears: roi.paybackYears,
    confidence: roi.confidence,
    assumptions,
    evidence,
  };
}
