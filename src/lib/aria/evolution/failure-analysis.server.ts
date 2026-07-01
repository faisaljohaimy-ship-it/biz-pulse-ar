/**
 * Failure analysis.
 *
 * Extracts failure signals from execution evidence. When no failure
 * signal is present the analysis is not produced — the engine never
 * invents a failure to justify a proposal.
 */

import {
  ExecutionEvidenceSchema,
  type ExecutionEvidenceInput,
} from "./contracts";
import type {
  EvidenceRef,
  FailureAnalysis,
  Severity,
} from "./types";

function analysisId(execution_id: string, ts: string): string {
  let h = 5381;
  const seed = `fa|${execution_id}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `fa_${(h >>> 0).toString(16)}`;
}

function classifySeverity(errors: readonly string[]): Severity {
  if (errors.length === 0) return "info";
  const joined = errors.join(" ").toLowerCase();
  if (joined.includes("critical") || joined.includes("fatal")) return "critical";
  if (joined.includes("timeout") || joined.includes("unavailable")) return "error";
  if (joined.includes("retry") || joined.includes("degraded")) return "warn";
  return "notice";
}

function classifyStage(tags: readonly string[]): FailureAnalysis["stage"] {
  if (tags.includes("planning")) return "planning";
  if (tags.includes("runtime")) return "runtime";
  if (tags.includes("tool")) return "tool";
  if (tags.includes("integration")) return "integration";
  if (tags.includes("cognition")) return "cognition";
  return "unknown";
}

export function analyzeFailure(
  raw: ExecutionEvidenceInput,
): FailureAnalysis | undefined {
  const evidence = ExecutionEvidenceSchema.parse(raw);
  if (evidence.outcome === "success") return undefined;
  if (evidence.errors.length === 0 && evidence.retries === 0) return undefined;

  const created_at = new Date().toISOString();
  const ref: EvidenceRef = {
    id: evidence.execution_id,
    kind: "execution",
    source: "runtime.execution",
    taken_at: evidence.finished_at,
  };
  return Object.freeze({
    id: analysisId(evidence.execution_id, created_at),
    execution_id: evidence.execution_id,
    created_at,
    failure_signals: Object.freeze([...evidence.errors]) as readonly string[],
    stage: classifyStage(evidence.tags),
    severity: classifySeverity(evidence.errors),
    evidence: Object.freeze([ref]) as readonly EvidenceRef[],
  });
}
