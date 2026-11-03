/**
 * سقف خطوات الأدوات في `/api/chat` — سلوكيًّا عبر المعالج الحقيقي (٢٠٢٦/١١/٠٣).
 *
 * السقف يُستخرج من شرط الإيقاف الذي تلقّاه `generateText` فعلًا: `stepCountIs(n)` يعيد
 * دالةً صحيحةً عند `steps.length === n` فقط، فيُسأل عن أصغر عددٍ تقف عنده.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");

type StopWhen = (event: { steps: unknown[] }) => boolean | PromiseLike<boolean>;

const sim = vi.hoisted(() => ({ stops: [] as unknown[] }));

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
  generateText: async (opts: { stopWhen: unknown }) => {
    sim.stops.push(opts.stopWhen);
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

describe("سقف الخطوات لكل وضع", () => {
  it("النص 4 · الصوت 4 · العميق 8", async () => {
    await post();
    await post("text");
    await post("voice");
    await post("deep");
    expect([await capOf(0), await capOf(1), await capOf(2), await capOf(3)]).toEqual([4, 4, 4, 8]);
  });

  it("السقف يصل سطر القياس (maxSteps) ليُقاس به", async () => {
    await post("voice");
    const line = vi
      .mocked(console.log)
      .mock.calls.find((call) => call[0] === "[api/chat] timing")?.[1] as
      { maxSteps: number } | undefined;
    expect(line?.maxSteps).toBe(4);
  });

  it("SADEED_MAX_STEPS_TEXT يتجاوز النص والصوت ولا يمسّ العميق، ويُقرأ عند كل طلب", async () => {
    vi.stubEnv("SADEED_MAX_STEPS_TEXT", "6");
    await post("text");
    await post("voice");
    await post("deep");
    vi.stubEnv("SADEED_MAX_STEPS_TEXT", "2");
    await post("text");
    vi.stubEnv("SADEED_MAX_STEPS_TEXT", "9"); // خارج النطاق ⇒ يُهمَل
    await post("text");
    expect([
      await capOf(0),
      await capOf(1),
      await capOf(2),
      await capOf(3),
      await capOf(4),
    ]).toEqual([6, 6, 8, 2, 4]);
  });

  it("المحوّل الاختياري يبقى على سقفه (2) لا يمسّه التغيير", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-only-not-a-secret-00");
    vi.stubEnv("SADEED_OPENAI_ENABLED", "true");
    vi.stubEnv("SADEED_MAX_STEPS_TEXT", "7");
    await post(undefined, { "X-SADEED-Provider": "openai" });
    expect(await capOf(0)).toBe(2);
  });
});
