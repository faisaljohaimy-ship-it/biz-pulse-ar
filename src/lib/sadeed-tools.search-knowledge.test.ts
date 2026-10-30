// @vitest-environment node
/**
 * أداة `search_knowledge` في دردشة سَدِيد (O3، ٢٠٢٦/١٠/٣٠).
 *
 * ثلاثة ثوابت، كلٌّ منها أُثبت أحمر على انتهاك مزروع:
 *
 * ① **لا التقاط داخل مسار الطلب (المادة ٢٦):** نداء `rag_record_gap_for_org`
 *    أُزيل. قِيس في الإنتاج: الدالّة بلا `EXECUTE` لـ`authenticated` وجدولها
 *    `rag_gaps` غائب، فلم يكن النداء قادرًا إلا على الفشل.
 * ② **لا رمي أبدًا (SEC-10):** `rpc` يعيد thenable بلا `.catch` (منشئ postgrest-js)
 *    فكان `.catch(() => undefined)` يرمي `TypeError`. الأداة تعيد الآن
 *    `{ ok:false, gate_result, results:[] }` صادقًا مهما حدث.
 * ③ **المطابقة النصّية تُذكر ولا يُستشهد بها:** حين يتعذّر التضمين تصل النتائج
 *    في `unverified_matches` بلا وسم استشهاد، و`results` فارغة، و`ok:false`.
 */
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ALL_ARTICLES,
  A_FENCE,
  makeFake,
  ORG_A,
  QUERY,
  USER_A,
  type Row,
} from "@/lib/sadeed/rag/fake-rag-db.test-support";

const state = vi.hoisted(() => ({
  ready: true,
  embed: "throw" as "throw" | "ok",
}));

