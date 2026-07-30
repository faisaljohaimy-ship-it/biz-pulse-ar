import type {
  BusinessCase,
  CommercializationMetrics,
  ConfidenceBucket,
  CostBenefit,
  LicensingOption,
  PricingPackage,
  PricingQuote,
  ProcurementReadiness,
  Proposal,
  RiskDisclosure,
} from "./types";

const RANK: Record<ConfidenceBucket, number> = { high: 1, medium: 0.66, low: 0.33, unknown: 0 };

export function computeCommercializationMetrics(input: {
  pricingPackage: PricingPackage;
  quote: PricingQuote;
  licensingOption: LicensingOption;
  costBenefit: CostBenefit;
  businessCase: BusinessCase;
  proposal: Proposal | null;
  risks: ReadonlyArray<RiskDisclosure>;
  procurement: ProcurementReadiness;
}): CommercializationMetrics {
  const confidences = [
    input.quote.confidence,
    input.costBenefit.confidence,
    input.businessCase.roi.confidence,
  ];
  const avg = confidences.reduce((a, b) => a + (RANK[b] ?? 0), 0) / confidences.length;
  return {
    pricingPackages: 1,
    quotes: 1,
    licensingOptions: 1,
    costItems: input.costBenefit.costs.length,
    benefitItems: input.costBenefit.benefits.length,
    proposals: input.proposal ? 1 : 0,
    risksDisclosed: input.risks.length,
    procurementReady: input.procurement.readyCount,
    procurementBlocked: input.procurement.blockedCount,
    avgConfidence: avg,
  };
}
