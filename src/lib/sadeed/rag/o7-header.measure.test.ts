// @vitest-environment node
/**
 * قياس O7 (أ): توزيع قيم `X-SADEED-Retrieval` على مجموعةٍ ثابتة من الأدوار — حتمي، بلا
 * شبكة ولا مزوّد ولا ساعة (ما عدا مهلة سياق الدردشة الحقيقية 2.5 ث في دورٍ واحد).
 *
 * الملف **قائمٌ بذاته**: لا يستورد وحدةً جديدة، فيُشغَّل نفسه على الشجرة الأقدم
 * (`75a23048c`) ليعطي «قبل» من الكود لا من التقدير:
 *   `O7_MEASURE_ONLY=1 npx vitest run src/lib/sadeed/rag/o7-header.measure.test.ts`
 * (لا تأكيدات «بعد»؛ الترويسة غائبة هناك فيُعدّ كل دور `absent`). على الشجرة الحالية
 * يثبّت التوزيع نفسه تأكيدًا — فيصير أيضًا حارس انحدار.
 *
 * المجموعة (13 دورًا): أذرع حقيقية فوق عميل قاعدة مزروع؛ التضمين والنموذج مزروعان.
 * ليست قياس أداء ولا جودة استرجاع، وكمون الإنتاج «لم يُقَس».
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const ORG = "00000000-0000-0000-0000-000000000001";
const MEASURE_ONLY = process.env.O7_MEASURE_ONLY === "1";

const sim = vi.hoisted(() => ({
  rate: { allowed: true, unavailable: false } as { allowed: boolean; unavailable?: boolean },
  fetchCalls: 0,
  user: null as null | { id: string; app_metadata: Record<string, unknown> },
  embedding: null as number[] | null,
  rpcRows: [] as Array<Record<string, unknown>>,
  override: null as null | string[] | "hang",
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
      chainOf(table === "org_members" ? [{ org_id: ORG, role: "admin" }] : []),
    rpc: () => chainOf(sim.rpcRows),
    auth: {
      getUser: () =>
        Promise.resolve(
          sim.user
            ? { data: { user: sim.user }, error: null }
            : { data: { user: null }, error: { message: "invalid JWT" } },
        ),
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
  generateText: async () => ({ text: "ردّ صوري." }),
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
    throw new Error("network is forbidden in o7-header measure");
  }) as typeof fetch;
});
afterAll(() => {
  globalThis.fetch = realFetch;
  vi.unstubAllEnvs();
});
vi.setConfig({ testTimeout: 30_000 });

type Handler = (args: { request: Request }) => Promise<Response>;
let seq = 0;
async function post(text: string, bearer?: string) {
  const mod = (await import("@/routes/api/chat")) as unknown as {
    Route: { options: { server: { handlers: { POST: Handler } } } };
  };
  seq += 1;
  const res = await mod.Route.options.server.handlers.POST({
    request: new Request("http://local/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify({
        messages: [{ id: `m${seq}`, role: "user", parts: [{ type: "text", text }] }],
        threadId: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
      }),
    }),
  });
  await res.text();
  return res;
}

const BEARER = "valid.jwt.that.is.long.enough.for.the.guard";
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
const QUESTIONS = [
  "ما متطلبات الأسوار الأمنية حول المنشأة؟",
  "كيف يتم تفتيش المركبات عند البوابات؟",
  "ما متطلبات كاميرات المراقبة؟",
];

type Scenario = {
  name: string;
  turns: number;
  setup: () => void;
  registered?: boolean;
};

const SCENARIOS: Scenario[] = [
  { name: "زائر عادي", turns: 3, setup: () => {} },
  { name: "مسجَّل والراية منخفضة", turns: 2, registered: true, setup: () => {} },
  {
    name: "مسجَّل والراية مرفوعة وتضمين وصفوف",
    turns: 2,
    registered: true,
    setup: () => {
      vi.stubEnv("SADEED_GEMINI_RAG_READY", "true");
      sim.embedding = [0.1, 0.2, 0.3];
      sim.rpcRows = [VECTOR_ROW];
    },
  },
  {
    name: "مسجَّل والراية مرفوعة بلا تضمين",
    turns: 1,
    registered: true,
    setup: () => vi.stubEnv("SADEED_GEMINI_RAG_READY", "true"),
  },
  {
    name: "المخزن معطّل (bounded)",
    turns: 1,
    setup: () => {
      vi.stubEnv("SADEED_GATE_DEGRADED_MODE", "bounded");
      sim.rate = { allowed: false, unavailable: true };
    },
  },
  { name: "مهلة سياق الاسترجاع", turns: 1, setup: () => (sim.override = "hang") },
  { name: "متّجهية وحدها (سياق مُصنَّع)", turns: 1, setup: () => (sim.override = ["vector"]) },
  { name: "لا ذراع خدمت (سياق مُصنَّع)", turns: 1, setup: () => (sim.override = []) },
  {
    name: "معجميتان (سياق مُصنَّع)",
    turns: 1,
    setup: () => (sim.override = ["seed-corpus-lexical", "hcis-live-lexical"]),
  },
];

const BASE_ENV = {
  SUPABASE_URL: "https://stub.invalid",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_stub",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_stub",
  GEMINI_API_KEY: "test-key-not-a-secret",
  GOOGLE_GENERATIVE_AI_API_KEY: "",
  SADEED_GEMINI_RAG_READY: "",
  SADEED_LLM_PROVIDER: "",
  SADEED_GATE_DEGRADED_MODE: "",
  SADEED_AI_DISABLED: "",
};

/** حالةٌ نظيفة لكل سيناريو: البيئة، ومحاكيات الأذرع، وذاكرة القاطع والحارسات. */
async function resetState(registered: boolean) {
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries(BASE_ENV)) vi.stubEnv(k, v);
  sim.rate = { allowed: true, unavailable: false };
  sim.user = registered ? { id: "11111111-1111-4111-8111-111111111111", app_metadata: {} } : null;
  sim.embedding = null;
  sim.rpcRows = [];
  sim.override = null;
  const rl = await import("@/lib/governance/rate-limit.server");
  rl.resetRateLimitStateForTests();
  const guards = await import("@/lib/governance/request-guards.server");
  guards.resetRequestGuardsForTests();
  const arms = await import("@/lib/sadeed/rag/lexical-arms.server");
  arms.resetLexicalArmsStateForTests();
}

