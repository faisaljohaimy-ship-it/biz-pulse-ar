// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: sdk.createClient }));

import { AUTH_USER_LOOKUP_TIMEOUT_MS, verifySupabaseUser } from "./hook-auth.server";

const request = () =>
  new Request("https://sadeed.invalid/api/heygen/token", {
    headers: { authorization: "Bearer test-only-token" },
  });

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://auth.example.invalid");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-only-public-key");
  sdk.getUser.mockReset();
  sdk.createClient.mockReset().mockReturnValue({ auth: { getUser: sdk.getUser } });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

async function responseStatus(input = request()): Promise<number> {
  const response = await verifySupabaseUser(input);
  if (!(response instanceof Response)) throw new Error("Expected a rejected auth response");
  return response.status;
}

describe("paid-token endpoint user lookup availability", () => {
  it("returns an explicit 503 when Auth transport rejects instead of throwing a 500", async () => {
    sdk.getUser.mockRejectedValueOnce(new Error("private-network-detail"));
    const result = await verifySupabaseUser(request());
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(503);
    expect(await (result as Response).json()).toEqual({ error: "auth_unavailable" });
  });

  it("returns 503 for synchronous SDK failures and malformed envelopes", async () => {
    sdk.createClient.mockImplementationOnce(() => {
      throw new Error("private-provider-detail");
    });
    expect(await responseStatus()).toBe(503);

    sdk.getUser.mockResolvedValueOnce(null);
    expect(await responseStatus()).toBe(503);

    sdk.getUser.mockResolvedValueOnce({ data: { user: { id: 42 } }, error: null });
    expect(await responseStatus()).toBe(503);
  });

  it("bounds a hung user lookup and cleans the timeout without minting identity", async () => {
    vi.useFakeTimers();
    sdk.getUser.mockReturnValue(new Promise(() => undefined));
    const pending = verifySupabaseUser(request());
    await vi.advanceTimersByTimeAsync(AUTH_USER_LOOKUP_TIMEOUT_MS);
    const result = await pending;
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(503);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves 401 for rejected tokens and missing sessions", async () => {
    sdk.getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: "bad_token" } });
    expect(await responseStatus()).toBe(401);
    sdk.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect(await responseStatus()).toBe(401);
  });

  it("preserves successful identity and forwards only the active bearer to Auth", async () => {
    sdk.getUser.mockResolvedValue({ data: { user: { id: "known-test-user" } }, error: null });
    expect(await verifySupabaseUser(request())).toEqual({ userId: "known-test-user" });
    expect(sdk.createClient).toHaveBeenCalledWith(
      "https://auth.example.invalid",
      "test-only-public-key",
      expect.objectContaining({
        global: { headers: { Authorization: "Bearer test-only-token" } },
        auth: { persistSession: false, autoRefreshToken: false },
      }),
    );
  });

  it("retains missing-token and missing-configuration failures", async () => {
    expect(await responseStatus(new Request("https://sadeed.invalid/api/heygen/token"))).toBe(401);
    vi.stubEnv("SUPABASE_URL", "");
    expect(await responseStatus()).toBe(503);
    expect(sdk.getUser).not.toHaveBeenCalled();
  });
});
