// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { rpc: vi.fn() },
}));

import { degradedAllowance, resetRateLimitStateForTests } from "./rate-limit.server";

beforeEach(() => resetRateLimitStateForTests());

describe("degradedAllowance — invalid clock inputs", () => {
  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.MAX_VALUE,
    -Number.MAX_VALUE,
  ])("fails closed without poisoning a new quota window for now=%s", (now) => {
    expect(degradedAllowance("clock", 2, 60, now)).toEqual({
      allowed: false,
      cap: 0,
      remaining: 0,
      retryAfterSeconds: 60,
    });
    // The invalid call must not create a NaN lease that never expires.
    expect(degradedAllowance("clock", 2, 60, 1_000)).toMatchObject({
      allowed: true,
      cap: 1,
      remaining: 0,
      retryAfterSeconds: 60,
    });
    expect(degradedAllowance("clock", 2, 60, 61_000).allowed).toBe(true);
  });

  it("preserves an already spent quota after an invalid timestamp", () => {
    expect(degradedAllowance("existing-clock", 2, 60, 1_000).allowed).toBe(true);
    expect(degradedAllowance("existing-clock", 2, 60, Number.NaN)).toMatchObject({
      allowed: false,
      cap: 0,
      remaining: 0,
    });
    expect(degradedAllowance("existing-clock", 2, 60, 1_001)).toMatchObject({
      allowed: false,
      cap: 1,
      remaining: 0,
      retryAfterSeconds: 60,
    });
    expect(degradedAllowance("existing-clock", 2, 60, 61_000).allowed).toBe(true);
  });
});
