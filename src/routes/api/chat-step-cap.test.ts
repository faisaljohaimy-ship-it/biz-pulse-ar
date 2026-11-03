/**
 * سقف خطوات الأدوات في `/api/chat` — سلوكيًّا عبر المعالج الحقيقي (٢٠٢٦/١١/٠٣).
 *
 * السقف يُستخرج من شرط الإيقاف الذي تلقّاه `generateText` فعلًا: `stepCountIs(n)` يعيد
 * دالةً صحيحةً عند `steps.length === n` فقط، فيُسأل عن أصغر عددٍ تقف عنده.
 *
 * النشر على مرحلتين: **الافتراض (بلا متغيّرات بيئة) يطابق الطلب القديم** — سقف 8 لكل الأوضاع، بلا
 * `prepareStep`، بلا `providerOptions` — ويُثبته اختبار «تكافؤ القديم» أدناه على مفاتيح النداء
 * نفسها. والتخفيض (`SADEED_MAX_STEPS_TEXT`) اختياريّ ويُمرِّر `prepareStep` وحده.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");

type StopWhen = (event: { steps: unknown[] }) => boolean | PromiseLike<boolean>;

const sim = vi.hoisted(() => ({
  stops: [] as unknown[],
  prepares: [] as unknown[],
  /** `providerOptions` كما تلقّاها كل نداء (undefined = لم تُمرَّر). */
  providerOptions: [] as unknown[],
  /** مفاتيح كائن الخيارات الذي تلقّاه كل نداء — لإثبات التكافؤ مع الطلب القديم. */
  optionKeys: [] as string[][],
  member: false,
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
    auth: {
      getUser: async () => ({
        data: { user: sim.member ? { id: "user-1", app_metadata: {} } : null },
        error: null,
      }),
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
// أدوات المسجَّل مزيَّفة (وجودها شرط `prepareStep`)؛ والاسترجاع فارغ بلا شبكة.
vi.mock("@/lib/sadeed-tools.server", () => ({
  buildSadeedTools: () => ({ marker: { description: "x" } }),
}));
vi.mock("@/lib/sadeed/rag.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  gatherRagContext: async () => ({
    contextBlock: "",
    citations: [],
    counts: { memories: 0, knowledge: 0, documents: 0 },
    embedding: null,
  }),
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
  generateText: async (opts: {
    stopWhen: unknown;
    prepareStep?: unknown;
    providerOptions?: unknown;
  }) => {
    sim.stops.push(opts.stopWhen);
    sim.prepares.push(opts.prepareStep);
    sim.providerOptions.push(opts.providerOptions);
    sim.optionKeys.push(Object.keys(opts).sort());
    return { text: "ردّ صوري." };
  },
}));

afterAll(() => vi.unstubAllEnvs());
vi.setConfig({ testTimeout: 20_000, hookTimeout: 30_000 });

type Handler = (args: { request: Request }) => Promise<Response>;
async function post(replyMode?: string, headers: Record<string, string> = {}) {
  const mod = (await import("@/routes/api/chat")) as unknown as {
    Route: { options: { server: { handlers: { POST: Handler } } } };
  };
  return mod.Route.options.server.handlers.POST({
    request: new Request("http://local/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(sim.member
          ? { authorization: "Bearer valid.jwt.that.is.long.enough.for.the.guard" }
          : {}),
        ...headers,
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
        ...(replyMode ? { replyMode } : {}),
      }),
    }),
  });
}

/** أصغر عددِ خطواتٍ يقف عنده شرط الإيقاف الذي تلقّاه النداء رقم `i`. */
async function capOf(i: number): Promise<number | null> {
  const stop = sim.stops[i] as StopWhen | undefined;
  if (typeof stop !== "function") return null;
  for (let n = 1; n <= 20; n++) {
    if (await stop({ steps: new Array(n).fill({}) })) return n;
  }
  return null;
}

beforeEach(async () => {
  sim.stops = [];
  sim.prepares = [];
  sim.providerOptions = [];
  sim.optionKeys = [];
  sim.member = false;
  // الأساس: لا تخفيض (الافتراض القديم 8) مهما كانت بيئة المشغِّل.
  vi.stubEnv("SADEED_MAX_STEPS_TEXT", undefined);
  const guards = await import("@/lib/governance/request-guards.server");
  guards.resetRequestGuardsForTests();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
  vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");
  vi.restoreAllMocks();
});

