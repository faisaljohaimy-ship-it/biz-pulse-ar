// @vitest-environment node
import { describe, expect, it } from "vitest";
import { crossSerialize, serialize } from "seroval";

describe("RegExp data embedded in an SSR script (GHSA-9wx9-5pv9-3349)", () => {
  // An inert character class can contain a literal HTML script end tag.
  const pattern = new RegExp("[</ScRiPt>]", "i");
  it.each([
    ["standalone", () => serialize(pattern)],
    ["cross-reference", () => crossSerialize(pattern)],
  ] as const)("%s serialization keeps the data inside the script element", (_mode, encode) => {
    expect(encode()).not.toMatch(/<\/script[\t\n\f\r />]/i);
  });
});
