/**
 * Phase-④ tests — the poisoning barrier and the bounded self-tuner.
 *
 * DB-free by construction. The database trigger is the real authority; these
 * prove the SAME rule offline, and prove the barrier's default is refusal.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  countCandidates,
  evaluateCandidate,
  retrievableOnly,
  type CandidateInput,
  type GateContext,
} from "./promotion";
import {
  AUTO_ENABLE,
  BASELINE_WEIGHTS,
  decideAutoEnable,
  MIN_FEEDBACK_ROWS,
  proposeWeights,
  WEIGHT_MAX,
  WEIGHT_MIN,
  type FeedbackRow,
} from "./tuning";

const ORG_A = "org-a";
const ORG_B = "org-b";

/** Chunk "c-a1" belongs to org A; "c-b1" to org B; anything else is unknown. */
const ctx = (isAdmin: boolean): GateContext => ({
  resolveChunkOrg: (id) => (id === "c-a1" ? ORG_A : id === "c-b1" ? ORG_B : null),
  isOrgAdmin: () => isAdmin,
});

const candidate = (over: Partial<CandidateInput> = {}): CandidateInput => ({
  orgId: ORG_A,
  question: "ما نطاق توجيه محطات التحويل الكهربائية؟",
  answer: "نص مولّد من النموذج.",
  sourceKind: "model_generated",
  citationChunkId: null,
  ...over,
});

describe("POISONING BARRIER — the default is refusal", () => {
  it("model output with NO citation and NO admin stays unverified", () => {
    const v = evaluateCandidate(candidate(), ctx(false));
    expect(v.verified).toBe(false);
    expect(v.reason).toBeNull();
    expect(v.refusedBecause).toBe("not_admin");
  });

  it("① grounded: a citation to a real chunk in the SAME org promotes", () => {
    const v = evaluateCandidate(candidate({ citationChunkId: "c-a1" }), ctx(false));
    expect(v.verified).toBe(true);
    expect(v.reason).toBe("grounded_citation");
  });

  it("② admin approval promotes content that has no citation", () => {
    const v = evaluateCandidate(candidate(), ctx(true));
    expect(v.verified).toBe(true);
    expect(v.reason).toBe("admin_approved");
  });

  it("a DANGLING citation (chunk does not exist) does NOT promote", () => {
    const v = evaluateCandidate(candidate({ citationChunkId: "c-ghost" }), ctx(false));
    expect(v.verified).toBe(false);
    expect(v.refusedBecause).toBe("ungrounded");
  });

  it("a CROSS-ORG citation is refused even for an admin (isolation wins)", () => {
    const v = evaluateCandidate(candidate({ citationChunkId: "c-b1" }), ctx(true));
    expect(v.verified).toBe(false);
    expect(v.reason).toBeNull();
    expect(v.refusedBecause).toBe("cross_org_citation");
  });

  it("source_kind alone never promotes — claiming 'uploaded_chunk' is not proof", () => {
    const v = evaluateCandidate(
      candidate({ sourceKind: "uploaded_chunk", citationChunkId: null }),
      ctx(false),
    );
    expect(v.verified).toBe(false);
  });

  it("retrieval only ever sees verified rows", () => {
    const rows = [
      { verified: false, id: 1 },
      { verified: true, id: 2 },
      { verified: false, id: 3 },
    ];
    expect(retrievableOnly(rows).map((r) => r.id)).toEqual([2]);
  });
});

describe("counters — unverified content is counted, never hidden", () => {
  it("splits verified / unverified / awaiting-a-source", () => {
    const c = countCandidates([
      { verified: true, reason: "grounded_citation", citationChunkId: "c-a1" },
      { verified: true, reason: "admin_approved", citationChunkId: null },
      { verified: false, reason: null, citationChunkId: null },
      { verified: false, reason: null, citationChunkId: null },
      { verified: false, reason: null, citationChunkId: "c-ghost" },
    ]);
    expect(c.total).toBe(5);
    expect(c.verified).toBe(2);
    expect(c.unverified).toBe(3);
    expect(c.awaitingSource).toBe(2); // unverified AND citation-less
    expect(c.byReason.grounded_citation).toBe(1);
    expect(c.byReason.admin_approved).toBe(1);
  });
});

