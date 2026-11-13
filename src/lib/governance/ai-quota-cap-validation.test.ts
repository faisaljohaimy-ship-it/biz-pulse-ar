import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    from: () => ({ insert: () => Promise.resolve({ error: null }) }),
  },
}));

async function loadQuota(raw: string) {
  vi.resetModules();
  vi.stubEnv("SADEED_CHAT_DAILY_GLOBAL", raw);
  const rate = await import("./rate-limit.server");
  rate.resetRateLimitStateForTests();
  const quota = await import("./ai-quota.server");
  return quota.degradedAiQuota;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("daily AI quota environment override validation", () => {
  it.each(["2e2", "3junk", "2.5", "+2", "-2", "0", "", "999999999999999999999999"])(
    "ignores invalid quota override %j instead of accepting its numeric prefix",
    async (raw) => {
      const quota = await loadQuota(raw);
      // The documented default global chat cap is 5,000 (2,500 in
      // degraded mode). A numeric prefix of 2 or 3 would deny request #2.
      for (let i = 0; i < 4; i += 1) {
        expect(quota("chat", `daily-cap-test-${i}`)).toBeNull();
      }
    },
  );

  it.each(["10", " 10 ", "0010"])(
    "preserves an intentional positive decimal quota override %j",
    async (raw) => {
      const quota = await loadQuota(raw);
      for (let i = 0; i < 5; i += 1) {
        expect(quota("chat", `daily-valid-${i}`)).toBeNull();
      }
      const denied = quota("chat", "daily-valid-overflow");
      expect(denied?.status).toBe(429);
      await expect(denied?.json()).resolves.toMatchObject({ error: "daily_global_cap" });
    },
  );
});
