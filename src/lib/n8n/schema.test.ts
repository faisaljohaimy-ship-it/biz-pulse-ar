// @vitest-environment node
/** صرامة المخططات: مفتاحٌ زائد يُرفض، وكل سقفٍ من العقد يُرفض تجاوزه، واتساق ok/code. */
import { describe, expect, it } from "vitest";
import {
  type ResearchEnvelope,
  type ResearchRequest,
  type RunnerEnvelope,
  type RunnerRequest,
  briefSchema,
  researchEnvelopeSchema,
  researchRequestSchema,
  runnerEnvelopeSchema,
  runnerRequestSchema,
} from "./schema";

const UUID = "123e4567-e89b-42d3-a456-426614174000";

const brief = { terms: ["أسوار"], codes: ["SEC-18"], lang: "ar" as const };
const request: ResearchRequest = {
  v: 1,
  requestId: UUID,
  mode: "regulatory",
  brief,
  maxResults: 5,
  freshness: "any",
};
const result = {
  title: "عنوان",
  url: "https://example.com/a",
  snippet: "مقتطف",
  publishedAt: "2026-09-01T00:00:00Z",
  provider: "p1",
};
const envelope: ResearchEnvelope = {
  v: 1,
  ok: true,
  code: "ok",
  requestId: UUID,
  degraded: false,
  fetchedAt: "2026-10-30T10:00:00.000Z",
  providers: [{ id: "p1", status: "ok", ms: 100, n: 1 }],
  results: [result],
};
const runnerEnv: RunnerEnvelope = {
  v: 1,
  ok: true,
  code: "ok",
  requestId: UUID,
  result: { summary: "تم", items: ["a"] },
};

const ok = (schema: { safeParse: (x: unknown) => { success: boolean } }, v: unknown) =>
  schema.safeParse(v).success;

describe("طلب البحث", () => {
  it("الصالح يمرّ", () => {
    expect(ok(researchRequestSchema, request)).toBe(true);
  });

  it.each([
    ["مفتاح زائد على الجذر", { ...request, extra: 1 }],
    ["مفتاح زائد في الموجز", { ...request, brief: { ...brief, raw: "الجملة كاملة" } }],
    ["v مختلف", { ...request, v: 2 }],
    ["requestId ليس UUID", { ...request, requestId: "abc" }],
    ["وضع خارج القائمة", { ...request, mode: "everything" }],
    ["حداثة خارج القائمة", { ...request, freshness: "week" }],
    ["maxResults = 6", { ...request, maxResults: 6 }],
    ["maxResults = 0", { ...request, maxResults: 0 }],
    ["maxResults كسر", { ...request, maxResults: 2.5 }],
    ["موجز فارغ", { ...request, brief: { terms: [], codes: [], lang: "ar" } }],
    ["7 كلمات", { ...request, brief: { ...brief, terms: Array(7).fill("كلمة") } }],
    ["كلمة 41 حرفًا", { ...request, brief: { ...brief, terms: ["ا".repeat(41)] } }],
    ["كلمة فارغة", { ...request, brief: { ...brief, terms: [""] } }],
    ["5 رموز", { ...request, brief: { ...brief, codes: Array(5).fill("SEC-1") } }],
    ["رمز 25 حرفًا", { ...request, brief: { ...brief, codes: ["S".repeat(25)] } }],
    ["لغة غير ar/en", { ...request, brief: { ...brief, lang: "fr" } }],
  ])("يُرفض: %s", (_n, v) => {
    expect(ok(researchRequestSchema, v)).toBe(false);
  });

  it("حدود القبول عند السقف بالضبط", () => {
    const edge = {
      ...request,
      brief: {
        terms: Array(6).fill("ا".repeat(40)),
        codes: Array(4).fill("S".repeat(24)),
        lang: "en",
      },
    };
    expect(ok(researchRequestSchema, edge)).toBe(true);
    expect(ok(briefSchema, edge.brief)).toBe(true);
  });
});

