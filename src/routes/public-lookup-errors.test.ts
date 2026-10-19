import { afterEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ error: null as null | { code: string } }));
const chain = () => ({
  select: () => chain(),
  eq: () => chain(),
  maybeSingle: async () => ({ data: null, error: db.error }),
});
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ from: chain }) }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: chain } }));
vi.mock("@/lib/governance/rate-limit.server", () => ({
  enforceRateLimit: async () => ({ allowed: true }),
}));

type Handler = (args: { request: Request }) => Promise<Response>;
afterEach(() => {
  vi.unstubAllEnvs();
  db.error = null;
});

describe("public lookup server errors", () => {
  for (const endpoint of ["permit", "unsubscribe"] as const) {
    for (const failed of [true, false]) {
      it(`${endpoint}: ${failed ? "query error is 500" : "missing record is 404"}`, async () => {
        vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only");
        vi.stubEnv("VITE_SUPABASE_URL", "https://stub.invalid");
        db.error = failed ? { code: "08006" } : null;
        const mod =
          endpoint === "permit"
            ? await import("./api/public/permit-verify")
            : await import("./email/unsubscribe");
        const handlers = (
          mod.Route.options.server as unknown as { handlers: { GET: Handler; POST?: Handler } }
        ).handlers;
        const query =
          endpoint === "permit" ? "id=11111111-1111-4111-8111-111111111111" : "token=test-only";
        const res = await handlers.GET({ request: new Request(`http://local/?${query}`) });
        expect(res.status).toBe(failed ? 500 : 404);
        if (endpoint === "unsubscribe" && handlers.POST) {
          const post = await handlers.POST({
            request: new Request(`http://local/?${query}`, { method: "POST" }),
          });
          expect(post.status).toBe(failed ? 500 : 404);
        }
      });
    }
  }
});
