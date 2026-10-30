// @vitest-environment node
/**
 * POST /api/finn/chat — السلوك الكامل عبر المعالج الحقيقي.
 *
 * ما يُحاكى: المصادقة (`verifySupabaseUser`) وحدّ المعدّل والحصّة والمزوّدون (`ai` ·
 * `@ai-sdk/openai` · Gemini). ما لا يُحاكى: بوّابة المالك والمحرّك وسلسلة السقوط
 * والمعالج نفسه. **لا مفتاح حقيقي هنا ولا نداء فعلي لأي مزوّد.**
 *
 * الأصفار أدناه ذات معنى لأن آخر مجموعة تُثبت أن المسار السليم يصل النموذج مرّة
 * ويستهلك حدًّا وحصّة مرّة (المادة ٣٠: لا أصفار فوق مجموعة فارغة).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sim = vi.hoisted(() => ({
  rateCalls: [] as Array<{ key: string; max: number; window: number }>,
  rate: { allowed: true } as { allowed: boolean; unavailable?: boolean },
  rateThrows: false,
  quotaCalls: [] as Array<Record<string, unknown>>,
  quota: null as Response | null,
  verifyCalls: 0,
  verifyUser: null as string | null,
  streamCalls: [] as Array<{ tag: string; modelId: string | null; args: Record<string, unknown> }>,
  script: {} as Record<string, () => AsyncIterable<Record<string, unknown>>>,
  gatewayAvailable: false,
  directAvailable: true,
  n8nInputs: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/governance/rate-limit.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  enforceRateLimit: async (key: string, max: number, window: number) => {
    sim.rateCalls.push({ key, max, window });
    if (sim.rateThrows) throw new Error("store exploded");
    return sim.rate;
  },
}));

vi.mock("@/lib/governance/ai-quota.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  enforceAiQuota: async (opts: Record<string, unknown>) => {
    sim.quotaCalls.push(opts);
    return sim.quota;
  },
}));

// عميل n8n كاملًا مُراقَب (لا شبكة ولا n8n): كل نداءٍ يُسجَّل. الغرض إثبات أن أداة web_research لا تُبنى ولا
// تُنفَّذ إلا على مسار المالك، لا اختبار القناة (لها اختباراتها).
vi.mock("@/lib/n8n/client.server", () => ({
  researchViaN8n: async (input: Record<string, unknown>) => {
    sim.n8nInputs.push(input);
    return { served: false, reason: "not_configured", latencyMs: 0 };
  },
  runViaN8n: async (input: Record<string, unknown>) => {
    sim.n8nInputs.push(input);
    return { served: false, reason: "not_configured", latencyMs: 0 };
  },
  n8nStatus: () => ({
    surface: "fnn",
    configured: false,
    disabled: false,
    mode: null,
    breaker: "closed",
    last_ok_at: null,
    p95_ms: null,
    samples: 0,
  }),
}));

vi.mock("@/lib/hook-auth.server", () => ({
  verifySupabaseUser: async () => {
    sim.verifyCalls++;
    return sim.verifyUser ? { userId: sim.verifyUser } : new Response("{}", { status: 401 });
  },
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => ({ responses: (id: string) => ({ tag: "openai", modelId: id }) }),
}));

vi.mock("ai", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  streamText: (args: Record<string, unknown>) => {
    const model = args.model as { tag: string; modelId: string | null };
    sim.streamCalls.push({ tag: model.tag, modelId: model.modelId ?? null, args });
    const make = sim.script[model.tag];
    return { fullStream: make ? make() : (async function* () {})() };
  },
}));

vi.mock("@/lib/sadeed/gemini-provider.server", () => ({
  resolveSadeedGeminiRuntimes: () =>
    sim.directAvailable
      ? [
          {
            vendor: "google-gemini",
            modelId: "gemini-test",
            provider: (id: string) => ({ tag: "gemini-direct", modelId: id }),
          },
        ]
      : [],
}));

// `isSadeedBackupEnabled` تبقى الحقيقية: فحص المحرّك قبل الإنفاق يُقاس على قاعدة الطلب الصريح (O8ج).
vi.mock("@/lib/sadeed/backup-provider.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  createSadeedBackupModel: () =>
    sim.gatewayAvailable ? { tag: "gemini-gateway", modelId: "gateway-test" } : null,
  primaryCoolingDown: () => false,
  coolPrimary: () => undefined,
  primaryCooldownFor: () => 1000,
}));

import { LOCAL_REPLY_NOTICE_AR } from "./local-reply.server";
import { FINN_DENY_FLOOR_MS, setFinnDenyClockForTests } from "./owner-gate.server";
import { createFinnEventParser, type FinnStreamEvent } from "./stream-protocol";

const OWNER = "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";
const OTHER = "9d8c7b6a-5e4f-4a3b-9c2d-1e0f9a8b7c6d";
const SECRET_KEY = "sk-test-SECRET-KEY-do-not-leak-0123456789";
const USER_TEXT = "اكتب لي دالة تحذف المستخدمين القدامى";

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwtFor = (sub: string) => `${b64({ alg: "HS256" })}.${b64({ sub })}.sig`;

type Handler = (args: { request: Request }) => Promise<Response>;
async function handlers(): Promise<Record<string, Handler>> {
  const mod = (await import("@/routes/api/finn/chat")) as unknown as {
    Route: { options: { server: { handlers: Record<string, Handler> } } };
  };
  return mod.Route.options.server.handlers;
}

function postReq(
  body: unknown = { messages: [{ role: "user", content: USER_TEXT }] },
  init: { token?: string | null; headers?: Record<string, string>; raw?: string } = {},
) {
  const token = init.token === undefined ? jwtFor(OWNER) : init.token;
  return new Request("http://local/api/finn/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    body: init.raw ?? JSON.stringify(body),
  });
}

async function post(req: Request) {
  return (await handlers()).POST({ request: req });
}

async function events(res: Response): Promise<FinnStreamEvent[]> {
  const parser = createFinnEventParser();
  const out = parser.push(await res.text());
  return [...out, ...parser.flush()];
}

const textPart = (text: string) => ({ type: "text-delta", id: "t", text });
const finishPart = { type: "finish", finishReason: "stop" };
async function* parts(list: Array<Record<string, unknown>>) {
  for (const p of list) yield p;
}
const failWith = (statusCode: number, extra: Record<string, unknown> = {}) =>
  parts([
    {
      type: "error",
      error: Object.assign(new Error(`provider text ${SECRET_KEY}`), { statusCode, ...extra }),
    },
  ]);

const spend = () => ({
  rate: sim.rateCalls.length,
  quota: sim.quotaCalls.length,
  models: sim.streamCalls.length,
});

/** بيئةٌ بلا أي محرّك: لا OpenAI ولا Gemini مباشر ولا بوّابة (حالة «لا يتعطل»). */
function stubNoEngine() {
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
  vi.stubEnv("LOVABLE_API_KEY", "");
  vi.stubEnv("SADEED_BACKUP_PROVIDER", "");
  sim.directAvailable = false;
  sim.gatewayAvailable = false;
}

