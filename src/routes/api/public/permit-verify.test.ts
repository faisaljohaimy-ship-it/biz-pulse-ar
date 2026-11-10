/**
 * The anonymous QR permit-verification endpoint must not allow clients to
 * rotate rate-limit buckets using their own CF-Connecting-IP headers on Vercel.
 * These tests stop before the database lookup: only the source-IP gate is used.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({ buckets: [] as string[] }));

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { rpc: vi.fn() },
}));

vi.mock("@/lib/governance/rate-limit.server", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/governance/rate-limit.server")>();
  return {
    ...real,
    enforceRateLimit: vi.fn(async (key: string) => {
      captured.buckets.push(key);
      return { allowed: false, unavailable: false };
    }),
  };
});

type Handler = (args: { request: Request }) => Promise<Response>;

async function check(headers: Record<string, string>) {
  const mod = (await import("./permit-verify")) as unknown as {
    Route: { options: { server: { handlers: { GET: Handler } } } };
  };
  const response = await mod.Route.options.server.handlers.GET({
    request: new Request("https://example.test/api/public/permit-verify?id=invalid", { headers }),
  });
  expect(response.status).toBe(429);
  return captured.buckets.at(-1);
}

beforeEach(() => {
  vi.stubEnv("VERCEL", "1");
  captured.buckets.length = 0;
});
afterEach(() => vi.unstubAllEnvs());

describe("public permit verification quota identity", () => {
  it("ignores forged CF-Connecting-IP when Vercel provides the source IP", async () => {
    const a = await check({
      "x-vercel-forwarded-for": "203.0.113.10",
      "x-forwarded-for": "203.0.113.10",
      "cf-connecting-ip": "192.0.2.10",
    });
    const b = await check({
      "x-vercel-forwarded-for": "203.0.113.10",
      "x-forwarded-for": "203.0.113.10",
      "cf-connecting-ip": "192.0.2.11",
    });
    expect(a).toBe("permit-verify:203.0.113.10");
    expect(b).toBe(a);
  });

  it("uses Vercel's XFF fallback without trusting a forged CF header", async () => {
    const key = await check({
      "x-forwarded-for": "198.51.100.23, 10.0.0.1",
      "cf-connecting-ip": "192.0.2.2",
    });
    expect(key).toBe("permit-verify:198.51.100.23");
  });

  it("falls into the shared unknown bucket without Vercel IP headers", async () => {
    const first = await check({ "cf-connecting-ip": "192.0.2.1" });
    const second = await check({ "cf-connecting-ip": "192.0.2.99" });
    expect(first).toBe("permit-verify:unknown");
    expect(second).toBe(first);
  });

  it("retains Cloudflare precedence outside Vercel", async () => {
    vi.stubEnv("VERCEL", "");
    const key = await check({
      "cf-connecting-ip": "198.51.100.7",
      "x-forwarded-for": "192.0.2.2",
    });
    expect(key).toBe("permit-verify:198.51.100.7");
  });
});
