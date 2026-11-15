import { describe, expect, it } from "vitest";
import {
  evaluateResilience,
  listResiliencePolicies,
  registerResiliencePolicy,
} from "./resilience.server";

describe("resilience policy snapshots", () => {
  it("cannot silently change a registered release-gate policy via a listing", () => {
    const subsystem = "regression:resilience-policy-snapshot";
    registerResiliencePolicy(subsystem, { retry: false, timeout: false });

    const listed = listResiliencePolicies().find((item) => item.subsystem === subsystem);
    expect(listed).toBeDefined();
    if (!listed) throw new Error("Registered policy missing from listing");

    // A consumer may edit its returned record; this must not mutate the registry.
    listed.flags.retry = true;
    listed.flags.timeout = true;

    const registered = listResiliencePolicies().find((item) => item.subsystem === subsystem);
    expect(registered?.flags).toMatchObject({ retry: false, timeout: false });
    expect(evaluateResilience().retry_policy).not.toBe("pass");
    expect(evaluateResilience().timeout_policy).not.toBe("pass");
  });
});
