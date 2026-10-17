/**
 * حارسا الطلب في `/api/chat` (VIBE 5.1): منع التكرار الجاري وسقف التزامن —
 * سلوكيًّا، بنموذجٍ مزروع يُمسَك حتى يُطلقه الاختبار.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");
// الهوية المجهولة من ترويسة الوكيل لا تُقرأ إلا خلف وكيلٍ موثوق — وإلا تشاركت كل
// الزيارات المجهولة مفتاحًا واحدًا، فيصير «عنوانٌ آخر» تكرارًا بحقّ.
vi.stubEnv("TRUST_PROXY_HEADERS", "true");

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

const sim = vi.hoisted(() => ({
  hold: null as null | Promise<void>,
  calls: 0,
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  generateText: async () => {
    sim.calls++;
    if (sim.hold) await sim.hold;
    return { text: "ردّ صوري." };
  },
}));

afterAll(() => vi.unstubAllEnvs());
// أوّل استيرادٍ لمسار الدردشة وحده يستغرق ثوانيَ على آلة CI؛ والانتظار هنا على
// أحداثٍ حقيقية لا على مهلةٍ ثابتة — فالسقف واسع ولا يُبلَغ إلا عند عطل.
vi.setConfig({ testTimeout: 20_000 });

type Handler = (args: { request: Request }) => Promise<Response>;

// معرّفات المحادثة UUID: الحارس يُسقط ما سواها فتتساوى «محادثتان» وهميّتان.
const THREAD_A = "11111111-1111-4111-8111-111111111111";
const THREAD_B = "22222222-2222-4222-8222-222222222222";

async function post(text: string, thread = THREAD_A, ip = "198.51.100.7") {
  const mod = (await import("@/routes/api/chat")) as unknown as {
    Route: { options: { server: { handlers: { POST: Handler } } } };
  };
  return mod.Route.options.server.handlers.POST({
    request: new Request("http://local/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({
        messages: [{ id: "m1", role: "user", parts: [{ type: "text", text }] }],
        threadId: thread,
      }),
    }),
  });
}

/** آخر بوّابةٍ معلّقة — تُحرَّر في afterEach فلا يسرّب اختبارٌ ساقط طلبًا إلى ما بعده. */
let pendingGate: { resolve: () => void } | null = null;
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  pendingGate = { resolve };
  return { promise, resolve };
}

const tick = () => new Promise((r) => setTimeout(r, 25));
/** ينتظر حتى يبلغ الطلب النموذج (أي بعد حجز الحارسين) — لا تخمينًا بمهلةٍ ثابتة. */
async function waitForCalls(n: number, timeoutMs = 15_000) {
  const started = Date.now();
  while (sim.calls < n) {
    if (Date.now() - started > timeoutMs) throw new Error(`لم يبلغ النموذج ${n} نداءً في الوقت`);
    await tick();
  }
}
const Q1 = "ما أبرز مخاطر اليوم في المنطقة الشرقية؟";
const Q2 = "كم تصريح عمل ساخن نشط الآن؟";

beforeEach(async () => {
  sim.hold = null;
  sim.calls = 0;
  const guards = await import("@/lib/governance/request-guards.server");
  guards.resetRequestGuardsForTests();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  pendingGate?.resolve();
  pendingGate = null;
  vi.unstubAllEnvs();
  vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
  vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");
  vi.stubEnv("TRUST_PROXY_HEADERS", "true");
  vi.restoreAllMocks();
});

describe("منع التكرار الجاري", () => {
  it("الطلب نفسه مرّتين معًا ⇐ الثاني 429 duplicate_request بلا نداء ثانٍ، وبعد الانتهاء يمرّ", async () => {
    const gate = deferred();
    sim.hold = gate.promise;
    const thread = crypto.randomUUID();
    const first = post(Q1, thread);
    await waitForCalls(1);
    const second = await post(Q1, thread);
    expect(second.status).toBe(429);
    expect(second.headers.get("Retry-After")).toBe("3");
    expect(second.headers.get("X-SADEED-Gate")).toBe("verified");
    expect(second.headers.get("X-SADEED-Auth")).toBe("anonymous");
    const body = (await second.json()) as { error: string; code?: string };
    expect(body.code).toBe("duplicate_request");
    expect(/[؀-ۿ]/.test(body.error)).toBe(true);
    expect(sim.calls).toBe(1);

    gate.resolve();
    expect((await first).status).toBe(200);
    sim.hold = null;
    const third = await post(Q1, thread);
    expect(third.status).toBe(200);
    expect(sim.calls).toBe(2);
  });

  it("سؤالٌ مختلف أو محادثةٌ أخرى أو هويةٌ أخرى ليست تكرارًا", async () => {
    const gate = deferred();
    sim.hold = gate.promise;
    const first = post(Q1);
    await waitForCalls(1);
    // كل ردٍّ يُسجَّل فور وصوله: ما يُرفض مبكرًا (429/503) يظهر هنا باسمه.
    const early: Record<string, number> = {};
    const track = (name: string, p: Promise<Response>) =>
      p.then((r) => {
        early[name] = r.status;
        return r;
      });
    const other = track("other-question", post(Q2));
    const otherThread = track("other-thread", post(Q1, THREAD_B));
    const otherIp = track("other-ip", post(Q1, THREAD_A, "198.51.100.8"));
    const reached = await waitForCalls(4).then(
      () => true,
      () => false,
    );
    expect(reached, `رفضٌ مبكر: ${JSON.stringify(early)}`).toBe(true);
    gate.resolve();
    for (const r of await Promise.all([first, other, otherThread, otherIp])) {
      expect(r.status).toBe(200);
    }
    expect(sim.calls).toBe(4);
  });
});

describe("سقف التزامن", () => {
  it("فوق السقف ⇐ 503 busy بـRetry-After 5 بلا نداء، وبعد التحرير يمرّ", async () => {
    vi.stubEnv("SADEED_CHAT_MAX_INFLIGHT", "1");
    const gate = deferred();
    sim.hold = gate.promise;
    const first = post(Q1);
    await waitForCalls(1);
    const second = await post(Q2);
    expect(second.status).toBe(503);
    expect(second.headers.get("Retry-After")).toBe("5");
    expect(second.headers.get("X-SADEED-Gate")).toBe("verified");
    expect(second.headers.get("X-SADEED-Auth")).toBe("anonymous");
    const body = (await second.json()) as { error: string; code?: string };
    expect(body.code).toBe("busy");
    expect(/[؀-ۿ]/.test(body.error)).toBe(true);
    expect(sim.calls).toBe(1);

    gate.resolve();
    expect((await first).status).toBe(200);
    sim.hold = null;
    expect((await post(Q2)).status).toBe(200);
    expect(sim.calls).toBe(2);
  });

  it("الخانة تُحرَّر حتى حين يفشل النموذج", async () => {
    vi.stubEnv("SADEED_CHAT_MAX_INFLIGHT", "1");
    const gate = deferred();
    sim.hold = gate.promise.then(() => {
      throw new Error("503 upstream");
    });
    const first = post(Q1);
    await waitForCalls(1);
    gate.resolve();
    expect((await first).status).toBe(200);
    sim.hold = null;
    expect((await post(Q2)).status).toBe(200);
  });
});
