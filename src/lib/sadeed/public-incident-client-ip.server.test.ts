import { describe, expect, it } from "vitest";
import { clientBucketKey } from "./public-incident-client-ip.server";

const request = (headers: Record<string, string>) =>
  new Request("https://example.test/api/public/hooks/sadeed-incident", { headers });

describe("public incident source-IP quotas", () => {
  it("ignores spoofable Cloudflare headers on Vercel", () => {
    const vercelIp = "203.0.113.42";
    const a = request({ "x-vercel-forwarded-for": vercelIp, "cf-connecting-ip": "192.0.2.1" });
    const b = request({ "x-vercel-forwarded-for": vercelIp, "cf-connecting-ip": "192.0.2.2" });
    expect(clientBucketKey(a, { VERCEL: "1" })).toBe("aria-incident:203.0.113.42");
    expect(clientBucketKey(b, { VERCEL: "1" })).toBe(clientBucketKey(a, { VERCEL: "1" }));
  });

  it("treats VERCEL=true as Vercel and rejects spoofed Cloudflare quota keys", () => {
    const a = request({
      "x-vercel-forwarded-for": "203.0.113.42",
      "cf-connecting-ip": "192.0.2.11",
    });
    const b = request({
      "x-vercel-forwarded-for": "203.0.113.42",
      "cf-connecting-ip": "192.0.2.12",
    });
    expect(clientBucketKey(a, { VERCEL: "true" })).toBe("aria-incident:203.0.113.42");
    expect(clientBucketKey(b, { VERCEL: "true" })).toBe(clientBucketKey(a, { VERCEL: "true" }));
  });

  it("uses a shared unknown bucket for VERCEL=true without platform-owned IP headers", () => {
    const a = request({ "cf-connecting-ip": "192.0.2.11" });
    const b = request({ "cf-connecting-ip": "192.0.2.12" });
    expect(clientBucketKey(a, { VERCEL: "true" })).toBe("aria-incident:unknown");
    expect(clientBucketKey(b, { VERCEL: "true" })).toBe("aria-incident:unknown");
  });

  it("falls back to Vercel-overwritten XFF, not a client-supplied CF header", () => {
    const req = request({
      "x-forwarded-for": "203.0.113.43",
      "cf-connecting-ip": "192.0.2.33",
    });
    expect(clientBucketKey(req, { VERCEL: "1" })).toBe("aria-incident:203.0.113.43");
  });

  it("fails closed into a shared unknown bucket when Vercel IP headers are unavailable", () => {
    const a = request({ "cf-connecting-ip": "192.0.2.101" });
    const b = request({ "cf-connecting-ip": "192.0.2.102" });
    expect(clientBucketKey(a, { VERCEL: "1" })).toBe("aria-incident:unknown");
    expect(clientBucketKey(b, { VERCEL: "1" })).toBe("aria-incident:unknown");
  });

  it("rejects X-Real-IP bucket rotation without platform-owned Vercel headers", () => {
    const a = request({
      "x-real-ip": "192.0.2.71",
      "cf-connecting-ip": "192.0.2.91",
    });
    const b = request({
      "x-real-ip": "192.0.2.72",
      "cf-connecting-ip": "192.0.2.92",
    });
    expect(clientBucketKey(a, { VERCEL: "1" })).toBe("aria-incident:unknown");
    expect(clientBucketKey(b, { VERCEL: "1" })).toBe("aria-incident:unknown");
    const trusted = request({
      "x-vercel-forwarded-for": "203.0.113.30",
      "x-real-ip": "192.0.2.73",
    });
    expect(clientBucketKey(trusted, { VERCEL: "1" })).toBe("aria-incident:203.0.113.30");
  });

  it("retains Cloudflare trusted CF header over XFF on Workers", () => {
    const req = request({
      "cf-connecting-ip": "198.51.100.7",
      "x-forwarded-for": "192.0.2.1, 198.51.100.7",
    });
    expect(clientBucketKey(req, {})).toBe("aria-incident:198.51.100.7");
  });

  it("preserves the local non-Cloudflare XFF fallback", () => {
    const req = request({ "x-forwarded-for": "203.0.113.44, 10.0.0.1" });
    expect(clientBucketKey(req, {})).toBe("aria-incident:203.0.113.44");
  });

  it("does not create a distinct bucket for blank IP headers", () => {
    expect(clientBucketKey(request({ "x-vercel-forwarded-for": "   " }), { VERCEL: "1" })).toBe(
      "aria-incident:unknown",
    );
  });
  it.each([
    "not-an-ip",
    "198.51.100.9:443",
    "999.0.0.1",
    "203.0.113.042",
  ])("falls back to trusted Vercel XFF when the primary header is malformed: %s", (bad) => {
    const req = request({
      "x-vercel-forwarded-for": bad,
      "x-forwarded-for": "203.0.113.42",
    });
    expect(clientBucketKey(req, { VERCEL: "1" })).toBe("aria-incident:203.0.113.42");
  });

  it("fails closed into the shared bucket when both Vercel IP headers are invalid", () => {
    const req = request({
      "x-vercel-forwarded-for": "not-an-ip",
      "x-forwarded-for": "198.51.100.4:443",
      "cf-connecting-ip": "198.51.100.9",
    });
    expect(clientBucketKey(req, { VERCEL: "1" })).toBe("aria-incident:unknown");
  });

  it("accepts and canonicalizes legitimate IPv6 proxy IPs", () => {
    const req = request({ "x-vercel-forwarded-for": "2001:0db8::0001" });
    expect(clientBucketKey(req, { VERCEL: "1" })).toBe("aria-incident:2001:db8::1");
  });

  it("ignores a malformed Cloudflare IP and falls back to the first valid XFF", () => {
    const req = request({
      "cf-connecting-ip": "not-an-ip",
      "x-forwarded-for": "198.51.100.7, 198.51.100.8",
    });
    expect(clientBucketKey(req, {})).toBe("aria-incident:198.51.100.7");
  });

});
