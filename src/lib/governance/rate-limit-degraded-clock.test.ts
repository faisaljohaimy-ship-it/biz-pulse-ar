/**
 * Degraded quota: backward wall-clock changes must not extend active leases.
 * Caps and exhausted budgets remain enforced throughout the replacement lease.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { rpc: vi.fn() },
}));

import {
  DEGRADED_MAX_KEYS,
  degradedAllowance,
  resetRateLimitStateForTests,
} from "./rate-limit.server";

beforeEach(() => resetRateLimitStateForTests());

describe("degradedAllowance — clock rollback", () => {
  it("preserves spent quota but recovers one identity within its own window", () => {
    const start = 10_000_000;
    const rewound = start - 3_600_000;
    expect(degradedAllowance("same", 2, 60, start).allowed).toBe(true);

    const denied = degradedAllowance("same", 2, 60, rewound);
    expect(denied).toMatchObject({ allowed: false, cap: 1, remaining: 0 });
    expect(denied.retryAfterSeconds).toBe(60);
    expect(degradedAllowance("same", 2, 60, rewound + 59_999).allowed).toBe(false);
    expect(degradedAllowance("same", 2, 60, rewound + 60_000).allowed).toBe(true);
  });

  it("does not free any of 3000 active buckets, but frees expired slots after rewind", () => {
    const start = 10_000_000;
    const rewound = start - 3_600_000;
    for (let i = 0; i < DEGRADED_MAX_KEYS; i += 1) {
      expect(degradedAllowance(`active:${i}`, 2, 60, start).allowed).toBe(true);
    }

    const full = degradedAllowance("new", 2, 60, rewound);
    expect(full).toMatchObject({ allowed: false, remaining: 0, retryAfterSeconds: 60 });
    expect(degradedAllowance("new", 2, 60, rewound + 59_999).allowed).toBe(false);
    expect(degradedAllowance("new", 2, 60, rewound + 60_000).allowed).toBe(true);
  });
});
