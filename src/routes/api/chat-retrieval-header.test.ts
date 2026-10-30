// @vitest-environment node
/**
 * ترويسة `X-SADEED-Retrieval` على `/api/chat` (O7 أ، ٢٠٢٦/١٠/٣٠): ما خدم الاسترجاع
 * فعلًا في الدور — `none | lexical | vector | vector+lexical` — على ردّ النموذج المبثوث
 * للزائر والمسجَّل، دون أن تتغيّر أيٌّ من الترويسات الأقدم. `rag.server` حقيقي (الأذرع
 * حقيقية فوق عميل قاعدة مزروع) إلا حيث يُصرَّح بتجاوزٍ لقيمة `servedArms`.
 * لا شبكة: النموذج والتضمين والبوّابات مزروعة، ونداء `fetch` يُفشل الاختبار.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const ORG = "00000000-0000-0000-0000-000000000001";
const USER_ID = "11111111-1111-4111-8111-111111111111";

const sim = vi.hoisted(() => ({
  rate: { allowed: true, unavailable: false } as { allowed: boolean; unavailable?: boolean },
  modelCalls: 0,
  fetchCalls: 0,
  user: null as null | { id: string; app_metadata: Record<string, unknown> },
  /** معرّف عضوية المؤسسة للمسجَّل؛ بلا مؤسسة ⇒ الأذرع القاعدية الخاصة تفشل مغلقة. */
  orgMember: true,
  authHang: false,
  embedding: null as number[] | null,
  rpcRows: [] as Array<Record<string, unknown>>,
  /** تجاوز قيمة الأذرع الخادمة: `null` = الأذرع الحقيقية؛ مصفوفة = سياق مُصنَّع؛ `"hang"` = وعدٌ لا يُحسم. */
  override: null as null | string[] | "hang",
  /** عدد نداءات المجمِّع: دورٌ بلا نصّ مستخدم لا يستدعيه أصلًا. */
  gatherCalls: 0,
}));

function stubSupabase() {
  const chainOf = (data: unknown): unknown => {
    const result = { data, error: null, count: 0 };
    const chain: unknown = new Proxy(() => chain, {
      get(_t, prop) {
        if (prop === "then") return (resolve: (v: unknown) => unknown) => resolve(result);
        return () => chain;
      },
      apply: () => chain,
    });
    return chain;
  };
  return {
    from: (table: string) =>
      chainOf(table === "org_members" && sim.orgMember ? [{ org_id: ORG, role: "admin" }] : []),
    rpc: () => chainOf(sim.rpcRows),
    auth: {
      getUser: () => {
        if (sim.authHang) return new Promise(() => {});
        return Promise.resolve(
          sim.user
            ? { data: { user: sim.user }, error: null }
            : { data: { user: null }, error: { message: "invalid JWT" } },
        );
      },
    },
  };
}

vi.mock("@supabase/supabase-js", () => ({ createClient: () => stubSupabase() }));
vi.mock("@/integrations/supabase/client.server", () => ({
  createSupabaseAdminClient: () => stubSupabase(),
  supabaseAdmin: stubSupabase(),
}));
vi.mock("@/lib/governance/rate-limit.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  enforceRateLimit: async () => sim.rate,
}));
vi.mock("@/lib/governance/ai-quota.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  enforceAiQuota: async () => null,
}));
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  generateText: async () => {
    sim.modelCalls++;
    return { text: "ردّ صوري." };
  },
}));
vi.mock("@/lib/sadeed/embeddings.server", () => ({
  embedText: async () => sim.embedding,
  toPgVector: (v: number[]) => `[${v.join(",")}]`,
}));
vi.mock("@/lib/sadeed-tools.server", () => ({ buildSadeedTools: () => undefined }));
vi.mock("@/lib/sadeed-context.server", () => ({
  buildSadeedContextSnapshot: async () => ({ hasOperationalData: false, contextBlock: "" }),
  buildProductionDatasetsSnapshot: async () => ({ contextBlock: "[PROD:STUB] datasets" }),
}));
vi.mock("@/lib/sadeed/rag.server", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/sadeed/rag.server")>();
  return {
    ...orig,
    gatherRagContext: (...args: Parameters<typeof orig.gatherRagContext>) => {
      sim.gatherCalls++;
      if (sim.override === "hang") return new Promise<never>(() => {});
      if (Array.isArray(sim.override))
        return Promise.resolve({
          ...orig.emptyRagContext(),
          retrieval: { servedArms: sim.override, arms: [], hitCount: 0, latencyMs: 0 },
        });
      return orig.gatherRagContext(...args);
    },
    rememberConversationTurn: async () => undefined,
  };
});

const realFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = (() => {
    sim.fetchCalls++;
    throw new Error("network is forbidden in chat-retrieval-header tests");
  }) as typeof fetch;
});
afterAll(() => {
  globalThis.fetch = realFetch;
  vi.unstubAllEnvs();
});
vi.setConfig({ testTimeout: 20_000 });

type Handler = (args: { request: Request }) => Promise<Response>;
let seq = 0;
async function post(
  text: string,
  opts: {
    bearer?: string;
    grounded?: boolean;
    /** أجزاء الرسالة بدل نصّ المستخدم (دورٌ بمرفق وحده). */
    parts?: Array<Record<string, unknown>>;
  } = {},
) {
  const mod = (await import("@/routes/api/chat")) as unknown as {
    Route: { options: { server: { handlers: { POST: Handler } } } };
  };
  seq += 1;
  const res = await mod.Route.options.server.handlers.POST({
    request: new Request("http://local/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(opts.bearer ? { authorization: `Bearer ${opts.bearer}` } : {}),
      },
      body: JSON.stringify({
        messages: [{ id: `m${seq}`, role: "user", parts: opts.parts ?? [{ type: "text", text }] }],
        threadId: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
        ...(opts.grounded === undefined ? {} : { grounded: opts.grounded }),
      }),
    }),
  });
  await res.text();
  return res;
}

