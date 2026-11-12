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
 * See docs/SADEED_ENGINEERING_CONSTITUTION.md § FR-19.
 */

// نوعٌ خالص بلا اعتماديّة واحدة، فـ`import type` يُمحى عند البناء: لا
// كلفةَ تشغيلٍ على وحدةٍ يستوردها كل سطح عرض.
import type { EntityKind } from "@/lib/sadeed/knowledge-graph/types";

export type { EntityKind };

export type EvidenceKind =
  | "db.query" // Data from a Supabase `sec_*` / product table
  | "runtime.probe" // Live runtime health probe result
  | "cert.public" // Public certificate / registry (link required)
  | "audit.log" // Immutable audit log entry
  | "external.api" // Verified third-party API response
  // ── widened for the grounding layer (`./evidence.ts`) ──────────────
  // FR-19 names this module the single source of truth and forbids
  // forking it. The grounding layer needed three source classes this
  // union did not name, so the union is widened HERE rather than a
  // second `Evidence` type being declared beside it. Purely additive:
  // no consumer reads `.kind` (only `source`/`observedAt`/`href`), so
  // no existing surface changes behaviour.
  | "reference.builtin" // Built-in reference simulation («بيانات لا تفرغ»)
  | "derived.computed" // Computed from other evidence — MUST carry its inputs
  | "human.attested"; // Human input attributed to a named actor

/**
 * A reference to an entity in the industrial security ontology.
 *
 * `kind` is the ontology's own closed union (`person` · `site` · `asset` ·
 * `incident` · `evidence` …), NOT a free-form string. It was written as
 * `type: string` first — and a free string beside a closed union already
 * naming these very kinds is a second vocabulary for one thing: `"incident"`
 * here and `"Incident"` or `"incidents"` there, agreeing only by habit.
 * The ontology is the single vocabulary; a typo is now a type error.
 */
export interface EntityRef {
  readonly kind: EntityKind;
  readonly id: string;
}

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
  /** The specific entity this evidence is about, when it is about one. */
  readonly entity?: EntityRef;
  /** A known limit in the evidence, carried to whatever is built on it. */
  readonly limitation?: string;
}

/**
 * Date.parse normalizes impossible dates (Feb 30 becomes Mar 2), which can
 * wrongly certify a fabricated observation as LIVE. Require a complete ISO
 * timestamp and validate its Gregorian calendar day before parsing.
 */
function validObservedAt(value: string): boolean {
  const match =
    /^(\d{4}|[+-]\d{6})-(\d{2})-(\d{2})T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-]\d{2}:[0-5]\d)$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1] && Number.isFinite(Date.parse(value));
}

export function hasEvidence(e: Evidence | null | undefined): e is Evidence {
  return (
    !!e &&
    typeof e.source === "string" &&
    e.source.trim().length > 0 &&
    typeof e.observedAt === "string" &&
    validObservedAt(e.observedAt)
  );
}

/** Freshness gate: reject stale, invalid, and future-dated evidence. */
export function isFresh(e: Evidence, maxAgeMs = 5 * 60_000): boolean {
  if (!hasEvidence(e)) return false;
  const t = Date.parse(e.observedAt);
  const ageMs = Date.now() - t;
  // A future timestamp previously produced a negative age, so even evidence
  // years ahead was mistakenly treated as fresh by the status-badge gate.
  // NaN from an invalid date fails both comparisons naturally.
  return ageMs >= 0 && ageMs <= maxAgeMs;
}

/**
 * Build evidence for a runtime probe. Callers MUST have actually
 * performed the probe — fabricating evidence violates FR-19.
 */
export function probeEvidence(source: string, value?: string | number): Evidence {
  return { kind: "runtime.probe", source, observedAt: new Date().toISOString(), value };
}

/**
 * Build evidence for a TanStack Query result. Pass the query's
 * `dataUpdatedAt` (0 when never resolved → returns null so the badge
 * refuses to render, honouring FR-19).
 */
export function queryEvidence(
  source: string,
  dataUpdatedAt: number,
  value?: string | number,
  href?: string,
): Evidence | null {
  // Reject invalid or out-of-range Date timestamps before toISOString can throw.
  if (!(dataUpdatedAt > 0 && dataUpdatedAt <= 8.64e15)) return null;
  return {
    kind: "db.query",
    source,
    observedAt: new Date(dataUpdatedAt).toISOString(),
    value,
    href,
  };
}
