/**
 * Phase-③ wiring tests — DB-FREE by construction.
 *
 * These exercise pure logic only: flag semantics, response-shape validation,
 * rank-metric arithmetic on hand-written fixtures, and the integrity of the
 * seed-verbatim anchor set. They prove NOTHING about retrieval quality — the
 * rag_* tables are not applied, so no retrieval has ever run.
 */
import { describe, expect, it } from "vitest";
import { parseRagFlag } from "./flags";
import { parseRetrieveResponse } from "./client";
import { evaluateRetrieval, firstHitRank, GOLDEN_ANCHORS, SEED_INVENTORY } from "./evaluation";

describe("feature flag — default OFF (rag_enabled = false)", () => {
  it("enables only on explicit true/1 (case/space tolerant)", () => {
    expect(parseRagFlag("true")).toBe(true);
    expect(parseRagFlag(" TRUE ")).toBe(true);
    expect(parseRagFlag("1")).toBe(true);
  });
  it("everything else is OFF — absent, empty, false, junk", () => {
    expect(parseRagFlag(undefined)).toBe(false);
    expect(parseRagFlag(null)).toBe(false);
    expect(parseRagFlag("")).toBe(false);
    expect(parseRagFlag("false")).toBe(false);
    expect(parseRagFlag("yes")).toBe(false);
    expect(parseRagFlag("0")).toBe(false);
  });
});

describe("retrieve response validation — strict shape, honest outcomes", () => {
  const validResult = {
    chunk_id: "c1",
    content: "نص المقطع",
    score: 0.0246,
    matched_paths: 2,
    is_simulation: false,
    citation: {
      document_id: "d1",
      code: "SEC-18",
      title: "محطات التحويل الكهربائية",
      source: "hcis.gov.sa",
      chunk_index: 0,
    },
  };

  it("accepts a valid payload — insufficient_evidence passes AS DATA", () => {
    const parsed = parseRetrieveResponse({
      results: [validResult],
      insufficient_evidence: true,
      degraded: null,
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.insufficient_evidence).toBe(true); // success outcome, not error
    expect(parsed?.results[0].citation.code).toBe("SEC-18");
  });

  it("accepts a null citation code and a degraded marker", () => {
    const parsed = parseRetrieveResponse({
      results: [{ ...validResult, citation: { ...validResult.citation, code: null } }],
      insufficient_evidence: false,
      degraded: "no_vector_path",
    });
    expect(parsed?.results[0].citation.code).toBeNull();
    expect(parsed?.degraded).toBe("no_vector_path");
  });

  it("rejects malformed payloads → null (mapped to a retryable error)", () => {
    expect(parseRetrieveResponse(null)).toBeNull();
    expect(parseRetrieveResponse({})).toBeNull();
    expect(
      parseRetrieveResponse({ results: "x", insufficient_evidence: false, degraded: null }),
    ).toBeNull();
    expect(
      parseRetrieveResponse({
        results: [{ ...validResult, score: "high" }],
        insufficient_evidence: false,
        degraded: null,
      }),
    ).toBeNull();
    expect(
      parseRetrieveResponse({
        results: [{ ...validResult, citation: null }],
        insufficient_evidence: false,
        degraded: null,
      }),
    ).toBeNull();
  });
});

describe("rank metrics — arithmetic on hand-written fixtures (no retrieval)", () => {
  it("hit@1, hit@5, MRR, coverage match exact arithmetic", () => {
    const metrics = evaluateRetrieval([
      { code: "SEC-18", rankedCodes: ["SEC-18", "SEC-01"], insufficient: false }, // rank 1
      { code: "SEC-13", rankedCodes: ["SEC-01", "SEC-13"], insufficient: false }, // rank 2
      { code: "SEC-02", rankedCodes: ["SEC-09", null], insufficient: true }, // miss
    ]);
    expect(metrics.scored).toBe(3);
    expect(metrics.hitAt1).toBeCloseTo(1 / 3, 12);
    expect(metrics.hitAt5).toBeCloseTo(2 / 3, 12);
    expect(metrics.mrr).toBeCloseTo((1 + 0.5 + 0) / 3, 12);
    expect(metrics.coverage).toBeCloseTo(2 / 3, 12);
    expect(metrics.insufficientRate).toBeCloseTo(1 / 3, 12);
    expect(metrics.misses).toEqual(["SEC-02"]);
  });

  it("no runs → all-zero metrics (an unmeasured system scores nothing)", () => {
    const metrics = evaluateRetrieval([]);
    expect(metrics.scored).toBe(0);
    expect(metrics.hitAt1).toBe(0);
    expect(metrics.coverage).toBe(0);
    expect(metrics.mrr).toBe(0);
  });

  it("unknown codes are ignored and lower `scored`", () => {
    expect(firstHitRank("SEC-18", ["SEC-01", "SEC-18"])).toBe(2);
    const metrics = evaluateRetrieval([
      { code: "SEC-01", rankedCodes: ["SEC-01"], insufficient: false },
      { code: "NOT-A-REAL-CODE", rankedCodes: ["NOT-A-REAL-CODE"], insufficient: false },
    ]);
    expect(metrics.total).toBe(2);
    expect(metrics.scored).toBe(1);
  });
});

describe("anchor set integrity — seed-verbatim only, zero authored questions", () => {
  it("holds exactly the 21 seeded directive codes, each once", () => {
    expect(GOLDEN_ANCHORS).toHaveLength(21);
    const codes = GOLDEN_ANCHORS.map((a) => a.code);
    expect(new Set(codes).size).toBe(21);
    const sec = Array.from({ length: 19 }, (_, i) => `SEC-${String(i + 1).padStart(2, "0")}`);
    expect(codes).toEqual([...sec, "SEC-RC", "SAF-GEN"]);
  });

  it("records that the seed supplies ZERO questions (30 not possible)", () => {
    expect(SEED_INVENTORY.questions).toBe(0);
    expect(SEED_INVENTORY.directives).toBe(21);
    expect(GOLDEN_ANCHORS.length).toBeLessThan(30);
  });

  it("every probe is non-empty Arabic (a seed label, not a question)", () => {
    for (const a of GOLDEN_ANCHORS) {
      expect(a.probeAr.trim().length).toBeGreaterThan(3);
      expect(/[؀-ۿ]/.test(a.probeAr)).toBe(true);
      // Seed labels are noun phrases — none is an interrogative.
      expect(a.probeAr).not.toContain("؟");
    }
  });
});