/** نصّ الرد المحلّي كاملًا (كل أحداث delta مجموعة). */
async function localText(res: Response): Promise<string> {
  return (await events(res))
    .filter((e) => e.type === "delta")
    .map((e) => (e as { text: string }).text)
    .join("");
}

// ساعة افتراضية لأرضية زمن الرفض (W5 #1): النوم يقدّم الزمن فقط، فلا انتظار حقيقي.
const denyClock = { t: 0, slept: [] as number[] };

let logSpies: Array<ReturnType<typeof vi.spyOn>>;
/**
 * كل ما طُبع في الكونسول **بمحتواه** لا باسم نوعه: `String({})` تعطي `[object Object]`
 * فيمرّ تسريبٌ داخل كائن. والأخطاء تُفرَّد (name/message/stack) لأن JSON يطويها فارغة.
 */
const logged = () =>
  JSON.stringify(
    logSpies.flatMap((s) => s.mock.calls),
    (_k, v) =>
      v instanceof Error ? { ...v, name: v.name, message: v.message, stack: v.stack } : v,
  );

beforeEach(() => {
  denyClock.t = 0;
  denyClock.slept = [];
  setFinnDenyClockForTests({
    now: () => denyClock.t,
    sleep: async (ms) => {
      denyClock.slept.push(ms);
      denyClock.t += ms;
    },
  });
  sim.rateCalls = [];
  sim.rate = { allowed: true };
  sim.rateThrows = false;
  sim.quotaCalls = [];
  sim.quota = null;
  sim.verifyCalls = 0;
  sim.verifyUser = OWNER;
  sim.streamCalls = [];
  sim.script = {};
  sim.gatewayAvailable = false;
  sim.directAvailable = true;
  sim.n8nInputs = [];
  vi.stubEnv("FINN_OWNER_USER_IDS", OWNER);
  vi.stubEnv("OPENAI_API_KEY", SECRET_KEY);
  vi.stubEnv("FINN_OPENAI_MODEL", "");
  vi.stubEnv("GEMINI_API_KEY", "gem-key");
  vi.stubEnv("SADEED_AI_DISABLED", "");
  logSpies = [
    vi.spyOn(console, "warn").mockImplementation(() => {}),
    vi.spyOn(console, "error").mockImplementation(() => {}),
    vi.spyOn(console, "log").mockImplementation(() => {}),
    vi.spyOn(console, "info").mockImplementation(() => {}),
  ];
  sim.script.openai = () => parts([textPart("رد GPT"), finishPart]);
  sim.script["gemini-direct"] = () => parts([textPart("رد احتياطي"), finishPart]);
});
afterEach(() => {
  setFinnDenyClockForTests(null);
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("① غير المالك: 404 متطابق، وصفر إنفاق", () => {
  const NON_OWNER_CASES: Array<[string, () => Request, () => void]> = [
    ["زائر بلا ترويسة", () => postReq(undefined, { token: null }), () => {}],
    ["رمزٌ معطوب", () => postReq(undefined, { token: "garbage" }), () => {}],
    ["مسجَّلٌ غير مالك", () => postReq(undefined, { token: jwtFor(OTHER) }), () => {}],
    ["قائمة المالكين غير معرَّفة", () => postReq(), () => vi.stubEnv("FINN_OWNER_USER_IDS", "")],
    [
      "قائمة المالكين فاسدة",
      () => postReq(),
      () => vi.stubEnv("FINN_OWNER_USER_IDS", `${OWNER},not-a-uuid`),
    ],
    [
      "رمزٌ يدّعي المالك ولا تتحقّق منه المصادقة",
      () => postReq(),
      () => {
        sim.verifyUser = null;
      },
    ],
    [
      "رمزٌ يدّعي المالك والمتحقَّق منه غيره",
      () => postReq(),
      () => {
        sim.verifyUser = OTHER;
      },
    ],
  ];

  it.each(NON_OWNER_CASES)("%s ⇒ 404 ولا حدّ ولا حصّة ولا نموذج", async (_n, make, setup) => {
    setup();
    const res = await post(make());
    expect(res.status).toBe(404);
    expect(spend()).toEqual({ rate: 0, quota: 0, models: 0 });
  });

  it("الأسباب كلّها ترد بجسمٍ وترويساتٍ متطابقة — لا يُميَّز بينها", async () => {
    const shapes: string[] = [];
    for (const [, make, setup] of NON_OWNER_CASES) {
      vi.unstubAllEnvs();
      vi.stubEnv("FINN_OWNER_USER_IDS", OWNER);
      sim.verifyUser = OWNER;
      setup();
      const res = await post(make());
      shapes.push(JSON.stringify([res.status, [...res.headers].sort(), await res.text()]));
    }
    expect(NON_OWNER_CASES.length).toBeGreaterThanOrEqual(7);
    expect(new Set(shapes).size).toBe(1);
  });

  it("كل رفضٍ عبر المعالج الحقيقي ينتظر أرضية الزمن نفسها (W5 #1)", async () => {
    for (const [name, make, setup] of NON_OWNER_CASES) {
      vi.unstubAllEnvs();
      vi.stubEnv("FINN_OWNER_USER_IDS", OWNER);
      sim.verifyUser = OWNER;
      setup();
      denyClock.t = 0;
      denyClock.slept = [];
      const res = await post(make());
      expect(res.status, name).toBe(404);
      expect(denyClock.t, `${name}: زمن الرفض`).toBe(FINN_DENY_FLOOR_MS);
    }
  });

  it("غير المالك الذي يحمل رمزًا بلا ادّعاء المالك لا يكلّف نداء مصادقة", async () => {
    await post(postReq(undefined, { token: jwtFor(OTHER) }));
    await post(postReq(undefined, { token: null }));
    expect(sim.verifyCalls).toBe(0);
  });

  it("والـ404 ليس 401/403 ولا يحمل نصّ مصادقة", async () => {
    const res = await post(postReq(undefined, { token: null }));
    expect(res.status).toBe(404);
    const text = await res.text();
    expect(text).not.toMatch(/unauthor|authenticat|token|forbidden|غير مصرّ?ح|صلاحي/i);
  });

  it("مفتاح الإيقاف مرفوعٌ + غير مالك ⇒ 404 لا 503 (وإلا كُشف وجود المسار)", async () => {
    vi.stubEnv("SADEED_AI_DISABLED", "1");
    const res = await post(postReq(undefined, { token: jwtFor(OTHER) }));
    expect(res.status).toBe(404);
  });
});

describe("② كل طريقةٍ غير POST ⇒ الـ404 نفسه (لا صفحة SPA تكشف المسار)", () => {
  it.each(["ANY"])("المعالج %s موجود", async (key) => {
    expect(typeof (await handlers())[key]).toBe("function");
  });

  it("GET/PUT/PATCH/DELETE/OPTIONS/HEAD كلّها تمرّ بـANY وتردّ 404 حتى للمالك", async () => {
    const h = await handlers();
    const reference = await (await h.POST({ request: postReq(undefined, { token: null }) })).text();
    for (const method of ["GET", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]) {
      const request = new Request("http://local/api/finn/chat", {
        method,
        headers: { authorization: `Bearer ${jwtFor(OWNER)}` },
      });
      const res = await h.ANY({ request });
      expect(res.status, method).toBe(404);
      expect(await res.text(), method).toBe(reference);
    }
    expect(spend()).toEqual({ rate: 0, quota: 0, models: 0 });
    expect(sim.verifyCalls).toBe(0);
  });
});

describe("③ المالك: مفتاح الإيقاف والحدّ والحصّة قبل أي نموذج", () => {
  it("مفتاح الإيقاف ⇒ 503 ai_disabled قبل الحدّ والحصّة والنموذج", async () => {
    vi.stubEnv("SADEED_AI_DISABLED", "1");
    const res = await post(postReq());
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toBe("ai_disabled");
    expect(spend()).toEqual({ rate: 0, quota: 0, models: 0 });
  });

  it("السقف اليومي 429 ⇒ يُعاد كما هو، وصفر نموذج", async () => {
    sim.quota = new Response(JSON.stringify({ error: "daily_identity_cap", message_ar: "سقف." }), {
      status: 429,
      headers: { "Retry-After": "3600", "Content-Type": "application/json; charset=utf-8" },
    });
    const res = await post(postReq());
    expect(res.status).toBe(429);
    expect(((await res.json()) as { error: string }).error).toBe("daily_identity_cap");
    expect(spend()).toEqual({ rate: 1, quota: 1, models: 0 });
  });

  it("حدّ المعدّل مرفوض ⇒ 429 finn_rate_limited عربيّ، والحصّة لا تُستهلك، وصفر نموذج", async () => {
    sim.rate = { allowed: false };
    const res = await post(postReq());
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string; message_ar: string };
    expect(body.error).toBe("finn_rate_limited");
    expect(body.message_ar).toMatch(/[؀-ۿ]/);
    expect(res.headers.get("retry-after")).toBe("60");
    expect(spend()).toEqual({ rate: 1, quota: 0, models: 0 });
  });

  it("المخزن غير متاح ⇒ 503 مغلقًا (لا «bounded»)، وصفر نموذج", async () => {
    sim.rate = { allowed: false, unavailable: true };
    const res = await post(postReq());
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toBe("rate_limit_unavailable");
    expect(spend()).toEqual({ rate: 1, quota: 0, models: 0 });
  });

  it("المخزن يرمي (لا يعيد «غير متاح») ⇒ 503 مغلقًا أيضًا، وصفر حصّة ونموذج", async () => {
    sim.rateThrows = true;
    const res = await post(postReq());
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toBe("rate_limit_unavailable");
    expect(spend()).toEqual({ rate: 1, quota: 0, models: 0 });
  });

  it("المفاتيح مستقلّة عن سَدِيد: دلو المعدّل ودلو الحصّة باسم finn-chat وهوية المالك", async () => {
    await post(postReq());
    expect(sim.rateCalls).toEqual([{ key: `finn-chat:${OWNER}`, max: 20, window: 60 }]);
    expect(sim.quotaCalls).toHaveLength(1);
    expect(sim.quotaCalls[0]).toMatchObject({
      surface: "finn",
      identity: `finn-chat:${OWNER}`,
      deadlineMs: 2000,
    });
  });

  // O8(ب) ٢٠٢٦/١٠/٣٠: كان «لا محرّك» يردّ 503 no_engine (وصفر إنفاق). صار ردًّا محلّيًّا حتميًّا بلا
  // نموذج (200 + X-FINN-Engine: local) وبصفر إنفاق أيضًا. تفاصيله في المجموعة «③ب» أدناه.
  it("لا محرّك مهيّأ أصلًا ⇒ 200 ردّ محلّي بلا نموذج، وصفر حدّ وحصّة ونموذج (كان 503 no_engine)", async () => {
    stubNoEngine();
    const res = await post(postReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("x-finn-engine")).toBe("local");
    expect(spend()).toEqual({ rate: 0, quota: 0, models: 0 });
  });

  // O8(ج) ٢٠٢٦/١٠/٢٩: كان المفتاح وحده يُرضي فحص المحرّك، فيُنفَق الحدّ والحصّة ثم تُتخطّى
  // المحاولات الثلاث ⇒ 503. الآن الفحص يتّفق مع بانِي المحاولات (الطلب الصريح شرط البوّابة)،
  // وحالة «لا محرّك» تُجاب محليًّا بلا إنفاق (O8(ب)).
  it("O8(ج): LOVABLE_API_KEY وحده بلا SADEED_BACKUP_PROVIDER ⇒ لا محرّك ⇒ ردّ محلّي وصفر حدّ وحصّة ونموذج", async () => {
    stubNoEngine();
    vi.stubEnv("LOVABLE_API_KEY", "lovable-key-stub-not-a-secret");
    const res = await post(postReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("x-finn-engine")).toBe("local");
    // كان قبل O8(ج): { rate: 1, quota: 1, models: 0 } ثم 503؛ وبعده 503 بصفر؛ والآن 200 بصفر.
    expect(spend()).toEqual({ rate: 0, quota: 0, models: 0 });
    expect(await localText(res)).toContain(LOCAL_REPLY_NOTICE_AR);
  });

  it("O8(ج) الإيجابي: SADEED_BACKUP_PROVIDER=lovable مع المفتاح ⇒ البوّابة تجيب بعد حدٍّ وحصّةٍ مرّة", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    vi.stubEnv("LOVABLE_API_KEY", "lovable-key-stub-not-a-secret");
    vi.stubEnv("SADEED_BACKUP_PROVIDER", "lovable");
    sim.directAvailable = false;
    sim.gatewayAvailable = true;
    sim.script["gemini-gateway"] = () => parts([textPart("من البوّابة"), finishPart]);
    const res = await post(postReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("x-finn-engine")).toBe("gemini");
    expect(res.headers.get("x-finn-fallback")).toBe("not_configured");
    expect(spend()).toEqual({ rate: 1, quota: 1, models: 1 });
    expect(sim.streamCalls.map((c) => c.tag)).toEqual(["gemini-gateway"]);
  });
});

