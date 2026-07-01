/**
 * Verifier — validates a RcReport before release.
 */
import { GateResultSchema, KnownLimitationSchema, RequirementSchema } from "./contracts";
import type { RcReport } from "./types";

export interface VerificationResult {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

export function verifyReport(r: RcReport): VerificationResult {
  const reasons: string[] = [];
  for (const g of r.gates) {
    const p = GateResultSchema.safeParse(g);
    if (!p.success) reasons.push(`gate ${g.id}: schema`);
    if (g.status === "pass" && g.evidence.length === 0)
      reasons.push(`gate ${g.id}: pass without evidence`);
    if (g.status === "unknown" && !g.unknown_reason)
      reasons.push(`gate ${g.id}: unknown without reason`);
  }
  for (const l of r.known_limitations) {
    if (!KnownLimitationSchema.safeParse(l).success)
      reasons.push(`limitation ${l.id}: schema`);
  }
  for (const req of r.requirements) {
    if (!RequirementSchema.safeParse(req).success)
      reasons.push(`requirement ${req.id}: schema`);
  }
  if (r.decision === "GO") {
    const critFail = r.gates.some(
      (g) => g.criticality === "critical" && (g.status === "fail" || g.status === "unknown"),
    );
    if (critFail) reasons.push("GO with critical fail/unknown");
    if (r.requirements.some((rq) => rq.blocker))
      reasons.push("GO with unresolved blocker requirement");
  }
  if (r.decision === "CONDITIONAL-GO" && r.requirements.length === 0) {
    reasons.push("CONDITIONAL-GO must list explicit requirements");
  }
  return { ok: reasons.length === 0, reasons };
}
