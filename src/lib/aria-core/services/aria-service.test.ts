/**
 * Contract test for the SAVED REPAIR METHOD (Lovable, f413ffa):
 * «مصادَق أولًا ← بديل عام/مجهول عند 401/403».
 *
 * A stale or invalid stored session must NEVER surface as a chat failure:
 * when the authenticated request is rejected 401/403, the transport retries
 * the same request once WITHOUT the Authorization header so /api/chat's
 * guest demo path answers. Documented in CLAUDE.md; breaking this test
 * means breaking the platform's always-on ARIA doctrine.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { access_token: "stale.invalid.jwt" } },
      })),
    },
  },
  isSupabaseConfigured: true,
}));

import { ariaAuthedFetch } from "./aria-service";

describe("ariaAuthedFetch — saved repair method (auth-first → anon fallback)", () => {
  const realFetch = global.fetch;
  let calls: Array<{ auth: string | null }>;

  beforeEach(() => {
    calls = [];
  });
  afterEach(() => {
    global.fetch = realFetch;
    vi.restoreAllMocks();
  });

  function stubFetch(responder: (call: number, headers: Headers) => Response) {
    let n = 0;
    global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      calls.push({ auth: headers.get("Authorization") });
      n += 1;
      return responder(n, headers);
    }) as unknown as typeof fetch;
  }

  it("retries once WITHOUT Authorization when the bearer is rejected 401", async () => {
    stubFetch((call) =>
      call === 1
        ? new Response(JSON.stringify({ ok: false, error: "Authentication token is invalid or expired." }), { status: 401 })
        : new Response("ok", { status: 200 }),
    );
    const res = await ariaAuthedFetch("/api/chat", { method: "POST", body: "{}" });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(2);
    expect(calls[0]!.auth).toBe("Bearer stale.invalid.jwt");
    expect(calls[1]!.auth).toBeNull();
  });

  it("falls back on 403 as well", async () => {
    stubFetch((call) =>
      call === 1 ? new Response("forbidden", { status: 403 }) : new Response("ok", { status: 200 }),
    );
    const res = await ariaAuthedFetch("/api/chat", { method: "POST", body: "{}" });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(2);
    expect(calls[1]!.auth).toBeNull();
  });

  it("does NOT retry when the authenticated request succeeds", async () => {
    stubFetch(() => new Response("ok", { status: 200 }));
    const res = await ariaAuthedFetch("/api/chat", { method: "POST", body: "{}" });
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.auth).toBe("Bearer stale.invalid.jwt");
  });

  it("does NOT retry non-auth failures (5xx handled by the retry/cooling layers)", async () => {
    stubFetch(() => new Response("boom", { status: 500 }));
    const res = await ariaAuthedFetch("/api/chat", { method: "POST", body: "{}" });
    expect(res.status).toBe(500);
    expect(calls).toHaveLength(1);
  });
});