describe("③ب طبقة «لا يتعطل» (O8 ب): لا محرّك ⇒ ردّ محلّي حتميّ بلا نموذج ولا حدّ ولا حصّة", () => {
  const FAKE_GH = "ghp_" + "Zx9Yw8Vv7Uu6Tt5Ss4Rr3Qq2Pp1Oo0Nn";
  const FAKE_VERCEL = "vcl_secret_" + "AbCdEf0123456789XyZ";

  it("الرد 200 SSE بترويسة X-FINN-Engine: local وبلا X-FINN-Fallback، وبلا تخزين مؤقّت", async () => {
    stubNoEngine();
    const res = await post(postReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.headers.get("x-finn-engine")).toBe("local");
    expect(res.headers.has("x-finn-fallback")).toBe(false);
    await res.text();
  });

  it("صفر نداء نموذج وصفر حدّ وصفر حصّة، ومزوّد OpenAI/Gemini لا يُبنى أصلًا", async () => {
    stubNoEngine();
    const res = await post(postReq());
    await res.text();
    expect(spend()).toEqual({ rate: 0, quota: 0, models: 0 });
    expect(sim.streamCalls).toEqual([]);
    expect(sim.rateCalls).toEqual([]);
    expect(sim.quotaCalls).toEqual([]);
  });

  it("الأحداث: نشاط الأداتين (اسمٌ ومرحلة) ثم النصّ ثم done، والسطر الصريح أوّل نصّ", async () => {
    stubNoEngine();
    const ev = await events(await post(postReq()));
    expect(ev.filter((e) => e.type === "tool")).toEqual([
      { type: "tool", name: "platform_status", phase: "start" },
      { type: "tool", name: "platform_status", phase: "done" },
      { type: "tool", name: "knowledge_search", phase: "start" },
      { type: "tool", name: "knowledge_search", phase: "done" },
    ]);
    const firstDelta = ev.find((e) => e.type === "delta") as { text: string };
    expect(firstDelta.text.startsWith(LOCAL_REPLY_NOTICE_AR)).toBe(true);
    expect(LOCAL_REPLY_NOTICE_AR).toMatch(/ردّ محلي بلا نموذج/);
    expect(ev.at(-1)).toEqual({ type: "done", truncated: false });
    expect(ev.some((e) => e.type === "error")).toBe(false);
  });

  it("النصّ يحمل لقطة المنصّة (المحرّكان غير مهيّأين) ولا يدّعي أنه أجاب عن السؤال", async () => {
    stubNoEngine();
    const text = await localText(await post(postReq()));
    expect(text).toContain("حالة المنصّة");
    expect(text).toMatch(/المحرّك الأساسي \(GPT\): غير مهيّأ/);
    expect(text).toMatch(/المحرّك الاحتياطي: غير مهيّأ/);
    expect(text).toContain("فلا أجيب عن سؤالك الآن");
    expect(text).toContain("لتفعيل الإجابة بنموذج");
    // لا شرطة طويلة في النصّ المكتوب (جمل قصيرة): العناوين المقتبسة من المعرفة قد تحملها، وهذا السؤال لا يطابق شيئًا.
    expect(text).not.toContain("—");
  });

  it("سؤالٌ يطابق المعرفة المضمّنة ⇒ عنوانٌ ومقتطفٌ بوسم «مطابقة نصّية» وبلا نسبة تشابه", async () => {
    stubNoEngine();
    const res = await post(
      postReq({ messages: [{ role: "user", content: "ما إطار تصاريح العمل والعزل؟" }] }),
    );
    const text = await localText(res);
    expect(text).toContain("المعرفة المضمّنة");
    expect(text).toContain("مطابقة نصّية");
    expect(text).toContain("إطار تصاريح العمل والعزل");
    expect(text).not.toMatch(/\bsim\b|\d\s*%|تشابه\s*\d/i);
    expect(spend()).toEqual({ rate: 0, quota: 0, models: 0 });
  });

  it("سؤالٌ لا يطابق شيئًا ⇒ «لا نتائج» صريحة، لا مرجعٌ مؤلَّف", async () => {
    stubNoEngine();
    const res = await post(
      postReq({
        messages: [{ role: "user", content: "ما سعر صرف الريال أمام الين الياباني اليوم؟" }],
      }),
    );
    const text = await localText(res);
    expect(text).toContain("لا نتائج مطابقة لسؤالك في المعرفة المضمّنة");
    expect(text).not.toMatch(/^\d+\. /m);
  });

  it("الاستعلام يُؤخذ من آخر رسالة للمستخدم لا من الأولى", async () => {
    stubNoEngine();
    const res = await post(
      postReq({
        messages: [
          { role: "user", content: "ما إطار تصاريح العمل والعزل؟" },
          { role: "assistant", content: "ج" },
          { role: "user", content: "ما سعر صرف الريال أمام الين الياباني اليوم؟" },
        ],
      }),
    );
    expect(await localText(res)).toContain("لا نتائج مطابقة");
  });

  it("لا سرّ ولا نصّ خطأ ولا محادثة في الاستجابة أو السجلّ — حتى لو كانت أسرار الأدوات مضبوطة", async () => {
    stubNoEngine();
    vi.stubEnv("FINN_GITHUB_TOKEN", FAKE_GH);
    vi.stubEnv("FINN_VERCEL_TOKEN", FAKE_VERCEL);
    vi.stubEnv("FINN_VERCEL_PROJECT_ID", "prj_test");
    const res = await post(postReq());
    const wire = JSON.stringify([...res.headers]) + (await res.text());
    for (const secret of [FAKE_GH, FAKE_VERCEL, SECRET_KEY, "provider text"]) {
      expect(wire, secret).not.toContain(secret);
      expect(logged(), secret).not.toContain(secret);
    }
    expect(wire).not.toMatch(/sk-[A-Za-z0-9]{8,}|ghp_|eyJ[A-Za-z0-9_-]{10,}|bearer|authorization/i);
    expect(wire).not.toMatch(/\bat\s+\S+\s*\(|Error:|stack/);
    // نصّ المحادثة لا يصل السجلّ، وسجلّ الرد المحلّي رمزٌ وعددٌ فقط.
    expect(logged()).not.toContain(USER_TEXT);
    expect(logged()).toContain("local reply");
    expect(logged()).toContain('"reason":"no_engine"');
  });

  it("التدقيق اسمٌ ونتيجةٌ وزمنٌ فقط للأداتين — لا الاستعلام ولا المخرجات", async () => {
    stubNoEngine();
    const info = logSpies[3];
    await (await post(postReq())).text();
    const calls = info.mock.calls as unknown[][];
    const tools = calls.filter((c) => c[0] === "[finn] tool").map((c) => c[1] as { tool: string });
    expect(tools.map((t) => t.tool)).toEqual(["platform_status", "knowledge_search"]);
    for (const entry of tools) {
      expect(Object.keys(entry).sort()).toEqual(["ms", "ok", "tool"]);
    }
    expect(JSON.stringify(tools)).not.toContain(USER_TEXT);
  });

  // ── ما يبقى كما هو ──

  it("غير المالك + لا محرّك ⇒ 404 المتطابق نفسه، قبل أي قراءة، وبلا ردّ محلّي", async () => {
    const reference = await post(postReq(undefined, { token: null }));
    const refShape = JSON.stringify([
      reference.status,
      [...reference.headers].sort(),
      await reference.text(),
    ]);
    sim.rateCalls = [];
    for (const make of [
      () => postReq(undefined, { token: null }),
      () => postReq(undefined, { token: jwtFor(OTHER) }),
      () => postReq(undefined, { token: "garbage" }),
    ]) {
      stubNoEngine();
      const res = await post(make());
      expect(JSON.stringify([res.status, [...res.headers].sort(), await res.text()])).toBe(
        refShape,
      );
    }
    // قائمة المالكين غير معرَّفة + لا محرّك ⇒ 404 أيضًا.
    vi.stubEnv("FINN_OWNER_USER_IDS", "");
    const res = await post(postReq());
    expect(res.status).toBe(404);
    await res.text();
    expect(spend()).toEqual({ rate: 0, quota: 0, models: 0 });
    expect(logged()).not.toContain("local reply");
    expect(logged()).not.toContain("platform_status");
  });

  it("رمزٌ يدّعي المالك ولا تتحقّق منه المصادقة + لا محرّك ⇒ 404 لا ردّ محلّي", async () => {
    stubNoEngine();
    sim.verifyUser = null;
    const res = await post(postReq());
    expect(res.status).toBe(404);
    expect(logged()).not.toContain("local reply");
  });

  it("مفتاح الإيقاف يغلب: مالك + لا محرّك + إيقاف ⇒ 503 ai_disabled لا ردّ محلّي", async () => {
    stubNoEngine();
    vi.stubEnv("SADEED_AI_DISABLED", "1");
    const res = await post(postReq());
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toBe("ai_disabled");
    expect(res.headers.get("x-finn-engine")).not.toBe("local");
    expect(spend()).toEqual({ rate: 0, quota: 0, models: 0 });
    expect(logged()).not.toContain("local reply");
  });

  it("جسمٌ غير صالح + لا محرّك ⇒ 400/413/415 كما كان، لا ردّ محلّي", async () => {
    stubNoEngine();
    const bad = await post(postReq(undefined, { raw: "{not json" }));
    expect(bad.status).toBe(400);
    const empty = await post(postReq({ messages: [] }));
    expect(empty.status).toBe(400);
    const lastAssistant = await post(postReq({ messages: [{ role: "assistant", content: "x" }] }));
    expect(lastAssistant.status).toBe(400);
    const wrongType = await post(
      new Request("http://local/api/finn/chat", {
        method: "POST",
        headers: { "content-type": "text/plain", authorization: `Bearer ${jwtFor(OWNER)}` },
        body: "x",
      }),
    );
    expect(wrongType.status).toBe(415);
    const big = await post(postReq(undefined, { headers: { "content-length": "999999" } }));
    expect(big.status).toBe(413);
    for (const r of [bad, empty, lastAssistant, wrongType, big]) {
      expect(r.headers.get("x-finn-engine")).toBe("none");
    }
    expect(spend()).toEqual({ rate: 0, quota: 0, models: 0 });
    expect(logged()).not.toContain("local reply");
  });

  it("المخزن غير متاح أو الحصّة مستنفدة + لا محرّك ⇒ لا يُستشار أيٌّ منهما (كان 503 no_engine قبلهما أيضًا)", async () => {
    stubNoEngine();
    sim.rate = { allowed: false, unavailable: true };
    sim.quota = new Response("{}", { status: 429 });
    const res = await post(postReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("x-finn-engine")).toBe("local");
    await res.text();
    expect(spend()).toEqual({ rate: 0, quota: 0, models: 0 });
  });

  it("وجود محرّك يُبقي كل الإغلاقات كما هي: المخزن ⇒ 503، الحصّة ⇒ 429، والنموذج يُنادى مرّة", async () => {
    // المخزن غير متاح مع محرّك مهيّأ.
    sim.rate = { allowed: false, unavailable: true };
    const store = await post(postReq());
    expect(store.status).toBe(503);
    expect(((await store.json()) as { error: string }).error).toBe("rate_limit_unavailable");
    expect(store.headers.get("x-finn-engine")).toBe("none");
    // الحصّة مستنفدة مع محرّك مهيّأ.
    sim.rate = { allowed: true };
    sim.quota = new Response(JSON.stringify({ error: "daily_identity_cap" }), { status: 429 });
    const quota = await post(postReq());
    expect(quota.status).toBe(429);
    expect(spend().models).toBe(0);
    // والسليم ينادي النموذج مرّة ويُنفق حدًّا وحصّة، لا ردّ محلّي.
    sim.quota = null;
    sim.rateCalls = [];
    sim.quotaCalls = [];
    const ok = await post(postReq());
    expect(ok.headers.get("x-finn-engine")).toBe("openai");
    await ok.text();
    expect(spend()).toEqual({ rate: 1, quota: 1, models: 1 });
  });

  it("محرّكٌ واحد يكفي: مفتاح Gemini وحده ⇒ لا ردّ محلّي بل الاحتياطي المعلَن", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const res = await post(postReq());
    expect(res.headers.get("x-finn-engine")).toBe("gemini");
    expect(res.headers.get("x-finn-fallback")).toBe("not_configured");
    await res.text();
  });
});

