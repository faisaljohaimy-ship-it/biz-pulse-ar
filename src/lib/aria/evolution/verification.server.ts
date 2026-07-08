/**
 * Verification.
 *
 * Runs structural and semantic checks against a reflection artefact.
 * The engine refuses to declare success when required evidence is
 * missing or when a report cannot be reproduced deterministically.
 */

import type {
  ExecutiveRecommendation,
  ImprovementProposal,
  ReflectionReport,
  VerificationIssue,
  VerificationReport,
} from "./types";

function verId(subject: string, ts: string): string {
  let h = 5381;
  const seed = `ver|${subject}|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `ver_${(h >>> 0).toString(16)}`;
}

export interface VerifiableBundle {
  readonly execution_id: string;
  readonly proposal?: ImprovementProposal;
  readonly recommendation?: ExecutiveRecommendation;
  readonly reflection?: Pick<ReflectionReport, "id" | "execution_id" | "patterns">;
}

export function verifyBundle(bundle: VerifiableBundle): VerificationReport {
  const issues: VerificationIssue[] = [];
  const checked: string[] = [];

  if (bundle.proposal) {
    checked.push(bundle.proposal.id);
    if (bundle.proposal.evidence.length === 0) {
      issues.push({
        code: "unbacked_recommendation",
        detail: `Proposal ${bundle.proposal.id} has no evidence.`,
      });
    }
    if (bundle.proposal.confidence === "unknown" && bundle.proposal.expected_gain > 0) {
      issues.push({
        code: "fabricated_confidence",
        detail: `Proposal ${bundle.proposal.id} claims positive gain with unknown confidence.`,
      });
    }
  }

  if (bundle.recommendation) {
    checked.push(bundle.recommendation.id);
    if (bundle.recommendation.evidence.length === 0) {
      issues.push({
        code: "unbacked_recommendation",
        detail: `Recommendation ${bundle.recommendation.id} has no evidence.`,
      });
    }
    if (bundle.proposal && bundle.recommendation.proposal_id !== bundle.proposal.id) {
      issues.push({
        code: "synthetic_improvement",
        detail: "Recommendation references a proposal not in the bundle.",
      });
    }
  }

  if (bundle.reflection) {
    checked.push(bundle.reflection.id);
    if (bundle.reflection.execution_id !== bundle.execution_id) {
      issues.push({
        code: "nondeterministic_report",
        detail: "Reflection execution_id does not match bundle execution_id.",
      });
    }
  }

  const created_at = new Date().toISOString();
  return Object.freeze({
    id: verId(bundle.execution_id, created_at),
    created_at,
    ok: issues.length === 0,
    issues: Object.freeze(issues) as readonly VerificationIssue[],
    checked_ids: Object.freeze(checked) as readonly string[],
  });
}