let infoSpy: { mock: { calls: unknown[][] } };
beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  expect(sim.fetchCalls, "نداء شبكة غير متوقَّع").toBe(0);
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

/** التوزيع الثابت المتوقَّع بعد O7 (أ) — 13 دورًا. */
const EXPECTED_AFTER = {
  lexical: 8,
  "vector+lexical": 2,
  vector: 1,
  none: 2,
};

describe("O7 (أ): توزيع X-SADEED-Retrieval على المجموعة الثابتة", () => {
  it("13 دورًا — التوزيع يُطبع، ويُثبَّت بعد O7", async () => {
    const dist: Record<string, number> = {};
    let total = 0;
    for (const sc of SCENARIOS) {
      await resetState(Boolean(sc.registered));
      sc.setup();
      for (let i = 0; i < sc.turns; i += 1) {
        const res = await post(
          QUESTIONS[i % QUESTIONS.length]!,
          sc.registered ? BEARER : undefined,
        );
        expect(res.status).toBe(200);
        const value = res.headers.get("X-SADEED-Retrieval") ?? "absent";
        dist[value] = (dist[value] ?? 0) + 1;
        total += 1;
      }
    }
    // كمون مرحلة الاسترجاع كما يسجّله حدث `rag.outcome` (الحقل الجديد، وإلا الأقدم)، p95 بالرتبة
    // الأقرب على عيّنات هذا التشغيل وحده — أدوار الأذرع الحقيقية فقط (لا السياق المُصنَّع).
    const samples = infoSpy.mock.calls
      .map((c) => c[1] as Record<string, unknown> | undefined)
      .filter((e) => e?.event === "rag.outcome")
      .map((e) => Number(e!.latency_ms ?? e!.latencyMs))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);
    // الأذرع المخدومة في أدوار الأذرع الحقيقية، لكل ذراع باسمها (الحقل الجديد، وإلا الأقدم).
    const servedByArm: Record<string, number> = {};
    for (const call of infoSpy.mock.calls) {
      const e = call[1] as Record<string, unknown> | undefined;
      if (e?.event !== "rag.outcome") continue;
      for (const arm of (e.arms_served ?? e.servedArms ?? []) as string[])
        servedByArm[arm] = (servedByArm[arm] ?? 0) + 1;
    }
    const p95 = samples.length
      ? samples[Math.min(samples.length - 1, Math.ceil(0.95 * samples.length) - 1)]
      : null;
    process.stdout.write(
      `O7_HEADER_MEASURE ${JSON.stringify({ total, distribution: dist, retrievalStage: { samples: samples.length, p95Ms: p95 }, servedByArm })}\n`,
    );
    expect(total).toBe(13);
    if (!MEASURE_ONLY) expect(dist).toEqual(EXPECTED_AFTER);
  });
});
