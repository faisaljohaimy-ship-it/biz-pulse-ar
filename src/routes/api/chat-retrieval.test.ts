// @vitest-environment node
/**
 * `/api/chat` بعد الخطوة ٢ (أمر المالك ٢٠٢٦/١٠/٢٩): الاسترجاع يعمل للزائر
 * بأذرعه (أ+ب) ويصل نظام‑التوجيه؛ قراءة HCIS المباشرة طُويت؛ وفشل كل الأذرع
 * لا يُحدث 503 ولا سطح خطأ جديدًا. `rag.server` **حقيقي** هنا (لا يُزرع) فوق
 * عميل قاعدة مزروع يسجّل الجداول؛ النموذج والبوّابات مزروعة بلا شبكة.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const sim = vi.hoisted(() => ({
  rate: { allowed: true, unavailable: false } as { allowed: boolean; unavailable?: boolean },
  modelCalls: 0,
  lastSystem: "",
  user: null as null | { id: string; app_metadata: Record<string, unknown> },
  reads: [] as string[],
  throwOnRead: false,
  fetchCalls: 0,
  /** المسجَّل ببياناتٍ تشغيلية ⇐ كتلة الصفوف الحيّة تدخل التعليمات. */
  operational: false,
}));

const RETRIEVAL_TABLES = new Set([
  "hcis_directives",
  "hcis_approval_stages",
  "hcis_sectors",
  "finn_knowledge",
  "sec_knowledge_articles",
  "finn_document_chunks",
]);

function stubSupabase() {
  const result = { data: null, error: null, count: 0 };
  // جداول الاسترجاع ترفض (كما يرفض عميل حقيقي، لا رميًا متزامنًا)؛ غيرها يجيب فراغًا.
  const chainFor = (reject: boolean): unknown => {
    const chain: unknown = new Proxy(() => chain, {
      get(_t, prop) {
        if (prop === "then")
          return (resolve: (v: unknown) => unknown, fail?: (e: unknown) => unknown) =>
            reject ? fail?.(new Error("synthetic db failure")) : resolve(result);
        return () => chain;
      },
      apply: () => chain,
    });
    return chain;
  };
  return {
    from: (table: string) => {
      sim.reads.push(table);
      return chainFor(sim.throwOnRead && RETRIEVAL_TABLES.has(table));
    },
    rpc: () => chainFor(false),
    auth: {
      getUser: async () =>
        sim.user
          ? { data: { user: sim.user }, error: null }
          : { data: { user: null }, error: { message: "invalid JWT" } },
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
  generateText: async (opts: { system?: string }) => {
    sim.modelCalls++;
    sim.lastSystem = String(opts.system ?? "");
    return { text: "ردّ صوري." };
  },
}));
vi.mock("@/lib/sadeed-tools.server", () => ({ buildSadeedTools: () => undefined }));
vi.mock("@/lib/sadeed-context.server", () => ({
  buildSadeedContextSnapshot: async () => ({
    hasOperationalData: sim.operational,
    contextBlock: sim.operational ? "[LIVE:STUB] rows visible to the caller" : "",
  }),
  buildProductionDatasetsSnapshot: async () => ({ contextBlock: "[PROD:STUB] datasets" }),
}));

const realFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = (() => {
    sim.fetchCalls++;
    throw new Error("network is forbidden in chat-retrieval tests");
  }) as typeof fetch;
});
afterAll(() => {
  globalThis.fetch = realFetch;
  vi.unstubAllEnvs();
});
vi.setConfig({ testTimeout: 20_000 });

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
/** التعليقات تقتبس ما نُقض — الحارس يفحص الكود وحده. */
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
const Q_FENCES = "ما متطلبات الأسوار الأمنية حول المنشأة؟";

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
  sim.lastSystem = "";
  sim.user = null;
  sim.reads = [];
  sim.throwOnRead = false;
  sim.fetchCalls = 0;
  sim.operational = false;
  const rl = await import("@/lib/governance/rate-limit.server");
  rl.resetRateLimitStateForTests();
  const guards = await import("@/lib/governance/request-guards.server");
  guards.resetRequestGuardsForTests();
  const arms = await import("@/lib/sadeed/rag/lexical-arms.server");
  arms.resetLexicalArmsStateForTests();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  expect(sim.fetchCalls, "نداء شبكة غير متوقَّع").toBe(0);
  vi.restoreAllMocks();
});

