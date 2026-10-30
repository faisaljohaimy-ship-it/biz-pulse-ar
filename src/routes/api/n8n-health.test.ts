// @vitest-environment node
/**
 * كتلتا n8n في نقطتَي الصحة الحقيقيتين: `n8n` في `/api/public/health` و`web_research` في
 * `/api/chat/health` (أمر المالك ٢٠٢٦/١٠/٣٠).
 *
 * ما يُثبَت: (١) الافتراضي مطفأ ولا شيء قائمًا يتغيّر إلا مفتاحٌ مضاف في آخر الجسم · (٢) لا قيمةَ ولا
 * سرّ ولا عنوان ولا مسار ولا اسم متغيّر في أي جسم أو ترويسة، ولو ضُبطت كل المتغيّرات على قيمٍ
 * حارسة · (٣) المعالج لا يرمي أبدًا ولو انهارت القراءة أو تعذّر تحميل الوحدة · (٤) المعالج لا ينادي
 * `fetch` ولو كان القاطع مفتوحًا · (٥) الكتلتان خارج `subsystems` فلا تغيّران الحالة الكلّية ولا الرمز.
 *
 * الحدود: لا n8n حقيقي ولا شبكة. حيث ظهرت أرقام زمن فهي من نقلٍ مزيَّف وساعةٍ مجمَّدة، لا قياس.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");

vi.mock("@supabase/supabase-js", () => {
  const chain: unknown = new Proxy(() => chain, {
    get(_t, prop) {
      if (prop === "then") return (resolve: (v: unknown) => unknown) => resolve({ error: null });
      return () => chain;
    },
    apply: () => chain,
  });
  return { createClient: () => ({ from: () => chain }) };
});
vi.mock("@/integrations/supabase/client.server", () => ({
  createSupabaseAdminClient: () => ({}),
  supabaseAdmin: {},
}));
vi.mock("@/lib/governance/rate-limit.server", () => ({
  enforceRateLimit: async () => ({ allowed: true }),
  rateLimitStorageState: () => ({
    state: "closed",
    consecutiveFailures: 0,
    openedAt: null,
    lastFailureAt: null,
    lastSuccessAt: null,
  }),
  gateDegradedMode: () => "closed",
}));

import { createStubN8n } from "@/lib/n8n/stub-transport.test-support";

const FROZEN_NOW = new Date("2026-10-30T12:00:00.000Z");

/** قيم حارسة تُبنى وقت التشغيل (لا مفتاحًا حرفيًّا في الملف). */
const SENTINEL = (() => {
  const host = "n8n-sentinel-host.example.com";
  return {
    host,
    base: `https://${host}`,
    sadeedSecret: "sentinel-sadeed-" + "a1b2c3d4".repeat(5),
    fnnSecret: "sentinel-fnn-" + "e5f6a7b8".repeat(5),
  };
})();

const N8N_ENV = [
  "SADEED_N8N_BASE_URL",
  "SADEED_N8N_SECRET",
  "FINN_N8N_SECRET",
  "SADEED_WEB_RESEARCH",
  "SADEED_WEB_DISABLED",
  "SADEED_AI_DISABLED",
] as const;

function setN8nEnv(env: Partial<Record<(typeof N8N_ENV)[number], string>>): void {
  for (const k of N8N_ENV) vi.stubEnv(k, env[k] ?? "");
}
const FULL_ENV = {
  SADEED_N8N_BASE_URL: SENTINEL.base,
  SADEED_N8N_SECRET: SENTINEL.sadeedSecret,
  FINN_N8N_SECRET: SENTINEL.fnnSecret,
  SADEED_WEB_RESEARCH: "all",
} as const;

/** كل ما يجب ألّا يظهر في أي جسم أو ترويسة. */
function leaks(text: string): string[] {
  const needles = [
    SENTINEL.host,
    SENTINEL.base,
    SENTINEL.sadeedSecret,
    SENTINEL.fnnSecret,
    SENTINEL.sadeedSecret.slice(0, 14),
    SENTINEL.fnnSecret.slice(0, 12),
    "webhook",
    "sadeed-research-v1",
    "fnn-research-v1",
    "fnn-runner-v1",
    ...N8N_ENV,
  ];
  return needles.filter((n) => text.includes(n));
}

