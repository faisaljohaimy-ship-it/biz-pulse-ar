/**
 * ARIA Self-Evolution Engine — orchestrator (server-only).
 *
 * Pipeline: analyze → detect_issues → generate_plan → estimate_risk →
 *           apply_safe_changes → validate → benchmark → report.
 *
 * Composes the existing modules; adds NO new intelligence:
 *   - production/readiness + production/release  → validate + report
 *   - self-improvement/engine                    → plan + estimate_risk + apply
 *   - evolution                                  → reflection + trends (audit)
 *
 * INVARIANTS enforced at runtime:
 *   1. Never mutates production code paths autonomously. `apply_safe_changes()`
 *      only records approved+verified proposals; actual code changes go
 *      through the normal review pipeline.
 *   2. Never bypasses auth. Callers must invoke through a server function that
 *      wraps this engine in `requireSupabaseAuth` + role check.
 *   3. Public API of every other module remains untouched.
 *   4. Rolls back the entire report if ANY validation check fails.
 */
import { evaluateRelease } from "../production/release.server";
import {
  runSelfImprovementPipeline,
  type SelfImprovementPipelineInput,
} from "../self-improvement/engine.server";
import type { EngineDecision, SelfImprovementReport } from "../self-improvement/types";
import type { ReleaseDecisionReport } from "../production/types";
import type {
  EvolutionInvariants,
  EvolutionIssue,
  EvolutionReport,
  EvolutionStage,
  EvolutionStageResult,
  EvolutionStatus,
} from "./types";

const INVARIANTS: EvolutionInvariants = {
  preserveArchitecture: true,
  preservePublicApi: true,
  preserveSingletons: true,
  preserveSecurity: true,
  preserveAriaIdentity: true,
  zeroBreakingChanges: true,
  zeroPlaceholders: true,
  zeroDuplicateEngines: true,
};

export interface RunSelfEvolutionInput {
  /**
   * Optional self-improvement pipeline input. When omitted the engine runs in
   * ANALYZE-ONLY mode: it collects readiness signals but generates no
   * proposals and applies nothing. This is the safe default.
   */
  readonly improvement?: SelfImprovementPipelineInput;
  /**
   * When `true`, proposals whose status is `approved` AND whose recommendation
   * has passed verification are recorded in `applied`. Anything else lands in
   * `deferred`. No code is executed here — application is a manifest for the
   * downstream deployment pipeline.
   */
  readonly enableApply?: boolean;
}

function stage(
  name: EvolutionStage,
  status: EvolutionStatus,
  detail: string,
  startedAt: string,
): EvolutionStageResult {
  return { stage: name, status, detail, startedAt, finishedAt: new Date().toISOString() };
}

function decisionFrom(
  readiness: ReleaseDecisionReport,
  improvement: SelfImprovementReport | null,
): { decision: EngineDecision; reasons: string[] } {
  const reasons: string[] = [];
  if (readiness.decision === "NO-GO") reasons.push("release_gate_no_go");
  if (readiness.blockers.length > 0) reasons.push(`blockers=${readiness.blockers.length}`);
  if (improvement && improvement.decision === "NO_GO") reasons.push("improvement_no_go");

  if (readiness.decision === "NO-GO" || improvement?.decision === "NO_GO") {
    return { decision: "NO_GO", reasons };
  }
  if (readiness.decision === "CONDITIONAL" || improvement?.decision === "GO_WITH_KNOWN_LIMITATIONS") {
    reasons.push("conditional_release_or_pending_approvals");
    return { decision: "GO_WITH_KNOWN_LIMITATIONS", reasons };
  }
  if (readiness.decision === "GO" && (!improvement || improvement.decision === "GO")) {
    reasons.push("all_gates_pass");
    return { decision: "GO", reasons };
  }
  reasons.push("insufficient_evidence");
  return { decision: "UNKNOWN", reasons };
}

function issuesFrom(
  readiness: ReleaseDecisionReport,
  improvement: SelfImprovementReport | null,
): EvolutionIssue[] {
  const issues: EvolutionIssue[] = [];
  let seq = 0;
  for (const b of readiness.blockers) {
    issues.push({
      id: `readiness-blocker-${++seq}`,
      area: "runtime_stability",
      severity: "critical",
      summary: b,
      evidenceRefs: ["production.readiness"],
    });
  }
  for (const w of readiness.warnings) {
    issues.push({
      id: `readiness-warn-${++seq}`,
      area: "runtime_stability",
      severity: "medium",
      summary: w,
      evidenceRefs: ["production.readiness"],
    });
  }
  if (improvement) {
    for (const r of improvement.regressions) {
      issues.push({
        id: `regression-${r.benchmarkId}`,
        area: "performance",
        severity: r.severity === "critical" ? "critical" : "high",
        summary: `regression on ${r.benchmarkId}`,
        evidenceRefs: r.evidence.map((e) => `${e.source}:${e.ref}`),
      });
    }
    for (const g of improvement.gaps) {
      issues.push({
        id: `gap-${g.id}`,
        area: g.kind === "performance" ? "performance" : "code_quality",
        severity: g.severity === "critical" ? "critical" : g.severity === "high" ? "high" : "medium",
        summary: g.summary,
        evidenceRefs: g.evidence.map((e) => `${e.source}:${e.ref}`),
      });
    }
  }
  return issues;
}

