/**
 * Decision Engine — coerces the model's decision proposal into the
 * canonical `DecisionProposal`. Any mode that changes state on the
 * platform (approve, reject, escalate, assign, close, reopen) is force-
 * flagged as `requires_human_approval` regardless of what the model says.
 */
import type { DecisionMode, DecisionProposal } from "./types";
import type { ModelEnvelope } from "./contracts";

const HUMAN_APPROVAL_REQUIRED: ReadonlySet<DecisionMode> = new Set<DecisionMode>([
  "approve",
  "reject",
  "escalate",
  "assign",
  "close",
  "reopen",
  "delay",
]);

export function normalizeDecision(raw: ModelEnvelope["decision"]): DecisionProposal | null {
  if (!raw) return null;
  const mode = raw.mode;
  return {
    mode,
    rationale_en: raw.rationale_en,
    rationale_ar: raw.rationale_ar,
    requires_human_approval: HUMAN_APPROVAL_REQUIRED.has(mode) ? true : raw.requires_human_approval,
  };
}