type Handler = (args: { request: Request }) => Promise<Response>;
interface Routes {
  pub(): Promise<Page>;
  chat(): Promise<Page>;
}
interface Page {
  status: number;
  text: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

/** يحمّل المعالجين طازجَين (حالة العميل الافتراضي معزولة لكل اختبار). */
async function load(): Promise<Routes> {
  vi.resetModules();
  const pubMod = (await import("@/routes/api/public/health")) as unknown as {
    Route: { options: { server: { handlers: { GET: Handler } } } };
  };
  const chatMod = (await import("@/routes/api/chat.health")) as unknown as {
    Route: { options: { server: { handlers: { GET: () => Promise<Response> } } } };
  };
  const pack = async (res: Response): Promise<Page> => {
    const text = await res.text();
    return {
      status: res.status,
      text,
      headers: Object.fromEntries([...res.headers.entries()].sort()),
      body: JSON.parse(text) as Record<string, unknown>,
    };
  };
  return {
    pub: async () =>
      pack(
        await pubMod.Route.options.server.handlers.GET({
          request: new Request("http://local/api/public/health"),
        }),
      ),
    chat: async () => pack(await chatMod.Route.options.server.handlers.GET()),
  };
}

const fetchSpy = vi.fn(async () => {
  throw new Error("لا شبكة في اختبار الصحة");
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: FROZEN_NOW });
  vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
  setN8nEnv({});
  fetchSpy.mockClear();
  vi.stubGlobal("fetch", fetchSpy);
});
afterEach(() => {
  vi.doUnmock("@/lib/n8n/client.server");
  vi.doUnmock("@/lib/n8n/health.server");
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
afterAll(() => vi.unstubAllEnvs());

const PUBLIC_BEFORE_KEYS = ["status", "version", "build", "timestamp", "uptime_hint", "subsystems"];
const CHAT_BEFORE_KEYS = [
  "ok",
  "provider",
  "model",
  "key_present",
  "gate",
  "mode",
  "selected",
  "backup_enabled",
  "zero_cost_ready",
  "rag_embedding_model",
  "rag_ready",
  "retrieval",
  "voice_configured",
  "transcription_configured",
];

describe("الافتراضي مطفأ: لا شيء قائمًا يتغيّر", () => {
  it("بلا بيئة n8n: كتلتان باردتان، والرمز والترويسات كما كانت", async () => {
    const r = await load();
    const pub = await r.pub();
    const chat = await r.chat();
    expect(pub.status).toBe(200);
    expect(chat.status).toBe(200);
    expect(pub.headers).toEqual({
      "cache-control": "no-store",
      "content-type": "application/json",
    });
    expect(chat.headers).toEqual({
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
    });
    expect(pub.body.n8n).toEqual({ configured: false, mode: "off", breaker: "closed" });
    expect(chat.body.web_research).toEqual({
      mode: "off",
      kill_switch: false,
      configured: { sadeed: false, fnn: false },
      armed: false,
      breaker: { sadeed: "closed", fnn: "closed" },
      last_ok_at: null,
      p95_ms: null,
      samples: 0,
    });
  });

  it("المفاتيح القائمة باقية بترتيبها، والجديد مضافٌ في الآخر وحده", async () => {
    const r = await load();
    expect(Object.keys((await r.pub()).body)).toEqual([...PUBLIC_BEFORE_KEYS, "n8n"]);
    expect(Object.keys((await r.chat()).body)).toEqual([...CHAT_BEFORE_KEYS, "web_research"]);
  });

  it("الجسم بلا المفتاح الجديد لا يتأثر بأيّ متغيّر n8n: بايتًا بايتًا", async () => {
    const strip = (page: Page, key: string) => {
      const copy = { ...page.body };
      delete copy[key];
      return JSON.stringify(copy);
    };
    const off = await load();
    const offPub = strip(await off.pub(), "n8n");
    const offChat = strip(await off.chat(), "web_research");

    setN8nEnv({ ...FULL_ENV, SADEED_WEB_RESEARCH: "all" });
    const on = await load();
    expect(strip(await on.pub(), "n8n")).toBe(offPub);
    expect(strip(await on.chat(), "web_research")).toBe(offChat);

    setN8nEnv({ ...FULL_ENV, SADEED_WEB_DISABLED: "1" });
    const killed = await load();
    expect(strip(await killed.pub(), "n8n")).toBe(offPub);
    expect(strip(await killed.chat(), "web_research")).toBe(offChat);
  });

  it("الكتلتان خارج subsystems، والحالة الكلّية لا تتأثر بهما", async () => {
    setN8nEnv(FULL_ENV);
    const r = await load();
    const pub = await r.pub();
    const subsystems = pub.body.subsystems as Record<string, unknown>;
    expect(Object.keys(subsystems).sort()).toEqual(["db", "gemini", "rate_limit_storage", "web"]);
    expect(subsystems).not.toHaveProperty("n8n");
    expect(pub.body.status).toBe("ok");
    expect(pub.status).toBe(200);
  });
});

describe("الشكل: الحقول المعلنة وحدها", () => {
  it("العامّة ثلاثة، والتفصيلية ثمانية، والمتداخلة بمفتاحَي السطحين", async () => {
    setN8nEnv(FULL_ENV);
    const r = await load();
    const pub = (await r.pub()).body.n8n as Record<string, unknown>;
    const web = (await r.chat()).body.web_research as Record<string, unknown>;
    expect(Object.keys(pub).sort()).toEqual(["breaker", "configured", "mode"]);
    expect(Object.keys(web).sort()).toEqual([
      "armed",
      "breaker",
      "configured",
      "kill_switch",
      "last_ok_at",
      "mode",
      "p95_ms",
      "samples",
    ]);
    expect(Object.keys(web.configured as object).sort()).toEqual(["fnn", "sadeed"]);
    expect(Object.keys(web.breaker as object).sort()).toEqual(["fnn", "sadeed"]);
  });

  it("المهيّأ بالكامل: مهيّأ · all · armed · القاطعان مغلقان · لم يُقَس زمن", async () => {
    setN8nEnv(FULL_ENV);
    const r = await load();
    expect((await r.pub()).body.n8n).toEqual({ configured: true, mode: "all", breaker: "closed" });
    expect((await r.chat()).body.web_research).toEqual({
      mode: "all",
      kill_switch: false,
      configured: { sadeed: true, fnn: true },
      armed: true,
      breaker: { sadeed: "closed", fnn: "closed" },
      last_ok_at: null,
      p95_ms: null,
      samples: 0,
    });
  });
});

describe("لا قيمة ولا سرّ ولا عنوان في أي جسم أو ترويسة", () => {
  it.each([
    ["all", FULL_ENV],
    ["members", { ...FULL_ENV, SADEED_WEB_RESEARCH: "members" }],
    ["off", { ...FULL_ENV, SADEED_WEB_RESEARCH: "off" }],
    ["إيقاف كامل", { ...FULL_ENV, SADEED_WEB_DISABLED: "1" }],
    ["مفتاح الذكاء القائم", { ...FULL_ENV, SADEED_AI_DISABLED: "1" }],
  ] as const)("كل المتغيّرات على قيمٍ حارسة (%s) ⇒ صفر تسرّب", async (_label, env) => {
    setN8nEnv(env);
    const r = await load();
    const pub = await r.pub();
    const chat = await r.chat();
    for (const page of [pub, chat]) {
      expect(leaks(page.text), page.text).toEqual([]);
      expect(leaks(JSON.stringify(page.headers))).toEqual([]);
    }
  });

  it("سرٌّ مكرَّر وأصلٌ غير صالح وقيمة وضع غريبة: لا تسرّب كذلك", async () => {
    const dup = SENTINEL.sadeedSecret;
    setN8nEnv({
      SADEED_N8N_BASE_URL: "http://" + SENTINEL.host,
      SADEED_N8N_SECRET: dup,
      FINN_N8N_SECRET: dup,
      SADEED_WEB_RESEARCH: SENTINEL.fnnSecret,
    });
    const r = await load();
    const text = (await r.pub()).text + (await r.chat()).text;
    expect(leaks(text)).toEqual([]);
  });

  it("الفاحص نفسه يعضّ: نصٌّ فيه عنوان أو سرّ أو اسم متغيّر يُدان (المادة ٣٠)", () => {
    expect(leaks('{"n8n":{"configured":true}}')).toEqual([]);
    expect(leaks(`{"n8n":{"base":"${SENTINEL.base}"}}`)).toContain(SENTINEL.host);
    expect(leaks(`{"s":"${SENTINEL.fnnSecret}"}`)).toContain(SENTINEL.fnnSecret);
    expect(leaks('{"mode":"SADEED_WEB_RESEARCH"}')).toContain("SADEED_WEB_RESEARCH");
    expect(leaks('{"path":"/webhook/x"}')).toContain("webhook");
    expect(leaks('{"p":"fnn-runner-v1"}')).toContain("fnn-runner-v1");
  });
});

describe("مفاتيح التحكّم تظهر كما هي", () => {
  it.each([
    ["members", "members", true],
    ["all", "all", true],
    ["ALL", "all", true],
    ["off", "off", false],
    ["", "off", false],
    ["غير معروف", "off", false],
  ] as const)("SADEED_WEB_RESEARCH=%j ⇒ mode=%s · armed=%s", async (raw, mode, armed) => {
    setN8nEnv({ ...FULL_ENV, SADEED_WEB_RESEARCH: raw });
    const r = await load();
    expect((await r.pub()).body.n8n).toMatchObject({ mode });
    expect((await r.chat()).body.web_research).toMatchObject({ mode, armed });
  });

  it.each([
    ["SADEED_WEB_DISABLED", "1"],
    ["SADEED_WEB_DISABLED", "true"],
    ["SADEED_WEB_DISABLED", "on"],
    ["SADEED_AI_DISABLED", "1"],
  ] as const)("%s=%s ⇒ kill_switch · غير armed · والتهيئة كما هي", async (name, value) => {
    setN8nEnv({ ...FULL_ENV, [name]: value });
    const r = await load();
    expect((await r.chat()).body.web_research).toMatchObject({
      kill_switch: true,
      armed: false,
      mode: "all",
      configured: { sadeed: true, fnn: true },
    });
    expect((await r.pub()).body.n8n).toMatchObject({ configured: true, mode: "all" });
  });

  it("إيقاف غير مرفوع (0 · false) لا يُحسب مرفوعًا", async () => {
    setN8nEnv({ ...FULL_ENV, SADEED_WEB_DISABLED: "0", SADEED_AI_DISABLED: "false" });
    const r = await load();
    expect((await r.chat()).body.web_research).toMatchObject({ kill_switch: false, armed: true });
  });

  it("سرّان متطابقان ⇒ لا تهيئة لأيٍّ من السطحين، وarmed false", async () => {
    setN8nEnv({ ...FULL_ENV, FINN_N8N_SECRET: SENTINEL.sadeedSecret });
    const r = await load();
    expect((await r.chat()).body.web_research).toMatchObject({
      configured: { sadeed: false, fnn: false },
      armed: false,
    });
    expect((await r.pub()).body.n8n).toMatchObject({ configured: false });
  });

  it("FNN وحده مهيّأ ⇒ العامّة true، وسَدِيد غير armed", async () => {
    setN8nEnv({
      SADEED_N8N_BASE_URL: SENTINEL.base,
      FINN_N8N_SECRET: SENTINEL.fnnSecret,
      SADEED_WEB_RESEARCH: "all",
    });
    const r = await load();
    expect((await r.pub()).body.n8n).toMatchObject({ configured: true });
    expect((await r.chat()).body.web_research).toMatchObject({
      configured: { sadeed: false, fnn: true },
      armed: false,
    });
  });

  it("الأصل بلا سرّ ⇒ غير مهيّأ", async () => {
    setN8nEnv({ SADEED_N8N_BASE_URL: SENTINEL.base, SADEED_WEB_RESEARCH: "all" });
    const r = await load();
    expect((await r.pub()).body.n8n).toMatchObject({ configured: false });
  });
});

describe("المعالج لا يرمي أبدًا", () => {
  it("قراءة الحالة تنهار ⇒ 200 والكتلتان null، وبقية الجسم سليمة، ولا نصّ خطأ", async () => {
    const reference = await load();
    const refPub = (await reference.pub()).body;
    const refChat = (await reference.chat()).body;

    vi.doMock("@/lib/n8n/client.server", () => ({
      n8nStatus: () => {
        throw new Error("boom " + SENTINEL.host);
      },
    }));
    const r = await load();
    const pub = await r.pub();
    const chat = await r.chat();
    expect(pub.status).toBe(200);
    expect(chat.status).toBe(200);
    expect(pub.body.n8n).toBeNull();
    expect(chat.body.web_research).toBeNull();
    expect(leaks(pub.text + chat.text)).toEqual([]);
    expect(pub.text).not.toContain("boom");
    const { n8n: _a, ...pubRest } = pub.body;
    const { n8n: _b, ...refPubRest } = refPub;
    expect(pubRest).toEqual(refPubRest);
    const { web_research: _c, ...chatRest } = chat.body;
    const { web_research: _d, ...refChatRest } = refChat;
    expect(chatRest).toEqual(refChatRest);
  });

  it("تعذّر تحميل وحدة الصحة نفسها ⇒ 200 والكتلتان null", async () => {
    vi.doMock("@/lib/n8n/health.server", () => {
      throw new Error("module load failed " + SENTINEL.host);
    });
    const r = await load();
    const pub = await r.pub();
    const chat = await r.chat();
    expect(pub.status).toBe(200);
    expect(chat.status).toBe(200);
    expect(pub.body.n8n).toBeNull();
    expect(chat.body.web_research).toBeNull();
    expect(chat.body.ok).toBe(true);
    expect(pub.text).not.toContain("module load failed");
  });

  it("لقطةٌ خارج المدى ⇒ null لا قيمة مختلَقة", async () => {
    vi.doMock("@/lib/n8n/client.server", () => ({
      n8nStatus: (surface: string) => ({
        surface,
        configured: true,
        disabled: false,
        mode: surface === "sadeed" ? "always" : null,
        breaker: "closed",
        last_ok_at: null,
        p95_ms: null,
        samples: 0,
      }),
    }));
    const r = await load();
    expect((await r.pub()).body.n8n).toBeNull();
    expect((await r.chat()).body.web_research).toBeNull();
  });
});

describe("المعالج لا ينادي fetch أبدًا", () => {
  it("الافتراضي والمهيّأ والموقوف: صفر نداء شبكة من المعالجين", async () => {
    for (const env of [{}, FULL_ENV, { ...FULL_ENV, SADEED_WEB_DISABLED: "1" }]) {
      setN8nEnv(env);
      const r = await load();
      await r.pub();
      await r.chat();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("الكاشف يعضّ: معالجٌ مزروع ينادي fetch يُرى بالمراقب نفسه", async () => {
    await (globalThis.fetch as typeof fetch)("https://example.invalid").catch(() => undefined);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("نقلٌ مزيَّف وساعةٌ مجمَّدة (ليس n8n حقيقيًّا ولا قياس كمون)", () => {
  const brief = (n: number) => ({ terms: [`term${n}`], codes: [], lang: "en" as const });

  it("قاطعٌ مفتوح بعد خمسة إخفاقات حقيقية في العميل ⇒ تراه الكتلتان، بلا نداء من المعالج، والتطبيق سليم", async () => {
    setN8nEnv(FULL_ENV);
    fetchSpy.mockImplementation(async () => {
      throw new TypeError("fetch failed");
    });
    const r = await load();
    const { researchViaN8n } = await import("@/lib/n8n/client.server");
    for (let i = 1; i <= 5; i++) {
      const out = await researchViaN8n({
        surface: "sadeed",
        mode: "general",
        brief: brief(i),
        audience: "anonymous",
      });
      expect(out).toMatchObject({ served: false });
    }
    expect(fetchSpy).toHaveBeenCalledTimes(5);
    fetchSpy.mockClear();

    const pub = await r.pub();
    const chat = await r.chat();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(pub.body.n8n).toEqual({ configured: true, mode: "all", breaker: "open" });
    expect(chat.body.web_research).toMatchObject({
      breaker: { sadeed: "open", fnn: "closed" },
      // armed يقيس المفاتيح لا صحّة القناة: القاطع المفتوح يعلن نفسه في حقله.
      armed: true,
      last_ok_at: null,
      p95_ms: null,
      samples: 0,
    });
    // n8n اختياري: قاطعه المفتوح لا يُنزل التطبيق ولا الدردشة.
    expect(pub.status).toBe(200);
    expect(pub.body.status).toBe("ok");
    expect(chat.body.gate).toBe("verified");
    expect(chat.body.ok).toBe(true);
  });

  it("نجاحٌ واحد من نقلٍ مزيَّف ⇒ last_ok_at وsamples يظهران، وp95_ms رقمٌ من ساعة مجمَّدة (ليس قياسًا)", async () => {
    setN8nEnv(FULL_ENV);
    const stub = createStubN8n({
      secrets: { sadeed: SENTINEL.sadeedSecret, fnn: SENTINEL.fnnSecret },
      now: () => Date.now(),
      plan: { kind: "research" },
    });
    fetchSpy.mockImplementation(stub.fetch as never);
    const r = await load();
    const { researchViaN8n } = await import("@/lib/n8n/client.server");
    const out = await researchViaN8n({
      surface: "sadeed",
      mode: "general",
      brief: brief(1),
      audience: "anonymous",
    });
    expect(out).toMatchObject({ served: true });
    fetchSpy.mockClear();

    const chat = await r.chat();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(chat.body.web_research).toMatchObject({
      last_ok_at: FROZEN_NOW.toISOString(),
      samples: 1,
      breaker: { sadeed: "closed", fnn: "closed" },
    });
    expect(typeof (chat.body.web_research as { p95_ms: unknown }).p95_ms).toBe("number");
    expect(leaks(chat.text)).toEqual([]);
  });
});
