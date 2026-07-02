// Phase 10.7 — Commercialization Pack public barrel + orchestrator.
// Server-only. Strictly additive. Never fabricates commercial claims.

export * from "./types";
export * as CommercializationContracts from "./contracts";

export { definePositioning } from "./positioning.server";
export { defineValueProposition } from "./value-proposition.server";
export { definePricingPackage, computeQuote } from "./pricing-model.server";
export { defineLicensingOption } from "./licensing.server";
export { computeRoi } from "./roi-calculator.server";
export { buildCostBenefit } from "./cost-benefit.server";
export { buildBusinessCase } from "./business-case.server";
export { buildProposal } from "./proposal.server";
export { buildExecutiveSummary } from "./executive-summary.server";
export { assessProcurement } from "./procurement-readiness.server";
export {
  deriveSeverity,
  discloseRisk,
  summarizeRisks,
} from "./risk-disclosure.server";
export { buildPilotToContractPath } from "./pilot-to-contract.server";
export { buildSupportModel } from "./support-model.server";
export { buildSlaModel } from "./sla-model.server";
export { createCommercializationAudit } from "./audit.server";
export { computeCommercializationMetrics } from "./metrics.server";
export { emitCommercializationTelemetry } from "./telemetry.server";
export {
  verifyCommercialization,
  type VerificationOutput,
} from "./verification.server";

import type {
  BusinessCase,
  CommercializationReport,
  CostBenefit,
  ExecutiveSummary,
  LicensingOption,
  PilotToContractPath,
  Positioning,
  PricingPackage,
  PricingQuote,
  ProcurementReadiness,
  Proposal,
  RiskDisclosure,
  RoiResult,
  SlaModel,
  SupportModel,
  ValueProposition,
} from "./types";
import { createCommercializationAudit } from "./audit.server";
import { computeCommercializationMetrics } from "./metrics.server";
import { verifyCommercialization } from "./verification.server";

export interface CommercializationPipelineInput {
  readonly positioning: Positioning;
  readonly valueProposition: ValueProposition;
  readonly pricingPackage: PricingPackage;
  readonly quote: PricingQuote;
  readonly licensingOption: LicensingOption;
  readonly costBenefit: CostBenefit;
  readonly roi: RoiResult;
  readonly businessCase: BusinessCase;
  readonly proposal: Proposal;
  readonly executiveSummary: ExecutiveSummary;
  readonly procurement: ProcurementReadiness;
  readonly risks: ReadonlyArray<RiskDisclosure>;
  readonly pilotToContract: PilotToContractPath;
  readonly support: SupportModel;
  readonly sla: SlaModel;
  readonly now: string;
}

export function runCommercializationPipeline(
  input: CommercializationPipelineInput,
): CommercializationReport {
  const audit = createCommercializationAudit();
  audit.append({ at: input.now, stage: "positioning", status: "pass", detail: input.positioning.id });
  audit.append({
    at: input.now,
    stage: "value_proposition",
    status: input.valueProposition.confidence === "unknown" ? "unknown" : "pass",
    detail: `confidence=${input.valueProposition.confidence}`,
  });
  audit.append({
    at: input.now,
    stage: "pricing",
    status: input.quote.confidence === "unknown" ? "unknown" : "pass",
    detail: `total=${input.quote.total} ${input.quote.currency}`,
  });
  audit.append({
    at: input.now,
    stage: "licensing",
    status: "pass",
    detail: `${input.licensingOption.model}/${input.licensingOption.termMonths}m`,
  });
  audit.append({
    at: input.now,
    stage: "cost_benefit",
    status: input.costBenefit.confidence === "unknown" ? "unknown" : "pass",
    detail: `confidence=${input.costBenefit.confidence}`,
  });
  audit.append({
    at: input.now,
    stage: "roi",
    status: input.roi.confidence === "unknown" ? "unknown" : "pass",
    detail: `roiPct=${input.roi.roiPct ?? "?"}`,
  });
  audit.append({
    at: input.now,
    stage: "business_case",
    status: "pass",
    detail: input.businessCase.id,
  });
  audit.append({
    at: input.now,
    stage: "proposal",
    status: "pass",
    detail: input.proposal.id,
  });
  audit.append({
    at: input.now,
    stage: "procurement",
    status:
      input.procurement.overall === "ready"
        ? "pass"
        : input.procurement.overall === "blocked"
          ? "fail"
          : "unknown",
    detail: input.procurement.overall,
  });

  const metrics = computeCommercializationMetrics({
    pricingPackage: input.pricingPackage,
    quote: input.quote,
    licensingOption: input.licensingOption,
    costBenefit: input.costBenefit,
    businessCase: input.businessCase,
    proposal: input.proposal,
    risks: input.risks,
    procurement: input.procurement,
  });

  const { decision, reasons } = verifyCommercialization({
    valueProposition: input.valueProposition,
    quote: input.quote,
    costBenefit: input.costBenefit,
    roi: input.roi,
    businessCase: input.businessCase,
    proposal: input.proposal,
    risks: input.risks,
    procurement: input.procurement,
  });
  audit.append({
    at: input.now,
    stage: "verify",
    status: decision === "GO" ? "pass" : decision === "NO_GO" ? "fail" : "unknown",
    detail: decision,
  });

  return {
    positioning: input.positioning,
    valueProposition: input.valueProposition,
    pricingPackage: input.pricingPackage,
    quote: input.quote,
    licensingOption: input.licensingOption,
    costBenefit: input.costBenefit,
    roi: input.roi,
    businessCase: input.businessCase,
    proposal: input.proposal,
    executiveSummary: input.executiveSummary,
    procurement: input.procurement,
    risks: input.risks,
    pilotToContract: input.pilotToContract,
    support: input.support,
    sla: input.sla,
    metrics,
    audit: audit.entries(),
    decision,
    reasons,
    generatedAt: input.now,
  };
}
