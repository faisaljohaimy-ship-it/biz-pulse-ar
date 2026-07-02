// Phase 10.7 — Commercialization Zod contracts.
import { z } from "zod";

export const EvidenceRefZ = z.object({
  source: z.string().min(1),
  ref: z.string().min(1),
  at: z.string().min(1),
});

export const ConfidenceZ = z.enum(["low", "medium", "high", "unknown"]);
export const SeverityZ = z.enum(["low", "medium", "high", "critical", "unknown"]);
export const BillingCycleZ = z.enum([
  "monthly",
  "quarterly",
  "annual",
  "multi_year",
  "unknown",
]);
export const TierZ = z.enum(["starter", "professional", "enterprise", "custom", "unknown"]);
export const LicensingModelZ = z.enum([
  "subscription",
  "usage_based",
  "perpetual",
  "hybrid",
  "unknown",
]);

export const PositioningZ = z.object({
  id: z.string().min(1),
  market: z.string().min(1),
  targetSegment: z.string().min(1),
  buyerPersona: z.string().min(1),
  differentiators: z.array(z.string().min(1)).min(1),
  competitiveContext: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const ValuePropositionZ = z.object({
  id: z.string().min(1),
  headline: z.string().min(1),
  outcomes: z.array(z.string().min(1)).min(1),
  proofPoints: z.array(z.string().min(1)).default([]),
  assumptions: z.array(z.string().min(1)).min(1),
  confidence: ConfidenceZ,
  evidence: z.array(EvidenceRefZ).min(1),
});

export const PricingComponentZ = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  unit: z.string().min(1),
  unitPrice: z.number().finite().nonnegative(),
  currency: z.string().min(1),
  minUnits: z.number().int().nonnegative(),
  maxUnits: z.number().int().positive().nullable(),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const PricingPackageZ = z.object({
  id: z.string().min(1),
  tier: TierZ,
  label: z.string().min(1),
  components: z.array(PricingComponentZ).min(1),
  billingCycle: BillingCycleZ,
  currency: z.string().min(1),
  assumptions: z.array(z.string().min(1)).min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const LicensingOptionZ = z.object({
  id: z.string().min(1),
  model: LicensingModelZ,
  termMonths: z.number().int().positive(),
  seatCap: z.number().int().positive().nullable(),
  usageCap: z.number().int().positive().nullable(),
  renewalPolicy: z.string().min(1),
  cancellationPolicy: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const RoiInputsZ = z.object({
  investment: z.number().finite().nonnegative(),
  annualValue: z.number().finite().nonnegative(),
  annualCost: z.number().finite().nonnegative(),
  horizonYears: z.number().int().positive(),
  discountRate: z.number().min(0).max(1),
  currency: z.string().min(1),
});

export const CostItemZ = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  amount: z.number().finite().nonnegative(),
  currency: z.string().min(1),
  recurring: z.boolean(),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const BenefitItemZ = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  annualAmount: z.number().finite().nonnegative(),
  currency: z.string().min(1),
  confidence: ConfidenceZ,
  evidence: z.array(EvidenceRefZ).min(1),
});

export const ProcurementChecklistItemZ = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  owner: z.string().min(1),
  state: z.enum(["not_started", "in_progress", "ready", "blocked", "unknown"]),
  detail: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const RiskDisclosureZ = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  likelihood: z.number().min(0).max(1),
  impact: z.number().min(0).max(1),
  severity: SeverityZ,
  mitigation: z.string().min(1),
  disclosureText: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const PilotToContractStepZ = z.object({
  order: z.number().int().positive(),
  title: z.string().min(1),
  owner: z.string().min(1),
  durationDays: z.number().int().positive(),
  exitCriteria: z.array(z.string().min(1)).min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const SupportTierZ = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  channels: z.array(z.enum(["email", "chat", "phone", "onsite"])).min(1),
  hours: z.string().min(1),
  firstResponseMinutes: z.number().int().positive(),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const SlaTargetZ = z.object({
  id: z.string().min(1),
  metric: z.string().min(1),
  target: z.number().finite(),
  unit: z.string().min(1),
  credit: z.string().min(1),
  evidence: z.array(EvidenceRefZ).min(1),
});

export const ProposalInputZ = z.object({
  id: z.string().min(1),
  businessCaseId: z.string().min(1),
  customer: z.string().min(1),
  validUntil: z.string().min(1),
  executiveSummary: z.string().min(1),
  deliverables: z.array(z.string().min(1)).min(1),
  acceptanceCriteria: z.array(z.string().min(1)).min(1),
  evidence: z.array(EvidenceRefZ).min(1),
  createdAt: z.string().min(1),
});
