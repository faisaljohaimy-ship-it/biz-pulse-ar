// Cost-benefit aggregation. Unknown-confidence benefit ⇒ total is null.
import type {
  BenefitItem,
  ConfidenceBucket,
  CostBenefit,
  CostItem,
  EvidenceRef,
} from "./types";
import { BenefitItemZ, CostItemZ } from "./contracts";

const RANK: Record<ConfidenceBucket, number> = { high: 3, medium: 2, low: 1, unknown: 0 };

export function buildCostBenefit(input: {
  currency: string;
  costs: ReadonlyArray<CostItem>;
  benefits: ReadonlyArray<BenefitItem>;
  evidence: ReadonlyArray<EvidenceRef>;
}): CostBenefit {
  if (input.evidence.length === 0) throw new Error("cost-benefit requires evidence");
  const costs = input.costs.map((c) => CostItemZ.parse(c));
  const benefits = input.benefits.map((b) => BenefitItemZ.parse(b));
  for (const c of costs) {
    if (c.currency !== input.currency) {
      throw new Error(`cost currency mismatch: ${c.currency} vs ${input.currency}`);
    }
  }
  for (const b of benefits) {
    if (b.currency !== input.currency) {
      throw new Error(`benefit currency mismatch: ${b.currency} vs ${input.currency}`);
    }
  }
  const totalOneOffCost = costs.filter((c) => !c.recurring).reduce((a, b) => a + b.amount, 0);
  const totalRecurringCost = costs.filter((c) => c.recurring).reduce((a, b) => a + b.amount, 0);
  const anyUnknownBenefit = benefits.some((b) => b.confidence === "unknown");
  const totalAnnualBenefit = anyUnknownBenefit
    ? null
    : benefits.reduce((a, b) => a + b.annualAmount, 0);
  const confidence: ConfidenceBucket =
    benefits.length === 0
      ? "unknown"
      : benefits.reduce<ConfidenceBucket>(
          (worst, b) => (RANK[b.confidence] < RANK[worst] ? b.confidence : worst),
          "high",
        );
  return {
    currency: input.currency,
    costs,
    benefits,
    totalOneOffCost,
    totalRecurringCost,
    totalAnnualBenefit,
    confidence,
    evidence: input.evidence,
  };
}