describe("④ شكل الطلب يُرفض قبل أن يُنفَق شيء", () => {
  it("ليس JSON ⇒ 415", async () => {
    const res = await post(
      new Request("http://local/api/finn/chat", {
        method: "POST",
        headers: { "content-type": "text/plain", authorization: `Bearer ${jwtFor(OWNER)}` },
        body: "x",
      }),
    );
    expect(res.status).toBe(415);
    expect(spend()).toEqual({ rate: 0, quota: 0, models: 0 });
  });

  it("content-length فوق الحدّ ⇒ 413", async () => {
    const res = await post(postReq(undefined, { headers: { "content-length": "999999" } }));
    expect(res.status).toBe(413);
    expect(spend()).toEqual({ rate: 0, quota: 0, models: 0 });
  });

  it("جسمٌ فعليّ فوق الحدّ (بلا content-length صادق) ⇒ 413", async () => {
    const huge = JSON.stringify({ messages: [{ role: "user", content: "ا".repeat(310_000) }] });
    const res = await post(postReq(undefined, { raw: huge }));
    expect(res.status).toBe(413);
    expect(spend()).toEqual({ rate: 0, quota: 0, models: 0 });
  });

  it.each([
    ["JSON معطوب", { raw: "{not json" }],
    ["رسالة system", { body: { messages: [{ role: "system", content: "x" }] } }],
    ["قائمة فارغة", { body: { messages: [] } }],
    ["آخر رسالة للمساعد", { body: { messages: [{ role: "assistant", content: "x" }] } }],
  ])("%s ⇒ 400 عربيّ", async (_n, spec) => {
    const res = await post(
      "raw" in spec ? postReq(undefined, { raw: spec.raw }) : postReq(spec.body),
    );
    expect([400, 413]).toContain(res.status);
    const body = (await res.json()) as { message_ar: string };
    expect(body.message_ar).toMatch(/[؀-ۿ]/);
    expect(spend()).toEqual({ rate: 0, quota: 0, models: 0 });
  });
});

