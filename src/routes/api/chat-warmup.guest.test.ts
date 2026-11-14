/**
 * Isolate the anonymous chat warm-up from the authenticated warm-up's
 * in-flight dynamic imports. Reusing the module registry could suppress the
 * context mock in an otherwise valid guest run, producing a false CI failure.
 * The full guest assertions are retained in a separate Vitest module context.
 */
import { afterAll, expect, it, vi } from "vitest";

vi.stubEnv("GEMINI_API_KEY", "test-key-not-a-secret");
vi.stubEnv("SUPABASE_URL", "https://stub.invalid");
vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_stub");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "sb_secret_stub");

const loaded = vi.hoisted(() => new Set<string>());

function stubSupabase() {
  const result = { data: null, error: null, count: 0 };
  const chain: unknown = new Proxy(() => chain, {
    get(_target, prop) {
      if (prop === "then") return (resolve: (value: unknown) => unknown) => resolve(result);
      return () => chain;
    },
    apply: () => chain,
  });
  return {
    from: () => chain,
    rpc: () => chain,
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  };
}

vi.mock("@supabase/supabase-js", () => ({ createClient: () => stubSupabase() }));
vi.mock("@/integrations/supabase/client.server", () => ({
  createSupabaseAdminClient: () => stubSupabase(),
  supabaseAdmin: stubSupabase(),
}));
vi.mock("@/lib/sadeed/instant-data-answers.server", async (importOriginal) => {
  loaded.add("instant");
  return importOriginal();
});
vi.mock("@/lib/sadeed/llm/zero-cost-router.server", async (importOriginal) => {
  loaded.add("router");
  return importOriginal();
});
vi.mock("@/lib/sadeed-context.server", async (importOriginal) => {
  loaded.add("context");
  return importOriginal();
});
vi.mock("@/lib/sadeed-tools.server", async (importOriginal) => {
  loaded.add("tools");
  return importOriginal();
});

afterAll(() => vi.unstubAllEnvs());

it("زائر (بلا Authorization): الثلاث دون الأدوات — لا يدفعها من لن يستعملها", async () => {
  const mod = (await import("@/routes/api/chat")) as unknown as {
    Route: {
      options: {
        server: {
          handlers: {
            POST: (args: { request: Request }) => Promise<Response>;
          };
        };
      };
    };
  };
  expect([...loaded]).toEqual([]);
  const response = await mod.Route.options.server.handlers.POST({
    request: new Request("http://local/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [] }),
    }),
  });
  expect(response.status).toBe(400);
  await vi.waitFor(() => expect([...loaded].sort()).toEqual(["context", "instant", "router"]));
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(loaded.has("tools")).toBe(false);
});