describe("طلب المشغّل", () => {
  const run: RunnerRequest = {
    v: 1,
    requestId: UUID,
    workflow: "engineering_digest",
    params: { days: 7 },
  };

  it("الصالح يمرّ، والكتالوج مغلق", () => {
    expect(ok(runnerRequestSchema, run)).toBe(true);
    for (const w of [
      "engineering_digest",
      "dependency_advisory_scan",
      "research_cache_purge",
      "canary_run_now",
      "owner_notify_test",
    ]) {
      expect(ok(runnerRequestSchema, { ...run, workflow: w })).toBe(true);
    }
    expect(ok(runnerRequestSchema, { ...run, workflow: "rm_rf" })).toBe(false);
    expect(ok(runnerRequestSchema, { ...run, workflow: "Engineering_Digest" })).toBe(false);
  });

  it.each([
    ["مفتاح زائد", { ...run, extra: true }],
    ["معامل نصّ حرّ", { ...run, params: { note: "افعل كذا الآن" } }],
    ["معامل بحرف كبير", { ...run, params: { mode: "FULL" } }],
    ["معامل كسر", { ...run, params: { days: 1.5 } }],
    ["معامل ضخم", { ...run, params: { days: 10_000_000 } }],
    ["معامل كائن", { ...run, params: { days: { a: 1 } } }],
    ["مفتاح بحرف كبير", { ...run, params: { Days: 1 } }],
    [
      "9 معاملات",
      { ...run, params: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`p${i}`, i])) },
    ],
    ["params مفقود", { v: 1, requestId: UUID, workflow: "canary_run_now" }],
  ])("يُرفض: %s", (_n, v) => {
    expect(ok(runnerRequestSchema, v)).toBe(false);
  });

  it("تعدادات قصيرة وأعداد صحيحة وبلا معاملات تمرّ", () => {
    expect(ok(runnerRequestSchema, { ...run, params: { scope: "week", n: -3 } })).toBe(true);
    expect(ok(runnerRequestSchema, { ...run, params: {} })).toBe(true);
  });
});

describe("غلاف البحث", () => {
  it("الصالح يمرّ", () => {
    expect(ok(researchEnvelopeSchema, envelope)).toBe(true);
  });

  it.each([
    ["مفتاح زائد على الجذر", { ...envelope, debug: "x" }],
    [
      "مفتاح زائد في نتيجة (مثل tier يدّعيه n8n)",
      { ...envelope, results: [{ ...result, tier: "official" }] },
    ],
    ["مفتاح زائد في نتيجة (domain)", { ...envelope, results: [{ ...result, domain: "gov.sa" }] }],
    [
      "مفتاح زائد في مزوّد",
      { ...envelope, providers: [{ id: "p", status: "ok", ms: 1, n: 1, key: "k" }] },
    ],
    ["v مختلف", { ...envelope, v: 2 }],
    ["رمز خارج القائمة", { ...envelope, code: "weird" }],
    ["fetchedAt ليس ISO", { ...envelope, fetchedAt: "yesterday" }],
    ["fetchedAt ناقص", { ...envelope, fetchedAt: undefined }],
    ["7 نتائج", { ...envelope, results: Array(7).fill(result) }],
    ["عنوان 121 حرفًا", { ...envelope, results: [{ ...result, title: "ع".repeat(121) }] }],
    ["مقتطف 301 حرفًا", { ...envelope, results: [{ ...result, snippet: "م".repeat(301) }] }],
    [
      "رابط 301 حرفًا",
      { ...envelope, results: [{ ...result, url: `https://e.com/${"a".repeat(290)}` }] },
    ],
    ["مزوّد بلا معرّف", { ...envelope, results: [{ ...result, provider: "" }] }],
    ["حالة مزوّد غريبة", { ...envelope, providers: [{ id: "p", status: "great", ms: 1, n: 1 }] }],
    ["ms سالب", { ...envelope, providers: [{ id: "p", status: "ok", ms: -1, n: 1 }] }],
    ["n كسر", { ...envelope, providers: [{ id: "p", status: "ok", ms: 1, n: 1.5 }] }],
    [
      "9 مزوّدين",
      { ...envelope, providers: Array(9).fill({ id: "p", status: "ok", ms: 1, n: 1 }) },
    ],
    ["ok نصّ", { ...envelope, ok: "true" }],
    ["results مفقود", { ...envelope, results: undefined }],
  ])("يُرفض: %s", (_n, v) => {
    expect(ok(researchEnvelopeSchema, v)).toBe(false);
  });

  it("حدود القبول عند السقف: 6 نتائج · 120/300/300", () => {
    const edge = {
      ...envelope,
      results: Array(6).fill({
        ...result,
        title: "ع".repeat(120),
        snippet: "م".repeat(300),
        url: `https://e.com/${"a".repeat(286)}`,
      }),
    };
    expect(edge.results[0].url.length).toBe(300);
    expect(ok(researchEnvelopeSchema, edge)).toBe(true);
  });

  it("publishedAt: null أو نصٌّ قصير؛ ونصٌّ طويل يُرفض", () => {
    expect(
      ok(researchEnvelopeSchema, { ...envelope, results: [{ ...result, publishedAt: null }] }),
    ).toBe(true);
    expect(
      ok(researchEnvelopeSchema, {
        ...envelope,
        results: [{ ...result, publishedAt: "x".repeat(41) }],
      }),
    ).toBe(false);
  });

  describe("اتساق ok و code", () => {
    it("ok ⇒ ok=true فقط", () => {
      expect(ok(researchEnvelopeSchema, { ...envelope, code: "ok", ok: false })).toBe(false);
    });
    it.each(["all_providers_failed", "auth_failed", "bad_request", "budget_exhausted", "internal"])(
      "%s ⇒ ok=false فقط",
      (code) => {
        expect(ok(researchEnvelopeSchema, { ...envelope, code, ok: false, results: [] })).toBe(
          true,
        );
        expect(ok(researchEnvelopeSchema, { ...envelope, code, ok: true, results: [] })).toBe(
          false,
        );
      },
    );
    it("no_results يُقبل بأيٍّ من القيمتين", () => {
      expect(
        ok(researchEnvelopeSchema, { ...envelope, code: "no_results", ok: true, results: [] }),
      ).toBe(true);
      expect(
        ok(researchEnvelopeSchema, { ...envelope, code: "no_results", ok: false, results: [] }),
      ).toBe(true);
    });
  });
});