describe("⑤ المسار السليم: يبثّ وينادي النموذج مرّة، ويُعلن المحرّك", () => {
  it("مالك سليم ⇒ 200 SSE، GPT يجيب، والترويسات صادقة", async () => {
    const res = await post(postReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.headers.get("x-finn-engine")).toBe("openai");
    expect(res.headers.has("x-finn-fallback")).toBe(false);
    const ev = await events(res);
    expect(
      ev
        .filter((e) => e.type === "delta")
        .map((e) => (e as { text: string }).text)
        .join(""),
    ).toBe("رد GPT");
    expect(ev.at(-1)).toEqual({ type: "done", truncated: false });
    expect(spend()).toEqual({ rate: 1, quota: 1, models: 1 });
    expect(sim.streamCalls.map((c) => c.tag)).toEqual(["openai"]);
  });

  it("البثّ تدريجيّ: يصل أكثر من حدث delta قبل done", async () => {
    sim.script.openai = () => parts([textPart("أ"), textPart("ب"), textPart("ج"), finishPart]);
    const ev = await events(await post(postReq()));
    expect(ev.filter((e) => e.type === "delta")).toHaveLength(3);
  });

  it("المحادثة تُمرَّر كاملة للمحرّك بدورها ونصّها (آخر رسالة للمستخدم)", async () => {
    await post(
      postReq({
        messages: [
          { role: "user", content: "س١" },
          { role: "assistant", content: "ج١" },
          { role: "user", content: "س٢" },
        ],
      }),
    );
    expect(sim.streamCalls[0].args.messages).toEqual([
      { role: "user", content: "س١" },
      { role: "assistant", content: "ج١" },
      { role: "user", content: "س٢" },
    ]);
  });
});

