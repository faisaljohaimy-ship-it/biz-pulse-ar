/**
 * Phase 8.7 — Autonomous Learning & Knowledge Evolution
 * Strictly additive. Consumes execution/reasoning outputs; never mutates them.
 */

export type LearningMode =
  | "post_mission"
  | "post_reasoning"
  | "periodic"
  | "on_feedback";

export type EvidenceStrength = "weak" | "moderate" | "strong" | "conclusive";

export type PatternKind =
  | "recurring_success"
  | "recurring_failure"
  | "bottleneck"
  | "capability_gap"
  | "cluster";

export type Trend = "improving" | "stable" | "regressing" | "unknown";

export interface Experience {
  readonly id: string;
  readonly missionId: string | null;
  readonly source: "execution" | "reasoning" | "decision" | "feedback";
  readonly capturedAt: string;
  readonly capability: string | null;
  readonly agentId: string | null;
  readonly durationMs: number;
  readonly success: boolean;
  readonly confidence: number;
  readonly retries: number;
  readonly rollbacks: number;
  readonly failureClass: string | null;
  readonly context: Readonly<Record<string, string | number | boolean>>;
}

export interface LearningCase {
  readonly id: string;
  readonly title: string;
  readonly experiences: ReadonlyArray<Experience>;
  readonly createdAt: string;
  readonly mode: LearningMode;
}

export interface Pattern {
  readonly id: string;
  readonly kind: PatternKind;
  readonly signature: string;
  readonly occurrences: number;
  readonly firstSeen: string;
  readonly lastSeen: string;
  readonly avgConfidence: number;
  readonly avgDurationMs: number;
  readonly failureRate: number;
  readonly capability: string | null;
  readonly evidenceIds: ReadonlyArray<string>;
}

export interface FailurePattern extends Pattern {
  readonly kind: "recurring_failure";
  readonly failureClass: string;
  readonly retryEffective: boolean;
}

export interface SuccessPattern extends Pattern {
  readonly kind: "recurring_success";
  readonly stability: number;
}

export interface Lesson {
  readonly id: string;
  readonly patternId: string;
  readonly statement: string;
  readonly rationale: string;
  readonly evidenceStrength: EvidenceStrength;
  readonly confidence: number;
  readonly createdAt: string;
  readonly evidenceIds: ReadonlyArray<string>;
  readonly appliesTo: ReadonlyArray<string>;
}

export interface Improvement {
  readonly id: string;
  readonly lessonId: string;
  readonly target:
    | "planner"
    | "reasoning"
    | "orchestrator"
    | "marketplace"
    | "execution"
    | "recovery";
  readonly action: string;
  readonly expectedImpact: string;
  readonly priority: "low" | "medium" | "high" | "critical";
  readonly confidence: number;
}

export interface KnowledgeArtifact {
  readonly id: string;
  readonly version: number;
  readonly title: string;
  readonly kind: "lesson" | "playbook" | "guideline" | "capability_profile";
  readonly body: string;
  readonly tags: ReadonlyArray<string>;
  readonly links: ReadonlyArray<string>;
  readonly evidenceIds: ReadonlyArray<string>;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly supersedes: string | null;
}

export interface CapabilityScore {
  readonly capability: string;
  readonly score: number;
  readonly samples: number;
  readonly avgConfidence: number;
  readonly successRate: number;
  readonly avgDurationMs: number;
  readonly updatedAt: string;
}

export interface ConfidenceHistory {
  readonly capability: string;
  readonly points: ReadonlyArray<{ at: string; value: number }>;
}

export interface SkillEvolution {
  readonly capability: string;
  readonly before: CapabilityScore | null;
  readonly after: CapabilityScore;
  readonly delta: number;
  readonly trend: Trend;
  readonly notedAt: string;
}

export interface LearningMetrics {
  readonly experiencesIngested: number;
  readonly patternsDetected: number;
  readonly lessonsCreated: number;
  readonly artifactsPublished: number;
  readonly recommendationsProposed: number;
  readonly rejectedByVerification: number;
  readonly capabilityUpdates: number;
  readonly lastRunAt: string | null;
}

export type LearningHealthStatus =
  | "healthy"
  | "degraded"
  | "starved"
  | "noisy"
  | "critical";

export interface LearningHealth {
  readonly status: LearningHealthStatus;
  readonly signals: ReadonlyArray<string>;
  readonly evaluatedAt: string;
}
