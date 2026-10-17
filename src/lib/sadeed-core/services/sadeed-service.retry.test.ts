/**
 * إعادة المحاولة التلقائية في العميل: تراجعٌ بتشويش، واحترام `Retry-After` (VIBE 5.1).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}));

import {
  AUTO_RETRY_BASE_MS,
  AUTO_RETRY_JITTER_MS,
  AUTO_RETRY_MAX_HINT_MS,
  computeAutoRetryDelayMs,
  lastGateRetryAfter,
  sadeedAuthedFetch,
} from "./sadeed-service";

describe("computeAutoRetryDelayMs", () => {
  it("الأساس 1.2 ث × المحاولة، والتشويش حتى 400 مللي ثانية", () => {
    expect(computeAutoRetryDelayMs(1, null, 0)).toBe(AUTO_RETRY_BASE_MS);
    expect(computeAutoRetryDelayMs(2, null, 0)).toBe(2 * AUTO_RETRY_BASE_MS);
    expect(computeAutoRetryDelayMs(1, null, 0.5)).toBe(AUTO_RETRY_BASE_MS + 200);
    expect(computeAutoRetryDelayMs(1, null, 1)).toBe(AUTO_RETRY_BASE_MS + AUTO_RETRY_JITTER_MS);
    // عشوائيٌّ حقيقي: ضمن [الأساس، الأساس + التشويش).
    const d = computeAutoRetryDelayMs(1, null)!;
    expect(d).toBeGreaterThanOrEqual(AUTO_RETRY_BASE_MS);
    expect(d).toBeLessThan(AUTO_RETRY_BASE_MS + AUTO_RETRY_JITTER_MS);
  });

  it("تلميح الخادم لا يُستبق، وما فوق عشر ثوانٍ يلغي الإعادة التلقائية", () => {
    expect(computeAutoRetryDelayMs(1, 5_000, 0)).toBe(5_000);
    expect(computeAutoRetryDelayMs(2, 1_000, 0)).toBe(2 * AUTO_RETRY_BASE_MS);
    expect(computeAutoRetryDelayMs(1, AUTO_RETRY_MAX_HINT_MS, 0)).toBe(AUTO_RETRY_MAX_HINT_MS);
    expect(computeAutoRetryDelayMs(1, AUTO_RETRY_MAX_HINT_MS + 1, 0)).toBeNull();
    expect(computeAutoRetryDelayMs(1, 60_000, 0)).toBeNull();
  });
});

describe("lastGateRetryAfter — يُقرأ من ردود البوّابة وحدها", () => {
  const realFetch = global.fetch;
  beforeEach(() => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("limited")) {
        return new Response("{}", { status: 429, headers: { "Retry-After": "7" } });
      }
      if (url.includes("busy")) return new Response("{}", { status: 503 });
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
  });
  afterEach(() => {
    global.fetch = realFetch;
  });

  it("‏429 بترويسة ⇐ 7000؛ ‏503 بلا ترويسة ⇐ null؛ ‏200 يمسح التلميح", async () => {
    await sadeedAuthedFetch("/api/chat?limited");
    expect(lastGateRetryAfter()).toBe(7_000);
    await sadeedAuthedFetch("/api/chat?busy");
    expect(lastGateRetryAfter()).toBeNull();
    await sadeedAuthedFetch("/api/chat?limited");
    expect(lastGateRetryAfter()).toBe(7_000);
    await sadeedAuthedFetch("/api/chat");
    expect(lastGateRetryAfter()).toBeNull();
  });
});
