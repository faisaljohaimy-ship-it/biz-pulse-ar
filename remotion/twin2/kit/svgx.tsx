import React, { useId } from "react";

export const useUid = (): string => useId().replace(/[^a-zA-Z0-9]/g, "");

export interface Stop {
  o: number;
  c: string;
  a?: number;
}

export const LinGrad: React.FC<{
  id: string;
  stops: Stop[];
  x1?: number | string;
  y1?: number | string;
  x2?: number | string;
  y2?: number | string;
  units?: "objectBoundingBox" | "userSpaceOnUse";
}> = ({ id, stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1, units = "objectBoundingBox" }) => (
  <linearGradient id={id} gradientUnits={units} x1={x1} y1={y1} x2={x2} y2={y2}>
    {stops.map((s, i) => (
      <stop key={i} offset={s.o} stopColor={s.c} stopOpacity={s.a ?? 1} />
    ))}
  </linearGradient>
);

export const RadGrad: React.FC<{
  id: string;
  stops: Stop[];
  cx?: number | string;
  cy?: number | string;
  r?: number | string;
  units?: "objectBoundingBox" | "userSpaceOnUse";
}> = ({ id, stops, cx = 0.5, cy = 0.5, r = 0.5, units = "objectBoundingBox" }) => (
  <radialGradient id={id} gradientUnits={units} cx={cx} cy={cy} r={r}>
    {stops.map((s, i) => (
      <stop key={i} offset={s.o} stopColor={s.c} stopOpacity={s.a ?? 1} />
    ))}
  </radialGradient>
);

/** مسار خطّي من نقاط. */
export const poly = (pts: ReadonlyArray<readonly [number, number]>, close = false): string =>
  pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("") +
  (close ? "Z" : "");

/** سلك معلّق بقطع مكافئ (يقرَّب بمنحنى تربيعيّ): sag = هبوط المنتصف. */
export const catenary = (x0: number, y0: number, x1: number, y1: number, sag: number): string => {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2 + sag * 2;
  return `Q${mx.toFixed(1)},${my.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
};
/** طول تقريبيّ لقطعٍ مكافئ. */
export const catenaryLen = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  sag: number,
): number => {
  const c = Math.hypot(x1 - x0, y1 - y0);
  return c + (8 / 3) * ((sag * sag) / Math.max(1, c));
};

/** نقطة على سلكٍ معلّق عند u ∈ [0,1]. */
export const catenaryAt = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  sag: number,
  u: number,
): [number, number] => {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2 + sag * 2;
  const a = (1 - u) * (1 - u);
  const b = 2 * (1 - u) * u;
  const c = u * u;
  return [a * x0 + b * mx + c * x1, a * y0 + b * my + c * y1];
};
