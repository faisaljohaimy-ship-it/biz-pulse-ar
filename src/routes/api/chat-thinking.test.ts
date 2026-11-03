/**
 * مستوى التفكير في `/api/chat` — سلوكيًّا عبر المعالج الحقيقي (٢٠٢٦/١١/٠٣).
 *
 * يُثبت: الخيار يصل Gemini وحده، والافتراض لكل وضع، وتجاوز البيئة يُقرأ عند كل طلب،
 * والسقوط مرّةً واحدة عند رفض الخيار نفسه مع تعطيل عشر دقائق، وأنه لا يسقط على غير ذلك
 * (429/5xx/401/404/400 لا يتعلّق بالتفكير)، ولا بعد خطوةٍ أنهت أدواتها.
 * مزوّد النموذج مزيَّف: `generateText` يسجّل `providerOptions` ويُنفِّذ سيناريو الفشل.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetThinkingStateForTests } from "@/lib/sadeed/llm/thinking-level.server";

vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");

type GenerateOpts = {
  model: { modelId: string };
  providerOptions?: Record<string, unknown>;
  onStepFinish?: (step: unknown) => void;
};

const sim = vi.hoisted(() => ({
  calls: [] as Array<{ modelId: string; providerOptions?: Record<string, unknown> }>,
  /** سيناريو النداءات بالتتابع: دالةٌ ترمي أو لا. ما نفد ⇒ نجاح. */
  script: [] as Array<(opts: GenerateOpts) => void>,
}));

function stubSupabase() {
  const result = { data: null, error: null, count: 0 };
  const chain: unknown = new Proxy(() => chain, {
    get(_t, prop) {
      if (prop === "then") return (resolve: (v: unknown) => unknown) => resolve(result);
      return () => chain;
    },
    apply: () => chain,
  });
  return {
    from: () => chain,
    rpc: () => chain,
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
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
vi.mock("@/lib/sadeed/orchestrator", () => ({
  runAgentMission: async () => ({
    mission_id: "mission-stub",
    results: [],
    answer: { text_ar: "خلاصة", text_en: "", risks: [], recommendation: null, next_action: null },
  }),
}));
vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  generateText: async (opts: GenerateOpts) => {
    sim.calls.push({ modelId: opts.model.modelId, providerOptions: opts.providerOptions });
    sim.script.shift()?.(opts);
    return { text: "ردّ صوري." };
  },
}));

afterAll(() => vi.unstubAllEnvs());
vi.setConfig({ testTimeout: 20_000, hookTimeout: 30_000 });

type Handler = (args: { request: Request }) => Promise<Response>;
async function post(extra: { replyMode?: string } = {}, headers: Record<string, string> = {}) {
  const mod = (await import("@/routes/api/chat")) as unknown as {
    Route: { options: { server: { handlers: { POST: Handler } } } };
  };
  return mod.Route.options.server.handlers.POST({
    request: new Request("http://local/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify({
        messages: [
          {
            id: "m1",
            role: "user",
            parts: [{ type: "text", text: "ما إجراءات السلامة لتصاريح العمل الساخن؟" }],
          },
        ],
        threadId: "11111111-1111-4111-8111-111111111111",
        ...extra,
      }),
    }),
  });
}

const apiError = (statusCode: number, message: string, responseBody?: string) =>
  Object.assign(new Error(message), { name: "AI_APICallError", statusCode, responseBody });
const failWith = (error: Error) => () => {
  throw error;
};
const thinkingRejected = () =>
  apiError(
    400,
    "Bad Request",
    '{"error":{"code":400,"message":"thinking_level is not supported by this model","status":"INVALID_ARGUMENT"}}',
  );

/** سطر القياس `[api/chat] timing` مفكوكًا (يُطبع نصَّ JSON لا كائنًا). */
const timingLine = () => {
  const raw = vi
    .mocked(console.log)
    .mock.calls.find((call) => call[0] === "[api/chat] timing")?.[1];
  return typeof raw === "string" ? (JSON.parse(raw) as Record<string, unknown>) : undefined;
};

