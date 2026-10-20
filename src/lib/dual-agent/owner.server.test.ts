// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CommandContext } from "./command.server";
import { isFnnOwner, requireFnnOwner } from "./owner.server";

const user = {
  id: "owner",
  email: "owner@example.com",
  email_confirmed_at: "2026-10-20",
  is_anonymous: false,
};
function context(account: unknown = user, error: unknown = null, userId: string | null = "owner") {
  return {
    userId,
    supabase: { auth: { getUser: vi.fn(async () => ({ data: { user: account }, error })) } },
  } as unknown as CommandContext;
}
afterEach(() => vi.unstubAllEnvs());
describe("FNN owner access", () => {
  it("fails closed without server configuration and for guests", async () => {
    vi.stubEnv("FNN_OWNER_USER_ID", "");
    vi.stubEnv("FNN_OWNER_EMAIL", "");
    expect(await isFnnOwner(context())).toBe(false);
    await expect(requireFnnOwner(context(null, null, null))).rejects.toThrow(/مالك النظام/);
  });
  it("uses freshly validated confirmed email, never editable owner claims", async () => {
    vi.stubEnv("FNN_OWNER_EMAIL", "owner@example.com");
    expect(await isFnnOwner(context())).toBe(true);
    expect(
      await isFnnOwner(
        context({ ...user, email: "other@example.com", user_metadata: { owner: true } }),
      ),
    ).toBe(false);
    expect(await isFnnOwner(context({ ...user, email_confirmed_at: null }))).toBe(false);
    expect(await isFnnOwner(context({ ...user, is_anonymous: true }))).toBe(false);
    expect(await isFnnOwner(context(user, new Error("revoked")))).toBe(false);
    expect(await isFnnOwner(context(user, null, "other"))).toBe(false);
  });
  it("an immutable configured ID overrides email bootstrap", async () => {
    vi.stubEnv("FNN_OWNER_USER_ID", "different");
    vi.stubEnv("FNN_OWNER_EMAIL", user.email);
    expect(await isFnnOwner(context())).toBe(false);
    vi.stubEnv("FNN_OWNER_USER_ID", user.id);
    expect(await isFnnOwner(context())).toBe(true);
  });
});
