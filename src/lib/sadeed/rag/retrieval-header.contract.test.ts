// @vitest-environment node
/**
 * عقد ترويسة الاسترجاع وحدث `rag.outcome` (O7 أ، ٢٠٢٦/١٠/٣٠):
 *
 * - قيمة `X-SADEED-Retrieval` تُشتقّ من الأذرع **التي خدمت** لا التي جُرِّبت.
 * - الحدث يحمل `arms_tried · arms_served · hits · latency_ms · reason_codes` بشكلٍ
 *   مغلق: لا نصّ استعلام، ولا معرّف شخص لأي حال جلسة.
 * - الاشتقاق دالّةٌ متزامنة نقيّة (لا انتظار جديد على المسار الحرج).
 *
 * لكل قاعدة حالة حمراء مزروعة في الملف نفسه (المادة ٣٠).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ARM_NAMES, type AggregateOutcome } from "@/lib/retrieval/aggregate.server";
import { fuseRankedLists } from "@/lib/retrieval/fuse.server";
import type { Hit } from "@/lib/retrieval/types";
import { gatherRagContext } from "../rag.server";
import { resetLexicalArmsStateForTests } from "./lexical-arms.server";
import {
  observeRagOutcome,
  resetRagObservationForTests,
  retrievalHeaderValue,
  type RetrievalHeaderValue,
} from "./observe.server";

const embed = vi.hoisted(() => ({ vector: null as number[] | null }));
vi.mock("@/lib/sadeed/embeddings.server", () => ({
  embedText: async () => embed.vector,
  toPgVector: (v: number[]) => `[${v.join(",")}]`,
}));

const USER = "11111111-1111-4111-8111-111111111111";
const ORG = "00000000-0000-0000-0000-000000000001";
const QUERY = "ما متطلبات الأسوار الأمنية حول المنشأة؟";
const ENV_OFF = { SADEED_GEMINI_RAG_READY: "false" };
const ENV_ON = { SADEED_GEMINI_RAG_READY: "true" };

type Row = Record<string, unknown>;

/** عميل مزروع: الجداول فارغة صادقة، والـRPC تعيد `rpcRows` — بلا شبكة. */
function client(rpcRows: Row[] = []): SupabaseClient {
  const chainOf = (data: unknown): unknown => {
    const chain: unknown = new Proxy(() => chain, {
      get(_t, prop) {
        if (prop === "then")
          return (resolve: (v: unknown) => unknown) => resolve({ data, error: null });
        return () => chain;
      },
      apply: () => chain,
    });
    return chain;
  };
  return { from: () => chainOf([]), rpc: () => chainOf(rpcRows) } as unknown as SupabaseClient;
}

const VECTOR_ROW: Row = {
  id: "k1",
  key: "ذاكرة",
  scope: "conversation",
  chunk_id: "c1",
  document_id: "d1",
  title: "سياسة الأسوار",
  source: "kb/fences",
  content: "اشتراطات الأسوار الأمنية ومواصفات الارتفاع حول المنشآت",
  importance: 0.5,
  similarity: 0.91,
};

function infoEvents(info: { mock: { calls: unknown[][] } }, event: string) {
  return info.mock.calls
    .map((c) => c[1])
    .filter(
      (e): e is Record<string, unknown> =>
        !!e && typeof e === "object" && (e as { event?: unknown }).event === event,
    );
}

const outcomeWith = (arms: AggregateOutcome["arms"]): AggregateOutcome => ({
  arms,
  fused: [],
  servedArms: arms.filter((a) => a.served).map((a) => a.arm),
  latencyMs: 9,
});

const hitOf = (id: string): Hit => ({
  id,
  source: "seed",
  title: `عنوان ${id}`,
  excerpt: `مقتطف ${id}`,
  score: 1,
  rank: 1,
  provenance: { docId: `kb/${id}`, citable: true, label: "مطابقة نصّية" },
});

/** نتيجةٌ مدموجة حقيقية (RRF) من قوائم الأذرع: `fused` فيها بلا تكرار، و`hits` للأذرع بتكرار. */
function fusedOutcome(lists: Array<{ arm: string; hits: Hit[] }>): AggregateOutcome {
  return {
    arms: lists.map((l) => ({
      arm: l.arm,
      served: true,
      hits: l.hits,
      reason: null,
      latencyMs: 1,
    })),
    fused: fuseRankedLists(lists),
    servedArms: lists.map((l) => l.arm),
    latencyMs: 9,
  };
}

