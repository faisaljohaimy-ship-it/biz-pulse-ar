/**
 * Verification.
 *
 * Structural + semantic checks on the store. The engine refuses to
 * declare success if any invariant is violated. All findings are
 * append-only observations.
 */

import { listRecords } from "./memory-store.server";
import type { MemoryStatus, VerificationIssue, VerificationReport } from "./types";

const ALLOWED_TRANSITIONS: Record<MemoryStatus, readonly MemoryStatus[]> = {
  active: ["active", "compressed", "decayed", "forgotten", "conflict"],
  compressed: ["compressed", "decayed", "forgotten", "active"],
  decayed: ["decayed", "forgotten"],
  forgotten: ["forgotten"],
  conflict: ["conflict", "compressed", "active", "forgotten"],
};

function verId(ts: string): string {
  let h = 5381;
  const seed = `ver-ltm|${ts}`;
  for (let i = 0; i < seed.length; i += 1) h = (h * 33) ^ seed.charCodeAt(i);
  return `ver_ltm_${(h >>> 0).toString(16)}`;
}

export function verifyStore(): VerificationReport {
  const issues: VerificationIssue[] = [];
  const seen = new Set<string>();
  const records = listRecords();

  for (const r of records) {
    if (seen.has(r.id)) {
      issues.push({ code: "duplicate_id", detail: `duplicate ${r.id}`, subject_id: r.id });
    }
    seen.add(r.id);

    if (r.status !== "forgotten" && r.evidence.length === 0) {
      issues.push({
        code: "missing_evidence",
        detail: `record ${r.id} has no evidence`,
        subject_id: r.id,
      });
    }

    if (r.status === "forgotten" && r.body !== "[forgotten]") {
      // Body must be tombstoned when forgotten.
      issues.push({
        code: "invalid_status_transition",
        detail: `forgotten record ${r.id} retains body`,
        subject_id: r.id,
      });
    }

    if (r.sensitivity === "secret") {
      issues.push({
        code: "sensitivity_violation",
        detail: `record ${r.id} stored with secret sensitivity`,
        subject_id: r.id,
      });
    }

    if (r.compressed_from && r.compressed_from.includes(r.id)) {
      issues.push({
        code: "circular_link",
        detail: `record ${r.id} references itself in compressed_from`,
        subject_id: r.id,
      });
    }

    if (r.conflict_partner_ids.includes(r.id)) {
      issues.push({
        code: "circular_link",
        detail: `record ${r.id} lists itself as its own conflict partner`,
        subject_id: r.id,
      });
    }

    if (!ALLOWED_TRANSITIONS[r.status].includes(r.status)) {
      issues.push({
        code: "invalid_status_transition",
        detail: `record ${r.id} has unknown status`,
        subject_id: r.id,
      });
    }
  }

  const created_at = new Date().toISOString();
  return Object.freeze({
    id: verId(created_at),
    created_at,
    ok: issues.length === 0,
    issues: Object.freeze(issues) as readonly VerificationIssue[],
    checked_count: records.length,
  });
}