describe("⑥ السقوط معلَن في الترويسة، والجسم من المحرّك المعلَن وحده", () => {
  it("مفتاح GPT غائب ⇒ X-FINN-Engine: gemini وX-FINN-Fallback: not_configured، ونصّ الاحتياطي", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const res = await post(postReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("x-finn-engine")).toBe("gemini");
    expect(res.headers.get("x-finn-fallback")).toBe("not_configured");
    const ev = await events(res);
    expect(
      ev
        .filter((e) => e.type === "delta")
        .map((e) => (e as { text: string }).text)
        .join(""),
    ).toBe("رد احتياطي");
    expect(sim.streamCalls.map((c) => c.tag)).toEqual(["gemini-direct"]);
  });

  it("429 من GPT ⇒ gemini + rate_limited، وGPT جُرِّب أولًا", async () => {
    sim.script.openai = () => failWith(429);
    const res = await post(postReq());
    expect(res.headers.get("x-finn-engine")).toBe("gemini");
    expect(res.headers.get("x-finn-fallback")).toBe("rate_limited");
    expect(sim.streamCalls.map((c) => c.tag)).toEqual(["openai", "gemini-direct"]);
    expect((await events(res)).some((e) => e.type === "delta")).toBe(true);
    // حدٌّ وحصّةٌ مرّةً واحدة رغم محاولتين — الطلب واحد.
    expect(spend().rate).toBe(1);
    expect(spend().quota).toBe(1);
  });

  it.each([
    [500, "upstream_error"],
    [404, "model_unavailable"],
    [401, "auth_failed"],
  ])("HTTP %i من GPT ⇒ سقوط معلَن بالرمز %s", async (status, reason) => {
    sim.script.openai = () => failWith(status);
    const res = await post(postReq());
    expect(res.headers.get("x-finn-engine")).toBe("gemini");
    expect(res.headers.get("x-finn-fallback")).toBe(reason);
  });

  it("المحرّكان يفشلان ⇒ 502 engine_unavailable بالعربية، X-FINN-Engine: none", async () => {
    sim.script.openai = () => failWith(503);
    sim.script["gemini-direct"] = () => failWith(503);
    const res = await post(postReq());
    expect(res.status).toBe(502);
    expect(res.headers.get("x-finn-engine")).toBe("none");
    const body = (await res.json()) as { error: string; message_ar: string };
    expect(body.error).toBe("engine_unavailable");
    expect(body.message_ar).toMatch(/[؀-ۿ]/);
  });

  it("400 من GPT لا يُسقط ⇒ 502 ولا يُنفق على الاحتياطي", async () => {
    sim.script.openai = () => failWith(400);
    const res = await post(postReq());
    expect(res.status).toBe(502);
    expect(sim.streamCalls.map((c) => c.tag)).toEqual(["openai"]);
  });

  it("فشلٌ في منتصف البثّ: ترويسة GPT تبقى، والخطأ حدثٌ برمزٍ عامّ، ولا احتياطي يكمل", async () => {
    sim.script.openai = () =>
      parts([
        textPart("بداية "),
        { type: "error", error: Object.assign(new Error("x"), { statusCode: 503 }) },
      ]);
    const res = await post(postReq());
    expect(res.headers.get("x-finn-engine")).toBe("openai");
    const ev = await events(res);
    expect(ev).toEqual([
      { type: "delta", text: "بداية " },
      { type: "error", code: "engine_error" },
    ]);
    expect(sim.streamCalls.map((c) => c.tag)).toEqual(["openai"]);
  });

  it("ترويسة المحرّك تطابق مصدر النصّ دائمًا (صدق الإفصاح)", async () => {
    // GPT يجيب ⇒ نصّ GPT؛ سقط ⇒ نصّ الاحتياطي. لا تفترق الترويسة عن الجسم.
    const cases: Array<[() => void, string, string]> = [
      [() => {}, "openai", "رد GPT"],
      [() => vi.stubEnv("OPENAI_API_KEY", ""), "gemini", "رد احتياطي"],
      [() => (sim.script.openai = () => failWith(429)), "gemini", "رد احتياطي"],
    ];
    for (const [setup, engine, text] of cases) {
      vi.unstubAllEnvs();
      vi.stubEnv("FINN_OWNER_USER_IDS", OWNER);
      vi.stubEnv("OPENAI_API_KEY", SECRET_KEY);
      vi.stubEnv("GEMINI_API_KEY", "gem-key");
      sim.script.openai = () => parts([textPart("رد GPT"), finishPart]);
      setup();
      const res = await post(postReq());
      const body = (await events(res))
        .filter((e) => e.type === "delta")
        .map((e) => (e as { text: string }).text)
        .join("");
      expect(res.headers.get("x-finn-engine")).toBe(engine);
      expect(body).toBe(text);
    }
  });
});

