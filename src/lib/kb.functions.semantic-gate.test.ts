/**
 * kbSemanticSearch spend gate — the paid embedding is reached only after the
 * kill switch, the per-minute rate limit and the daily AI quota all allow it.
 * Any block falls back to the non-paid keyword search. Global fetch throws, so
 * a provider call that slipped past the gate would fail the test loudly.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  rateKeys: [] as string[],
  /** Decision per bucket key: true = allowed, false = denied, "down" = unavailable. */
  decide: ((_key: string) => true) as (key: string) => boolean | "down",
  embedCalls: 0,
  rpcCalls: [] as string[],
  headers: new Headers(),
}));

vi.mock("@tanstack/react-start", () => {
  const builder = () => {
    const b: Record<string, unknown> = {};
    b.middleware = () => b;
    b.inputValidator = () => b;
    b.validator = () => b;
    b.server = () => b;
    b.handler = (fn: unknown) => fn;
    return b;
  };
  return { createServerFn: builder, createMiddleware: builder };
});
vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => ({ headers: h.headers }),
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/optional-auth-middleware", () => ({
  optionalSupabaseAuth: {},
}));
vi.mock("@/lib/authz.server", () => ({ requirePlatformAdmin: async () => {} }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: () => ({ insert: () => Promise.resolve({ error: null }) }) },
}));
vi.mock("@/lib/exec/showcase-simulation.server", () => ({
  buildKbSimulation: () => ({ articles: [] }),
  resilient: async <T>(_label: string, work: () => Promise<T>) => work(),
}));
vi.mock("@/lib/governance/rate-limit.server", () => ({
  enforceRateLimit: async (key: string) => {
    h.rateKeys.push(key);
    const d = h.decide(key);
    if (d === "down") return { allowed: false, unavailable: true };
    return { allowed: d };
  },
  degradedAllowance: () => ({ allowed: true, cap: 1, remaining: 1, retryAfterSeconds: 1 }),
}));
vi.mock("@/lib/kb-embed.server", () => ({
  embedText: async () => {
    h.embedCalls += 1;
    return [0.1, 0.2, 0.3];
  },
}));

import { kbSemanticSearch } from "./kb.functions";

type SearchResult = { mode: "semantic" | "keyword"; reason: string | null; hits: unknown[] };
const search = kbSemanticSearch as unknown as (args: {
  data: { query: string; limit: number };
  context: { supabase: unknown; userId: string | null };
}) => Promise<SearchResult>;

/** Minimal PostgREST stand-in: keyword chain resolves rows, rpc resolves semantic rows. */
function fakeSupabase() {
  const rows = [{ id: "a1", doc_code: "SEC-01", title_ar: "ع", title_en: "t" }];
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "or", "limit"]) chain[m] = () => chain;
  chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null });
  return {
    from: () => chain,
    rpc: (fn: string) => {
      h.rpcCalls.push(fn);
      return Promise.resolve({ data: [{ id: "a1", similarity: 0.9 }], error: null });
    },
  };
}

function run(userId: string | null = "user-1") {
  return search({
    data: { query: "تصريح عمل", limit: 8 },
    context: { supabase: fakeSupabase(), userId },
  });
}

beforeEach(() => {
  h.rateKeys = [];
  h.decide = () => true;
  h.embedCalls = 0;
  h.rpcCalls = [];
  h.headers = new Headers();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("network must not be reached in this test");
    }),
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("kbSemanticSearch — gate open", () => {
  it("rate limit + both daily caps allow ⇒ one embedding, semantic mode", async () => {
    const out = await run("user-1");
    expect(out.mode).toBe("semantic");
    expect(h.embedCalls).toBe(1);
    expect(h.rpcCalls).toEqual(["sec_kb_search"]);
    expect(h.rateKeys[0]).toBe("kb-semantic:user-1");
    expect(h.rateKeys.slice(1)).toEqual([
      expect.stringMatching(/^ai-daily-id:kb:\d{4}-\d{2}-\d{2}:user-1$/),
      expect.stringMatching(/^ai-daily-global:kb:\d{4}-\d{2}-\d{2}$/),
    ]);
  });

  it("never touches the chat buckets /api/chat uses for the same user (typing must not spend chat quota)", async () => {
    // The page searches on every keystroke from the 3rd character: ~23 calls
    // for one 25-character query. Billed to "chat", that was 23 of the user's
    // 120 daily chat units and 23 units of the shared global chat cap.
    for (let i = 0; i < 23; i++) await run("user-1");
    expect(h.embedCalls).toBe(23);
    expect(h.rateKeys.filter((k) => k.startsWith("ai-daily-id:chat:"))).toEqual([]);
    expect(h.rateKeys.filter((k) => k.startsWith("ai-daily-global:chat:"))).toEqual([]);
  });
});

