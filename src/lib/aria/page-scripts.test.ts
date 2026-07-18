import { describe, expect, it } from "vitest";
import { pageScriptFor } from "./page-scripts";

describe("pageScriptFor", () => {
  it("matches an exact route and its descendants", () => {
    expect(pageScriptFor("/sec/incidents")).not.toBeNull();
    expect(pageScriptFor("/sec/incidents/123")).not.toBeNull();
  });

  it("does not match a route that only shares a string prefix", () => {
    expect(pageScriptFor("/security-unrelated")).toBeNull();
  });
});
