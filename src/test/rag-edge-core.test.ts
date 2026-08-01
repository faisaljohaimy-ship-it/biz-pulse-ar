/**
 * rag-edge-core tests — the pure core shared by the rag-retrieve / rag-ingest
 * Edge Functions (supabase/functions/_shared/rag-core.ts).
 *
 * The decisive suite here is the NEGATIVE one: any org-ish key in a request
 * body is rejected with 400/org_id_forbidden — org identity derives from the
 * JWT inside Postgres (RLS), never from the client.
 */
import { describe, expect, it } from "vitest";
import {
  CHUNK_MAX_CHARS,
  CHUNK_OVERLAP_CHARS,
  chunkArabicText,
  EMBED_DIM,
  hasSufficientEvidence,
  parseIngestRequest,
  parseRetrieveRequest,
  validateEmbeddingVector,
} from "../../supabase/functions/_shared/rag-core";

describe("NEGATIVE — org_id from the request body is REJECTED (both endpoints)", () => {
  const orgKeys = [
    "org_id",
    "orgId",
    "org-id",
    "org",
    "organization_id",
    "organizationId",
    "organization",
    "tenant_id",
    "tenantId",
    "tenant",
  ];

  it("retrieve: every org-ish alias → 400 org_id_forbidden", () => {
    for (const key of orgKeys) {
      const res = parseRetrieveRequest({
        query: "ما نطاق SEC-18؟",
        [key]: "00000000-0000-0000-0000-00000000bbbb",
      });
      expect(res.ok, `key "${key}" must be rejected`).toBe(false);
      if (!res.ok) {
        expect(res.status).toBe(400);
        expect(res.code).toBe("org_id_forbidden");
        expect(res.messageAr).toContain("يُشتق من جلستك");
      }
    }
  });

  it("ingest: every org-ish alias → 400 org_id_forbidden", () => {
    for (const key of orgKeys) {
      const res = parseIngestRequest({
        title: "توجيه",
        source: "hcis.gov.sa",
        content: "نص",
        [key]: "attacker-org",
      });
      expect(res.ok, `key "${key}" must be rejected`).toBe(false);
      if (!res.ok) expect(res.code).toBe("org_id_forbidden");
    }
  });

  it("unknown keys are also rejected (strict allowlist — no smuggling channel)", () => {
    const res = parseRetrieveRequest({ query: "x", filter: "org=b" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe("unknown_field");
  });
});

describe("retrieve request validation", () => {
  it("accepts a valid Arabic query and clamps match_count to [1,24]", () => {
    const ok = parseRetrieveRequest({ query: "  متطلبات تصريح العمل  ", match_count: 100 });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.query).toBe("متطلبات تصريح العمل");
      expect(ok.value.match_count).toBe(24);
    }
  });

  it("rejects an empty / non-string query and a non-object body", () => {
    expect(parseRetrieveRequest({ query: "   " }).ok).toBe(false);
    expect(parseRetrieveRequest({ query: 5 }).ok).toBe(false);
    expect(parseRetrieveRequest([1]).ok).toBe(false);
    expect(parseRetrieveRequest(null).ok).toBe(false);
  });
});

describe("ingest request validation", () => {
  it("accepts a valid document with defaults (sec · ar · not simulation)", () => {
    const ok = parseIngestRequest({
      code: "SEC-18",
      title: "توجيه",
      source: "hcis.gov.sa",
      content: "نص التوجيه.",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.value.doc_type).toBe("sec");
      expect(ok.value.lang).toBe("ar");
      expect(ok.value.is_simulation).toBe(false);
    }
  });

  it("rejects a bad doc_type and oversized content", () => {
    expect(parseIngestRequest({ doc_type: "x", title: "t", source: "s", content: "c" }).ok).toBe(
      false,
    );
    expect(parseIngestRequest({ title: "t", source: "s", content: "a".repeat(200_001) }).ok).toBe(
      false,
    );
  });
});

describe("Gemini Embedding 2 vector contract", () => {
  it("accepts exactly the configured 1536-dimensional representation", () => {
    const vector = Array.from({ length: EMBED_DIM }, (_, index) => index / EMBED_DIM);
    const out = validateEmbeddingVector(vector);
    expect(out).toHaveLength(EMBED_DIM);
    expect(out).toEqual(vector);
  });

  it("rejects under/over-dimensioned and non-finite responses", () => {
    expect(() => validateEmbeddingVector([1, 2, 3])).toThrowError(/1536/);
    expect(() => validateEmbeddingVector(Array(3072).fill(1))).toThrowError(/exactly/);
    const invalid = Array(EMBED_DIM).fill(0);
    invalid[7] = Number.NaN;
    expect(() => validateEmbeddingVector(invalid)).toThrowError(/non-finite/);
  });
});

describe("clause-preserving chunker", () => {
  const sentence = "تُطبَّق اشتراطات السلامة الصناعية على كل محطة تحويل قبل إصدار تصريح العمل. ";

  it("short text → one chunk, verbatim", () => {
    expect(chunkArabicText("  نص قصير.  ")).toEqual(["نص قصير."]);
    expect(chunkArabicText("")).toEqual([]);
  });

  it("long text → every chunk ≤ the hard ceiling, deterministic", () => {
    const long = sentence.repeat(120);
    const a = chunkArabicText(long);
    const b = chunkArabicText(long);
    expect(a.length).toBeGreaterThan(1);
    expect(a.every((c) => c.length <= CHUNK_MAX_CHARS)).toBe(true);
    expect(a).toEqual(b);
  });

  it("consecutive chunks carry the exact tail overlap", () => {
    const long = sentence.repeat(120);
    const chunks = chunkArabicText(long);
    const tail = chunks[0].slice(-CHUNK_OVERLAP_CHARS);
    expect(chunks[1].startsWith(tail)).toBe(true);
  });
});

describe("evidence sufficiency (≥2 corroborating paths)", () => {
  it("empty results → insufficient", () => {
    expect(hasSufficientEvidence([])).toBe(false);
  });
  it("single-path hits only → insufficient", () => {
    expect(hasSufficientEvidence([{ matched_paths: 1 }, { matched_paths: 1 }])).toBe(false);
  });
  it("one chunk corroborated by ≥2 paths → sufficient", () => {
    expect(hasSufficientEvidence([{ matched_paths: 1 }, { matched_paths: 2 }])).toBe(true);
  });
});