describe("غلاف المشغّل", () => {
  it("الصالح يمرّ، والنتيجة قد تكون null", () => {
    expect(ok(runnerEnvelopeSchema, runnerEnv)).toBe(true);
    expect(ok(runnerEnvelopeSchema, { ...runnerEnv, result: null })).toBe(true);
  });

  it.each([
    ["مفتاح زائد", { ...runnerEnv, extra: 1 }],
    ["مفتاح زائد في النتيجة", { ...runnerEnv, result: { summary: "x", items: [], raw: "y" } }],
    ["ملخص 501 حرفًا", { ...runnerEnv, result: { summary: "م".repeat(501), items: [] } }],
    ["11 بندًا", { ...runnerEnv, result: { summary: "x", items: Array(11).fill("a") } }],
    ["بند 201 حرفًا", { ...runnerEnv, result: { summary: "x", items: ["a".repeat(201)] } }],
    ["بند ليس نصًّا", { ...runnerEnv, result: { summary: "x", items: [1] } }],
    ["رمز خارج القائمة", { ...runnerEnv, code: "weird" }],
    ["result مفقود", { v: 1, ok: true, code: "ok", requestId: UUID }],
  ])("يُرفض: %s", (_n, v) => {
    expect(ok(runnerEnvelopeSchema, v)).toBe(false);
  });

  it("حدود القبول: ملخص 500 · 10 بنود", () => {
    expect(
      ok(runnerEnvelopeSchema, {
        ...runnerEnv,
        result: { summary: "م".repeat(500), items: Array(10).fill("a".repeat(200)) },
      }),
    ).toBe(true);
  });

  describe("اتساق ok و code", () => {
    it("ok ⇒ ok=true فقط؛ والأخطاء ⇒ ok=false فقط؛ وalready_done بأيٍّ منهما", () => {
      expect(ok(runnerEnvelopeSchema, { ...runnerEnv, ok: false })).toBe(false);
      for (const code of [
        "unknown_workflow",
        "bad_params",
        "auth_failed",
        "budget_exhausted",
        "internal",
      ]) {
        expect(ok(runnerEnvelopeSchema, { ...runnerEnv, code, ok: false, result: null })).toBe(
          true,
        );
        expect(ok(runnerEnvelopeSchema, { ...runnerEnv, code, ok: true, result: null })).toBe(
          false,
        );
      }
      expect(ok(runnerEnvelopeSchema, { ...runnerEnv, code: "already_done", ok: true })).toBe(true);
      expect(ok(runnerEnvelopeSchema, { ...runnerEnv, code: "already_done", ok: false })).toBe(
        true,
      );
    });
  });
});