vi.mock("@/lib/authz.server", () => ({
  getCurrentOrgIdForUser: async () => null,
  hasAnyPlatformRole: async () => false,
  hasPlatformRole: async () => false,
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));
vi.mock("@/lib/sadeed/rag.server", () => ({ isGeminiRagReady: () => state.ready }));
vi.mock("@/lib/sadeed/rag/embed.server", () => ({
  RAG_MODEL_VERSION: "test-embed-1536-v1",
  toPgVector: (v: number[]) => `[${v.join(",")}]`,
  embedOne: async () => {
    if (state.embed === "throw") throw new Error("no embedding key");
    return { vector: [0.1, 0.2, 0.3], model_version: "x" };
  },
}));

type ToolLike = { execute: (a: unknown, o: unknown) => Promise<Record<string, unknown>> };

async function searchKnowledge(
  client: SupabaseClient,
  orgId: string | null = ORG_A,
): Promise<Record<string, unknown>> {
  const { buildSadeedTools } = await import("@/lib/sadeed-tools.server");
  const tools = buildSadeedTools(client, USER_A, {
    lastUserText: QUERY,
    orgId,
  }) as unknown as Record<string, ToolLike>;
  return tools.search_knowledge.execute(
    { query: QUERY, limit: 8 },
    { toolCallId: "t-search-knowledge", messages: [] },
  );
}

const rpcRow = (id: string, dense: number): Row => ({
  id,
  doc_code: id,
  title_ar: `عنوان ${id}`,
  title_en: null,
  summary_ar: `ملخص ${id}`,
  summary_en: null,
  category_code: null,
  risk_level: null,
  priority: null,
  dense_score: dense,
  fts_score: 0,
  trgm_score: 0,
  rrf_score: 0,
});

beforeEach(() => {
  state.ready = true;
  state.embed = "throw";
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock("@/lib/sadeed/rag/retrieve.server");
  vi.resetModules();
});

describe("① لا التقاط فجوات داخل مسار الطلب (المادة ٢٦)", () => {
  it("بوابة غير ناجحة ⇐ لا نداء rag_record_gap_for_org ولا أي RPC كاتب", async () => {
    state.embed = "ok";
    const db = makeFake({ rpcRows: [rpcRow("a", 0.1)] }); // تحت العتبة
    const out = await searchKnowledge(db.client);
    expect(out).toMatchObject({ ok: false, gate_result: "below_threshold", results: [] });
    expect(db.calls.rpc.map((c) => c.name)).toEqual(["sec_kb_hybrid_search"]);
    expect(db.calls.rpc.some((c) => c.name === "rag_record_gap_for_org")).toBe(false);
  });

  it("ولا أثر للنداء في مصدر الأداة ولا في مصدر البوابة", () => {
    for (const f of ["src/lib/sadeed-tools.server.ts", "src/lib/sadeed/rag/retrieve.server.ts"]) {
      expect(readFileSync(f, "utf8"), `${f} ينادي دالّة التقاط الفجوات`).not.toMatch(
        /rag_record_gap_for_org/,
      );
    }
  });
});

describe("② الأداة لا ترمي أبدًا (SEC-10)", () => {
  it("rpc يعيد thenable بلا catch ⇐ نتيجة صادقة لا TypeError", async () => {
    state.embed = "ok";
    const db = makeFake({ rpcRows: [] });
    // التأكيد على أن الوهمي يعيد thenable بلا catch فعلًا — كمنشئ postgrest-js.
    const probe = (db.client as unknown as { rpc: (n: string, a: object) => object }).rpc("x", {});
    expect(typeof (probe as { catch?: unknown }).catch).toBe("undefined");
    db.calls.rpc.length = 0;

    const out = await searchKnowledge(db.client);
    expect(out).toMatchObject({ ok: false, gate_result: "below_threshold", results: [] });
  });

  it("rpc يرمي تزامنيًّا ⇐ {ok:false, gate_result:error} بلا رمي", async () => {
    state.embed = "ok";
    const db = makeFake({ rpcThrows: true });
    const out = await searchKnowledge(db.client);
    expect(out).toMatchObject({ ok: false, gate_result: "error", results: [] });
  });

  it("البوابة نفسها ترمي ⇐ {ok:false, gate_result:error, reason:retrieval_failed}", async () => {
    vi.resetModules();
    vi.doMock("@/lib/sadeed/rag/retrieve.server", () => ({
      retrieveWithEvidenceGate: async () => {
        throw new Error("gate exploded");
      },
      unverifiedMentions: () => [],
      UNVERIFIED_MENTION_NOTE: "",
    }));
    const out = await searchKnowledge(makeFake().client);
    expect(out).toEqual({
      ok: false,
      gate_result: "error",
      reason: "retrieval_failed",
      results: [],
    });
  });

  it("بلا مؤسسة ⇐ missing_org_context بلا أي قراءة", async () => {
    const db = makeFake({ articles: ALL_ARTICLES });
    const out = await searchKnowledge(db.client, null);
    expect(out).toMatchObject({ ok: false, gate_result: "error", reason: "missing_org_context" });
    expect(db.calls.reads).toEqual([]);
    expect(db.calls.rpc).toEqual([]);
  });
});

describe("③ المطابقة النصّية تُذكر ولا يُستشهد بها", () => {
  it("التضمين معطّل ⇐ results فارغة، وunverified_matches مرتّبة بلا وسم استشهاد", async () => {
    const db = makeFake({ articles: ALL_ARTICLES, jwtUid: USER_A });
    const out = await searchKnowledge(db.client);
    expect(out).toMatchObject({
      ok: false,
      gate_result: "below_threshold",
      reason: "lexical_only",
      results: [],
    });
    const matches = out.unverified_matches as Array<Record<string, unknown>>;
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].id).toBe(A_FENCE.id);
    for (const m of matches) {
      expect(m.citable).toBe(false);
      expect(JSON.stringify(m)).not.toMatch(/\[(?:KB|DOC):/);
    }
    expect(typeof out.unverified_note).toBe("string");
    // لا صفّ من مؤسسة أخرى ولا مسودة.
    expect(JSON.stringify(out)).not.toContain("B-SECRET-9");
    // لا RPC هجين بمتّجه فارغ.
    expect(db.calls.rpc).toEqual([]);
  });

  it("والصفّ المسجَّل يحمل user_id الجلسة (عميل JWT) فيقبله RLS", async () => {
    const db = makeFake({ articles: ALL_ARTICLES, jwtUid: USER_A });
    await searchKnowledge(db.client);
    expect(db.calls.rejected).toEqual([]);
    expect(db.calls.accepted).toHaveLength(1);
    expect(db.calls.accepted[0]).toMatchObject({
      user_id: USER_A,
      org_id: ORG_A,
      route: "chat-tool:search_knowledge",
    });
  });

  it("بوابة ناجحة ⇐ ok:true بوسم استشهاد ولا unverified_matches", async () => {
    state.embed = "ok";
    const db = makeFake({ rpcRows: [rpcRow("KB-1", 0.9), rpcRow("KB-2", 0.6)] });
    const out = await searchKnowledge(db.client);
    expect(out).toMatchObject({ ok: true, gate_result: "passed", citation_count: 2 });
    const results = out.results as Array<{ citation: string }>;
    expect(results.map((r) => r.citation)).toEqual(["[KB:KB-1]", "[KB:KB-2]"]);
    expect(out.unverified_matches).toBeUndefined();
  });
});
