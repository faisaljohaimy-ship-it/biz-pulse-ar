// ROI model — deterministic NPV / ROI / payback with confidence bucket.
// No fabricated cash flows: caller-supplied inputs only.
import type {
  ConfidenceBucket,
  EvidenceRef,
  RoiInputs,
  RoiResult,
  ValueCase,
} from "./types";
import { RoiInputsZ } from "./contracts";

export function computeRoi(input: {
  inputs: RoiInputs;
  valueCase: ValueCase | null;
  evidence: ReadonlyArray<EvidenceRef>;
}): RoiResult {
  const parsed = RoiInputsZ.parse(input.inputs);
  const assumptions: string[] = [
    `horizon=${parsed.horizonYears}y`,
    `discountRate=${parsed.discountRate}`,
    `currency=${parsed.currency}`,
  ];
  const netAnnual = parsed.annualValue - parsed.annualCost;

  // NPV of net annual cash flows minus initial investment.
  let npv = -parsed.investment;
  for (let y = 1; y <= parsed.horizonYears; y += 1) {
    npv += netAnnual / Math.pow(1 + parsed.discountRate, y);
  }
  const totalNet = netAnnual * parsed.horizonYears;
  const roiPct = parsed.investment === 0 ? null : (totalNet - parsed.investment) / parsed.investment;

  let paybackYears: number | null = null;
  if (netAnnual > 0) {
    paybackYears = parsed.investment / netAnnual;
    if (paybackYears > parsed.horizonYears) paybackYears = null;
  }

  // Confidence: if value case is unknown or missing, ROI is unknown-bucket.
  let confidence: ConfidenceBucket;
  if (!input.valueCase || input.valueCase.confidence === "unknown") {
    confidence = "unknown";
  } else {
    confidence = input.valueCase.confidence;
  }

  if (confidence === "unknown") {
    return {
      npv: null,
      roiPct: null,
      paybackYears: null,
      confidence,
      assumptions,
      evidence: input.evidence,
    };
  }

  return {
    npv,
    roiPct,
    paybackYears,
    confidence,
    assumptions,
    evidence: input.evidence,
  };
}
