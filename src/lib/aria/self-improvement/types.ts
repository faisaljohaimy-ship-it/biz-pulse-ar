// Phase 10.4 — Self-Improvement Engine: shared types. Server-only. Additive.

export type TriState = "pass" | "fail" | "unknown";
export type ConfidenceBucket = "low" | "medium" | "high" | "unknown";
export type ImprovementStatus =
  | "proposed"
  | "under_review"
  | "approved"
  | "rejected"
  | "scheduled"
  | "unknown";
export type GapKind =
  | "knowledge"
  | "capability"
  | "performance"
  | "quality"
  | "reliability"
  | "unknown";
export type ApprovalDecision = "approve" | "reject" | "defer" | "unknown";
export type EngineDecision =
  | "GO"
  | "NO_GO"
  | "GO_WITH_KNOWN_LIMITATIONS"
  | "UNKNOWN";

export interface EvidenceRef {
  readonly source: string; // e.g. "runtime.metrics" | "governance.audit"
  readonly ref: string; // opaque id / URL / row key
  readonly at: string; // ISO-8601
}

/** A concrete measurement captured from a real subsystem. Never synthetic. */
export interface EvidenceSample {
  readonly id: string;
  readonly subject: string; // e.g. "agent:executive_briefing"
  readonly metric: string; // e.g. "latency_p95_ms"
  readonly value: number;
  readonly unit: string;
  readonly capturedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface EvaluationCriterion {
  readonly id: string;
  readonly metric: string;
  readonly target: number;
  readonly comparator: "lte" | "gte" | "eq";
  readonly weight: number; // 0..1
}

export interface EvaluationOutcome {
  readonly criterionId: string;
  readonly observed: number | null;
  readonly target: number;
  readonly comparator: EvaluationCriterion["comparator"];
  readonly state: TriState;
  readonly detail: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface EvaluationReport {
  readonly subject: string;
  readonly outcomes: ReadonlyArray<EvaluationOutcome>;
  readonly overall: TriState;
  readonly score: number; // 0..1 weighted; 0 when unknown
  readonly evidence: ReadonlyArray<EvidenceRef>;
  readonly evaluatedAt: string;
}

export interface Benchmark {
  readonly id: string;
  readonly subject: string;
  readonly metric: string;
  readonly baseline: number;
  readonly capturedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface BenchmarkComparison {
  readonly benchmarkId: string;
  readonly subject: string;
  readonly metric: string;
  readonly baseline: number;
  readonly observed: number | null;
  readonly deltaPct: number | null;
  readonly regression: boolean;
  readonly state: TriState;
  readonly comparedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface RegressionFinding {
  readonly id: string;
  readonly subject: string;
  readonly metric: string;
  readonly severity: "low" | "medium" | "high" | "critical" | "unknown";
  readonly deltaPct: number | null;
  readonly detectedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface Gap {
  readonly id: string;
  readonly kind: GapKind;
  readonly subject: string;
  readonly detail: string;
  readonly severity: "low" | "medium" | "high" | "critical" | "unknown";
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface FailureCase {
  readonly id: string;
  readonly subject: string;
  readonly category: string;
  readonly occurrences: number;
  readonly firstSeenAt: string;
  readonly lastSeenAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface FeedbackSignal {
  readonly id: string;
  readonly subject: string;
  readonly channel: "user" | "operator" | "automated" | "unknown";
  readonly polarity: "positive" | "negative" | "neutral" | "unknown";
  readonly weight: number; // 0..1
  readonly capturedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface ImprovementScore {
  readonly impact: number; // 0..1
  readonly effort: number; // 0..1
  readonly risk: number; // 0..1
  readonly confidence: ConfidenceBucket;
  readonly composite: number; // 0..1
  readonly rationale: string;
}

export interface ImprovementProposal {
  readonly id: string;
  readonly title: string;
  readonly subject: string;
  readonly gapIds: ReadonlyArray<string>;
  readonly hypothesis: string;
  readonly score: ImprovementScore;
  readonly status: ImprovementStatus;
  readonly proposedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface Recommendation {
  readonly id: string;
  readonly proposalId: string;
  readonly summary: string;
  readonly confidence: ConfidenceBucket;
  readonly requiredApprovals: ReadonlyArray<string>;
  readonly issuedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface AbVariant {
  readonly id: string;
  readonly label: string;
  readonly samples: ReadonlyArray<EvidenceSample>;
}

export interface AbResult {
  readonly experimentId: string;
  readonly variants: ReadonlyArray<{
    readonly id: string;
    readonly n: number;
    readonly mean: number | null;
    readonly stddev: number | null;
  }>;
  readonly winnerId: string | null;
  readonly deltaPct: number | null;
  readonly confidence: ConfidenceBucket;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface QualitySignal {
  readonly subject: string;
  readonly dimension: "accuracy" | "helpfulness" | "safety" | "latency" | "cost";
  readonly value: number;
  readonly unit: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface RoadmapEntry {
  readonly rank: number;
  readonly proposalId: string;
  readonly recommendationId: string | null;
  readonly targetQuarter: string;
  readonly composite: number;
  readonly confidence: ConfidenceBucket;
}

export interface Roadmap {
  readonly generatedAt: string;
  readonly entries: ReadonlyArray<RoadmapEntry>;
}

export interface ApprovalRecord {
  readonly proposalId: string;
  readonly approverId: string;
  readonly decision: ApprovalDecision;
  readonly justification: string;
  readonly decidedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface SelfImprovementAuditEntry {
  readonly id: string;
  readonly at: string;
  readonly stage: string;
  readonly status: TriState;
  readonly detail: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface SelfImprovementMetrics {
  readonly evidenceCount: number;
  readonly evaluations: number;
  readonly benchmarks: number;
  readonly regressions: number;
  readonly gaps: number;
  readonly proposals: number;
  readonly recommendations: number;
  readonly approvals: number;
  readonly rejections: number;
  readonly roadmapEntries: number;
  readonly avgConfidence: number; // 0..1; 0 when unknown
}

export interface SelfImprovementTelemetry {
  readonly emittedAt: string;
  readonly metrics: SelfImprovementMetrics;
  readonly recentAudit: ReadonlyArray<SelfImprovementAuditEntry>;
}

export interface SelfImprovementReport {
  readonly evaluations: ReadonlyArray<EvaluationReport>;
  readonly comparisons: ReadonlyArray<BenchmarkComparison>;
  readonly regressions: ReadonlyArray<RegressionFinding>;
  readonly gaps: ReadonlyArray<Gap>;
  readonly failureCases: ReadonlyArray<FailureCase>;
  readonly feedback: ReadonlyArray<FeedbackSignal>;
  readonly proposals: ReadonlyArray<ImprovementProposal>;
  readonly recommendations: ReadonlyArray<Recommendation>;
  readonly abResults: ReadonlyArray<AbResult>;
  readonly approvals: ReadonlyArray<ApprovalRecord>;
  readonly roadmap: Roadmap;
  readonly metrics: SelfImprovementMetrics;
  readonly audit: ReadonlyArray<SelfImprovementAuditEntry>;
  readonly decision: EngineDecision;
  readonly reasons: ReadonlyArray<string>;
  readonly generatedAt: string;
}
