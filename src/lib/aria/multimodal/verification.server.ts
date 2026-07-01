/**
 * Verifier — final gate before a finding leaves the pipeline.
 * Rejects anything without evidence, out-of-range confidence,
 * or unknown-modality findings claiming high confidence.
 */
import { MultimodalFindingSchema } from "./contracts";
import type { MultimodalFinding } from "./types";

export interface VerificationResult {
  readonly ok: boolean;
  readonly reasons: readonly string[];
}

export function verifyFinding(f: MultimodalFinding): VerificationResult {
  const reasons: string[] = [];
  const parsed = MultimodalFindingSchema.safeParse(f);
  if (!parsed.success) {
    reasons.push(`schema:${parsed.error.issues.map((i) => i.path.join(".")).join(",")}`);
    return { ok: false, reasons };
  }
  if (f.evidence.length === 0) reasons.push("no_evidence");
  if (f.signals.length === 0 && f.bucket !== "unknown") {
    reasons.push("no_signals_but_confident");
  }
  if (f.modality === "unknown" && f.bucket === "high") {
    reasons.push("unknown_modality_high_confidence");
  }
  for (const s of f.signals) {
    if (s.confidence > 0 && !s.evidence) reasons.push(`signal_${s.id}:missing_evidence`);
    if (s.bucket === "high" && s.confidence < 0.85) reasons.push(`signal_${s.id}:bucket_mismatch`);
  }
  return { ok: reasons.length === 0, reasons };
}
