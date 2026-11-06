import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const limiter = vi.hoisted(() => ({ enforce: vi.fn() }));

vi.mock("@/lib/governance/rate-limit.server", () => ({
  enforceRateLimit: limiter.enforce,
}));

import { checkRateLimit } from "./audit-log.server";

beforeEach(() => {
  limiter.enforce.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("legacy audit rate-limit helper — secure compatibility", () => {
  it("delegates the same key and limits to the bounded central gate", async () => {
    limiter.enforce.mockResolvedValue({ allowed: true });
    await expect(checkRateLimit("legacy:test", 12, 60)).resolves.toBe(true);
    expect(limiter.enforce).toHaveBeenCalledExactlyOnceWith("legacy:test", 12, 60);
  });

  it.each([
    [{ allowed: false }, false],
    [{ allowed: false, unavailable: true }, false],
    [{ allowed: true, unavailable: true }, false],
    [{ allowed: true }, true],
  ])("preserves the central quota decision %j => %s", async (decision, expected) => {
    limiter.enforce.mockResolvedValue(decision);
    await expect(checkRateLimit("legacy:decision", 10, 60)).resolves.toBe(expected);
  });

  it.each([undefined, null, { allowed: "true" }, { allowed: 1 }, {}])(
    "does not grant quotas on malformed central decisions: %j",
    async (response) => {
      limiter.enforce.mockResolvedValue(response);
      await expect(checkRateLimit("legacy:invalid", 10, 60)).resolves.toBe(false);
    },
  );

  it("fails closed and redacts identities and provider errors on thrown failures", async () => {
    const identity = "synthetic-private-identity-for-test";
    const backendError = "synthetic-sensitive-provider-error";
    limiter.enforce.mockRejectedValue(new Error(backendError));
    await expect(checkRateLimit(identity, 10, 60)).resolves.toBe(false);
    const logs = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logs).toContain("legacy check unavailable");
    expect(logs).not.toContain(identity);
    expect(logs).not.toContain(backendError);
  });
});