describe("kbSemanticSearch — gate blocks ⇒ keyword fallback, zero embeddings", () => {
  it("kill switch ⇒ ai_disabled before any network or rate-limit call", async () => {
    vi.stubEnv("SADEED_AI_DISABLED", "1");
    const out = await run();
    expect(out).toMatchObject({ mode: "keyword", reason: "ai_disabled" });
    expect(out.hits).toHaveLength(1);
    expect(h.embedCalls).toBe(0);
    expect(h.rateKeys).toEqual([]);
  });

  it("per-minute rate limit denied ⇒ rate_limited, quota untouched", async () => {
    h.decide = (key) => !key.startsWith("kb-semantic:");
    const out = await run();
    expect(out).toMatchObject({ mode: "keyword", reason: "rate_limited" });
    expect(h.embedCalls).toBe(0);
    expect(h.rateKeys).toHaveLength(1);
  });

  it("rate-limit store unavailable ⇒ rate_limit_unavailable (fails closed)", async () => {
    h.decide = (key) => (key.startsWith("kb-semantic:") ? "down" : true);
    const out = await run();
    expect(out).toMatchObject({ mode: "keyword", reason: "rate_limit_unavailable" });
    expect(h.embedCalls).toBe(0);
  });

  it("daily identity cap ⇒ daily_identity_cap", async () => {
    h.decide = (key) => !key.startsWith("ai-daily-id:");
    const out = await run();
    expect(out).toMatchObject({ mode: "keyword", reason: "daily_identity_cap" });
    expect(h.embedCalls).toBe(0);
  });

  it("daily global cap ⇒ daily_global_cap", async () => {
    h.decide = (key) => !key.startsWith("ai-daily-global:");
    const out = await run();
    expect(out).toMatchObject({ mode: "keyword", reason: "daily_global_cap" });
    expect(h.embedCalls).toBe(0);
  });

  it("quota store unavailable ⇒ quota_unavailable (fails closed)", async () => {
    h.decide = (key) => (key.startsWith("ai-daily-") ? "down" : true);
    const out = await run();
    expect(out).toMatchObject({ mode: "keyword", reason: "quota_unavailable" });
    expect(h.embedCalls).toBe(0);
  });
});

describe("kbSemanticSearch — guest identity never trusts client headers by default", () => {
  it("without TRUST_PROXY_HEADERS a spoofed address still lands in the shared guest bucket", async () => {
    h.headers = new Headers({
      "x-forwarded-for": "203.0.113.7",
      "cf-connecting-ip": "198.51.100.9",
    });
    await run(null);
    expect(h.rateKeys[0]).toBe("kb-semantic:guest:kb:shared");
  });

  it("with TRUST_PROXY_HEADERS=true the proxy-written cf-connecting-ip wins over x-forwarded-for", async () => {
    vi.stubEnv("TRUST_PROXY_HEADERS", "true");
    h.headers = new Headers({
      "x-forwarded-for": "203.0.113.7",
      "cf-connecting-ip": "198.51.100.9",
    });
    await run(null);
    expect(h.rateKeys[0]).toBe("kb-semantic:guest:kb:198.51.100.9");
    expect(h.rateKeys[1]).toMatch(/:guest:kb:198\.51\.100\.9$/);
  });

  it("a malformed trusted header falls back to the shared bucket", async () => {
    vi.stubEnv("TRUST_PROXY_HEADERS", "true");
    h.headers = new Headers({ "cf-connecting-ip": "not-an-ip; drop" });
    await run(null);
    expect(h.rateKeys[0]).toBe("kb-semantic:guest:kb:shared");
  });
});
