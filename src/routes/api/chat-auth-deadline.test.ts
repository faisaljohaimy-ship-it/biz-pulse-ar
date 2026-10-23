/**
 * مهلة التحقّق من الجلسة في `/api/chat` (VIBE 5.1): خدمة مصادقةٍ تقبل ولا تجيب
 * لا تعلّق طلب المسجَّل — يُخدَم زائرًا موسومًا `X-SADEED-Auth: unverified`،
 * ولا يُمنح شيءٌ من صلاحيات الجلسة. والرفض الصريح (401) باقٍ كما كان.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");

const auth = vi.hoisted(() => ({
  mode: "hang" as "hang" | "reject" | "ok",
  orgHang: false,
  orgQueries: 0,
  /** جداول تُعلَّق استعلاماتها (لا تُحسم أبدًا) — لاختبار مهل قراءات السياق. */
  hangTables: [] as string[],
  ragHang: false,
}));

/** سلسلة استعلامٍ وهمية: تُحسم فورًا ببيانات فارغة، أو لا تُحسم أبدًا (`hang`). */
function makeChain(hang: boolean) {
  const result = { data: null, error: null, count: 0 };
  const chain: unknown = new Proxy(() => chain, {
    get(_t, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => unknown) => {
          if (hang) return; // لا يُحسم أبدًا
          resolve(result);
        };
      }
      return () => chain;
    },
    apply: () => chain,
  });
  return chain;
}

function stubSupabase() {
  return {
    from: (table: string) => {
      if (table === "org_members") auth.orgQueries += 1;
      // يعلق جدول العضويات (أو ما سُمّي) — بقية الجداول تجيب فورًا بفراغ.
      return makeChain(
        (table === "org_members" && auth.orgHang) || auth.hangTables.includes(table),
      );
    },
    rpc: () => makeChain(false),
    auth: {
      getUser: () => {
        if (auth.mode === "hang") return new Promise(() => {});
        if (auth.mode === "reject")
          return Promise.resolve({ data: { user: null }, error: { message: "invalid JWT" } });
        return Promise.resolve({
          data: { user: { id: "user-1", app_metadata: {} } },
          error: null,
        });
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
  enforceRateLimit: async () => ({ allowed: true }),
}));
vi.mock("@/lib/governance/ai-quota.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  enforceAiQuota: async () => null,
}));
const model = vi.hoisted(() => ({
  calls: 0,
  tools: [] as boolean[],
  modelId: "",
  maxOutputTokens: 0,
  maxRetries: -1,
}));
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  generateText: async (opts: {
    tools?: unknown;
    model: { modelId: string };
    maxOutputTokens: number;
    maxRetries: number;
  }) => {
    model.calls++;
    model.modelId = opts.model.modelId;
    model.maxOutputTokens = opts.maxOutputTokens;
    model.maxRetries = opts.maxRetries;
    model.tools.push(Boolean(opts.tools));
    return { text: "ردّ صوري." };
  },
}));
// أدوات المسجَّل: لو مُنحت لزائرٍ «غير متحقَّق» لكان ذلك تجاوزًا للمصادقة.
vi.mock("@/lib/sadeed-tools.server", () => ({
  buildSadeedTools: () => ({ marker: { description: "x" } }),
}));
// الاسترجاع للمسجَّل: يُعلَّق عند الطلب لاختبار مهلته (بلا شبكة تضمين).
vi.mock("@/lib/sadeed/rag.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  gatherRagContext: async () => {
    if (auth.ragHang) return new Promise(() => {});
    return {
      contextBlock: "",
      citations: [],
      counts: { memories: 0, knowledge: 0, documents: 0 },
      embedding: null,
    };
  },
}));

afterAll(() => vi.unstubAllEnvs());
vi.setConfig({ testTimeout: 20_000 });

type Handler = (args: { request: Request }) => Promise<Response>;
async function post(bearer?: string, provider?: string) {
  const mod = (await import("@/routes/api/chat")) as unknown as {
    Route: { options: { server: { handlers: { POST: Handler } } } };
  };
  const t0 = Date.now();
  const res = await mod.Route.options.server.handlers.POST({
    request: new Request("http://local/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(provider ? { "X-SADEED-Provider": provider } : {}),
        ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      },
      body: JSON.stringify({
        messages: [
          {
            id: "m1",
            role: "user",
            parts: [{ type: "text", text: "ما إجراءات السلامة لتصاريح العمل الساخن؟" }],
          },
        ],
        threadId: "11111111-1111-4111-8111-111111111111",
      }),
    }),
  });
  return { res, elapsed: Date.now() - t0 };
}

