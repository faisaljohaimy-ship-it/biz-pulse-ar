// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
const create = vi.hoisted(() =>
  vi.fn((_url: string, _key: string, _options: unknown) => ({ from: vi.fn() })),
);
vi.mock("@supabase/supabase-js", () => ({ createClient: create }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  create.mockClear();
});
describe("server service-role configuration", () => {
  it("supports the existing misspelled secret only on the server", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("SUPABASE_SERVCE_ROLE_KEY", "server-fixture");
    const { supabaseAdmin } = await import("./client.server");
    void supabaseAdmin.from;
    expect(create.mock.calls[0]).toEqual([
      "https://example.supabase.co",
      "server-fixture",
      expect.any(Object),
    ]);
  });
  it("the canonical secret takes precedence; never uses a public key", async () => {
    vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "canonical-fixture");
    vi.stubEnv("SUPABASE_SERVCE_ROLE_KEY", "legacy-fixture");
    const { supabaseAdmin } = await import("./client.server");
    void supabaseAdmin.from;
    expect(create.mock.calls[0]?.[1]).toBe("canonical-fixture");
  });
});
