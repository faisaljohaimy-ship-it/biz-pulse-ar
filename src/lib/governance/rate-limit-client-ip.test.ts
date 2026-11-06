import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { rpc: vi.fn() },
}));

import { clientBucketKey } from "./rate-limit.server";

const request = (headers: Record<string, string>) =>
  new Request("https://example.test/api/chat", { headers });

afterEach(() => vi.unstubAllEnvs());

describe("shared rate-limit client-IP buckets", () => {
  it("cannot rotate Vercel chat quotas using forged CF-Connecting-IP", () => {
    vi.stubEnv("VERCEL", "1");
    const a = request({
      "x-vercel-forwarded-for": "203.0.113.10",
      "cf-connecting-ip": "192.0.2.1",
    });
    const b = request({
      "x-vercel-forwarded-for": "203.0.113.10",
      "cf-connecting-ip": "192.0.2.2",
    });
    expect(clientBucketKey(a, "ai-chat")).toBe("ai-chat:203.0.113.10");
    expect(clientBucketKey(b, "ai-chat")).toBe(clientBucketKey(a, "ai-chat"));
  });

  it("uses Vercel-overwritten XFF if the Vercel-specific header is unavailable", () => {
    vi.stubEnv("VERCEL", "1");
    expect(
      clientBucketKey(
        request({
          "x-forwarded-for": "203.0.113.42, 10.0.0.1",
          "cf-connecting-ip": "192.0.2.77",
        }),
        "voice",
      ),
    ).toBe("voice:203.0.113.42");
  });

  it("fails into a shared unknown bucket without platform IP headers on Vercel", () => {
    vi.stubEnv("VERCEL", "1");
    const a = request({ "cf-connecting-ip": "192.0.2.5" });
    const b = request({ "cf-connecting-ip": "192.0.2.6" });
    expect(clientBucketKey(a, "chat")).toBe("chat:unknown");
    expect(clientBucketKey(b, "chat")).toBe("chat:unknown");
  });

  it("preserves Cloudflare-Worker CF header precedence and scope separation", () => {
    vi.stubEnv("VERCEL", "");
    const req = request({
      "cf-connecting-ip": "198.51.100.7",
      "x-forwarded-for": "192.0.2.2",
    });
    expect(clientBucketKey(req, "chat")).toBe("chat:198.51.100.7");
    expect(clientBucketKey(req, "voice")).toBe("voice:198.51.100.7");
  });

  it("preserves the non-Vercel XFF fallback", () => {
    vi.stubEnv("VERCEL", "");
    expect(clientBucketKey(request({ "x-forwarded-for": "198.51.100.8, 10.0.0.1" }), "chat")).toBe(
      "chat:198.51.100.8",
    );
  });
});
