/**
 * لوحة الفيلم. ألوان المناطق الأربع من `REGION_ACCENT_HEX` (المرجع
 * الجغرافي الوحيد) — لا قيمة منها مكتوبة هنا. الباقي كحليٌّ سينمائيّ
 * داكن ودرجات سماويّة/زمرديّة مشتقّة من ألوان المناطق نفسها بالمزج.
 */
import { REGION_ACCENT_HEX, type RegionId } from "@/lib/regions";

export type RGB = readonly [number, number, number];

const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const mixRGB = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export const REGION_RGB: Record<RegionId, RGB> = {
  central: hex(REGION_ACCENT_HEX.central),
  western: hex(REGION_ACCENT_HEX.western),
  eastern: hex(REGION_ACCENT_HEX.eastern),
  southern: hex(REGION_ACCENT_HEX.southern),
};

/** كحليّ الخلفية: لا أسود صرف ولا أبيض يغمر الإطار. */
export const NAVY_DEEP: RGB = [3, 8, 18];
export const NAVY: RGB = [7, 17, 34];
export const NAVY_LIFT: RGB = [14, 32, 58];
/** ضوء بارد للحواف: السماويّ ممزوجًا ببياضٍ مكسور. */
export const ICE: RGB = mixRGB(REGION_RGB.western, [255, 255, 255], 0.55);
export const CYAN: RGB = REGION_RGB.western;
export const EMERALD: RGB = REGION_RGB.eastern;
export const MINT: RGB = mixRGB(REGION_RGB.eastern, [255, 255, 255], 0.45);

export const rgba = (c: RGB, a: number): string =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a.toFixed(3)})`;
