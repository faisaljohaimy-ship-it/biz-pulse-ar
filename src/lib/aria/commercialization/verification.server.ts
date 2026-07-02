import type {
  BusinessCase,
  CommercialDecision,
  CostBenefit,
  PricingQuote,
  ProcurementReadiness,
  Proposal,
  RiskDisclosure,
  RoiResult,
  ValueProposition,
} from "./types";

export interface VerificationOutput {
  readonly decision: CommercialDecision;
  readonly reasons: ReadonlyArray<string>;
}

export function verifyCommercialization(input: {
  valueProposition: ValueProposition;
  quote: PricingQuote;
  costBenefit: CostBenefit;
  roi: RoiResult;
  businessCase: BusinessCase;
  proposal: Proposal | null;
  risks: ReadonlyArray<RiskDisclosure>;
  procurement: ProcurementReadiness;
}): VerificationOutput {
  const reasons: string[] = [];

  if (input.valueProposition.assumptions.length === 0) {
    reasons.push("value_prop_missing_assumptions");
  }
  if (input.quote.assumptions.length === 0) reasons.push("quote_missing_assumptions");
  if (input.businessCase.assumptions.length === 0) {
    reasons.push("business_case_missing_assumptions");
  }
  if (input.businessCase.evidence.length === 0) reasons.push("business_case_no_evidence");

  // Any critical, un-mitigated (empty mitigation text) risk blocks GO.
  const critical = input.risks.filter((r) => r.severity === "critical");
  const criticalUnmitigated = critical.filter((r) => !r.mitigation.trim());
  if (criticalUnmitigated.length > 0) {
    reasons.push(`unmitigated_critical_risks:${criticalUnmitigated.length}`);
  }

  if (input.procurement.overall === "blocked") reasons.push("procurement_blocked");

  const unknownRoi = input.roi.confidence === "unknown";
  const unknownValue = input.valueProposition.confidence === "unknown";
  const unknownBenefit = input.costBenefit.confidence === "unknown";
  const unknownQuote = input.quote.confidence === "unknown";
  const procurementIncomplete = input.procurement.overall !== "ready";
  const noProposal = input.proposal === null;

  let decision: CommercialDecision;
  if (reasons.length > 0) decision = "NO_GO";
  else if (
    unknownRoi ||
    unknownValue ||
    unknownBenefit ||
    unknownQuote ||
    procurementIncomplete ||
    noProposal
  ) {
    decision = "GO_WITH_KNOWN_LIMITATIONS";
    if (unknownRoi) reasons.push("roi_unknown");
    if (unknownValue) reasons.push("value_proposition_unknown");
    if (unknownBenefit) reasons.push("cost_benefit_unknown");
    if (unknownQuote) reasons.push("quote_unknown");
    if (procurementIncomplete) reasons.push(`procurement:${input.procurement.overall}`);
    if (noProposal) reasons.push("proposal_missing");
  } else {
    decision = "GO";
    reasons.push("all_invariants_satisfied");
  }
  return { decision, reasons };
}
