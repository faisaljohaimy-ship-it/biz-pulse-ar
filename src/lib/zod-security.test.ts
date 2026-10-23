import { describe, expect, it } from "vitest";
import { z } from "zod";

// GHSA-mrhx-c7xc-m3w5: size bounds must run before element validation.
// Small fixtures establish early rejection without allocating malicious payloads.
describe("bounded collection validation", () => {
  it("rejects an oversized array before parsing its elements", () => {
    let calls = 0;
    const item = z.string().superRefine(() => {
      calls++;
    });
    expect(z.array(item).max(2).safeParse(["a", "b", "c"]).success).toBe(false);
    expect(calls).toBe(0);
  });

  it("rejects an oversized set before parsing its elements", () => {
    let calls = 0;
    const item = z.string().superRefine(() => {
      calls++;
    });
    expect(z.set(item).max(2).safeParse(new Set(["a", "b", "c"])).success).toBe(false);
    expect(calls).toBe(0);
  });

  it("keeps valid bounded inputs and unknown-key stripping unchanged", () => {
    const schema = z.object({ messages: z.array(z.string()).max(2) });
    expect(schema.parse({ messages: ["hello"], ignored: true })).toEqual({
      messages: ["hello"],
    });
  });
});
