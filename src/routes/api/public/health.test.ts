/**
 * `/api/public/health` يسمّي مخزن حدّ المعدّل تبعيةً مستقلة (VIBE 5.1):
 * حين يسقط يظهر «down» باسمه مع حالة القاطع وسياسة التدهور — لا يُدفن في «db».
 * وفحص القاعدة نفسه محدود بمهلة: قاعدةٌ لا تجيب ⇐ «down/timeout» لا تعليق.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");

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

const gate = vi.hoisted(() => ({
  unavailable: false,
  state: "closed" as "closed" | "open" | "half-open",
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
  gateDegradedMode: () => "bounded",
}));

afterAll(() => vi.unstubAllEnvs());

type Handler = (args: { request: Request }) => Promise<Response>;
type Body = {
  status: string;
  subsystems: Record<string, { status: string; detail?: string; latency_ms?: number }>;
};
async function get() {
  const mod = (await import("@/routes/api/public/health")) as unknown as {
    Route: { options: { server: { handlers: { GET: Handler } } } };
    HEALTH_DB_DEADLINE_MS: number;
  };
  const res = await mod.Route.options.server.handlers.GET({
    request: new Request("http://local/api/public/health"),
  });
  return { res, body: (await res.json()) as Body, deadline: mod.HEALTH_DB_DEADLINE_MS };
}

beforeEach(() => {
  gate.unavailable = false;
  gate.state = "closed";
  db.hang = false;
});

describe("مخزن حدّ المعدّل في فحص الصحّة", () => {
  it("المخزن يجيب ⇐ ok مع حالة القاطع", async () => {
    const { res, body } = await get();
    expect(res.status).toBe(200);
    expect(body.subsystems.rate_limit_storage.status).toBe("ok");
    expect(body.subsystems.rate_limit_storage.detail).toContain("breaker=closed");
    expect(body.subsystems.db.status).toBe("ok");
  });

  it("المخزن ساقط والقاطع مفتوح ⇐ down باسمه، والحالة الكلّية 503", async () => {
    gate.unavailable = true;
    gate.state = "open";
    const { res, body } = await get();
    expect(res.status).toBe(503);
    expect(body.status).toBe("down");
    expect(body.subsystems.rate_limit_storage.status).toBe("down");
    expect(body.subsystems.rate_limit_storage.detail).toContain("breaker=open");
    expect(body.subsystems.rate_limit_storage.detail).toContain("degraded_mode=bounded");
  });
});

describe("فحص القاعدة لا يعلق", () => {
  it("قاعدةٌ تقبل ولا تجيب ⇐ db down/timeout خلال المهلة، والفحص كلّه يردّ", async () => {
    db.hang = true;
    const t0 = Date.now();
    const { res, body, deadline } = await get();
    const elapsed = Date.now() - t0;
    expect(res.status).toBe(503);
    expect(body.subsystems.db).toMatchObject({ status: "down", detail: "timeout" });
    expect(elapsed).toBeGreaterThanOrEqual(deadline - 50);
    expect(elapsed).toBeLessThan(deadline + 1_500);
  }, 10_000);
});
