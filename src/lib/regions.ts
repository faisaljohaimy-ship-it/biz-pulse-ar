/**
 * Industrial Security — the four Saudi regional administrations.
 * Every region hosts the SAME full Nexios system; only the active
 * sector/label changes. Keep this list ordered as it should appear
 * in the sidebar switcher.
 */
export type RegionId = "central" | "western" | "eastern" | "southern";

export interface Region {
  id: RegionId;
  labelAr: string;
  labelEn: string;
  shortAr: string;
  shortEn: string;
}

export const REGIONS: readonly Region[] = [
  {
    id: "central",
    labelAr: "الأمن الصناعي — المنطقة الوسطى",
    labelEn: "Industrial Security — Central Region",
    shortAr: "الوسطى",
    shortEn: "Central",
  },
  {
    id: "western",
    labelAr: "الأمن الصناعي — المنطقة الغربية",
    labelEn: "Industrial Security — Western Region",
    shortAr: "الغربية",
    shortEn: "Western",
  },
  {
    id: "eastern",
    labelAr: "الأمن الصناعي — المنطقة الشرقية",
    labelEn: "Industrial Security — Eastern Region",
    shortAr: "الشرقية",
    shortEn: "Eastern",
  },
  {
    id: "southern",
    labelAr: "الأمن الصناعي — المنطقة الجنوبية",
    labelEn: "Industrial Security — Southern Region",
    shortAr: "الجنوبية",
    shortEn: "Southern",
  },
] as const;

export const DEFAULT_REGION_ID: RegionId = "western";

/**
 * Per-region accent colour (RGB triplet, used by the icon/sector pulse halos —
 * see `--nx-region-rgb` in styles.css). Every pulsing icon across the app
 * breathes in the ACTIVE region's colour and updates live on region switch.
 */
export const REGION_ACCENT_RGB: Record<RegionId, string> = {
  central: "59, 130, 246", // royal blue
  western: "56, 189, 248", // sky blue
  eastern: "34, 197, 94", // green
  southern: "16, 185, 129", // emerald
};

/** Hex form of the region accent (for inline styles / SVG). */
export const REGION_ACCENT_HEX: Record<RegionId, string> = {
  central: "#3B82F6",
  western: "#38BDF8",
  eastern: "#22C55E",
  southern: "#10B981",
};

export function getRegion(id: RegionId): Region {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[1];
}