beforeEach(() => {
  resetRagObservationForTests();
  resetLexicalArmsStateForTests();
  embed.vector = null;
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("① القيمة من الأذرع التي خدمت — جدول الحقيقة الكامل", () => {
  const TABLE: Array<[string, readonly string[], RetrievalHeaderValue]> = [
    ["لا ذراع خدمت", [], "none"],
    ["الفهرس الداخلي وحده", [ARM_NAMES.seed], "lexical"],
    ["hcis الحيّة وحدها", [ARM_NAMES.hcisLive], "lexical"],
    ["ذراعان معجميتان", [ARM_NAMES.hcisLive, ARM_NAMES.seed], "lexical"],
    ["المسجَّل: المعجمية كلّها", [ARM_NAMES.seed, ARM_NAMES.finnKnowledge], "lexical"],
    ["المتّجهية وحدها", [ARM_NAMES.vector], "vector"],
    ["المتّجهية ومعجمية", [ARM_NAMES.vector, ARM_NAMES.seed], "vector+lexical"],
    [
      "كل الأذرع",
      [
        ARM_NAMES.seed,
        ARM_NAMES.hcisLive,
        ARM_NAMES.finnKnowledge,
        ARM_NAMES.secKnowledge,
        ARM_NAMES.documentChunks,
        ARM_NAMES.vector,
      ],
      "vector+lexical",
    ],
  ];
  it.each(TABLE)("%s ⇒ %s", (_label, served, expected) => {
    expect(retrievalHeaderValue(served)).toBe(expected);
  });

  it("كل ذراع معروفة مصنَّفة صراحةً: أُضيفت ذراع جديدة بلا تصنيف ⇒ يسقط هذا الاختبار", () => {
    const CLASSIFIED: Record<string, "lexical" | "vector"> = {
      [ARM_NAMES.seed]: "lexical",
      [ARM_NAMES.hcisLive]: "lexical",
      [ARM_NAMES.finnKnowledge]: "lexical",
      [ARM_NAMES.secKnowledge]: "lexical",
      [ARM_NAMES.documentChunks]: "lexical",
      [ARM_NAMES.vector]: "vector",
    };
    expect(Object.keys(CLASSIFIED).sort()).toEqual(Object.values(ARM_NAMES).sort());
    for (const [arm, kind] of Object.entries(CLASSIFIED))
      expect(retrievalHeaderValue([arm])).toBe(kind);
  });

  it("مزروع: الاشتقاق من «ما جُرِّب» كان يقول vector+lexical والمتّجهية متخطّاة (flag_off) — الخدمة تقول lexical", () => {
    const arms: AggregateOutcome["arms"] = [
      { arm: ARM_NAMES.seed, served: true, hits: [], reason: null, latencyMs: 1 },
      { arm: ARM_NAMES.vector, served: false, hits: [], reason: "flag_off", latencyMs: 0 },
    ];
    const byTried = (a: AggregateOutcome["arms"]) => retrievalHeaderValue(a.map((x) => x.arm));
    expect(byTried(arms)).toBe("vector+lexical");
    expect(retrievalHeaderValue(arms.filter((a) => a.served).map((a) => a.arm))).toBe("lexical");
    expect(
      observeRagOutcome(outcomeWith(arms), { audience: "anonymous" }, { info() {}, warn() {} }),
    ).toMatchObject({ retrieval: "lexical", arms_served: [ARM_NAMES.seed] });
  });

  it("ذراعٌ خدمت بنتيجة فارغة خدمت: lexical لا none (الفراغ الصادق نتيجة)", () => {
    const arms: AggregateOutcome["arms"] = [
      { arm: ARM_NAMES.seed, served: true, hits: [], reason: null, latencyMs: 1 },
    ];
    expect(
      observeRagOutcome(outcomeWith(arms), { audience: "anonymous" }, { info() {}, warn() {} })
        .retrieval,
    ).toBe("lexical");
  });

  it("دالّةٌ متزامنة نقيّة: لا Promise ولا async في المصدر — لا انتظار جديد على المسار الحرج", () => {
    const out: unknown = retrievalHeaderValue([ARM_NAMES.seed]);
    expect(typeof out).toBe("string");
    expect(out).not.toBeInstanceOf(Promise);
    const src = readFileSync("src/lib/sadeed/rag/observe.server.ts", "utf8");
    expect(src).toMatch(/export function retrievalHeaderValue\(/);
    expect(src).not.toMatch(/export async function retrievalHeaderValue/);
  });
});

describe("② حدث rag.outcome — الحقول الجديدة بشكلٍ مغلق", () => {
  it("الحمولة: retrieval · arms_tried · arms_served · hits · latency_ms · reason_codes · auth_state", () => {
    const log = { info: vi.fn(), warn: vi.fn() };
    const ev = observeRagOutcome(
      outcomeWith([
        { arm: ARM_NAMES.seed, served: true, hits: [], reason: null, latencyMs: 3 },
        { arm: ARM_NAMES.hcisLive, served: false, hits: [], reason: "timeout", latencyMs: 1500 },
        { arm: ARM_NAMES.vector, served: false, hits: [], reason: "flag_off", latencyMs: 0 },
        { arm: ARM_NAMES.finnKnowledge, served: false, hits: [], reason: "timeout", latencyMs: 9 },
      ]),
      { requestId: "r-9", audience: "member", authState: "verified" },
      log,
    );
    expect(ev).toMatchObject({
      event: "rag.outcome",
      requestId: "r-9",
      auth_state: "verified",
      retrieval: "lexical",
      arms_tried: [ARM_NAMES.seed, ARM_NAMES.hcisLive, ARM_NAMES.vector, ARM_NAMES.finnKnowledge],
      arms_served: [ARM_NAMES.seed],
      hits: 0,
      latency_ms: 9,
      reason_codes: ["flag_off", "timeout"],
    });
  });

  it("hits = عدد النتائج المدموجة بلا تكرار (لا صفرًا ثابتًا ولا مجموع نتائج الأذرع)", () => {
    // ذراعان: الأولى a,b,c والثانية b,d ⇒ مجموع نتائج الأذرع 5، والمدموج بلا تكرار 4.
    const outcome = fusedOutcome([
      { arm: ARM_NAMES.seed, hits: [hitOf("a"), hitOf("b"), hitOf("c")] },
      { arm: ARM_NAMES.hcisLive, hits: [hitOf("b"), hitOf("d")] },
    ]);
    expect(outcome.arms.reduce((n, a) => n + a.hits.length, 0)).toBe(5);
    expect(outcome.fused).toHaveLength(4);
    const ev = observeRagOutcome(outcome, { audience: "anonymous" }, { info() {}, warn() {} });
    expect(ev.hits).toBe(4);
    // الحقل الأقدم الباقي لقرّاء السجلّ يطابقه، فلا يتباعدان بصمت.
    expect(ev.hitCount).toBe(4);
    expect(ev.arms[ARM_NAMES.seed]!.candidates).toBe(3);
    expect(ev.arms[ARM_NAMES.hcisLive]!.candidates).toBe(2);
  });

  it("مزروع: الأعداد الخاطئة الثلاثة (صفر ثابت · مجموع الأذرع · المجموع + المدموج) تُدان بالعدد نفسه", () => {
    const outcome = fusedOutcome([
      { arm: ARM_NAMES.seed, hits: [hitOf("a"), hitOf("b"), hitOf("c")] },
      { arm: ARM_NAMES.hcisLive, hits: [hitOf("b"), hitOf("d")] },
    ]);
    const ev = observeRagOutcome(outcome, { audience: "anonymous" }, { info() {}, warn() {} });
    const sumArms = outcome.arms.reduce((n, a) => n + a.hits.length, 0);
    for (const wrong of [0, sumArms, sumArms + outcome.fused.length])
      expect(ev.hits).not.toBe(wrong);
  });

  it("الأذرع المُسقَطة قبل التشغيل (db_unavailable) ليست «جُرِّبت» لكن سببها يبقى في reason_codes", () => {
    const ev = observeRagOutcome(
      outcomeWith([
        { arm: ARM_NAMES.seed, served: true, hits: [], reason: null, latencyMs: 2 },
        {
          arm: ARM_NAMES.hcisLive,
          served: false,
          hits: [],
          reason: "db_unavailable",
          latencyMs: 0,
        },
      ]),
      { audience: "anonymous" },
      { info() {}, warn() {} },
    );
    expect(ev.arms_tried).toEqual([ARM_NAMES.seed]);
    expect(ev.reason_codes).toEqual(["db_unavailable"]);
    expect(ev.retrieval).toBe("lexical");
  });

  it("لا ذراع خدمت ⇒ none، وreason_codes تشرح؛ ونصٌّ حرّ في السبب يُردّ error", () => {
    const ev = observeRagOutcome(
      outcomeWith([
        { arm: ARM_NAMES.seed, served: false, hits: [], reason: "threw", latencyMs: 1 },
        {
          arm: ARM_NAMES.hcisLive,
          served: false,
          hits: [],
          reason: 'relation "finn_knowledge" does not exist',
          latencyMs: 1,
        },
      ]),
      { audience: "anonymous" },
      { info() {}, warn() {} },
    );
    expect(ev.retrieval).toBe("none");
    expect(ev.arms_served).toEqual([]);
    expect(ev.reason_codes).toEqual(["error", "threw"]);
    expect(JSON.stringify(ev)).not.toContain("does not exist");
  });

  it("auth_state مفرداتٌ مغلقة: قيمة حرّة (نصّ أو معرّف) تُردّ null ولا تصل الحدث", () => {
    const base = outcomeWith([
      { arm: ARM_NAMES.seed, served: true, hits: [], reason: null, latencyMs: 1 },
    ]);
    const log = { info() {}, warn() {} };
    expect(
      observeRagOutcome(base, { audience: "anonymous", authState: "unverified" }, log),
    ).toMatchObject({ auth_state: "unverified" });
    expect(observeRagOutcome(base, { audience: "anonymous" }, log).auth_state).toBeNull();
    const leaked = observeRagOutcome(base, { audience: "member", authState: USER }, log);
    expect(leaked.auth_state).toBeNull();
    expect(JSON.stringify(leaked)).not.toContain(USER);
  });
});

describe("③ gatherRagContext — الحالات الحقيقية بأذرع حقيقية وعميلٍ مزروع", () => {
  const headerOf = (ctx: Awaited<ReturnType<typeof gatherRagContext>>) =>
    retrievalHeaderValue(ctx.retrieval.servedArms);

  it("زائر ⇒ lexical (الفهرس الداخلي + hcis)، والحدث يطابق الترويسة", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const ctx = await gatherRagContext(client(), null, null, QUERY, {
      audience: "anonymous",
      env: ENV_OFF,
      authState: "anonymous",
      requestId: "r-guest",
    });
    expect(headerOf(ctx)).toBe("lexical");
    const [ev] = infoEvents(info, "rag.outcome");
    expect(ev).toMatchObject({
      retrieval: "lexical",
      auth_state: "anonymous",
      arms_served: ctx.retrieval.servedArms,
    });
    // دورٌ يعيد نتائج: العدد في الحدث هو عدد المدموج الذي بُني منه السياق، لا صفر.
    expect(ctx.retrieval.hitCount).toBeGreaterThan(0);
    expect(ev.hits).toBe(ctx.retrieval.hitCount);
    expect(ev.hits).toBe(ev.hitCount);
    expect(ev.arms_tried).toEqual([ARM_NAMES.hcisLive, ARM_NAMES.seed]);
  });

  it("مسجَّل والراية منخفضة ⇒ lexical، والمتّجهية متخطّاة flag_off (جُرِّبت ولم تخدم)", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const ctx = await gatherRagContext(client(), USER, ORG, QUERY, {
      audience: "member",
      env: ENV_OFF,
      authState: "verified",
    });
    expect(headerOf(ctx)).toBe("lexical");
    const [ev] = infoEvents(info, "rag.outcome");
    expect(ev.arms_tried).toContain(ARM_NAMES.vector);
    expect(ev.arms_served).not.toContain(ARM_NAMES.vector);
    expect(ev.reason_codes).toContain("flag_off");
  });

  it("المتّجهية خدمت (راية + تضمين + صفوف) ⇒ vector+lexical", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    embed.vector = [0.1, 0.2, 0.3];
    const ctx = await gatherRagContext(client([VECTOR_ROW]), USER, ORG, QUERY, {
      audience: "member",
      env: ENV_ON,
      authState: "verified",
    });
    expect(ctx.retrieval.servedArms).toContain(ARM_NAMES.vector);
    expect(headerOf(ctx)).toBe("vector+lexical");
  });

  it("الراية مرفوعة ولا تضمين (لا مزوّد) ⇒ lexical: المتّجهية جُرِّبت ولم تخدم embed_unavailable", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    embed.vector = null;
    const ctx = await gatherRagContext(client([VECTOR_ROW]), USER, ORG, QUERY, {
      audience: "member",
      env: ENV_ON,
      authState: "verified",
    });
    expect(headerOf(ctx)).toBe("lexical");
    const [ev] = infoEvents(info, "rag.outcome");
    expect(ev.arms_tried).toContain(ARM_NAMES.vector);
    expect(ev.reason_codes).toContain("embed_unavailable");
  });

  it("المخزن معطّل (degraded) ⇒ lexical من الفهرس الداخلي، والأذرع القاعدية والمتّجهية خارج arms_tried", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    embed.vector = [0.1, 0.2, 0.3];
    const ctx = await gatherRagContext(client([VECTOR_ROW]), USER, ORG, QUERY, {
      audience: "member",
      env: ENV_ON,
      dbUnavailable: true,
      authState: "verified",
    });
    expect(headerOf(ctx)).toBe("lexical");
    const [ev] = infoEvents(info, "rag.outcome");
    expect(ev.arms_tried).toEqual([ARM_NAMES.seed]);
    expect(ev.reason_codes).toEqual(["db_unavailable"]);
  });

  it("استعلام فارغ ⇒ لا ذراع ولا حدث، والقيمة none", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const ctx = await gatherRagContext(client(), null, null, "   ", { audience: "anonymous" });
    expect(headerOf(ctx)).toBe("none");
    expect(infoEvents(info, "rag.outcome")).toEqual([]);
  });
});

