/**
 * Phase-③ wiring tests: feature flag semantics, strict response-shape
 * validation (insufficient_evidence flows as SUCCESS data), rank-metric math
 * with hand-computed fixtures, and golden-set integrity (all 19 real SEC
 * codes present exactly once).
 */
import { describe, expect, it } from "vitest";
import { parseRagFlag } from "./flags";
import { parseRetrieveResponse } from "./client";
import { evaluateRetrieval, firstHitRank, GOLDEN_SET } from "./evaluation";

describe("feature flag — NOT_GLOBAL, default OFF", () => {
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
      title: "محطات التحويل",
      source: "hcis.gov.sa",
      chunk_index: 0,
    },
  };

  it("accepts a valid payload — and insufficient_evidence passes AS DATA", () => {
    const parsed = parseRetrieveResponse({
      results: [validResult],
      insufficient_evidence: true,
      degraded: null,
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.insufficient_evidence).toBe(true); // success outcome, not error
    expect(parsed?.results[0].citation.code).toBe("SEC-18");
  });

  it("accepts a null citation code (PTW docs may omit code)", () => {
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

describe("rank metrics — hand-computed fixture", () => {
  it("hit@1, hit@5, MRR, coverage match exact arithmetic", () => {
    const metrics = evaluateRetrieval([
      { queryId: "sec-18", rankedCodes: ["SEC-18", "SEC-01"], insufficient: false }, // rank 1
      { queryId: "sec-13", rankedCodes: ["SEC-01", "SEC-13"], insufficient: false }, // rank 2
      { queryId: "sec-02", rankedCodes: ["SEC-09", null], insufficient: true }, // miss
    ]);
    expect(metrics.scored).toBe(3);
    expect(metrics.hitAt1).toBeCloseTo(1 / 3, 12);
    expect(metrics.hitAt5).toBeCloseTo(2 / 3, 12);
    expect(metrics.mrr).toBeCloseTo((1 + 0.5 + 0) / 3, 12);
    expect(metrics.coverage).toBeCloseTo(2 / 3, 12);
    expect(metrics.insufficientRate).toBeCloseTo(1 / 3, 12);
    expect(metrics.misses).toEqual(["sec-02"]);
  });

  it("prefix expectation matches PTW-style codes; unknown ids are ignored", () => {
    expect(firstHitRank({ prefix: "PTW" }, ["SEC-01", "PTW-SIM-3"])).toBe(2);
    const metrics = evaluateRetrieval([
      { queryId: "ptw-chain", rankedCodes: ["PTW-01"], insufficient: false },
      { queryId: "not-a-golden-id", rankedCodes: ["SEC-01"], insufficient: false },
    ]);
    expect(metrics.total).toBe(2);
    expect(metrics.scored).toBe(1);
    expect(metrics.hitAt1).toBe(1);
  });
});

describe("golden set integrity — real seed codes, no inventions", () => {
  it("holds all 19 SEC codes exactly once + 3 PTW queries = 22", () => {
    expect(GOLDEN_SET).toHaveLength(22);
    const secCodes = GOLDEN_SET.flatMap((g) => g.expect.codes ?? []);
    const expected = Array.from({ length: 19 }, (_, i) => `SEC-${String(i + 1).padStart(2, "0")}`);
    expect([...secCodes].sort()).toEqual([...expected].sort());
    expect(new Set(secCodes).size).toBe(19);
    expect(GOLDEN_SET.filter((g) => g.expect.prefix === "PTW")).toHaveLength(3);
  });

  it("every query is non-empty Arabic with a unique id", () => {
    expect(new Set(GOLDEN_SET.map((g) => g.id)).size).toBe(GOLDEN_SET.length);
    for (const g of GOLDEN_SET) {
      expect(g.queryAr.trim().length).toBeGreaterThan(5);
      expect(/[؀-ۿ]/.test(g.queryAr)).toBe(true);
    }
  });
});