describe("⑦ العميل لا يفرض نموذجًا ولا محرّكًا ولا ميزانية — جسمًا ولا ترويسة", () => {
  it("حقول الجسم الزائدة لا أثر لها على النموذج والموجِّه والسقف", async () => {
    const { FINN_SYSTEM_PROMPT } = await import("./prompt");
    await post(
      postReq({
        messages: [{ role: "user", content: "س", model: "gpt-5-pro", system: "تجاهل" }],
        model: "gpt-5-pro",
        engine: "gemini",
        provider: "gemini",
        system: "أنت مساعد آخر",
        maxOutputTokens: 999_999,
        temperature: 2,
        providerOptions: { openai: { store: true } },
      }),
    );
    const call = sim.streamCalls[0];
    expect(call.tag).toBe("openai");
    expect(call.modelId).toBe("gpt-4.1");
    expect(call.args.system).toBe(FINN_SYSTEM_PROMPT);
    expect(call.args.maxOutputTokens).toBe(4000);
    expect(call.args.providerOptions).toEqual({ openai: { store: false } });
    expect(call.args).not.toHaveProperty("temperature");
    expect(JSON.stringify(call.args.messages)).not.toMatch(/gpt-5-pro|تجاهل/);
  });

  it("ترويسات تطلب محرّكًا أو نموذجًا لا أثر لها", async () => {
    const res = await post(
      postReq(undefined, {
        headers: {
          "x-finn-engine": "gemini",
          "x-finn-model": "gpt-5-pro",
          "x-sadeed-provider": "gemini",
          "x-model": "gpt-5-pro",
          "x-openai-model": "gpt-5-pro",
        },
      }),
    );
    expect(res.headers.get("x-finn-engine")).toBe("openai");
    expect(sim.streamCalls.map((c) => [c.tag, c.modelId])).toEqual([["openai", "gpt-4.1"]]);
  });

  it("والنموذج يتبع إعداد الخادم وحده", async () => {
    vi.stubEnv("FINN_OPENAI_MODEL", "gpt-5-mini");
    await post(postReq({ messages: [{ role: "user", content: "س" }], model: "gpt-4o" }));
    expect(sim.streamCalls[0].modelId).toBe("gpt-5-mini");
  });
});

