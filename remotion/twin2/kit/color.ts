export type RGB = readonly [number, number, number];

export const hexToRgb = (h: string): RGB => {
  const s = h.replace("#", "");
  const n = parseInt(s.length === 3 ? s.replace(/./g, "$&$&") : s, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const rgbToHex = (c: RGB): string =>
  "#" +
  c
    .map((v) =>
      Math.round(Math.min(255, Math.max(0, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");

/** مزج لونين hex بنسبة t. */
export const mix = (a: string, b: string, t: number): string => {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
};
export const lighten = (c: string, t: number): string => mix(c, "#ffffff", t);
export const darken = (c: string, t: number): string => mix(c, "#000000", t);
/** rgba من hex وشفافيّة. */
export const alpha = (c: string, a: number): string => {
  const [r, g, b] = hexToRgb(c);
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
};
