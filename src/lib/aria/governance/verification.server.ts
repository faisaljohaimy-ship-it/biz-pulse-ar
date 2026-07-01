/**
 * Verifier — final check on outbound ControlPlaneOutcome + ExecutionPermission.
 */
import { ExecutionPermissionSchema } from "./contracts";
import type { ControlPlaneOutcome, ExecutionPermission } from "./types";

export interface VerificationResult {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

export function verifyPermission(p: ExecutionPermission): VerificationResult {
  const parsed = ExecutionPermissionSchema.safeParse(p);
  if (!parsed.success) {
    return { ok: false, reasons: parsed.error.issues.map((i) => `schema:${i.path.join(".")}`) };
  }
  const reasons: string[] = [];
  if (p.ok && !p.authority) reasons.push("granted_without_authority");
  if (p.ok && !p.approval_id) reasons.push("granted_without_approval_ref");
  if (p.expires_at && Date.parse(p.expires_at) < Date.now())
    reasons.push("expired_permission");
  return { ok: reasons.length === 0, reasons };
}

export function verifyOutcome(o: ControlPlaneOutcome): VerificationResult {
  const reasons: string[] = [];
  if (o.gate.impact.level === "critical" && !o.escalation && o.ok) {
    reasons.push("critical_without_escalation");
  }
  if (o.ok && !o.permission) reasons.push("ok_without_permission");
  if (o.permission) {
    const pv = verifyPermission(o.permission);
    if (!pv.ok) reasons.push(...pv.reasons.map((r) => `permission:${r}`));
  }
  return { ok: reasons.length === 0, reasons };
}
