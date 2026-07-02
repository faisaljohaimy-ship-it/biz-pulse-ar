import type {
  BusinessCase,
  CostBenefit,
  EvidenceRef,
  LicensingOption,
  PricingPackage,
  Positioning,
  RoiResult,
  ValueProposition,
} from "./types";

export function buildBusinessCase(input: {
  id: string;
  sponsor: string;
  summary: string;
  positioning: Positioning;
  valueProposition: ValueProposition;
  pricingPackage: PricingPackage;
  licensingOption: LicensingOption;
  costBenefit: CostBenefit;
  roi: RoiResult;
  additionalAssumptions?: ReadonlyArray<string>;
  evidence: ReadonlyArray<EvidenceRef>;
  createdAt: string;
}): BusinessCase {
  if (!input.id.trim()) throw new Error("business case id required");
  if (!input.sponsor.trim()) throw new Error("business case sponsor required");
  if (input.evidence.length === 0) {
    throw new Error("business case requires evidence");
  }
  const assumptions = [
    ...input.valueProposition.assumptions,
    ...input.costBenefit.evidence.map((e) => `cost_benefit:${e.source}`),
    ...input.roi.assumptions,
    ...(input.additionalAssumptions ?? []),
  ];
  return {
    id: input.id,
    sponsor: input.sponsor,
    summary: input.summary,
    positioningId: input.positioning.id,
    valuePropositionId: input.valueProposition.id,
    pricingPackageId: input.pricingPackage.id,
    licensingOptionId: input.licensingOption.id,
    costBenefit: input.costBenefit,
    roi: input.roi,
    assumptions,
    evidence: input.evidence,
    createdAt: input.createdAt,
  };
}
