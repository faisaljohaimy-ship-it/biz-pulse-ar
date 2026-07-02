// Phase 10.6 — Executive Pilot Readiness Pack: shared types. Server-only. Additive.

export type TriState = "pass" | "fail" | "unknown";
export type ConfidenceBucket = "low" | "medium" | "high" | "unknown";
export type PilotDecision = "GO" | "NO_GO" | "GO_WITH_KNOWN_LIMITATIONS" | "UNKNOWN";
export type StakeholderInfluence = "low" | "medium" | "high" | "critical" | "unknown";
export type StakeholderStance = "champion" | "supporter" | "neutral" | "skeptic" | "blocker" | "unknown";
export type Severity = "low" | "medium" | "high" | "critical" | "unknown";
export type AcceptanceState = "pass" | "fail" | "not_run" | "unknown";

export interface EvidenceRef {
  readonly source: string;
  readonly ref: string;
  readonly at: string;
}

export interface PilotScope {
  readonly pilotId: string;
  readonly title: string;
  readonly sponsor: string;
  readonly businessUnit: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly includedCapabilities: ReadonlyArray<string>;
  readonly excludedCapabilities: ReadonlyArray<string>;
  readonly participants: ReadonlyArray<string>;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface Stakeholder {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly influence: StakeholderInfluence;
  readonly stance: StakeholderStance;
  readonly interests: ReadonlyArray<string>;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface SuccessCriterion {
  readonly id: string;
  readonly title: string;
  readonly metric: string;
  readonly target: number;
  readonly comparator: "lte" | "gte" | "eq";
  readonly weight: number; // 0..1
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface SuccessMeasurement {
  readonly criterionId: string;
  readonly observed: number | null;
  readonly state: TriState;
  readonly detail: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface DemoStep {
  readonly order: number;
  readonly title: string;
  readonly narrative: string;
  readonly capability: string;
  readonly durationMinutes: number;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface DemoScript {
  readonly pilotId: string;
  readonly audience: string;
  readonly totalMinutes: number;
  readonly steps: ReadonlyArray<DemoStep>;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface AcceptanceTest {
  readonly id: string;
  readonly title: string;
  readonly criterionId: string | null;
  readonly precondition: string;
  readonly action: string;
  readonly expected: string;
  readonly observed: string | null;
  readonly state: AcceptanceState;
  readonly executedAt: string | null;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface FeedbackItem {
  readonly id: string;
  readonly participantId: string;
  readonly channel: "interview" | "survey" | "observed" | "email" | "unknown";
  readonly sentiment: "positive" | "negative" | "neutral" | "unknown";
  readonly detail: string;
  readonly capturedAt: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface TrainingModule {
  readonly id: string;
  readonly title: string;
  readonly audience: string;
  readonly durationMinutes: number;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface TrainingPlan {
  readonly pilotId: string;
  readonly modules: ReadonlyArray<TrainingModule>;
  readonly totalMinutes: number;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface SupportChannel {
  readonly id: string;
  readonly kind: "email" | "chat" | "phone" | "onsite" | "unknown";
  readonly slaMinutes: number | null;
  readonly hours: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface SupportPlan {
  readonly pilotId: string;
  readonly channels: ReadonlyArray<SupportChannel>;
  readonly escalationPath: ReadonlyArray<string>;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface RiskEntry {
  readonly id: string;
  readonly title: string;
  readonly likelihood: number; // 0..1
  readonly impact: number; // 0..1
  readonly severity: Severity;
  readonly mitigation: string;
  readonly owner: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface GovernancePlan {
  readonly pilotId: string;
  readonly steeringCommittee: ReadonlyArray<string>;
  readonly cadence: string;
  readonly decisionRights: ReadonlyArray<{ decision: string; owner: string }>;
  readonly escalationPolicy: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface RolloutWave {
  readonly waveNumber: number;
  readonly label: string;
  readonly targetUsers: number;
  readonly startDate: string;
  readonly exitCriteriaIds: ReadonlyArray<string>;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface RolloutPlan {
  readonly pilotId: string;
  readonly waves: ReadonlyArray<RolloutWave>;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface ValueDriver {
  readonly id: string;
  readonly title: string;
  readonly annualValue: number;
  readonly currency: string;
  readonly confidence: ConfidenceBucket;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface ValueCase {
  readonly pilotId: string;
  readonly drivers: ReadonlyArray<ValueDriver>;
  readonly totalAnnualValue: number | null;
  readonly currency: string;
  readonly confidence: ConfidenceBucket;
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

export interface PilotAuditEntry {
  readonly id: string;
  readonly at: string;
  readonly stage: string;
  readonly status: TriState;
  readonly detail: string;
  readonly evidence: ReadonlyArray<EvidenceRef>;
}

export interface PilotMetrics {
  readonly stakeholders: number;
  readonly champions: number;
  readonly blockers: number;
  readonly criteria: number;
  readonly acceptanceRun: number;
  readonly acceptancePass: number;
  readonly acceptanceFail: number;
  readonly feedbackCount: number;
  readonly positiveFeedback: number;
  readonly negativeFeedback: number;
  readonly criticalRisks: number;
  readonly rolloutWaves: number;
  readonly valueDrivers: number;
}

export interface PilotTelemetry {
  readonly emittedAt: string;
  readonly metrics: PilotMetrics;
  readonly recent: ReadonlyArray<PilotAuditEntry>;
}

export interface PilotReadinessReport {
  readonly scope: PilotScope;
  readonly stakeholders: ReadonlyArray<Stakeholder>;
  readonly criteria: ReadonlyArray<SuccessCriterion>;
  readonly measurements: ReadonlyArray<SuccessMeasurement>;
  readonly demoScript: DemoScript;
  readonly acceptanceTests: ReadonlyArray<AcceptanceTest>;
  readonly feedback: ReadonlyArray<FeedbackItem>;
  readonly training: TrainingPlan;
  readonly support: SupportPlan;
  readonly risks: ReadonlyArray<RiskEntry>;
  readonly governance: GovernancePlan;
  readonly rollout: RolloutPlan;
  readonly valueCase: ValueCase;
  readonly roi: RoiResult;
  readonly metrics: PilotMetrics;
  readonly audit: ReadonlyArray<PilotAuditEntry>;
  readonly decision: PilotDecision;
  readonly reasons: ReadonlyArray<string>;
  readonly generatedAt: string;
}
