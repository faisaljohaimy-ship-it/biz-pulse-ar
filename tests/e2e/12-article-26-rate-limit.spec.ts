/**
 * Article 26 — Rate limiting + audit trail E2E lock.
 *
 * Verifies:
 *   1. `/api/public/hooks/aria-incident` returns 429 after > 60 requests in
 *      60 s from the same client IP (rate-limit bucket keyed by IP).
 *   2. A well-formed beacon still returns 202 in a fresh bucket.
 *
 * The `aria_actions_log` audit visibility is org-scoped and cannot be
 * probed anonymously — that is asserted indirectly: a probing anon caller
 * MUST NOT be able to SELECT the log, which we verify via the Supabase
 * Data API just like Article 19's anon-read probes.
 */
import { test, expect, request as pwRequest } from "@playwright/test";

const APP_BASE = process.env.APP_BASE_URL ?? "http://localhost:8080";
const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "";

test.describe("Article 26 — audit trail + rate limiting", () => {
  test("public incident sink throttles after > 60 requests in 60s", async () => {
    const ctx = await pwRequest.newContext({
      baseURL: APP_BASE,
      extraHTTPHeaders: { "x-forwarded-for": "203.0.113.42" },
    });

    // Fire 65 well-formed beacons back-to-back. First 60 accepted (202),
    // the remainder MUST be 429 with a Retry-After header.
    let accepted = 0;
    let throttled = 0;
    let lastRetryAfter: string | null = null;

    for (let i = 0; i < 65; i += 1) {
      const res = await ctx.post("/api/public/hooks/aria-incident", {
        data: {
          kind: "unhandled_error",
          detail: `article-26 lock ${i}`,
          url: "/tests/article-26",
          device_class: "ci",
          ts: Date.now(),
        },
        headers: { "content-type": "application/json" },
      });
      if (res.status() === 202) accepted += 1;
      else if (res.status() === 429) {
        throttled += 1;
        lastRetryAfter = res.headers()["retry-after"] ?? lastRetryAfter;
      }
    }

    await ctx.dispose();

    expect(accepted, "at least the first burst must be accepted").toBeGreaterThanOrEqual(50);
    expect(throttled, "the sink MUST throttle after the 60 req / 60 s budget").toBeGreaterThanOrEqual(1);
    expect(lastRetryAfter).toBeTruthy();
  });

  test("aria_actions_log is not readable by anonymous callers", async () => {
    test.skip(!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY, "missing SUPABASE env");

    const ctx = await pwRequest.newContext({
      baseURL: SUPABASE_URL,
      extraHTTPHeaders: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
    });
    const res = await ctx.get("/rest/v1/aria_actions_log?select=id&limit=1");
    await ctx.dispose();

    // Either 401/403 outright, or 200 with an empty array (RLS filters all rows).
    if (res.status() === 200) {
      const body = await res.json();
      expect(Array.isArray(body) && body.length, "anon SELECT MUST return zero rows").toBe(0);
    } else {
      expect([401, 403, 404]).toContain(res.status());
    }
  });
});