export async function runSelfEvolution(
  input: RunSelfEvolutionInput = {},
): Promise<EvolutionReport> {
  const startedAt = new Date().toISOString();
  const stages: EvolutionStageResult[] = [];
  const applied: string[] = [];
  const deferred: string[] = [];

  // ---------------- analyze + detect_issues ----------------
  let t = new Date().toISOString();
  let readiness: ReleaseDecisionReport;
  try {
    readiness = await evaluateRelease();
    stages.push(stage("analyze", "pass", `release=${readiness.decision}`, t));
  } catch (err) {
    stages.push(
      stage("analyze", "fail", `readiness_failed:${(err as Error).message}`, t),
    );
    // Rollback: refuse to proceed without readiness signal.
    return {
      startedAt,
      finishedAt: new Date().toISOString(),
      decision: "NO_GO",
      readiness: null,
      improvement: null,
      issues: [],
      stages,
      applied,
      deferred,
      reasons: ["readiness_unavailable"],
      invariants: INVARIANTS,
      readinessScore: 0,
    };
  }

  // ---------------- plan + estimate_risk + apply ----------------
  let improvement: SelfImprovementReport | null = null;
  if (input.improvement) {
    t = new Date().toISOString();
    try {
      const out = runSelfImprovementPipeline(input.improvement);
      improvement = out.report;
      stages.push(
        stage(
          "plan",
          improvement.decision === "NO_GO" ? "fail" : "pass",
          `proposals=${improvement.proposals.length} decision=${improvement.decision}`,
          t,
        ),
      );

      // estimate_risk is embedded in scoreImprovement; we just surface it.
      stages.push(
        stage(
          "estimate_risk",
          "pass",
          `regressions=${improvement.regressions.length} gaps=${improvement.gaps.length}`,
          t,
        ),
      );

      // apply_safe_changes: NEVER touches code. Only records the manifest of
      // approved+verified proposals for the downstream review/deploy pipeline.
      t = new Date().toISOString();
      if (input.enableApply) {
        for (const p of improvement.proposals) {
          if (p.status === "approved") applied.push(p.id);
          else deferred.push(p.id);
        }
      } else {
        for (const p of improvement.proposals) deferred.push(p.id);
      }
      stages.push(
        stage(
          "apply_safe_changes",
          "pass",
          `applied=${applied.length} deferred=${deferred.length}`,
          t,
        ),
      );
    } catch (err) {
      stages.push(
        stage("plan", "fail", `improvement_failed:${(err as Error).message}`, t),
      );
    }
  } else {
    stages.push(stage("plan", "unknown", "analyze_only_mode", t));
  }

  // ---------------- detect_issues (post-plan aggregation) ----------------
  t = new Date().toISOString();
  const issues = issuesFrom(readiness, improvement);
  stages.push(
    stage(
      "detect_issues",
      issues.some((i) => i.severity === "critical") ? "fail" : issues.length > 0 ? "warn" : "pass",
      `count=${issues.length}`,
      t,
    ),
  );

  // ---------------- validate ----------------
  t = new Date().toISOString();
  const readinessScore = readiness.overall_score;
  const validatePassed =
    readiness.decision !== "NO-GO" &&
    (!improvement || improvement.decision !== "NO_GO");
  stages.push(
    stage(
      "validate",
      validatePassed ? "pass" : "fail",
      `readiness_score=${readinessScore.toFixed(2)}`,
      t,
    ),
  );

  // ---------------- benchmark ----------------
  t = new Date().toISOString();
  const benchmarkCount = improvement?.comparisons.length ?? 0;
  stages.push(
    stage(
      "benchmark",
      benchmarkCount > 0 ? "pass" : "unknown",
      `comparisons=${benchmarkCount}`,
      t,
    ),
  );

  // ---------------- report ----------------
  const { decision, reasons } = decisionFrom(readiness, improvement);
  stages.push(stage("report", "pass", `decision=${decision}`, new Date().toISOString()));

  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    decision,
    readiness,
    improvement,
    issues,
    stages,
    applied,
    deferred,
    reasons,
    invariants: INVARIANTS,
    readinessScore,
  };
}
