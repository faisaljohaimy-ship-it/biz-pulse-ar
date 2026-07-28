/**
 * The poisoning barrier — pure logic, mirroring the DB trigger exactly.
 *
 * WHY THIS EXISTS TWICE: the authority is the database trigger
 * (rag_enforce_verification_gate, migration 20260728140000) because a client
 * can never bypass it. This module is the same rule expressed as pure,
 * offline-testable code so the barrier can be PROVEN without a database — and
 * so any surface can pre-compute the verdict before writing.
 *
 * THE RULE. A candidate becomes verified ONLY if:
 *   ① GROUNDED — its citation resolves to a chunk that exists in the SAME
 *      org (a cross-org citation is both ungrounded and an isolation breach),
 *   ② or ADMIN-APPROVED by an admin of that org.
 * Everything else — any model-generated text with no traceable source —
 * stays unverified: stored, counted, analysed, reported, and NEVER retrieved
 * or cited. One-way, permanent. This is what stops generational drift
 * (model collapse) in a compliance corpus.
 */

export type CandidateSourceKind = "model_generated" | "uploaded_chunk" | "admin_authored";
export type VerifiedReason = "grounded_citation" | "admin_approved";

export interface CandidateInput {
  orgId: string;
  question: string;
  answer: string;
  sourceKind: CandidateSourceKind;
  /** Chunk this answer claims to rest on. null = ungrounded. */
  citationChunkId: string | null;
}

/** What the caller can prove about the world at decision time. */
export interface GateContext {
  /** Resolves a chunk id → the org that owns it, or null if it doesn't exist. */
  resolveChunkOrg: (chunkId: string) => string | null;
  /** Is the actor an admin of this org? */
  isOrgAdmin: (orgId: string) => boolean;
}

export interface GateVerdict {
  verified: boolean;
  reason: VerifiedReason | null;
  /** Why it was refused — for reports, never shown as an error to a user. */
  refusedBecause: "ungrounded" | "cross_org_citation" | "not_admin" | null;
}

/**
 * Decide a candidate's fate. Deterministic and total: every input yields a
 * verdict, and the default is ALWAYS unverified.
 */
export function evaluateCandidate(input: CandidateInput, ctx: GateContext): GateVerdict {
  // ① Grounding first — it is the stronger claim (traceable evidence).
  if (input.citationChunkId) {
    const owner = ctx.resolveChunkOrg(input.citationChunkId);
    if (owner === null) {
      // Citation points at nothing. Not evidence — a dangling reference.
      return admitAdminOrRefuse(input, ctx, "ungrounded");
    }
    if (owner !== input.orgId) {
      // Citation into another tenant's corpus: ungrounded AND an isolation
      // breach. Never promotable, not even by an admin of the citing org.
      return { verified: false, reason: null, refusedBecause: "cross_org_citation" };
    }
    return { verified: true, reason: "grounded_citation", refusedBecause: null };
  }
  return admitAdminOrRefuse(input, ctx, "ungrounded");
}

function admitAdminOrRefuse(
  input: CandidateInput,
  ctx: GateContext,
  fallbackRefusal: GateVerdict["refusedBecause"],
): GateVerdict {
  // ② An admin of this org may vouch for content that has no citation.
  if (ctx.isOrgAdmin(input.orgId)) {
    return { verified: true, reason: "admin_approved", refusedBecause: null };
  }
  return {
    verified: false,
    reason: null,
    refusedBecause: input.citationChunkId ? fallbackRefusal : "not_admin",
  };
}

/** Retrieval may only ever see verified candidates. */
export function retrievableOnly<T extends { verified: boolean }>(rows: readonly T[]): T[] {
  return rows.filter((r) => r.verified);
}

// ── Counters for the required status report ───────────────────────────────

export interface CandidateCounters {
  total: number;
  verified: number;
  unverified: number;
  awaitingSource: number;
  byReason: Record<VerifiedReason, number>;
}

export function countCandidates(
  rows: readonly {
    verified: boolean;
    reason: VerifiedReason | null;
    citationChunkId: string | null;
  }[],
): CandidateCounters {
  const counters: CandidateCounters = {
    total: rows.length,
    verified: 0,
    unverified: 0,
    awaitingSource: 0,
    byReason: { grounded_citation: 0, admin_approved: 0 },
  };
  for (const r of rows) {
    if (r.verified) {
      counters.verified += 1;
      if (r.reason) counters.byReason[r.reason] += 1;
    } else {
      counters.unverified += 1;
      // "Awaiting a source": unverified AND carrying no citation at all —
      // exactly the model-generated bucket that needs a document to exist.
      if (!r.citationChunkId) counters.awaitingSource += 1;
    }
  }
  return counters;
}
