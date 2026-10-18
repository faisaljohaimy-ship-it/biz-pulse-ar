// @vitest-environment node
/**
 * `/api/chat/health` — جاهزية المحرّك **المختار** (القاعدة ٤)، والحقول القديمة باقية
 * بأسمائها لفحص الإنتاج (`scripts/smoke-production.mjs`: `ok` و`key_present` و`provider`).
 * لا قيمة مفتاحٍ في الجسم أبدًا.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

type Handler = () => Promise<Response>;
async function health(env: Record<string, string>) {
  for (const k of [
    "GEMINI_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "OPENAI_API_KEY",
    "LOVABLE_API_KEY",
    "SADEED_LLM_PROVIDER",
    "SADEED_OPENAI_ENABLED",
    "SADEED_OPENAI_MODEL",
    "SADEED_BACKUP_PROVIDER",
  ])
    vi.stubEnv(k, env[k] ?? "");
  const mod = (await import("@/routes/api/chat.health")) as unknown as {
    Route: { options: { server: { handlers: { GET: Handler } } } };
  };
  const res = await mod.Route.options.server.handlers.GET();
  return { res, body: (await res.json()) as Record<string, unknown> };
}

afterEach(() => vi.unstubAllEnvs());

describe("/api/chat/health", () => {
  it("Gemini مهيّأ ⇐ الحقول القديمة كما كانت، ومعها الوضع والاحتياطي", async () => {
    const key = "gemini-key-not-a-secret-000";
    const { res, body } = await health({ GEMINI_API_KEY: key });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      provider: "google-gemini",
      model: "gemini-3.6-flash",
      key_present: true,
      mode: "llm",
      selected: "gemini",
      backup_enabled: false,
      zero_cost_ready: true,
      transcription_configured: true,
    });
    expect(JSON.stringify(body)).not.toContain(key);
  });

  it("بلا مفتاح ⇐ الوضع الحتمي، والجاهزية الحتمية صادقة", async () => {
    const { body } = await health({});
    expect(body).toMatchObject({
      ok: true,
      provider: null,
      key_present: false,
      mode: "zero_cost",
      zero_cost_ready: true,
    });
  });

  it("مفتاح المحوّل وحده لا يجعل الذكاء جاهزًا؛ والإذنان معًا يجعلانه", async () => {
    const key = "openai-key-not-a-secret-0000";
    expect((await health({ OPENAI_API_KEY: key })).body).toMatchObject({
      key_present: false,
      mode: "zero_cost",
    });
    const { body } = await health({
      OPENAI_API_KEY: key,
      SADEED_LLM_PROVIDER: "openai",
      SADEED_OPENAI_ENABLED: "true",
    });
    expect(body).toMatchObject({
      key_present: true,
      provider: "openai",
      model: "gpt-5-mini",
      mode: "llm",
      // النسخ الصوتي على Gemini وحده — لا يتبع محرّك الدردشة.
      transcription_configured: false,
    });
    expect(JSON.stringify(body)).not.toContain(key);
  });

  it("الاحتياطي يُبلَّغ حين يطلبه المالك بالاسم فقط", async () => {
    const base = { GEMINI_API_KEY: "gemini-key-not-a-secret-000", LOVABLE_API_KEY: "lovable-k" };
    expect((await health(base)).body.backup_enabled).toBe(false);
    expect((await health({ ...base, SADEED_BACKUP_PROVIDER: "lovable" })).body.backup_enabled).toBe(
      true,
    );
  });
});