const googleOptions = (i: number) =>
  (sim.calls[i]?.providerOptions as { google?: { thinkingConfig?: unknown } } | undefined)?.google;

beforeEach(async () => {
  sim.calls = [];
  sim.script = [];
  resetThinkingStateForTests();
  const guards = await import("@/lib/governance/request-guards.server");
  guards.resetRequestGuardsForTests();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
  vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");
  vi.restoreAllMocks();
});

describe("الخيار يصل Gemini بالمستوى الصحيح", () => {
  it("نص: low مع includeThoughts:false", async () => {
    const res = await post();
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model");
    expect(sim.calls).toHaveLength(1);
    expect(sim.calls[0]!.modelId).toBe("gemini-3.6-flash");
    expect(googleOptions(0)).toEqual({
      thinkingConfig: { thinkingLevel: "low", includeThoughts: false },
    });
  });

  it("صوت: low — والعميق: medium", async () => {
    await post({ replyMode: "voice" });
    await post({ replyMode: "deep" });
    expect(googleOptions(0)).toEqual({
      thinkingConfig: { thinkingLevel: "low", includeThoughts: false },
    });
    expect(googleOptions(1)).toEqual({
      thinkingConfig: { thinkingLevel: "medium", includeThoughts: false },
    });
  });

  it("المحوّل الاختياري (OpenAI) لا يتلقّى خيار Gemini أبدًا", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-only-not-a-secret-00");
    vi.stubEnv("SADEED_OPENAI_ENABLED", "true");
    const res = await post({}, { "X-SADEED-Provider": "openai" });
    expect(res.headers.get("X-SADEED-Provider")).toBe("openai");
    expect(sim.calls).toHaveLength(1);
    expect(sim.calls[0]!.providerOptions).toEqual({ openai: { store: false } });
    expect(googleOptions(0)).toBeUndefined();
    // ولو طُلب المستوى صراحةً بالبيئة.
    vi.stubEnv("SADEED_THINKING_LEVEL", "high");
    await post({}, { "X-SADEED-Provider": "openai" });
    expect(googleOptions(1)).toBeUndefined();
  });
});

describe("SADEED_THINKING_LEVEL يُقرأ عند كل طلب", () => {
  it("high ثم default ثم قيمة مجهولة في ثلاثة طلبات متتالية بلا إعادة تحميل", async () => {
    vi.stubEnv("SADEED_THINKING_LEVEL", "high");
    await post();
    vi.stubEnv("SADEED_THINKING_LEVEL", "default");
    await post();
    vi.stubEnv("SADEED_THINKING_LEVEL", "turbo");
    await post();
    expect(googleOptions(0)).toEqual({
      thinkingConfig: { thinkingLevel: "high", includeThoughts: false },
    });
    // default ⇒ لا providerOptions أصلًا (السلوك القديم حرفًا).
    expect(sim.calls[1]!.providerOptions).toBeUndefined();
    // مجهول ⇒ يعود الافتراض لا التعطيل.
    expect(googleOptions(2)).toEqual({
      thinkingConfig: { thinkingLevel: "low", includeThoughts: false },
    });
  });

  it("minimal يصل كما هو", async () => {
    vi.stubEnv("SADEED_THINKING_LEVEL", "minimal");
    await post({ replyMode: "deep" });
    expect(googleOptions(0)).toEqual({
      thinkingConfig: { thinkingLevel: "minimal", includeThoughts: false },
    });
  });
});

