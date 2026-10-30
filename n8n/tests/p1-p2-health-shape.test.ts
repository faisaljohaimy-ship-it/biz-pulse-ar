// @vitest-environment node
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * المراقب (watchdog-canary) أمام التطبيق الحقيقي: مساره يقرأ `/api/public/health` و`/api/chat/health`
 * ويحكم على حقولٍ بعينها (`status` · `subsystems.*.status` · `ok` · `gate` · `key_present`). هنا يشغَّل
 * مسار المراقب بالمحرّك المصغّر وهو يقرأ **ردود معالجَي المسارين الحقيقيين** في التطبيق (لا fixtures
 * مكتوبة يدويًّا)، فإن غيّر التطبيق اسم حقلٍ أو معناه حمرّ الفحص قبل أن يرسل المراقب تنبيهًا كاذبًا.
 *
 * الحدود: معالجا المسارين يعملان بقاعدةٍ وحدّ معدّلٍ مزروعين (كاختباراتهما القائمة)؛ والمراقب يعمل على
 * المحرّك المصغّر لا على n8n. السلوك على الإنتاج وعلى n8n الحقيقي: لم يُقَس.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");

const db = vi.hoisted(() => ({ hang: false }));
vi.mock("@supabase/supabase-js", () => {
  const chain: unknown = new Proxy(() => chain, {
    get(_t, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => unknown) => {
          if (!db.hang) resolve({ error: null });
        };
      }
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

const gate = vi.hoisted(() => ({
  unavailable: false,
  state: "closed" as "closed" | "open" | "half-open",
  mode: "closed" as "closed" | "bounded",
}));
vi.mock("@/lib/governance/rate-limit.server", () => ({
  enforceRateLimit: async () =>
    gate.unavailable ? { allowed: false, unavailable: true } : { allowed: true },
  rateLimitStorageState: () => ({
    state: gate.state,
    consecutiveFailures: gate.unavailable ? 2 : 0,
    openedAt: null,
    lastFailureAt: null,
    lastSuccessAt: null,
  }),
  gateDegradedMode: () => gate.mode,
}));

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runWorkflow } from "../test-support/mini-engine.js";
import { makeTransport } from "../test-support/fixtures.js";
import { ALL_CREDENTIALS, ENV, NOW, ROOT, loadCode } from "./helpers.js";

const CANARY = loadCode("canary-evaluate");

const watchdog = JSON.parse(
  readFileSync(join(ROOT, "n8n", "workflows", "watchdog-canary.json"), "utf8"),
);
const fixtures = makeTransport({}, { calls: [] });

const PLAN_ENV = [
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "OPENAI_API_KEY",
  "LOVABLE_API_KEY",
  "SADEED_LLM_PROVIDER",
  "SADEED_OPENAI_ENABLED",
  "SADEED_OPENAI_MODEL",
  "SADEED_BACKUP_PROVIDER",
];

beforeAll(() => vi.useFakeTimers({ toFake: ["Date"] }));
afterAll(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
beforeEach(() => {
  gate.unavailable = false;
  gate.state = "closed";
  gate.mode = "closed";
  db.hang = false;
  for (const k of PLAN_ENV) vi.stubEnv(k, "");
  vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
});
afterEach(() => {
  // فحص المخزن يُحفظ 15 ث في المعزول؛ كل حالةٍ بعد دقيقةٍ من سابقتها فلا ترث نتيجتها.
  vi.setSystemTime(Date.now() + 60_000);
});

/** ردّ معالج المسار الحقيقي في التطبيق بشكل ما يسلّمه n8n لنقل المحرّك. */
async function appRoute(pathname: string): Promise<{ status: number; body: string }> {
  if (pathname === "/api/public/health") {
    const mod = (await import("@/routes/api/public/health")) as any;
    const res: Response = await mod.Route.options.server.handlers.GET({
      request: new Request("http://local/api/public/health"),
    });
    return { status: res.status, body: await res.text() };
  }
  const mod = (await import("@/routes/api/chat.health")) as any;
  const res: Response = await mod.Route.options.server.handlers.GET();
  return { status: res.status, body: await res.text() };
}

const transport = async (req: any) => {
  const { pathname } = new URL(req.url);
  if (pathname === "/api/public/health" || pathname === "/api/chat/health") {
    const r = await appRoute(pathname);
    return { status: r.status, body: r.body, latencyMs: 40 };
  }
  return fixtures(req);
};

/** دقيقة مراقبة واحدة؛ الحالة المشتركة (static data) تمرّ بين الدقائق. */
async function minute(staticData: object, minuteIndex: number) {
  const result = await runWorkflow(watchdog, {
    trigger: { type: "schedule" },
    env: ENV,
    credentials: ALL_CREDENTIALS,
    transport,
    notifier: async () => ({ ok: true, result: { message_id: minuteIndex } }),
    staticData,
    nowMs: NOW + minuteIndex * 60_000,
  });
  // أحكام الفحوص الثلاثة: الدالّة نفسها التي تشغّلها عقدة Evaluate، على نواتج عقد HTTP كما وصلتها.
  const out = result.outputs as any;
  const evaluation = CANARY.canaryEvaluate({
    health: {
      app: out["App Health"][0].json,
      chat: out["Chat Health"][0].json,
      provider: out["Provider Canary"][0].json,
    },
    now: NOW + minuteIndex * 60_000,
  });
  const alerts = result.notifications.map((n: any) =>
    String(n.params.text ?? n.params.message ?? ""),
  );
  return { result, evaluation, alerts };
}

const checkOf = (evaluation: any, name: string) =>
  evaluation.checks.find((c: any) => c.name === name);

describe("المراقب يقرأ التطبيق الحقيقي: الحقول والمعاني", () => {
  it("تطبيق سليم ⇒ الفحوص الثلاثة سليمة ولا تنبيه", async () => {
    const sd = {};
    const m = await minute(sd, 0);
    expect(m.result.violations).toEqual([]);
    expect(m.result.failedNodes).toEqual([]);
    expect(m.evaluation.observed).toBe("ok");
    expect(m.evaluation.checks.map((c: any) => `${c.name}:${c.status}`)).toEqual([
      "app:ok",
      "chat:ok",
      "provider:ok",
    ]);
    expect(m.alerts).toEqual([]);
  });

  it("مخزن حدّ المعدّل ساقط ⇒ المراقب يقرأ 503 وgate=closed: التطبيق متوقف والدردشة متدهورة باسمهما", async () => {
    gate.unavailable = true;
    gate.state = "open";
    const m = await minute({}, 0);
    expect(checkOf(m.evaluation, "app")).toMatchObject({ status: "down" });
    expect(checkOf(m.evaluation, "app").detail).toContain("rate_limit_storage");
    expect(checkOf(m.evaluation, "chat")).toMatchObject({
      status: "degraded",
      detail: "gate_closed",
    });
    expect(m.evaluation.observed).toBe("down");
  });

  it("حدود الذاكرة بإقرار المالك ⇒ gate=degraded ⇒ الدردشة متدهورة (gate_degraded)", async () => {
    gate.unavailable = true;
    gate.state = "open";
    gate.mode = "bounded";
    const m = await minute({}, 0);
    expect(checkOf(m.evaluation, "chat")).toMatchObject({
      status: "degraded",
      detail: "gate_degraded",
    });
  });

  it("بلا مفتاح ذكاء ⇒ key_present=false ⇒ degraded (no_key) والتطبيق سليم", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const m = await minute({}, 0);
    expect(checkOf(m.evaluation, "chat")).toMatchObject({ status: "degraded", detail: "no_key" });
    expect(checkOf(m.evaluation, "app").status).toBe("ok");
  });

  it("تنبيه بعد رصدين متتاليين وتعافٍ بعد رصدين، بنصٍّ لا يسرّب سرًّا", async () => {
    const sd = {};
    expect((await minute(sd, 0)).alerts).toEqual([]);
    gate.unavailable = true;
    gate.state = "open";
    const first = await minute(sd, 1);
    expect(first.alerts).toEqual([]);
    const second = await minute(sd, 2);
    expect(second.alerts.join("\n")).toContain("تنبيه: حالة سَدِيد الآن متوقفة");
    gate.unavailable = false;
    gate.state = "closed";
    expect((await minute(sd, 3)).alerts).toEqual([]);
    const recovered = await minute(sd, 4);
    expect(recovered.alerts.join("\n")).toContain("تعافى سَدِيد");
    for (const text of [...first.alerts, ...second.alerts, ...recovered.alerts]) {
      expect(text).not.toContain(ENV.SADEED_N8N_SECRET ?? "never");
    }
  });
});

describe("انتهاكات مزروعة: لو غيّر التطبيق شكل ردّه لحمرّ الفحص أعلاه", () => {
  const asHttp = (body: unknown, statusCode = 200) => ({
    statusCode,
    headers: {},
    data: JSON.stringify(body),
  });

  it("إعادة تسمية gate في /api/chat/health تجعل المراقب يرى الدردشة سليمة والبوّابة مغلقة (فيُكشف بالاختبار لا بالإنتاج)", async () => {
    gate.unavailable = true;
    gate.state = "open";
    const real = JSON.parse((await appRoute("/api/chat/health")).body);
    expect(real.gate).toBe("closed");
    const renamed = { ...real, state: real.gate };
    delete renamed.gate;
    const health = { app: asHttp({ status: "ok" }), provider: asHttp({}) };
    const asReal = CANARY.canaryEvaluate({ health: { ...health, chat: asHttp(real) }, now: NOW });
    const asRenamed = CANARY.canaryEvaluate({
      health: { ...health, chat: asHttp(renamed) },
      now: NOW,
    });
    expect(checkOf(asReal, "chat")).toMatchObject({ status: "degraded", detail: "gate_closed" });
    expect(checkOf(asRenamed, "chat").status).toBe("ok");
  });

  it("إعادة تسمية status في /api/public/health تجعل المراقب يرى التطبيق متوقفًا وهو سليم", async () => {
    const real = JSON.parse((await appRoute("/api/public/health")).body);
    const renamed = { ...real, state: real.status };
    delete renamed.status;
    const ok = (body: unknown) =>
      checkOf(
        CANARY.canaryEvaluate({
          health: {
            app: asHttp(body),
            chat: asHttp({ ok: true, gate: "verified", key_present: true }),
            provider: asHttp({}),
          },
          now: NOW,
        }),
        "app",
      ).status;
    expect(ok(real)).toBe("ok");
    expect(ok(renamed)).toBe("down");
  });
});

// ── كتلتا n8n (`n8n` و`web_research`): المراقب يقرأ التطبيق الحقيقي وهما فيه ولا يتأثر بهما ──────────
//
// المراقب يحكم على `status` و`subsystems.*.status` و`ok` و`gate` و`key_present` فقط. الكتلتان حقلان
// إضافيان في المعالجين الحقيقيين، ويجب أن يبقيا بلا أثر على حكمه مهما كانت قيمتهما: n8n اختياري، وغيابه
// أو قاطعه المفتوح أو مفتاح إيقافه لا يُنذر ولا يُنزل التطبيق. لا n8n حقيقي هنا ولا شبكة.

const N8N_ENV_NAMES = [
  "SADEED_N8N_BASE_URL",
  "SADEED_N8N_SECRET",
  "FINN_N8N_SECRET",
  "SADEED_WEB_RESEARCH",
  "SADEED_WEB_DISABLED",
];
/** سرّان حارسان يُبنيان وقت التشغيل (لا مفتاحًا حرفيًّا). */
const SENTINEL_SECRETS = {
  sadeed: "canary-shape-sadeed-" + "0f1e2d3c".repeat(5),
  fnn: "canary-shape-fnn-" + "4b5a6978".repeat(5),
};

function withN8nEnv(env: Record<string, string>) {
  for (const k of N8N_ENV_NAMES) vi.stubEnv(k, env[k] ?? "");
}

/** الأحكام الثلاثة كما تقرؤها شيفرة المراقب من جسمَي المعالجين (والمزوّد ثابت سليم). */
function verdictOf(appBody: unknown, chatBody: unknown) {
  const http = (body: unknown) => ({ statusCode: 200, headers: {}, data: JSON.stringify(body) });
  return CANARY.canaryEvaluate({
    health: { app: http(appBody), chat: http(chatBody), provider: http({}) },
    now: NOW,
  });
}

describe("كتلتا n8n في المعالجين الحقيقيين: المراقب لا يتأثر بهما", () => {
  afterEach(() => withN8nEnv({}));

  it("الحقول التي يقرؤها المراقب ما زالت تُنتَج بأنواعها (لو غابت لحمرّ هذا)", async () => {
    const app = JSON.parse((await appRoute("/api/public/health")).body);
    const chat = JSON.parse((await appRoute("/api/chat/health")).body);
    expect(["ok", "degraded", "down"]).toContain(app.status);
    expect(typeof app.subsystems).toBe("object");
    for (const s of Object.values(app.subsystems) as any[]) {
      expect(["ok", "unknown", "degraded", "down"]).toContain(s.status);
    }
    expect(chat.ok).toBe(true);
    expect(["verified", "degraded", "closed"]).toContain(chat.gate);
    expect(typeof chat.key_present).toBe("boolean");
  });

  it("الكتلتان حاضرتان في الردّين الحقيقيين بالشكل المعلن، وخارج subsystems", async () => {
    const app = JSON.parse((await appRoute("/api/public/health")).body);
    const chat = JSON.parse((await appRoute("/api/chat/health")).body);
    expect(Object.keys(app.n8n).sort()).toEqual(["breaker", "configured", "mode"]);
    expect(Object.keys(chat.web_research).sort()).toEqual([
      "armed",
      "breaker",
      "configured",
      "kill_switch",
      "last_ok_at",
      "mode",
      "p95_ms",
      "samples",
    ]);
    expect(app.subsystems).not.toHaveProperty("n8n");
  });

  it("حكم المراقب مع الكتلتين = حكمه بدونهما، مطفأً أو مهيّأً بالكامل أو موقوفًا", async () => {
    const cases: Record<string, Record<string, string>>[] = [
      { env: {} },
      {
        env: {
          SADEED_N8N_BASE_URL: "https://n8n-canary-shape.example.com",
          SADEED_N8N_SECRET: SENTINEL_SECRETS.sadeed,
          FINN_N8N_SECRET: SENTINEL_SECRETS.fnn,
          SADEED_WEB_RESEARCH: "all",
        },
      },
      {
        env: {
          SADEED_N8N_BASE_URL: "https://n8n-canary-shape.example.com",
          SADEED_N8N_SECRET: SENTINEL_SECRETS.sadeed,
          FINN_N8N_SECRET: SENTINEL_SECRETS.fnn,
          SADEED_WEB_RESEARCH: "members",
          SADEED_WEB_DISABLED: "1",
        },
      },
    ];
    for (const { env } of cases) {
      withN8nEnv(env);
      const app = JSON.parse((await appRoute("/api/public/health")).body);
      const chat = JSON.parse((await appRoute("/api/chat/health")).body);
      const bareApp = { ...app };
      const bareChat = { ...chat };
      delete bareApp.n8n;
      delete bareChat.web_research;
      expect(verdictOf(app, chat)).toEqual(verdictOf(bareApp, bareChat));
      expect(verdictOf(app, chat).observed).toBe("ok");
    }
  });

  it("أسوأ قيمٍ ممكنة للكتلتين (قاطع مفتوح · إيقاف · غير مقروء null) لا تغيّر الحكم", async () => {
    const app = JSON.parse((await appRoute("/api/public/health")).body);
    const chat = JSON.parse((await appRoute("/api/chat/health")).body);
    const base = verdictOf(app, chat);
    const worstApp = { ...app, n8n: { configured: true, mode: "all", breaker: "open" } };
    const worstChat = {
      ...chat,
      web_research: {
        mode: "all",
        kill_switch: true,
        configured: { sadeed: true, fnn: true },
        armed: false,
        breaker: { sadeed: "open", fnn: "open" },
        last_ok_at: null,
        p95_ms: null,
        samples: 0,
      },
    };
    expect(verdictOf(worstApp, worstChat)).toEqual(base);
    expect(verdictOf({ ...app, n8n: null }, { ...chat, web_research: null })).toEqual(base);
  });

  it("مزروع: لو دخلت كتلة n8n في subsystems بحالة down لرآها المراقب تنزل التطبيق (فالاختبار يعضّ)", async () => {
    const app = JSON.parse((await appRoute("/api/public/health")).body);
    const chat = JSON.parse((await appRoute("/api/chat/health")).body);
    const planted = {
      ...app,
      status: "down",
      subsystems: { ...app.subsystems, n8n: { status: "down" } },
    };
    const v = verdictOf(planted, chat);
    expect(checkOf(v, "app")).toMatchObject({ status: "down" });
    expect(checkOf(v, "app").detail).toContain("n8n");
    expect(v.observed).toBe("down");
  });

  it("مزروع: إسقاط الكتلة من الجسم لا يغيّر الحكم، لكن إسقاط gate يغيّره (فالتمييز حقيقي)", async () => {
    const chat = JSON.parse((await appRoute("/api/chat/health")).body);
    const app = JSON.parse((await appRoute("/api/public/health")).body);
    const noBlock = { ...chat };
    delete noBlock.web_research;
    expect(verdictOf(app, noBlock)).toEqual(verdictOf(app, chat));
    gate.unavailable = true;
    gate.state = "open";
    // فحص المخزن يُحفظ 15 ث في المعزول: دقيقةٌ تفصل القراءتين.
    vi.setSystemTime(Date.now() + 60_000);
    const closed = JSON.parse((await appRoute("/api/chat/health")).body);
    expect(closed.gate).toBe("closed");
    expect(checkOf(verdictOf(app, closed), "chat")).toMatchObject({
      status: "degraded",
      detail: "gate_closed",
    });
  });
});