describe("① فرع الزائر يشغّل الاسترجاع", () => {
  it("زائرٌ بسؤال مرجعي ⇐ كتلة معرفة من الفهرس الداخلي في نظام‑التوجيه بوسم [KB:…] و«مطابقة نصّية»", async () => {
    const res = await post(Q_FENCES);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model");
    expect(res.headers.get("X-SADEED-Auth")).toBe("anonymous");
    expect(sim.modelCalls).toBe(1);
    expect(sim.lastSystem).toContain("UNTRUSTED TENANT KNOWLEDGE");
    expect(sim.lastSystem).toContain("[KB:الأسوار الأمنية]");
    expect(sim.lastSystem).toContain("مطابقة نصّية");
    expect(sim.lastSystem).not.toMatch(/\(sim \d+%\)/);
    // الزائر يقرأ hcis_* بسياسة anon ولا يقرأ جداول المعرفة الخاصة.
    expect(sim.reads).toContain("hcis_directives");
    expect(sim.reads).not.toContain("finn_knowledge");
    expect(sim.reads).not.toContain("sec_knowledge_articles");
    expect(sim.reads).not.toContain("finn_document_chunks");
  });

  it("مزروع: الاسترجاع لم يعد داخل `if (userId)` في المصدر", () => {
    const chat = stripComments(readFileSync("src/routes/api/chat.ts", "utf8"));
    const ragAt = chat.indexOf("gatherRagContext(supabase, userId, orgId, lastUserText");
    expect(ragAt).toBeGreaterThan(-1);
    const guardAt = chat.lastIndexOf("if (userId) {", ragAt);
    const groundedAt = chat.lastIndexOf("if (grounded !== false) {", ragAt);
    // أقرب بوّابة قبل نداء الاسترجاع هي `grounded` لا `userId`.
    expect(groundedAt).toBeGreaterThan(guardAt);
    expect(chat).toContain('audience: userId ? "member" : "anonymous"');
  });
});

/**
 * مراجعة ثالثة ٢٠٢٦/١٠/٢٩: للمسجَّل ببياناتٍ تشغيلية كانت كتلة المعرفة المسترجعة
 * كلّها — ومعها قسم «غير موثّق» المرفوع — تُدرج داخل `<live-enterprise-data>`
 * الموصوفة «Verified read-only rows»، فتناقض قاعدة التأريض التي تسمّيه غير
 * موثّق. صارت لها ترويستها الخاصّة دائمًا.
 */
describe("④ كتلة المعرفة المسترجعة لا تدخل كتلة الصفوف الحيّة «Verified»", () => {
  it("المسجَّل ببياناتٍ تشغيلية ⇐ الصفوف الحيّة في <live-enterprise-data> والمعرفة في <tenant-knowledge> وحدها", async () => {
    sim.user = { id: "11111111-1111-4111-8111-111111111111", app_metadata: {} };
    sim.operational = true;
    const res = await post(Q_FENCES, BEARER);
    expect(res.status).toBe(200);
    const live = sim.lastSystem.match(/<live-enterprise-data>([\s\S]*?)<\/live-enterprise-data>/);
    const tenant = sim.lastSystem.match(/<tenant-knowledge>([\s\S]*?)<\/tenant-knowledge>/);
    expect(live?.[1]).toContain("[LIVE:STUB]");
    expect(live?.[1]).not.toContain("[KB:");
    expect(live?.[1]).not.toContain("KNOWLEDGE BASE");
    expect(live?.[1]).not.toContain("UNVERIFIED UPLOADS");
    expect(tenant?.[1]).toContain("[KB:الأسوار الأمنية]");
    expect(sim.lastSystem).toContain("UNTRUSTED TENANT KNOWLEDGE");
    // ولا تُكرَّر الكتلة في موضعين.
    expect(sim.lastSystem.split("[KB:الأسوار الأمنية]").length - 1).toBeGreaterThanOrEqual(1);
    expect(sim.lastSystem.indexOf("<tenant-knowledge>")).toBe(
      sim.lastSystem.lastIndexOf("<tenant-knowledge>"),
    );
  });

  it("مزروع: لا إدراج لكتلة المعرفة داخل كتلة الصفوف الحيّة في المصدر", () => {
    const chat = stripComments(readFileSync("src/routes/api/chat.ts", "utf8"));
    const liveOpen = chat.indexOf("<live-enterprise-data>");
    const liveClose = chat.indexOf("</live-enterprise-data>");
    expect(liveOpen).toBeGreaterThan(-1);
    expect(chat.slice(liveOpen, liveClose)).not.toContain("ragContext");
    expect(chat).not.toContain("ragIncluded");
  });

  it("دليل بوّابة المخرج يُبنى من الاستشهادات ذات نصّ (bodyText) وحدها", () => {
    const chat = stripComments(readFileSync("src/routes/api/chat.ts", "utf8"));
    expect(chat).toMatch(/available:\s*ragCitations\s*\.filter\(\(c\)\s*=>\s*c\.bodyText\)/);
  });
});