const BEARER = "valid.jwt.that.is.long.enough.for.the.guard";
const Q_FENCES = "ما متطلبات الأسوار الأمنية حول المنشأة؟";
const VECTOR_ROW = {
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
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

type CallLog = { mock: { calls: unknown[][] } };
let infoSpy: CallLog;
let warnSpy: CallLog;
const outcomeEvents = () =>
  infoSpy.mock.calls
    .map((c) => c[1] as Record<string, unknown> | undefined)
    .filter((e): e is Record<string, unknown> => e?.event === "rag.outcome");

beforeEach(async () => {
  for (const [k, v] of Object.entries({
    SUPABASE_URL: "https://stub.invalid",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_stub",
    SUPABASE_SERVICE_ROLE_KEY: "sb_secret_stub",
    GEMINI_API_KEY: "test-key-not-a-secret",
    GOOGLE_GENERATIVE_AI_API_KEY: "",
    SADEED_GEMINI_RAG_READY: "",
    SADEED_LLM_PROVIDER: "",
    SADEED_GATE_DEGRADED_MODE: "",
    SADEED_AI_DISABLED: "",
  }))
    vi.stubEnv(k, v);
  sim.rate = { allowed: true, unavailable: false };
  sim.modelCalls = 0;
  sim.fetchCalls = 0;
  sim.user = null;
  sim.orgMember = true;
  sim.authHang = false;
  sim.embedding = null;
  sim.rpcRows = [];
  sim.override = null;
  sim.gatherCalls = 0;
  const rl = await import("@/lib/governance/rate-limit.server");
  rl.resetRateLimitStateForTests();
  const guards = await import("@/lib/governance/request-guards.server");
  guards.resetRequestGuardsForTests();
  const arms = await import("@/lib/sadeed/rag/lexical-arms.server");
  arms.resetLexicalArmsStateForTests();
  const observe = await import("@/lib/sadeed/rag/observe.server");
  observe.resetRagObservationForTests();
  vi.spyOn(console, "log").mockImplementation(() => {});
  infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  expect(sim.fetchCalls, "نداء شبكة غير متوقَّع").toBe(0);
  vi.restoreAllMocks();
});

const registered = () => {
  sim.user = { id: USER_ID, app_metadata: {} };
};

describe("① القيمة على ردّ النموذج — زائرًا ومسجَّلًا", () => {
  it("زائر ⇒ lexical، والترويسات الأقدم كما هي", async () => {
    const res = await post(Q_FENCES);
    expect(res.status).toBe(200);
    expect(sim.modelCalls).toBe(1);
    expect(res.headers.get("X-SADEED-Retrieval")).toBe("lexical");
    expect(res.headers.get("X-SADEED-Gate")).toBe("verified");
    expect(res.headers.get("X-SADEED-Auth")).toBe("anonymous");
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model");
    expect(res.headers.get("X-SADEED-Request-ID")).toBeTruthy();
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    // دورٌ يعيد نتائج: `hits` في الحدث عدد المدموج الفعلي (لا صفرًا) ويطابق الحقل الأقدم.
    const [ev] = outcomeEvents();
    expect(ev.hits).toBeGreaterThan(0);
    expect(ev.hits).toBe(ev.hitCount);
  });

  it("مسجَّل متحقَّق بمؤسسة والراية منخفضة ⇒ lexical", async () => {
    registered();
    const res = await post(Q_FENCES, { bearer: BEARER });
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Retrieval")).toBe("lexical");
    expect(res.headers.get("X-SADEED-Auth")).toBe("verified");
    expect(res.headers.get("X-SADEED-Gate")).toBe("verified");
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model");
  });

  it("مسجَّل والراية مرفوعة وتضمين وصفوف ⇒ vector+lexical", async () => {
    registered();
    vi.stubEnv("SADEED_GEMINI_RAG_READY", "true");
    sim.embedding = [0.1, 0.2, 0.3];
    sim.rpcRows = [VECTOR_ROW];
    const res = await post(Q_FENCES, { bearer: BEARER });
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Retrieval")).toBe("vector+lexical");
  });

  it("الراية مرفوعة بلا تضمين (لا مزوّد) ⇒ lexical، لا vector ولا 503", async () => {
    registered();
    vi.stubEnv("SADEED_GEMINI_RAG_READY", "true");
    sim.embedding = null;
    const res = await post(Q_FENCES, { bearer: BEARER });
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Retrieval")).toBe("lexical");
  });

  it("المخزن معطّل والسياسة bounded (degraded) ⇒ lexical من الفهرس الداخلي، والبوّابة degraded", async () => {
    vi.stubEnv("SADEED_GATE_DEGRADED_MODE", "bounded");
    sim.rate = { allowed: false, unavailable: true };
    const res = await post(Q_FENCES);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Gate")).toBe("degraded");
    expect(res.headers.get("X-SADEED-Retrieval")).toBe("lexical");
  });

  it("التحقّق من الجلسة يتجاوز مهلته ⇒ يُخدَم زائرًا unverified، والاسترجاع lexical، والحدث بلا معرّف", async () => {
    sim.authHang = true;
    sim.user = { id: USER_ID, app_metadata: {} };
    const res = await post(Q_FENCES, { bearer: BEARER });
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Auth")).toBe("unverified");
    expect(res.headers.get("X-SADEED-Retrieval")).toBe("lexical");
    const [ev] = outcomeEvents();
    expect(ev.auth_state).toBe("unverified");
    expect(ev.audience).toBe("anonymous");
    const everything = JSON.stringify([...infoSpy.mock.calls, ...warnSpy.mock.calls]);
    expect(everything).not.toContain(USER_ID);
    expect(everything).not.toContain("الأسوار");
  });
});

describe("② القيم الأربع من الأذرع الخادمة (سياق مُصنَّع) ومهلة الاسترجاع", () => {
  it.each([
    [["seed-corpus-lexical"], "lexical"],
    [["vector"], "vector"],
    [["vector", "hcis-live-lexical"], "vector+lexical"],
    [[], "none"],
  ] as const)("servedArms=%j ⇒ %s", async (served, expected) => {
    sim.override = [...served];
    const res = await post(Q_FENCES);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Retrieval")).toBe(expected);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model");
  });

  it("الاسترجاع يتجاوز مهلة السياق (2.5 ث) ⇒ none، والإجابة تمضي بلا سياق", async () => {
    sim.override = "hang";
    const res = await post(Q_FENCES);
    expect(res.status).toBe(200);
    expect(sim.modelCalls).toBe(1);
    expect(res.headers.get("X-SADEED-Retrieval")).toBe("none");
    expect(
      warnSpy.mock.calls.some(
        (c: unknown[]) => (c[1] as { event?: string })?.event === "rag.timeout",
      ),
    ).toBe(true);
  });
});

