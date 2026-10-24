import { describe, expect, it } from "vitest";
import { FINN_HOME_CAPABILITIES, finnHomeState } from "./home-access";

describe("FNN home visibility is separate from server authorization", () => {
  it.each([
    [{ signedIn: false }, "guest"],
    [{ signedIn: false, allowed: true }, "guest"],
    [{ signedIn: false, failed: true }, "guest"],
    [{ signedIn: true }, "checking"],
    [{ signedIn: true, allowed: false }, "denied"],
    [{ signedIn: true, failed: true }, "error"],
    [{ signedIn: true, allowed: true, failed: true }, "error"],
    [{ signedIn: true, allowed: true }, "owner"],
  ] as const)("%j => %s", (input, expected) => {
    expect(finnHomeState(input)).toBe(expected);
  });

  it("lists advisory capabilities without granting deployment or database access", () => {
    expect(FINN_HOME_CAPABILITIES).toHaveLength(3);
    expect(FINN_HOME_CAPABILITIES.map((item) => item.en)).toEqual([
      "Write and review code",
      "Analyze supplied errors",
      "Design automation plans",
    ]);
  });
});