beforeEach(async () => {
  auth.mode = "hang";
  auth.orgHang = false;
  auth.orgQueries = 0;
  auth.hangTables = [];
  auth.ragHang = false;
  model.calls = 0;
  model.tools = [];
  const guards = await import("@/lib/governance/request-guards.server");
  guards.resetRequestGuardsForTests();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.restoreAllMocks());

describe("التحقّق من الجلسة بمهلة", () => {
  // «الاثنان معًا» (قرار المالك ٢٠٢٦/١٠/٢٣): الترويسة تطلب، وخطّة البيئة تأذن بالبوّابتين.
  it("طلب OpenAI بالترويسة مع الإذنَين ⇐ يُجاب منه بسقوفٍ من الخادم، وبصلاحيات الزائر", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-only-not-a-secret-00");
    vi.stubEnv("SADEED_OPENAI_ENABLED", "true");
    const { res } = await post(undefined, "openai");
    expect(res.headers.get("X-SADEED-Provider")).toBe("openai");
    expect(res.headers.get("X-SADEED-Model")).toBe("gpt-5-mini");
    expect(res.headers.get("X-SADEED-Generation")).toBe("success");
    expect(model.modelId).toBe("gpt-5-mini");
    expect(model.maxOutputTokens).toBe(1200);
    expect(model.maxRetries).toBe(0);
    expect(model.tools[0]).toBe(false);
    expect(model.calls).toBe(1);
  });
  it("مفتاح OpenAI وحده لا يُبدّل Gemini الافتراضي", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-only-not-a-secret-00");
    vi.stubEnv("SADEED_OPENAI_ENABLED", "true");
    const { res } = await post();
    expect(model.modelId).toBe("gemini-3.6-flash");
    expect(res.headers.get("X-SADEED-Provider")).toBeNull();
  });
  it("طلبٌ بالترويسة بلا إذن البيئة ⇐ لا نداء لأيّ مورّد، ولا سقوط إلى Gemini، وردٌّ صادق لا 503", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-only-not-a-secret-00");
    vi.stubEnv("SADEED_OPENAI_ENABLED", "");
    const { res } = await post(undefined, "openai");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("zero-cost");
    expect(res.headers.get("X-SADEED-Provider")).toBeNull();
    expect(model.calls).toBe(0);
    expect(await res.text()).toContain("المطلوب غير مهيّأ");
  });
  it("خدمة مصادقةٍ معلّقة ⇐ يُخدَم زائرًا خلال المهلة، بلا أدوات، موسومًا unverified", async () => {
    const { res, elapsed } = await post("stale.jwt.token.that.is.long.enough.for.the.guard");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Auth")).toBe("unverified");
    expect(elapsed).toBeLessThan(10_000);
    expect(model.calls).toBe(1);
    expect(model.tools[0], "أدوات المسجَّل مُنحت لجلسةٍ غير متحقَّقة").toBe(false);
    expect(auth.orgQueries, "استُعلمت المؤسسة بلا مستخدم").toBe(0);
  });

  it("الرفض الصريح باقٍ: Bearer تالف ⇐ 401 ولا نموذج", async () => {
    auth.mode = "reject";
    const { res } = await post("invalid.jwt.that.is.long.enough.for.the.guard");
    expect(res.status).toBe(401);
    expect(model.calls).toBe(0);
  });

  it("جلسة سليمة ⇐ verified، ومؤسسةٌ معلّقة لا تعلّق الطلب", async () => {
    auth.mode = "ok";
    auth.orgHang = true;
    const { res, elapsed } = await post("valid.jwt.that.is.long.enough.for.the.guard");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Auth")).toBe("verified");
    expect(elapsed).toBeLessThan(10_000);
    expect(model.calls).toBe(1);
  });

  it("جلسة سليمة والاسترجاع والتفضيلات معلّقان ⇐ يُجاب بلا سياقٍ خلال المهلة", async () => {
    auth.mode = "ok";
    auth.ragHang = true;
    auth.hangTables = ["finn_adaptive_preferences"];
    const { res, elapsed } = await post("valid.jwt.that.is.long.enough.for.the.guard");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Auth")).toBe("verified");
    expect(elapsed).toBeLessThan(12_000);
    expect(model.calls).toBe(1);
  });

  it("الزائر بلا Bearer ⇐ anonymous، ولا نداء مصادقة", async () => {
    const { res } = await post();
    expect(res.status).toBe(200);
    expect(res.headers.get("X-SADEED-Auth")).toBe("anonymous");
  });
});