describe("③ الغياب يعني «لم تعمل المرحلة» لا none", () => {
  it("grounded:false ⇒ لا ترويسة (المرحلة لم تعمل) والنموذج يُستدعى", async () => {
    const res = await post(Q_FENCES, { grounded: false });
    expect(res.status).toBe(200);
    expect(sim.modelCalls).toBe(1);
    expect(res.headers.has("X-SADEED-Retrieval")).toBe(false);
    expect(res.headers.get("X-SADEED-Gate")).toBe("verified");
  });

  it("دورٌ بلا نصّ مستخدم (مرفق وحده) ⇒ لا ترويسة: المجمِّع لم يُستدعَ ولا حدث rag.outcome", async () => {
    const res = await post("", {
      parts: [
        {
          type: "file",
          mediaType: "image/png",
          url: "data:image/png;base64,iVBORw0KGgo=",
          filename: "a.png",
        },
      ],
    });
    expect(res.status).toBe(200);
    expect(sim.modelCalls).toBe(1);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model");
    // المرحلة لم تعمل: لا نداء للمجمِّع ولا حدث، فالترويسة غائبة لا `none` («عمل ولم تخدم ذراع»).
    expect(sim.gatherCalls).toBe(0);
    expect(outcomeEvents()).toHaveLength(0);
    expect(res.headers.has("X-SADEED-Retrieval")).toBe(false);
  });

  it("وبالمقابل: دورٌ بنصٍّ يستدعي المجمِّع مرةً ويحمل الترويسة (يمنع تفريغ الاختبار السابق)", async () => {
    const res = await post(Q_FENCES);
    expect(sim.gatherCalls).toBe(1);
    expect(outcomeEvents()).toHaveLength(1);
    expect(res.headers.get("X-SADEED-Retrieval")).toBe("lexical");
  });

  it("خارج النطاق (ردّ حتمي بلا استرجاع) ⇒ لا ترويسة ولا نداء نموذج", async () => {
    const res = await post("اكتب لي وصفة كيك الشوكولاتة");
    expect(res.status).toBe(200);
    expect(sim.modelCalls).toBe(0);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("scope-guard");
    expect(res.headers.has("X-SADEED-Retrieval")).toBe(false);
  });
});

describe("④ المصدر: مشتقّة من الأذرع الخادمة بلا انتظار جديد", () => {
  const chat = stripComments(readFileSync("src/routes/api/chat.ts", "utf8"));

  it("القيمة تُحسب من ragServedArms بالدالّة النقيّة، وتُضاف مشروطةً إلى ترويسات ردّ البثّ", () => {
    expect(chat).toMatch(
      /retrievalHeader\s*=\s*lastUserText\s*\?\s*retrievalHeaderValue\(ragServedArms\)\s*:\s*null/,
    );
    expect(chat).toMatch(
      /\.\.\.\(retrievalHeader\s*\?\s*\{\s*"X-SADEED-Retrieval":\s*retrievalHeader\s*\}\s*:\s*\{\}\)/,
    );
    // لا `await` على سطر الاشتقاق ولا على سطر الترويسة: لا I/O جديد على المسار الحرج.
    const lines = chat.split("\n").filter((l) => /retrievalHeader/.test(l));
    expect(lines.length).toBeGreaterThanOrEqual(3);
    for (const l of lines) expect(l, l).not.toMatch(/\bawait\b/);
  });

  it("الترويسات الأقدم باقية على ردّ البثّ النهائي", () => {
    const at = chat.lastIndexOf("createUIMessageStreamResponse({");
    const block = chat.slice(at, at + 900);
    for (const h of [
      "X-SADEED-Reply-Source",
      "X-SADEED-Gate",
      "X-SADEED-Auth",
      "X-SADEED-Retrieval",
    ])
      expect(block, h).toContain(`"${h}"`);
  });

  it("مزروع: لو رُدّت الترويسة إلى قيمةٍ ثابتة أو حُسبت من نصّ المستخدم لأُدين المصدر", () => {
    const FROM_SERVED =
      /retrievalHeader\s*=\s*lastUserText\s*\?\s*retrievalHeaderValue\(ragServedArms\)\s*:\s*null/;
    expect(FROM_SERVED.test('retrievalHeader = "lexical";')).toBe(false);
    expect(FROM_SERVED.test("retrievalHeader = retrievalHeaderValue([lastUserText]);")).toBe(false);
    // بلا شرط وجود النصّ ⇒ دورُ المرفق وحده يحمل `none` وهو لم يسترجع شيئًا.
    expect(FROM_SERVED.test("retrievalHeader = retrievalHeaderValue(ragServedArms);")).toBe(false);
    expect(
      FROM_SERVED.test(
        "retrievalHeader = lastUserText ? retrievalHeaderValue(ragServedArms) : null;",
      ),
    ).toBe(true);
  });
});