describe("السقوط مرّةً واحدة عند رفض الخيار نفسه", () => {
  it("400 يذكر thinking ⇒ إعادة واحدة بلا خيار، وردّ النموذج يصل، والميزة معطّلة بعدها", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-03T10:00:00.000Z"));
    sim.script = [failWith(thinkingRejected())];

    const first = await post();
    expect(first.status).toBe(200);
    expect(first.headers.get("X-SADEED-Reply-Source")).toBe("model");
    expect(await first.text()).toContain("ردّ صوري");
    expect(sim.calls).toHaveLength(2);
    expect(googleOptions(0)).toBeDefined();
    expect(sim.calls[1]!.providerOptions).toBeUndefined();

    // الطلب التالي في المعزول نفسه: نداء واحد، بلا خيار (لا يدفع إعادةً مرّةً ثانية).
    await post();
    expect(sim.calls).toHaveLength(3);
    expect(sim.calls[2]!.providerOptions).toBeUndefined();

    // بعد دقيقة: ما زال معطّلًا. بعد عشر دقائق: يعود.
    vi.setSystemTime(new Date("2026-11-03T10:01:00.000Z"));
    await post();
    expect(sim.calls[3]!.providerOptions).toBeUndefined();
    vi.setSystemTime(new Date("2026-11-03T10:10:01.000Z"));
    await post();
    expect(googleOptions(4)).toEqual({
      thinkingConfig: { thinkingLevel: "low", includeThoughts: false },
    });
  });

  it("إن رُفضت الإعادة نفسها لسببٍ آخر فلا حلقة: نداءان فقط ثم سطر الخطأ الآمن", async () => {
    sim.script = [failWith(thinkingRejected()), failWith(apiError(401, "API key not valid"))];
    const res = await post();
    expect(sim.calls).toHaveLength(2);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model-error");
  });

  it("السجلّ يشهد بالسقوط: thinking:fallback ونداءان للنموذج", async () => {
    sim.script = [failWith(thinkingRejected())];
    await post();
    expect(timingLine()).toMatchObject({ thinking: "fallback", modelRuns: 2 });
    expect(
      vi
        .mocked(console.warn)
        .mock.calls.some((c) => String(c[0]).includes("thinking option rejected")),
    ).toBe(true);
  });
});

describe("لا سقوط على غير رفض الخيار", () => {
  const cases: Array<[string, () => Error]> = [
    [
      "429 حصّة ولو ذكرت thinking",
      () => apiError(429, "RESOURCE_EXHAUSTED: thinking tokens quota"),
    ],
    ["401", () => apiError(401, "API key not valid")],
    ["403", () => apiError(403, "permission denied")],
    ["404", () => apiError(404, "models/x is not found")],
    ["400 لا يتعلّق بالتفكير", () => apiError(400, "Request payload size exceeds the limit")],
  ];
  it.each(cases)(
    "%s ⇒ نداء واحد، سطر الخطأ الآمن، والخيار يبقى مفعّلًا للطلب التالي",
    async (_n, make) => {
      sim.script = [failWith(make())];
      const res = await post();
      expect(sim.calls).toHaveLength(1);
      expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model-error");
      await post();
      expect(googleOptions(1)).toBeDefined();
    },
  );

  it("5xx ولو ذكرت رسالته thinking ⇒ الإعادة العابرة القائمة بالخيار نفسه، لا سقوط", async () => {
    sim.script = [failWith(apiError(503, "The thinking service is overloaded, high demand"))];
    const res = await post();
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model");
    expect(sim.calls).toHaveLength(2);
    expect(googleOptions(0)).toBeDefined();
    expect(googleOptions(1)).toBeDefined();
    // ولم تُعطَّل الميزة.
    await post();
    expect(googleOptions(2)).toBeDefined();
  });

  it("بعد أن أنهت خطوةٌ أدواتها لا يُعاد الدور (يُكرّر أثر الأدوات)", async () => {
    sim.script = [
      (opts) => {
        opts.onStepFinish?.({ finishReason: "tool-calls", toolCalls: [{ toolName: "x" }] });
        throw thinkingRejected();
      },
    ];
    const res = await post();
    expect(sim.calls).toHaveLength(1);
    expect(res.headers.get("X-SADEED-Reply-Source")).toBe("model-error");
  });
});
