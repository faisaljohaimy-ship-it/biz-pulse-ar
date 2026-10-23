import { describe, expect, it } from "vitest";
import { StepSchema } from "./workflow-engine.server";

const step = { id: "s1", kind: "tool", toolId: "sql.read", input: {} };

describe("workflow retry compatibility", () => {
  it("does not inject a retry policy when it is omitted", () => {
    expect(StepSchema.parse(step)).toEqual(step);
    const parsed = StepSchema.parse({ ...step, retry: undefined });
    if (parsed.kind !== "tool") throw new Error("Expected a tool step");
    expect(parsed.retry).toBeUndefined();
  });

  it("retains field defaults when a policy is explicitly supplied", () => {
    expect(StepSchema.parse({ ...step, retry: {} })).toMatchObject({
      retry: { max: 0, backoffMs: 1000, factor: 2 },
    });
  });

  it("preserves retry limits and rejects invalid explicit policies", () => {
    for (const retry of [null, { max: 6 }, { max: -1 }, { backoffMs: 0 }, { factor: 0 }]) {
      expect(StepSchema.safeParse({ ...step, retry }).success).toBe(false);
    }
  });
});
