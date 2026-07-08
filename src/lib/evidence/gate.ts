/**
 * ============================================================
 * Evidence Gate — FR-19 (NEXUS Engineering Constitution)
 * ============================================================
 *
 * No numeric metric, status badge, certification mark, or "LIVE"
 * indicator may be shown to a user unless it carries a resolved
 * `Evidence` object naming its verifiable source.
 *
 * This module is the single primitive every surface MUST use.
 * Static strings such as "UPTIME 99.97%", "TLS 1.3", "ISO 27001",
 * "LIVE", "بث مباشر" are FORBIDDEN in JSX unless produced by a
 * verified `Evidence` here.
 *
 * See docs/NEXUS_ENGINEERING_CONSTITUTION.md § FR-19.
 */

export type EvidenceKind =
  | "db.query" // Data from a Supabase `sec_*` / product table
  | "runtime.probe" // Live runtime health probe result
  | "cert.public" // Public certificate / registry (link required)
  | "audit.log" // Immutable audit log entry
  | "external.api"; // Verified third-party API response

export interface Evidence {
  readonly kind: EvidenceKind;
  /** Human-readable source, e.g. `sec_incidents` or `GET /api/health`. */
  readonly source: string;
  /** ISO timestamp the evidence was observed. */
  readonly observedAt: string;
  /** Optional link a reviewer can open to verify (URL, doc, dashboard). */
  readonly href?: string;
  /** Optional exact value the badge is claiming. */
  readonly value?: string | number;
}

export function hasEvidence(e: Evidence | null | undefined): e is Evidence {
  if (!e) return false;
  if (!e.source || typeof e.source !== "string") return false;
  if (!e.observedAt || typeof e.observedAt !== "string") return false;
  const t = Date.parse(e.observedAt);
  if (Number.isNaN(t)) return false;
  return true;
}

/** Freshness gate: evidence older than `maxAgeMs` is treated as stale. */
export function isFresh(e: Evidence, maxAgeMs = 5 * 60_000): boolean {
  const t = Date.parse(e.observedAt);
  return Date.now() - t <= maxAgeMs;
}

/**
 * Build evidence for a runtime probe. Callers MUST have actually
 * performed the probe — fabricating evidence violates FR-19.
 */
export function probeEvidence(source: string, value?: string | number): Evidence {
  return { kind: "runtime.probe", source, observedAt: new Date().toISOString(), value };
}
