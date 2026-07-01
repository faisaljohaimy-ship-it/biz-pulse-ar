/**
 * Shared helpers for gate audits.
 * All gate modules are pure: caller-supplied signals in, GateResult out.
 * No file system probing, no fabricated results.
 */
import type { EvidenceRef, GateId, GateResult, GateStatus } from "./types";
import { checklistItem } from "./rc-checklist.server";

export function buildGate(
  id: GateId,
  status: GateStatus,
  score: number,
  summary: string,
  findings: readonly string[],
  evidence: readonly EvidenceRef[],
  unknown_reason?: string,
): GateResult {
  const item = checklistItem(id);
  const s = Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : 0;
  return {
    id,
    title: item.title,
    status,
    criticality: item.criticality,
    score: Number(s.toFixed(4)),
    summary,
    findings,
    evidence,
    unknown_reason,
    checked_at: new Date().toISOString(),
  };
}

export function ev(
  source_id: string,
  kind: EvidenceRef["kind"],
  locator: string,
): EvidenceRef {
  return { source_id, kind, locator, captured_at: new Date().toISOString() };
}

export function unknownGate(id: GateId, reason: string): GateResult {
  return buildGate(id, "unknown", 0, `unknown: ${reason}`, [], [], reason);
}