describe("self-tuning — bounded, and it never touches a model", () => {
  const rows = (n: number, paths: number, helpful = true): FeedbackRow[] =>
    Array.from({ length: n }, () => ({ matchedPaths: paths, rank: 1, helpful }));

  it("keeps the baseline until the sample is big enough", () => {
    const p = proposeWeights(rows(MIN_FEEDBACK_ROWS - 1, 2));
    expect(p.keptBaseline).toBe(true);
    expect(p.weights).toEqual({ ...BASELINE_WEIGHTS });
  });

  it("lifts the lexical paths when helpful hits come from few paths", () => {
    const p = proposeWeights(rows(60, 1));
    expect(p.keptBaseline).toBe(false);
    expect(p.weights.fts).toBeGreaterThan(BASELINE_WEIGHTS.fts);
    expect(p.weights.trgm).toBeGreaterThan(BASELINE_WEIGHTS.trgm);
  });

  it("leaves the balance alone when corroboration is already high", () => {
    const p = proposeWeights(rows(60, 3));
    expect(p.weights.fts).toBeCloseTo(BASELINE_WEIGHTS.fts, 5);
    expect(p.weights.trgm).toBeCloseTo(BASELINE_WEIGHTS.trgm, 5);
  });

  it("never leaves the safety band, however lopsided the feedback", () => {
    for (const paths of [1, 2, 3]) {
      const w = proposeWeights(rows(500, paths)).weights;
      for (const v of Object.values(w)) {
        expect(v).toBeGreaterThanOrEqual(WEIGHT_MIN);
        expect(v).toBeLessThanOrEqual(WEIGHT_MAX);
      }
    }
  });
});

describe("auto-enable gate — an unmeasured system can never flip the flag", () => {
  it("refuses on an unverified corpus even with perfect numbers", () => {
    const d = decideAutoEnable({
      hitAt5: 1,
      citationAccuracy: 1,
      measuredQuestions: 100,
      corpusVerified: false,
    });
    expect(d.enable).toBe(false);
    expect(d.blockers).toContain("corpus_not_verified");
  });

  it("refuses below the measured-question floor", () => {
    const d = decideAutoEnable({
      hitAt5: 1,
      citationAccuracy: 1,
      measuredQuestions: AUTO_ENABLE.minMeasuredQuestions - 1,
      corpusVerified: true,
    });
    expect(d.enable).toBe(false);
    expect(d.blockers.some((b) => b.startsWith("measured_questions_"))).toBe(true);
  });

  it("refuses when either quality threshold is missed", () => {
    expect(
      decideAutoEnable({
        hitAt5: 0.84,
        citationAccuracy: 0.99,
        measuredQuestions: 30,
        corpusVerified: true,
      }).enable,
    ).toBe(false);
    expect(
      decideAutoEnable({
        hitAt5: 0.9,
        citationAccuracy: 0.94,
        measuredQuestions: 30,
        corpusVerified: true,
      }).enable,
    ).toBe(false);
  });

  it("enables only when every condition holds together", () => {
    const d = decideAutoEnable({
      hitAt5: 0.85,
      citationAccuracy: 0.95,
      measuredQuestions: 30,
      corpusVerified: true,
    });
    expect(d.enable).toBe(true);
    expect(d.blockers).toEqual([]);
  });

  it("TODAY the gate is shut — nothing is measured, so nothing can enable", () => {
    const today = decideAutoEnable({
      hitAt5: 0,
      citationAccuracy: 0,
      measuredQuestions: 0,
      corpusVerified: false,
    });
    expect(today.enable).toBe(false);
  });
});

describe("the DB trigger is the authority — and it mirrors this rule", () => {
  const sql = readFileSync(
    join(__dirname, "..", "..", "..", "supabase/migrations/20260728140000_rag_learning_loop.sql"),
    "utf8",
  );

  it("promotion is enforced by a BEFORE trigger, not by app code", () => {
    expect(sql).toContain("create trigger rag_candidates_gate");
    expect(sql).toContain("before insert or update on public.rag_candidates");
  });

  it("grounding requires the chunk to belong to the SAME org", () => {
    expect(sql).toContain("AND c.org_id = NEW.org_id");
  });

  it("admin approval is the only other route", () => {
    expect(sql).toContain("public.is_org_member(NEW.org_id, 'admin')");
  });

  it("the retrieval-facing view exposes verified rows only", () => {
    expect(sql).toContain("create or replace view public.rag_verified_candidates");
    expect(sql).toContain("where verified = true");
  });
});
