/**
 * Reflection pipeline.
 *
 * Orchestrates the reflection sequence:
 *   Execution → Evidence collection → Failure analysis →
 *   Root cause → Pattern extraction → Experience generation →
 *   Strategy comparison → Improvement proposal →
 *   Confidence estimation → Executive recommendation → Verification.
 *
 * Every stage is optional; the pipeline only produces artefacts backed
 * by real evidence. Missing evidence means the stage is skipped.
 */

import {
  ExecutionEvidenceSchema,
  type ExecutionEvidenceInput,
} from "./contracts";
import { analyzeFailure } from "./failure-analysis.server";
import { rootCause } from "./root-cause.server";
import { detectPatterns } from "./pattern.server";
import { generateExperience } from "./experience.server";
import { proposeImprovement } from "./improvement.server";
import { deriveConfidence } from "./confidence.server";
import { verifyBundle } from "./verification.server";
import { audit } from "./audit.server";
import { emitTelemetry } from "./telemetry.server";
import type { EvidenceRef, ReflectionReport, Severity } from "./types";

function reflectionId(execution_id: string, ts: string): string {
  let h = 5381;
  const seed = `ref|${execution_id}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `ref_${(h >>> 0).toString(16)}`;
}

function riskFor(severity: Severity): Severity {
  return severity === "critical" ? "critical" : severity;
}

export function reflect(raw: ExecutionEvidenceInput): ReflectionReport {
  const evidence = ExecutionEvidenceSchema.parse(raw);
  const created_at = new Date().toISOString();
  const executionRef: EvidenceRef = {
    id: evidence.execution_id,
    kind: "execution",
    source: "runtime.execution",
    taken_at: evidence.finished_at,
  };

  const failure = analyzeFailure(evidence);
  const rca = failure ? rootCause(failure) : undefined;
  const patterns = detectPatterns();

  const experience = generateExperience({
    problem: `execution:${evidence.execution_id}`,
    context: evidence.workspace_id,
    goal: "reflect_on_execution",
    actions: evidence.tags.length > 0 ? [...evidence.tags] : ["execute"],
    evidence: [executionRef],
    outcome: evidence.outcome,
    failures: evidence.errors,
    successes: evidence.outcome === "success" ? ["execution_ok"] : [],
    metrics: {
      duration_ms: evidence.duration_ms,
      cost_tokens: evidence.cost_tokens,
      tool_calls: evidence.tool_calls,
      retries: evidence.retries,
    },
    duration_ms: evidence.duration_ms,
    cost_tokens: evidence.cost_tokens,
    risk: failure ? riskFor(failure.severity) : "info",
    lessons: rca ? [rca.hypothesis] : [],
    recommendations: [],
  });

  let proposal;
  if (failure && rca && rca.cause_category !== "unknown") {
    proposal = proposeImprovement({
      target:
        rca.cause_category === "planning_defect"
          ? "planner"
          : rca.cause_category === "prompt_defect"
          ? "prompt"
          : rca.cause_category === "policy_violation"
          ? "policy"
          : rca.cause_category === "capability_gap"
          ? "tool"
          : "runtime",
      summary: rca.hypothesis,
      rationale: `Failure classified as ${rca.cause_category} from execution ${evidence.execution_id}.`,
      expected_gain: 0.1,
      expected_risk: failure.severity,
      evidence: [executionRef, {
        id: rca.id,
        kind: "reflection",
        source: "evolution.root-cause",
        taken_at: rca.created_at,
      }],
    });
  }

  const confidence = deriveConfidence({
    subject_id: `reflection:${evidence.execution_id}`,
    evidence_quality: 0.6,
    execution_success_rate: evidence.outcome === "success" ? 1 : evidence.outcome === "failure" ? 0 : 0.5,
    historical_alignment: -1,
    benchmark_alignment: -1,
    pattern_consistency: patterns.length > 0 ? 0.6 : -1,
    coverage: patterns.length > 0 ? 0.5 : 0.3,
    evidence: [executionRef],
  });

  const verification = verifyBundle({
    execution_id: evidence.execution_id,
    proposal,
    reflection: {
      id: reflectionId(evidence.execution_id, created_at),
      execution_id: evidence.execution_id,
      patterns,
    },
  });

  const report: ReflectionReport = Object.freeze({
    id: reflectionId(evidence.execution_id, created_at),
    created_at,
    execution_id: evidence.execution_id,
    failure_analysis: failure,
    root_cause: rca,
    patterns,
    experience,
    proposal,
    confidence,
    verification,
  });

  audit("reflect", report.id, [
    executionRef.id,
    ...(failure ? [failure.id] : []),
    ...(rca ? [rca.id] : []),
    experience.id,
    ...(proposal ? [proposal.id] : []),
  ]);
  emitTelemetry("reflection.completed", "info", `execution=${evidence.execution_id}`);

  return report;
}
