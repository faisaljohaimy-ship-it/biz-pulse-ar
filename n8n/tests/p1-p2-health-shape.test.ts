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
