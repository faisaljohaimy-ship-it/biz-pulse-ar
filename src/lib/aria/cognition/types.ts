/**
 * Phase 8.8 — Executive Cognitive Layer (Meta Intelligence)
 * Strictly additive. Thinks only. Never executes, never mutates other layers.
 */

export type CognitiveMode =
  | "strategic"
  | "analytical"
  | "critical"
  | "creative"
  | "systems"
  | "root_cause"
  | "first_principles"
  | "risk"
  | "scenario"
  | "advisory";

export type EvidenceStrength = "weak" | "moderate" | "strong" | "conclusive";

export type SimulationOutcome = "best" | "expected" | "worst";

export type ContradictionKind =
  | "logical"
  | "policy"
  | "memory"
  | "context"
  | "evidence";

export interface EvidenceSource {
  readonly id: string;
  readonly kind:
    | "memory"
    | "context"
    | "execution"
    | "reasoning"
    | "learning"
    | "external";
  readonly label: string;
  readonly trust: number;
}

export interface Evidence {
  readonly id: string;
  readonly claim: string;
  readonly source: EvidenceSource;
  readonly weight: number;
  readonly strength: EvidenceStrength;
  readonly capturedAt: string;
  readonly refs: ReadonlyArray<string>;
}

export interface Assumption {
  readonly id: string;
  readonly statement: string;
  readonly criticality: "low" | "medium" | "high";
  readonly evidenceIds: ReadonlyArray<string>;
}

export interface Hypothesis {
  readonly id: string;
  readonly statement: string;
  readonly rationale: string;
  readonly supportingEvidenceIds: ReadonlyArray<string>;
  readonly opposingEvidenceIds: ReadonlyArray<string>;
  readonly confidence: number;
  readonly rejected: boolean;
  readonly rejectionReason: string | null;
}

export interface Tradeoff {
  readonly optionId: string;
  readonly pros: ReadonlyArray<string>;
  readonly cons: ReadonlyArray<string>;
  readonly cost: number;
  readonly risk: number;
  readonly speed: number;
  readonly accuracy: number;
  readonly complexity: number;
  readonly compliance: number;
  readonly maintainability: number;
}

export interface DecisionOption {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly hypothesisId: string;
  readonly evidenceIds: ReadonlyArray<string>;
}

export interface DecisionScore {
  readonly optionId: string;
  readonly score: number;
  readonly components: Readonly<Record<string, number>>;
}

export interface Alternative {
  readonly optionId: string;
  readonly reasonNotSelected: string;
}

export interface ConfidenceModel {
  readonly overall: number;
  readonly evidenceCoverage: number;
  readonly contradictionPenalty: number;
  readonly uncertaintyPenalty: number;
  readonly simulationSpread: number;
}

export interface Contradiction {
  readonly id: string;
  readonly kind: ContradictionKind;
  readonly description: string;
  readonly evidenceIds: ReadonlyArray<string>;
  readonly severity: "low" | "medium" | "high" | "critical";
}

export interface RiskSignal {
  readonly id: string;
  readonly description: string;
  readonly likelihood: number;
  readonly impact: number;
  readonly evidenceIds: ReadonlyArray<string>;
}

export interface Uncertainty {
  readonly id: string;
  readonly gap: string;
  readonly severity: "low" | "medium" | "high";
}

export interface CausalLink {
  readonly cause: string;
  readonly effect: string;
  readonly confidence: number;
  readonly evidenceIds: ReadonlyArray<string>;
}

export interface CausalGraph {
  readonly rootCause: string | null;
  readonly links: ReadonlyArray<CausalLink>;
  readonly secondOrderEffects: ReadonlyArray<string>;
}

export interface SimulationResult {
  readonly optionId: string;
  readonly outcome: SimulationOutcome;
  readonly narrative: string;
  readonly probability: number;
  readonly kpiDelta: Readonly<Record<string, number>>;
}

export interface ReasoningStep {
  readonly id: string;
  readonly kind:
    | "collect_evidence"
    | "generate_hypotheses"
    | "evaluate_alternatives"
    | "tradeoff"
    | "contradiction"
    | "causal"
    | "simulate"
    | "confidence"
    | "recommendation"
    | "reflection"
    | "verification";
  readonly summary: string;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly refs: ReadonlyArray<string>;
}

export interface ReasoningNode {
  readonly id: string;
  readonly label: string;
  readonly kind: "evidence" | "hypothesis" | "option" | "risk" | "assumption";
  readonly refId: string;
}

export interface ReasoningGraph {
  readonly nodes: ReadonlyArray<ReasoningNode>;
  readonly edges: ReadonlyArray<{ from: string; to: string; relation: string }>;
}

export interface ExecutiveRecommendation {
  readonly decisionOptionId: string;
  readonly title: string;
  readonly rationale: string;
  readonly nextAction: string;
  readonly businessImpact: string;
  readonly requiresApproval: boolean;
}

export interface CognitiveSession {
  readonly id: string;
  readonly goal: string;
  readonly mode: CognitiveMode;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly steps: ReadonlyArray<ReasoningStep>;
  readonly graph: ReasoningGraph;
  readonly evidence: ReadonlyArray<Evidence>;
  readonly assumptions: ReadonlyArray<Assumption>;
  readonly hypotheses: ReadonlyArray<Hypothesis>;
  readonly options: ReadonlyArray<DecisionOption>;
  readonly tradeoffs: ReadonlyArray<Tradeoff>;
  readonly scores: ReadonlyArray<DecisionScore>;
  readonly alternatives: ReadonlyArray<Alternative>;
  readonly contradictions: ReadonlyArray<Contradiction>;
  readonly risks: ReadonlyArray<RiskSignal>;
  readonly uncertainties: ReadonlyArray<Uncertainty>;
  readonly causal: CausalGraph;
  readonly simulations: ReadonlyArray<SimulationResult>;
  readonly confidence: ConfidenceModel;
  readonly recommendation: ExecutiveRecommendation;
  readonly explanationHuman: string;
  readonly explanationMachine: Readonly<Record<string, unknown>>;
  readonly verified: boolean;
  readonly verificationIssues: ReadonlyArray<string>;
}

export interface CognitiveMetrics {
  readonly sessions: number;
  readonly avgReasoningMs: number;
  readonly avgEvidence: number;
  readonly avgConfidence: number;
  readonly contradictionRate: number;
  readonly avgSimulationSpread: number;
  readonly rejectedByVerification: number;
  readonly lastRunAt: string | null;
}

export type CognitiveHealthStatus =
  | "healthy"
  | "learning"
  | "uncertain"
  | "blocked"
  | "degraded";

export interface CognitiveHealth {
  readonly status: CognitiveHealthStatus;
  readonly signals: ReadonlyArray<string>;
  readonly evaluatedAt: string;
}