/** مفاتيح نداء `generateText` القديم (قبل مستوى التفكير وسقف الخطوات و`prepareStep`). */
const OLD_CALL_KEYS = [
  "abortSignal",
  "maxOutputTokens",
  "maxRetries",
  "messages",
  "model",
  "onStepFinish",
  "stopWhen",
  "system",
  "toolChoice",
  "tools",
];

describe("تكافؤ القديم: الافتراض بلا متغيّرات بيئة", () => {
  it("كل وضع، زائرًا ومسجَّلًا بأدوات: سقف 8 · بلا prepareStep · بلا providerOptions · المفاتيح هي القديمة بالضبط", async () => {
    const modes = [undefined, "text", "voice", "deep"] as const;
    for (const member of [false, true]) {
      sim.member = member;
      for (const mode of modes) await post(mode);
    }
    expect(sim.stops).toHaveLength(8);
    for (let i = 0; i < 8; i++) {
      const label = `نداء ${i} (${i < 4 ? "زائر" : "مسجَّل"}/${modes[i % 4] ?? "—"})`;
      expect(await capOf(i), label).toBe(8);
      expect(sim.prepares[i], label).toBeUndefined();
      expect(sim.providerOptions[i], label).toBeUndefined();
      expect(sim.optionKeys[i], label).toEqual(OLD_CALL_KEYS);
    }
  });

  it("المحوّل الاختياري: السقف 2 وproviderOptions القديم وحده — لم يتغيّر", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-only-not-a-secret-00");
    vi.stubEnv("SADEED_OPENAI_ENABLED", "true");
    sim.member = true;
    await post(undefined, { "X-SADEED-Provider": "openai" });
    expect(await capOf(0)).toBe(2);
    expect(sim.prepares[0]).toBeUndefined();
    expect(sim.providerOptions[0]).toEqual({ openai: { store: false } });
    expect(sim.optionKeys[0]).toEqual([...OLD_CALL_KEYS, "providerOptions"].sort());
  });
});

describe("سقف الخطوات لكل وضع", () => {
  it("الافتراض: النص 8 · الصوت 8 · العميق 8", async () => {
    await post();
    await post("text");
    await post("voice");
    await post("deep");
    expect([await capOf(0), await capOf(1), await capOf(2), await capOf(3)]).toEqual([8, 8, 8, 8]);
  });

  it("SADEED_MAX_STEPS_TEXT=4 ⇒ النص 4 · الصوت 4 · العميق يبقى 8", async () => {
    vi.stubEnv("SADEED_MAX_STEPS_TEXT", "4");
    await post();
    await post("text");
    await post("voice");
    await post("deep");
    expect([await capOf(0), await capOf(1), await capOf(2), await capOf(3)]).toEqual([4, 4, 4, 8]);
  });

  it("السقف يصل سطر القياس (maxSteps) ليُقاس به", async () => {
    const maxStepsOfLine = () => {
      const raw = vi
        .mocked(console.log)
        .mock.calls.filter((call) => call[0] === "[api/chat] timing")
        .at(-1)?.[1];
      return typeof raw === "string" ? (JSON.parse(raw) as { maxSteps: number }).maxSteps : null;
    };
    await post("voice");
    expect(maxStepsOfLine()).toBe(8);
    vi.stubEnv("SADEED_MAX_STEPS_TEXT", "4");
    await post("voice");
    expect(maxStepsOfLine()).toBe(4);
  });

  it("SADEED_MAX_STEPS_TEXT يتجاوز النص والصوت ولا يمسّ العميق، ويُقرأ عند كل طلب", async () => {
    vi.stubEnv("SADEED_MAX_STEPS_TEXT", "6");
    await post("text");
    await post("voice");
    await post("deep");
    vi.stubEnv("SADEED_MAX_STEPS_TEXT", "2");
    await post("text");
    vi.stubEnv("SADEED_MAX_STEPS_TEXT", "9"); // خارج النطاق ⇒ يُهمَل (يعود الافتراض 8)
    await post("text");
    expect([
      await capOf(0),
      await capOf(1),
      await capOf(2),
      await capOf(3),
      await capOf(4),
    ]).toEqual([6, 6, 8, 2, 8]);
  });

  it("المحوّل الاختياري يبقى على سقفه (2) لا يمسّه التغيير", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-only-not-a-secret-00");
    vi.stubEnv("SADEED_OPENAI_ENABLED", "true");
    vi.stubEnv("SADEED_MAX_STEPS_TEXT", "7");
    await post(undefined, { "X-SADEED-Provider": "openai" });
    expect(await capOf(0)).toBe(2);
  });
});

