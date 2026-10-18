/**
 * `/api/chat/health` يقول حال البوّابة لا المفتاح وحده (DEF-11، ٢٠٢٦/١٠/١٨) — فالشارة لا تقول
 * «متصل الآن» وكل سؤالٍ يحتاج النموذج يأخذ السطر المغلق. محكمٌ بلا خرج شبكي: الفحص وحده مزروع.
 */
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");

const probe = vi.hoisted(() => ({
  result: { allowed: true, unavailable: false } as { allowed: boolean; unavailable?: boolean },
  options: [] as unknown[],
}));

vi.mock("@/integrations/supabase/client.server", () => ({
  createSupabaseAdminClient: () => ({}),
  supabaseAdmin: {},
}));
vi.mock("@/lib/governance/rate-limit.server", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  enforceRateLimit: async (_k: string, _m: number, _w: number, options?: unknown) => {
    probe.options.push(options);
    return probe.result;
  },
}));

afterEach(() => {
  probe.result = { allowed: true, unavailable: false };
  probe.options = [];
  vi.unstubAllEnvs();
  vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
});
afterAll(() => vi.unstubAllEnvs());

async function health(): Promise<{ key_present?: boolean; gate?: string }> {
  const mod = (await import("@/routes/api/chat.health")) as unknown as {
    Route: { options: { server: { handlers: { GET: () => Promise<Response> } } } };
  };
  return (await mod.Route.options.server.handlers.GET()).json();
}

describe("/api/chat/health — حال البوّابة بجانب المفتاح", () => {
  it("المخزن يجيب ⇐ verified", async () => {
    expect(await health()).toMatchObject({ key_present: true, gate: "verified" });
  });

  it("المخزن لا يجيب والسياسة الافتراضية ⇐ closed، والمفتاح حاضر رغم ذلك", async () => {
    probe.result = { allowed: false, unavailable: true };
    expect(await health()).toMatchObject({ key_present: true, gate: "closed" });
  });

  it("المخزن لا يجيب وحدود الذاكرة بإقرار المالك ⇐ degraded (النموذج يُستدعى فعلًا)", async () => {
    vi.stubEnv("SADEED_GATE_DEGRADED_MODE", "bounded");
    probe.result = { allowed: false, unavailable: true };
    expect(await health()).toMatchObject({ gate: "degraded" });
  });

  it("الحدّ المبلوغ ليس عطلًا: المخزن أجاب ⇐ verified", async () => {
    probe.result = { allowed: false };
    expect(await health()).toMatchObject({ gate: "verified" });
  });

  it("الفحص بمهلة — لا انتظار مفتوح على قاعدةٍ لا تردّ", async () => {
    await health();
    const opts = probe.options[0] as { deadlineMs?: number };
    expect(opts?.deadlineMs).toBeLessThanOrEqual(2_000);
  });
});
