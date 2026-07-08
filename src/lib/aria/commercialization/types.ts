// Phase 10.7 — Enterprise Commercialization Pack: shared types. Server-only. Additive.

export type TriState = "pass" | "fail" | "unknown";
export type ConfidenceBucket = "low" | "medium" | "high" | "unknown";
export type CommercialDecision = "GO" | "NO_GO" | "GO_WITH_KNOWN_LIMITATIONS" | "UNKNOWN";
export type Severity = "low" | "medium" | "high" | "critical" | "unknown";
export type LicensingModel = "subscription" | "usage_based" | "perpetual" | "hybrid" | "unknown";
export type BillingCycle = "monthly" | "quarterly" | "annual" | "multi_year" | "unknown";
export type PricingTier = "starter" | "professional" | "enterprise" | "custom" | "unknown";
export type ProcurementItemState = "not_started" | "in_progress" | "ready" | "blocked" | "unknown";

export interface EvidenceRef {
  readonly source: string;
  readonly ref: string;
  readonly at: string;
}

export interface Positioning {
  readonly id: string;
  readonly market: string;
  readonly targetSegment: string;
  readonly buyerPersona: string;
  readonly differentiators: ReadonlyArray<string>;
  readonly competitiveContext: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface ValueProposition {
  readonly id: string;
  readonly headline: string;
  readonly outcomes: ReadonlyArray<string>;
  readonly proofPoints: ReadonlyArray<string>;
  readonly assumptions: ReadonlyArray<string>;
  readonly confidence: ConfidenceBucket;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface PricingComponent {
  readonly id: string;
  readonly label: string;
  readonly unit: string; // e.g. "user/month", "workflow-execution", "flat"
  readonly unitPrice: number;
  readonly currency: string;
  readonly minUnits: number;
  readonly maxUnits: number | null;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface PricingPackage {
  readonly id: string;
  readonly tier: PricingTier;
  readonly label: string;
  readonly components: ReadonlyArray<PricingComponent>;
  readonly billingCycle: BillingCycle;
  readonly currency: string;
  readonly assumptions: ReadonlyArray<string>;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface PricingQuote {
  readonly packageId: string;
  readonly quantities: Readonly<Record<string, number>>; // componentId -> qty
  readonly subtotal: number;
  readonly discountPct: number; // 0..1
  readonly total: number;
  readonly currency: string;
  readonly billingCycle: BillingCycle;
  readonly confidence: ConfidenceBucket;
  readonly assumptions: ReadonlyArray<string>;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface LicensingOption {
  readonly id: string;
  readonly model: LicensingModel;
  readonly termMonths: number;
  readonly seatCap: number | null;
  readonly usageCap: number | null;
  readonly renewalPolicy: string;
  readonly cancellationPolicy: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface RoiInputs {
  readonly investment: number;
  readonly annualValue: number;
  readonly annualCost: number;
  readonly horizonYears: number;
  readonly discountRate: number; // 0..1
  readonly currency: string;
}

export interface RoiResult {
  readonly npv: number | null;
  readonly roiPct: number | null;
  readonly paybackYears: number | null;
  readonly confidence: ConfidenceBucket;
  readonly assumptions: ReadonlyArray<string>;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface CostItem {
  readonly id: string;
  readonly label: string;
  readonly amount: number;
  readonly currency: string;
  readonly recurring: boolean;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface BenefitItem {
  readonly id: string;
  readonly label: string;
  readonly annualAmount: number;
  readonly currency: string;
  readonly confidence: ConfidenceBucket;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface CostBenefit {
  readonly currency: string;
  readonly costs: ReadonlyArray<CostItem>;
  readonly benefits: ReadonlyArray<BenefitItem>;
  readonly totalOneOffCost: number;
  readonly totalRecurringCost: number;
  readonly totalAnnualBenefit: number | null;
  readonly confidence: ConfidenceBucket;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface BusinessCase {
  readonly id: string;
  readonly sponsor: string;
  readonly summary: string;
  readonly positioningId: string;
  readonly valuePropositionId: string;
  readonly pricingPackageId: string;
  readonly licensingOptionId: string;
  readonly costBenefit: CostBenefit;
  readonly roi: RoiResult;
  readonly assumptions: ReadonlyArray<string>;
  readonly evidence: ReadonlyArray<EvidenceRef>;
  readonly createdAt: string;
}

export interface Proposal {
  readonly id: string;
  readonly businessCaseId: string;
  readonly customer: string;
  readonly validUntil: string;
  readonly executiveSummary: string;
  readonly deliverables: ReadonlyArray<string>;
  readonly acceptanceCriteria: ReadonlyArray<string>;
  readonly evidence: ReadonlyArray<EvidenceRef>;
  readonly createdAt: string;
}

export interface ExecutiveSummary {
  readonly businessCaseId: string;
  readonly headline: string;
  readonly outcomes: ReadonlyArray<string>;
  readonly investment: number;
  readonly annualValue: number;
  readonly roiPct: number | null;
  readonly paybackYears: number | null;
  readonly confidence: ConfidenceBucket;
  readonly assumptions: ReadonlyArray<string>;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface ProcurementChecklistItem {
  readonly id: string;
  readonly title: string;
  readonly owner: string;
  readonly state: ProcurementItemState;
  readonly detail: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface ProcurementReadiness {
  readonly items: ReadonlyArray<ProcurementChecklistItem>;
  readonly readyCount: number;
  readonly blockedCount: number;
  readonly overall: ProcurementItemState;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface RiskDisclosure {
  readonly id: string;
  readonly title: string;
  readonly likelihood: number; // 0..1
  readonly impact: number; // 0..1
  readonly severity: Severity;
  readonly mitigation: string;
  readonly disclosureText: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface PilotToContractStep {
  readonly order: number;
  readonly title: string;
  readonly owner: string;
  readonly durationDays: number;
  readonly exitCriteria: ReadonlyArray<string>;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface PilotToContractPath {
  readonly pilotId: string;
  readonly steps: ReadonlyArray<PilotToContractStep>;
  readonly totalDays: number;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface SupportTier {
  readonly id: string;
  readonly label: string;
  readonly channels: ReadonlyArray<"email" | "chat" | "phone" | "onsite">;
  readonly hours: string;
  readonly firstResponseMinutes: number;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface SupportModel {
  readonly tiers: ReadonlyArray<SupportTier>;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface SlaTarget {
  readonly id: string;
  readonly metric: string;
  readonly target: number;
  readonly unit: string;
  readonly credit: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface SlaModel {
  readonly targets: ReadonlyArray<SlaTarget>;
  readonly measurementWindow: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface CommercializationAuditEntry {
  readonly id: string;
  readonly at: string;
  readonly stage: string;
  readonly status: TriState;
  readonly detail: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface CommercializationMetrics {
  readonly pricingPackages: number;
  readonly quotes: number;
  readonly licensingOptions: number;
  readonly costItems: number;
  readonly benefitItems: number;
  readonly proposals: number;
  readonly risksDisclosed: number;
  readonly procurementReady: number;
  readonly procurementBlocked: number;
  readonly avgConfidence: number; // 0..1
}

export interface CommercializationTelemetry {
  readonly emittedAt: string;
  readonly metrics: CommercializationMetrics;
  readonly recent: ReadonlyArray<CommercializationAuditEntry>;
}

export interface CommercializationReport {
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
  readonly metrics: CommercializationMetrics;
  readonly audit: ReadonlyArray<CommercializationAuditEntry>;
  readonly decision: CommercialDecision;
  readonly reasons: ReadonlyArray<string>;
  readonly generatedAt: string;
}