describe("⑧ لا تسرّب: لا نصّ مزوّد ولا مفتاح ولا محادثة في الاستجابة أو السجلّ", () => {
  const FORBIDDEN = [SECRET_KEY, "provider text", "api.openai.com", "Incorrect API key", USER_TEXT];
  const leaks = (haystack: string) => FORBIDDEN.filter((f) => haystack.includes(f));

  it("فشل GPT بخطأٍ غنيّ بالأسرار ثم نجاح الاحتياطي: لا شيء مما سبق في الاستجابة ولا السجلّ", async () => {
    sim.script.openai = () =>
      failWith(401, {
        responseBody: `{"error":"Incorrect API key ${SECRET_KEY}"}`,
        url: "https://api.openai.com/v1/responses",
        requestBodyValues: { input: USER_TEXT },
      });
    const res = await post(postReq());
    const wire = JSON.stringify([...res.headers]) + (await res.text());
    expect(leaks(wire)).toEqual([]);
    expect(leaks(logged())).toEqual([]);
    expect(logged()).toContain("auth_failed");
  });

  it("فشل الكلّ: جسم الخطأ عربيّ محايد بلا تسرّب", async () => {
    sim.script.openai = () => failWith(401, { responseBody: SECRET_KEY });
    sim.script["gemini-direct"] = () => failWith(503, { responseBody: SECRET_KEY });
    const res = await post(postReq());
    const wire = JSON.stringify([...res.headers]) + (await res.text());
    expect(leaks(wire)).toEqual([]);
    expect(leaks(logged())).toEqual([]);
  });

  it("الطلب السليم: نصّ المحادثة والرد لا يُسجَّلان", async () => {
    const res = await post(postReq());
    await res.text();
    expect(leaks(logged())).toEqual([]);
    expect(logged()).not.toContain("رد GPT");
  });

  it("المفتاح لا يظهر في أي ترويسة استجابة", async () => {
    const res = await post(postReq());
    await res.text();
    expect(JSON.stringify([...res.headers])).not.toContain(SECRET_KEY);
  });

  it("الكاشف نفسه يحمرّ على تسريبٍ مزروع (المادة ٣٠)", () => {
    expect(leaks(`x ${SECRET_KEY} y`)).toContain(SECRET_KEY);
    expect(leaks(`ERROR ${USER_TEXT}`)).toContain(USER_TEXT);
    expect(leaks(JSON.stringify({ engine: "openai", code: "auth_failed" }))).toEqual([]);
  });
});

describe("⑨ المصادقة والخصوصية", () => {
  it("لا تخزين: لا كتابة إلى قاعدة ولا ملف من المسار (لا سجلّ محادثات)", async () => {
    const { readFileSync } = await import("node:fs");
    for (const f of [
      "src/routes/api/finn/chat.ts",
      "src/lib/finn-agent/engine.server.ts",
      "src/lib/finn-agent/failover.ts",
      "src/lib/finn-agent/knowledge-search.server.ts",
      "src/lib/finn-agent/local-reply.server.ts",
    ]) {
      const code = readFileSync(f, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^[ \t]*\/\/.*$/gm, "");
      expect(code, f).not.toMatch(
        /supabaseAdmin|\.from\(|\.insert\(|\.upsert\(|writeFile|localStorage/,
      );
    }
  });

  it("مالكٌ واحد يتحقّق مرّةً واحدة لكل طلب", async () => {
    await post(postReq());
    expect(sim.verifyCalls).toBe(1);
  });
});

describe("⑩ web_research: لا تُبنى ولا تُنفَّذ إلا على مسار المالك (٢٠٢٦/١٠/٣٠)", () => {
  type Exec = (input: unknown, opts: unknown) => Promise<Record<string, unknown>>;
  const toolsOfFirstCall = () =>
    sim.streamCalls[0]!.args.tools as Record<string, { execute: Exec }>;

  it("كل صنوف غير المالك ⇒ 404 ولا مجموعة أدوات تُبنى ولا نداء إلى n8n", async () => {
    for (const make of [
      () => postReq(undefined, { token: null }),
      () => postReq(undefined, { token: "garbage" }),
      () => postReq(undefined, { token: jwtFor(OTHER) }),
    ]) {
      const res = await post(make());
      expect(res.status).toBe(404);
    }
    expect(sim.streamCalls).toHaveLength(0);
    expect(sim.n8nInputs).toHaveLength(0);
  });

  it("المالك: المجموعة تحمل web_research، وبناؤها لا ينادي n8n، وتنفيذها ينادي العميل مرّةً بالسطح fnn", async () => {
    const res = await post(postReq());
    await res.text();
    const tools = toolsOfFirstCall();
    expect(Object.keys(tools)).toContain("web_research");
    expect(sim.n8nInputs).toHaveLength(0);
    const out = await tools.web_research.execute(
      { query: "vite build cache", mode: "docs" },
      { toolCallId: "t1", messages: [] },
    );
    // غير مهيّأ في هذه المحاكاة ⇒ فشلٌ مغلق هادئ، لا استثناء ولا مصطلح مصادقة.
    expect(out).toMatchObject({ ok: false, reason: "not_configured" });
    expect(sim.n8nInputs).toHaveLength(1);
    expect(sim.n8nInputs[0]).toMatchObject({ surface: "fnn", mode: "docs" });
    expect(Object.keys(sim.n8nInputs[0]!).sort()).toEqual([
      "brief",
      "maxResults",
      "mode",
      "surface",
    ]);
  });

  it("مفتاح الإيقاف مرفوع ⇒ 503 قبل أي أداة، ولا نداء إلى n8n", async () => {
    vi.stubEnv("SADEED_AI_DISABLED", "1");
    const res = await post(postReq());
    expect(res.status).toBe(503);
    expect(sim.streamCalls).toHaveLength(0);
    expect(sim.n8nInputs).toHaveLength(0);
  });

  it("لا محرّك مهيّأ ⇒ الرد المحلّي بلا نموذج لا يُنادي n8n ولا يعرض الأداة", async () => {
    stubNoEngine();
    const res = await post(postReq());
    expect(res.status).toBe(200);
    expect(res.headers.get("x-finn-engine")).toBe("local");
    const names = (await events(res)).filter((e) => e.type === "tool").map((e) => e.name);
    expect(names).toEqual([
      "platform_status",
      "platform_status",
      "knowledge_search",
      "knowledge_search",
    ]);
    expect(sim.n8nInputs).toHaveLength(0);
  });
});
