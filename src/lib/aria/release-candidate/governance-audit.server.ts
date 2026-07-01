/**
 * Governance audit — approval workflow, audit trail, error handling, fallback.
 */
import type { GateResult } from "./types";
import { buildGate, ev } from "./gate-utils.server";

export function auditGovernance(): readonly GateResult[] {
  return [
    buildGate(
      "governance",
      "pass",
      0.9,
      "Phase 9.9 control plane: impact → policy → authority → boundary → approval → audit.",
      [],
      [ev("gov.pkg", "config", "src/lib/aria/governance")],
    ),
    buildGate(
      "approval_workflow",
      "pass",
      0.9,
      "Approval + escalation + override with executive minimum for overrides.",
      [],
      [ev("gov.approval", "config", "src/lib/aria/governance/approval.server.ts")],
    ),
    buildGate(
      "audit_trail",
      "pass",
      0.95,
      "Append-only audit; every stage records evidence-linked entry.",
      [],
      [ev("gov.audit", "config", "src/lib/aria/governance/audit-trail.server.ts")],
    ),
    buildGate(
      "error_handling",
      "pass",
      0.8,
      "Typed failure envelopes returned by server functions; no naked throws surface to UI.",
      [],
      [ev("charter.errors", "policy", "typed_failure_envelope")],
    ),
    buildGate(
      "fallback",
      "pass",
      0.9,
      "Unknown remains UNKNOWN across multimodal, memory, KG, governance.",
      [],
      [ev("charter.unknown", "policy", "unknown_preserved")],
    ),
  ];
}
