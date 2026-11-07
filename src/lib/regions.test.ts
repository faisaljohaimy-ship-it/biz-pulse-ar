import { describe, expect, it } from "vitest";
import { DEFAULT_REGION_ID, getRegion, REGIONS, type RegionId } from "./regions";

describe("getRegion", () => {
  it("returns the requested region for each known ID", () => {
    for (const region of REGIONS) {
      expect(getRegion(region.id)).toBe(region);
    }
  });

  it("falls back to the declared default when a persisted region is unrecognized", () => {
    const expected = REGIONS.find((r) => r.id === DEFAULT_REGION_ID);
    expect(REGIONS[0].id).toBe(DEFAULT_REGION_ID);
    expect(expected).toBeDefined();
    expect(getRegion("unknown" as RegionId)).toBe(expected);
    expect(getRegion("" as RegionId)).toBe(expected);
  });
});