describe("② قراءة HCIS المباشرة طُويت", () => {
  it("المسجَّل بسؤال HCIS ⇐ finn_knowledge تُقرأ من الذراع المعجمية؛ وchat.ts بلا قراءة مباشرة ولا similarity: 1", async () => {
    sim.user = { id: "11111111-1111-4111-8111-111111111111", app_metadata: {} };
    const res = await post("اشرح SEC-18", BEARER);
    expect(res.status).toBe(200);
    expect(sim.reads).toContain("finn_knowledge");
    const chat = stripComments(readFileSync("src/routes/api/chat.ts", "utf8"));
    expect(chat).not.toMatch(/\.like\("source", "hcis\/%"\)/);
    expect(chat).not.toContain("similarity: 1");
    expect(chat).not.toContain("hcis-reference");
    expect(chat).not.toContain("UNTRUSTED HCIS REFERENCE");
  });
});

describe("③ لا 503 جديدة — فشل كل الأذرع يمضي بالإجابة كما كانت", () => {
  it("كل قراءة قاعدة ترمي ⇐ 200 من النموذج، والفهرس الداخلي ما زال في نظام‑التوجيه", async () => {
    sim.throwOnRead = true;
    const res = await post(Q_FENCES);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model");
    expect(sim.modelCalls).toBe(1);
    expect(sim.lastSystem).toContain("[KB:الأسوار الأمنية]");
  });

  it("المسجَّل وكل قراءة ترمي ⇐ 200 كذلك، بلا تسرّب نصّ الخطأ إلى الردّ", async () => {
    sim.user = { id: "11111111-1111-4111-8111-111111111111", app_metadata: {} };
    sim.throwOnRead = true;
    const res = await post(Q_FENCES, BEARER);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model");
  });

  it("المخزن معطّل والسياسة bounded ⇐ الأذرع القاعدية تُسقط قبل أن تُشغَّل، والداخلية تخدم", async () => {
    vi.stubEnv("SADEED_GATE_DEGRADED_MODE", "bounded");
    sim.rate = { allowed: false, unavailable: true };
    const res = await post(Q_FENCES);
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Gate")).toBe("degraded");
    expect(sim.reads.filter((t) => t.startsWith("hcis_"))).toEqual([]);
    expect(sim.lastSystem).toContain("[KB:الأسوار الأمنية]");
  });

  it("الراية مرفوعة بلا مفتاح ⇐ لا نداء شبكة، والمعجمية تصل", async () => {
    vi.stubEnv("SADEED_GEMINI_RAG_READY", "true");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("SADEED_LLM_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "openai-key-not-a-secret-0000");
    vi.stubEnv("SADEED_OPENAI_ENABLED", "true");
    sim.user = { id: "11111111-1111-4111-8111-111111111111", app_metadata: {} };
    const res = await post(Q_FENCES, BEARER);
    expect(res.status).toBe(200);
    expect(sim.lastSystem).toContain("[KB:الأسوار الأمنية]");
  });
});
