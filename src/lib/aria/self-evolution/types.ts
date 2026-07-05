/**
 * ARIA Self-Evolution Engine — public types (server-only).
 *
 * The Self-Evolution Engine is a THIN orchestrator that composes the existing
 * `evolution/`, `self-improvement/`, and `production/` engines behind a single
 * controlled surface. It does NOT duplicate their logic and NEVER autonomously
 * mutates production code paths. Every proposal is evidence-first and requires
 * a human approval before it becomes actionable.
 */
import type {
  SelfImprovementReport,
  EngineDecision,
} from "../self-improvement/types";
import type { ReleaseDecisionReport } from "../production/types";

export type EvolutionStage =
  | "analyze"
  | "detect_issues"
  | "plan"
  | "estimate_risk"
  | "apply_safe_changes"
  | "validate"
  | "benchmark"
  | "report";

export type EvolutionStatus = "pass" | "warn" | "fail" | "unknown";

export interface EvolutionIssue {
  readonly id: string;
  readonly area:
    | "performance"
    | "memory"
    | "render"
    | "bundle"
    | "code_quality"
    | "type_safety"
    | "accessibility"
    | "rtl"
    | "arabic"
    | "error_handling"
    | "security"
    | "runtime_stability";
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly summary: string;
  readonly evidenceRefs: ReadonlyArray<string>;
}

export interface EvolutionStageResult {
  readonly stage: EvolutionStage;
  readonly status: EvolutionStatus;
  readonly detail: string;
  readonly startedAt: string;
  readonly finishedAt: string;
}

export interface EvolutionInvariants {
  readonly preserveArchitecture: true;
  readonly preservePublicApi: true;
  readonly preserveSingletons: true;
  readonly preserveSecurity: true;
  readonly preserveAriaIdentity: true;
  readonly zeroBreakingChanges: true;
  readonly zeroPlaceholders: true;
  readonly zeroDuplicateEngines: true;
}

export interface EvolutionReport {
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly decision: EngineDecision;
  readonly readiness: ReleaseDecisionReport | null;
  readonly improvement: SelfImprovementReport | null;
  readonly issues: ReadonlyArray<EvolutionIssue>;
  readonly stages: ReadonlyArray<EvolutionStageResult>;
  readonly applied: ReadonlyArray<string>;
  readonly deferred: ReadonlyArray<string>;
  readonly reasons: ReadonlyArray<string>;
  readonly invariants: EvolutionInvariants;
  readonly readinessScore: number; // 0..1
}
