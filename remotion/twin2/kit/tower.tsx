/** برج نقل ضغط عالٍ (شبكيّ) بمنظر جانبيّ مبسّط. الإحداثيات: القاعدة (x, baseY)، الارتفاع h. */
import React from "react";
import type { V } from "../characters/rig";

export interface TowerGeom {
  lattice: string;
  armsPath: string;
  tips: { left: V[]; right: V[] };
  insul: Array<{ x: number; y: number; side: -1 | 1 }>;
  top: V;
}

const ARM_FR = [0.6, 0.72, 0.85] as const;
const ARM_LEN = [0.26, 0.3, 0.22] as const;

export const towerGeom = (x: number, baseY: number, h: number): TowerGeom => {
  const bw = 0.17 * h;
  const tw = 0.032 * h;
  const yTop = 0.88 * h;
  const w = (y: number): number =>
    y <= yTop ? bw + (tw - bw) * (y / yTop) : tw * (1 - (y - yTop) / (0.12 * h)) * 0.8 + 0.004 * h;
  const sections = 12;
  let lat = "";
  const ys: number[] = [];
  for (let i = 0; i <= sections; i++) ys.push((i / sections) * yTop);
  const P = (sx: number, y: number): string => `${(x + sx).toFixed(1)},${(baseY - y).toFixed(1)}`;
  // الساقان
  lat += `M${P(-w(0), 0)} L${P(-w(yTop), yTop)} L${P(0, h)} L${P(w(yTop), yTop)} L${P(w(0), 0)}`;
  for (let i = 0; i < sections; i++) {
    const y0 = ys[i];
    const y1 = ys[i + 1];
    lat += `M${P(-w(y0), y0)} L${P(w(y1), y1)}`;
    lat += `M${P(w(y0), y0)} L${P(-w(y1), y1)}`;
    lat += `M${P(-w(y1), y1)} L${P(w(y1), y1)}`;
  }
  const tipsL: V[] = [];
  const tipsR: V[] = [];
  const insul: TowerGeom["insul"] = [];
  let arms = "";
  ARM_FR.forEach((fr, k) => {
    const y = fr * h;
    const al = ARM_LEN[k] * h;
    const ww = w(y);
    const thick = 0.022 * h;
    for (const s of [-1, 1] as const) {
      arms += `M${P(s * ww, y + thick * 0.5)} L${P(s * al, y + thick * 0.2)} L${P(s * al, y - thick * 0.5)} L${P(s * ww, y - thick * 1.5)}Z`;
      const tipX = x + s * al;
      const tipY = baseY - (y - thick * 0.5) + 0.056 * h;
      insul.push({ x: tipX, y: baseY - (y - thick * 0.5), side: s });
      (s < 0 ? tipsL : tipsR).push([tipX, tipY]);
    }
  });
  return {
    lattice: lat,
    armsPath: arms,
    tips: { left: tipsL, right: tipsR },
    insul,
    top: [x, baseY - h],
  };
};

export const Tower: React.FC<{
  x: number;
  baseY: number;
  h: number;
  color: string;
  rim?: string;
  rimSide?: -1 | 1;
  lw?: number;
}> = ({ x, baseY, h, color, rim, rimSide = 1, lw }) => {
  const g = towerGeom(x, baseY, h);
  const sw = lw ?? Math.max(0.8, h / 140);
  const il = 0.056 * h;
  return (
    <g>
      <path
        d={g.lattice}
        stroke={color}
        strokeWidth={sw}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d={g.armsPath}
        fill={color}
        stroke={color}
        strokeWidth={sw * 0.6}
        strokeLinejoin="round"
      />
      {rim && (
        <path
          d={`M${x + rimSide * 0.17 * h},${baseY} L${x + rimSide * 0.032 * h},${baseY - 0.88 * h} L${x},${baseY - h}`}
          stroke={rim}
          strokeWidth={sw * 0.9}
          fill="none"
          strokeLinecap="round"
          opacity={0.85}
        />
      )}
      {g.insul.map((p, i) => (
        <g key={i}>
          <line x1={p.x} y1={p.y} x2={p.x} y2={p.y + il} stroke={color} strokeWidth={sw * 0.8} />
          {[0.2, 0.4, 0.6, 0.8].map((f, j) => (
            <rect
              key={j}
              x={p.x - sw * 1.6}
              y={p.y + il * f - sw * 0.5}
              width={sw * 3.2}
              height={sw * 0.9}
              fill={color}
            />
          ))}
        </g>
      ))}
    </g>
  );
};
