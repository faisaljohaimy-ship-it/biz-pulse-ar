/**
 * Executive Intelligence Runtime — shared contracts (Phase 6).
 *
 * This layer is the reasoning brain of NEXIOS: it evaluates information,
 * events, KPIs, risks and objectives and produces executive intelligence —
 * decisions, recommendations, insights, snapshots. It NEVER executes actions:
 * there is no execution surface anywhere in this layer; anything actionable
 * flows out as an approval-gated recommendation for the platform chain
 * (Platform Runtime → Orchestrator → Agent Gateway → Output Gateway).
 */
export class IntelError extends Error {
  constructor(
    readonly area: string,
    message: string,
  ) {
    super(`[intel:${area}] ${message}`);
    this.name = "IntelError";
  }
}

export type Clock = () => string;

export type ImpactLevel = "none" | "low" | "medium" | "high" | "critical";

export interface ImpactAssessment {
  readonly level: ImpactLevel;
  readonly summary: string;
}

export const IMPACT_RANK: Readonly<Record<ImpactLevel, number>> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export interface EvidenceItem {
  readonly id: string;
  readonly source: string;
  readonly topic: string;
  readonly statement: string;
  /** 0..1 — how strongly this item supports a conclusion. */
  readonly weight: number;
  readonly observedISO: string;
}

export interface DecisionAlternative {
  readonly id: string;
  readonly summary: string;
  readonly expectedOutcome: string;
  /** Why this path was NOT chosen. */
  readonly tradeoff: string;
}

export type Urgency = "routine" | "elevated" | "urgent" | "immediate";

/** The FULL executive decision model — every field is mandatory. */
export interface ExecutiveDecision {
  readonly decisionId: string;
  readonly context: string;
  readonly objective: string;
  readonly confidence: number; // 0..1
  readonly reasoningPath: readonly string[];
  readonly evidence: readonly EvidenceItem[];
  readonly sources: readonly string[];
  readonly businessImpact: ImpactAssessment;
  readonly financialImpact: ImpactAssessment;
  readonly operationalImpact: ImpactAssessment;
  readonly riskScore: number; // 0..100
  readonly complianceImpact: ImpactAssessment;
  readonly affectedSystems: readonly string[];
  readonly requiredApprovals: readonly string[];
  readonly alternatives: readonly DecisionAlternative[];
  readonly priority: number;
  readonly urgency: Urgency;
  readonly timestamp: string;
  readonly author: string;
  readonly trace: readonly string[];
}

/** Recommendations NEVER execute automatically — `required` is literally true. */
export interface ApprovalRequirement {
  readonly required: true;
  readonly approvers: readonly string[];
}

export type RecommendationStatus = "open" | "approved" | "declined" | "withdrawn";

export interface ExecutiveRecommendation {
  readonly id: string;
  readonly title: string;
  readonly confidence: number;
  readonly evidence: readonly EvidenceItem[];
  readonly reasoning: readonly string[];
  readonly expectedOutcome: string;
  readonly risk: ImpactAssessment;
  readonly alternative: string;
  readonly approvalRequirement: ApprovalRequirement;
  readonly affectedSystems: readonly string[];
  readonly estimatedCost: string;
  readonly estimatedTime: string;
  readonly createdISO: string;
  readonly status: RecommendationStatus;
}

export interface KpiSample {
  readonly kpiId: string;
  readonly value: number;
  readonly atISO: string;
}
