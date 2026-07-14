import { describe, expect, it } from "vitest";
import { HOTSPOTS } from "./NexiosCommandCenter";
import { REGION_ACCENT_HEX, REGIONS } from "@/lib/regions";

describe("NexiosCommandCenter artwork contract", () => {
  it("keeps the approved four-region palette exact", () => {
    expect(REGIONS.map((region) => region.id)).toEqual([
      "central",
      "western",
      "eastern",
      "southern",
    ]);
    expect(REGION_ACCENT_HEX).toEqual({
      central: "#3B82F6",
      western: "#22D3EE",
      eastern: "#22C55E",
      southern: "#F59E0B",
    });
  });

  it("exposes all 44 artwork controls as unique, labelled routes", () => {
    expect(HOTSPOTS).toHaveLength(44);
    expect(new Set(HOTSPOTS.map((hotspot) => hotspot.id)).size).toBe(HOTSPOTS.length);
    for (const hotspot of HOTSPOTS) {
      expect(hotspot.to).toMatch(/^\//);
      expect(hotspot.labelAr.trim()).not.toBe("");
      expect(hotspot.labelEn.trim()).not.toBe("");
      expect(hotspot.width).toBeGreaterThan(0);
      expect(hotspot.height).toBeGreaterThan(0);
    }
  });

  it("binds every regional control to its region colour", () => {
    const prefixes = {
      central: "central-",
      western: "west-",
      eastern: "east-",
      southern: "south-",
    } as const;

    for (const [region, prefix] of Object.entries(prefixes)) {
      const controls = HOTSPOTS.filter((hotspot) => hotspot.id.startsWith(prefix));
      expect(controls.length).toBeGreaterThan(0);
      expect(new Set(controls.map((hotspot) => hotspot.color))).toEqual(
        new Set([REGION_ACCENT_HEX[region as keyof typeof REGION_ACCENT_HEX]]),
      );
    }
  });
});