describe("④ الحدث بلا نصّ استعلام ولا معرّف شخص — لأي حال جلسة", () => {
  /** كاشف التسرّب كما يُطبَّق على الحدث المسلسَل: نصّ الاستعلام أو أي معرّف مُمرَّر. */
  const leaks = (event: unknown, forbidden: readonly string[]) => {
    const json = JSON.stringify(event);
    return forbidden.filter((f) => json.includes(f));
  };
  const SECRETS = [USER, "الأسوار", "متطلبات", "faisal@example.com"];

  it.each([
    ["anonymous", null, null],
    ["unverified", null, null],
    ["verified", USER, ORG],
  ] as const)("auth_state=%s ⇒ لا استعلام ولا معرّف مستخدم في أي حدث", async (state, uid, org) => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await gatherRagContext(client(), uid, org, QUERY, {
      audience: uid ? "member" : "anonymous",
      env: ENV_OFF,
      authState: state,
      requestId: "req-0001-abcdef",
    });
    const events = [...infoEvents(info, "rag.outcome")];
    expect(events).toHaveLength(1);
    expect(leaks(events, SECRETS)).toEqual([]);
    expect(leaks([...info.mock.calls, ...warn.mock.calls], SECRETS)).toEqual([]);
    expect(events[0].auth_state).toBe(state);
  });

  it("مزروع: حدثٌ يحمل userId أو الاستعلام يُدان بالكاشف نفسه", () => {
    const honest = { event: "rag.outcome", auth_state: "unverified", hits: 1 };
    expect(leaks(honest, SECRETS)).toEqual([]);
    expect(leaks({ ...honest, user_id: USER }, SECRETS)).toEqual([USER]);
    expect(leaks({ ...honest, query: QUERY }, SECRETS)).toContain("الأسوار");
    expect(leaks({ ...honest, email: "faisal@example.com" }, SECRETS)).toEqual([
      "faisal@example.com",
    ]);
  });

  it("مصدر observe.server.ts لا يذكر userId/user_id/email/query في كودٍ منفَّذ — والكاشف يُدين مصدرًا مزروعًا", () => {
    const strip = (s: string) =>
      s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[\s;{}(])\/\/[^\n]*/gm, "$1");
    const FORBIDDEN = /\buserId\b|\buser_id\b|\bemail\b|\bquery\b|\bquery_text\b/;
    expect(strip(readFileSync("src/lib/sadeed/rag/observe.server.ts", "utf8"))).not.toMatch(
      FORBIDDEN,
    );
    expect(strip("const event = { requestId, userId: meta.userId };")).toMatch(FORBIDDEN);
    expect(strip("log.info('x', { query });")).toMatch(FORBIDDEN);
    // والتعليقات تُحذف: ذكر الكلمة في تعليق لا يُدان.
    expect(strip("// لا userId في الحدث\nconst a = 1;")).not.toMatch(FORBIDDEN);
  });
});
