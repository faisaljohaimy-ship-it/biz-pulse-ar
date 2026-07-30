/**
 * Phase 9.9 — Executive AGI Governance & Control Layer (public surface)
 *
 * Pipeline:
 *   proposed action → impact classification → policy check → authority check
 *     → boundary check → approval gate → escalation (critical)
 *     → execution permission → audit
 *
 * Strictly additive. Server-side only. Worker compatible.
 */
export * from "./types";
export * from "./contracts";
export { classifyImpact } from "./impact-classification.server";
export { registerPolicy, listPolicies, evaluatePolicies, type PolicyRule } from "./policy.server";
export { requiredAuthorityFor, checkAuthority, rankOf } from "./authority.server";
export { evaluateRisk } from "./risk-gate.server";
export { checkCompliance, type ComplianceRule } from "./compliance.server";
export { checkEthics } from "./ethics.server";
export { minAuthorityFor, canDecide } from "./decision-rights.server";
export {
  requestApproval,
  decideApproval,
  expireStale,
  getApproval,
  listPendingFor,
} from "./approval.server";
export { resolveApproval, listQueue } from "./human-in-loop.server";
export {
  escalate,
  acknowledgeEscalation,
  listOpen as listOpenEscalations,
} from "./escalation.server";
export { applyOverride, listOverrides } from "./override.server";
export { withinBoundary } from "./permission-boundary.server";
export { verifyOutcome, verifyPermission } from "./verification.server";
export {
  record as recordAudit,
  recent as recentAudit,
  forAction as auditForAction,
} from "./audit-trail.server";
export { snapshot as metricsSnapshot } from "./metrics.server";
export { getRun as getGovernanceRun } from "./telemetry.server";
export { submitAction, type ControlPlaneInput } from "./control-plane.server";