describe("آخر خطوةٍ مسموحة تكتب الجواب (prepareStep) — خلف التخفيض الاختياري وحده", () => {
  type Prepare = (event: { stepNumber: number }) => unknown;

  it("الافتراض 8: للمسجَّل بأدوات Gemini لا prepareStep في أي وضع (يطابق الطلب القديم)", async () => {
    sim.member = true;
    await post("text");
    await post("voice");
    await post("deep");
    expect(sim.prepares).toEqual([undefined, undefined, undefined]);
    expect(sim.optionKeys.every((keys) => !keys.includes("prepareStep"))).toBe(true);
  });

  it("SADEED_MAX_STEPS_TEXT=4 للمسجَّل بأدوات Gemini: النص والصوت يحملان prepareStep يمنع الأدوات عند الخطوة الأخيرة (4)؛ والعميق (8) لا", async () => {
    sim.member = true;
    vi.stubEnv("SADEED_MAX_STEPS_TEXT", "4");
    await post("text");
    await post("voice");
    await post("deep");
    for (const i of [0, 1]) {
      const prepare = sim.prepares[i] as Prepare | undefined;
      expect(typeof prepare, `نداء ${i}`).toBe("function");
      expect(prepare!({ stepNumber: 2 })).toBeUndefined();
      expect(prepare!({ stepNumber: 3 })).toEqual({ toolChoice: "none" });
    }
    expect(sim.prepares[2]).toBeUndefined();
    expect(await capOf(2)).toBe(8);
  });

  it("السقف المخفَّض المحكوم به يحدّد الخطوة الأخيرة: 6 ثم 2 ثم 7", async () => {
    sim.member = true;
    const cases: Array<[string, number]> = [
      ["6", 6],
      ["2", 2],
      ["7", 7],
    ];
    for (const [value] of cases) {
      vi.stubEnv("SADEED_MAX_STEPS_TEXT", value);
      await post("voice");
    }
    for (const [i, [, cap]] of cases.entries()) {
      const prepare = sim.prepares[i] as Prepare | undefined;
      expect(typeof prepare, `نداء ${i}`).toBe("function");
      expect(await capOf(i)).toBe(cap);
      expect(prepare!({ stepNumber: cap - 2 })).toBeUndefined();
      expect(prepare!({ stepNumber: cap - 1 })).toEqual({ toolChoice: "none" });
    }
  });

  it("SADEED_MAX_STEPS_TEXT=8 صراحةً = الافتراض: لا prepareStep", async () => {
    sim.member = true;
    vi.stubEnv("SADEED_MAX_STEPS_TEXT", "8");
    await post("text");
    expect(await capOf(0)).toBe(8);
    expect(sim.prepares[0]).toBeUndefined();
  });

  it("الزائر بلا أدوات: لا prepareStep (لا شيء يُمنع) ولو خُفِّض السقف", async () => {
    vi.stubEnv("SADEED_MAX_STEPS_TEXT", "4");
    await post("text");
    expect(await capOf(0)).toBe(4);
    expect(sim.prepares[0]).toBeUndefined();
  });

  it("المحوّل الاختياري لا يتغيّر سلوكه: لا prepareStep ولو خُفِّض السقف", async () => {
    sim.member = true;
    vi.stubEnv("OPENAI_API_KEY", "test-only-not-a-secret-00");
    vi.stubEnv("SADEED_OPENAI_ENABLED", "true");
    vi.stubEnv("SADEED_MAX_STEPS_TEXT", "4");
    await post(undefined, { "X-SADEED-Provider": "openai" });
    expect(sim.prepares[0]).toBeUndefined();
  });
});
