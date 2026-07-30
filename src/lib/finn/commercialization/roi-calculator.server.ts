// ROI calculator — deterministic NPV/ROI/payback. Unknown confidence ⇒ null outputs.
import type { ConfidenceBucket, EvidenceRef, RoiInputs, RoiResult } from "./types";
import { RoiInputsZ } from "./contracts";

export function computeRoi(input: {
  inputs: RoiInputs;
  confidence: ConfidenceBucket;
  evidence: ReadonlyArray<EvidenceRef>;
  additionalAssumptions?: ReadonlyArray<string>;
}): RoiResult {
  const parsed = RoiInputsZ.parse(input.inputs);
  const assumptions = [
    `horizon=${parsed.horizonYears}y`,
    `discountRate=${parsed.discountRate}`,
    `currency=${parsed.currency}`,
    ...(input.additionalAssumptions ?? []),
  ];
  if (input.confidence === "unknown") {
    return {
      npv: null,
      roiPct: null,
      paybackYears: null,
      confidence: "unknown",
      assumptions,
      evidence: input.evidence,
    };
  }
  const netAnnual = parsed.annualValue - parsed.annualCost;
  let npv = -parsed.investment;
  for (let y = 1; y <= parsed.horizonYears; y += 1) {
    npv += netAnnual / Math.pow(1 + parsed.discountRate, y);
  }
  const totalNet = netAnnual * parsed.horizonYears;
  const roiPct =
    parsed.investment === 0 ? null : (totalNet - parsed.investment) / parsed.investment;
  let paybackYears: number | null = null;
  if (netAnnual > 0) {
    paybackYears = parsed.investment / netAnnual;
    if (paybackYears > parsed.horizonYears) paybackYears = null;
  }
  return {
    npv,
    roiPct,
    paybackYears,
    confidence: input.confidence,
    assumptions,
    evidence: input.evidence,
  };
}
