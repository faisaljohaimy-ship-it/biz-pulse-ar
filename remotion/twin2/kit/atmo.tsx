/** الغلاف الجوّي: سماء، شمس، نجوم، سحب، جبال، ضباب، غبار معلّق. */
import React from "react";
import { clamp, hash1, mod, rng } from "./ease";
import { LinGrad, RadGrad, useUid, type Stop } from "./svgx";
import { alpha } from "./color";

export const Sky: React.FC<{ stops: Stop[]; w?: number; h?: number; x?: number; y?: number }> = ({
  stops,
  w = 1280,
  h = 720,
  x = 0,
  y = 0,
}) => {
  const id = useUid() + "sk";
  return (
    <g>
      <defs>
        <LinGrad id={id} stops={stops} />
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${id})`} />
    </g>
  );
};

export const Stars: React.FC<{
  seed?: number;
  count?: number;
  opacity: number;
  t: number;
  w?: number;
  h?: number;
}> = ({ seed = 7, count = 90, opacity, t, w = 1280, h = 420 }) => {
  if (opacity <= 0.01) return null;
  const r = rng(seed);
  const arr = Array.from({ length: count }, (_, i) => {
    const x = r() * w;
    const y = Math.pow(r(), 1.6) * h;
    const s = 0.5 + r() * 1.3;
    const ph = r() * 6.28;
    const tw = 0.65 + 0.35 * Math.sin(t * (0.9 + r() * 1.1) + ph + i);
    return { x, y, s, tw };
  });
  return (
    <g opacity={opacity}>
      {arr.map((s, i) => (
        <circle
          key={i}
          cx={s.x}
          cy={s.y}
          r={s.s}
          fill="#dff4ff"
          opacity={s.tw * (0.35 + 0.65 * (1 - s.y / h))}
        />
      ))}
    </g>
  );
};

/** شمس + هالة + أشعة. */
export const Sun: React.FC<{
  x: number;
  y: number;
  r: number;
  core?: string;
  halo?: string;
  rays?: number;
  t?: number;
  haloR?: number;
}> = ({ x, y, r, core = "#fff2d6", halo = "#ffb072", rays = 0.18, t = 0, haloR = 420 }) => {
  const id = useUid();
  const rayAngles = [-84, -68, -52, -36, -20, -6, 8, 22, 38, 54, 70, 86];
  return (
    <g>
      <defs>
        <RadGrad
          id={id + "h"}
          stops={[
            { o: 0, c: core, a: 0.9 },
            { o: 0.12, c: halo, a: 0.6 },
            { o: 0.45, c: halo, a: 0.16 },
            { o: 1, c: halo, a: 0 },
          ]}
        />
        <LinGrad
          id={id + "r"}
          x1={0}
          y1={0}
          x2={1}
          y2={0}
          stops={[
            { o: 0, c: core, a: 0.55 },
            { o: 0.55, c: halo, a: 0.12 },
            { o: 1, c: halo, a: 0 },
          ]}
        />
      </defs>
      <circle cx={x} cy={y} r={haloR} fill={`url(#${id}h)`} style={{ mixBlendMode: "screen" }} />
      {rays > 0 &&
        rayAngles.map((a, i) => {
          const ang = ((a + Math.sin(t * 0.35 + i) * 1.4 - 90) * Math.PI) / 180;
          const len = 1000;
          const wdt = 0.022 + (i % 3) * 0.01;
          const p1 = [x + Math.cos(ang - wdt) * len, y + Math.sin(ang - wdt) * len];
          const p2 = [x + Math.cos(ang + wdt) * len, y + Math.sin(ang + wdt) * len];
          return (
            <path
              key={i}
              d={`M${x},${y} L${p1[0].toFixed(1)},${p1[1].toFixed(1)} L${p2[0].toFixed(1)},${p2[1].toFixed(1)}Z`}
              fill={`url(#${id}r)`}
              opacity={rays * (0.6 + 0.4 * Math.sin(t * 0.5 + i * 1.7))}
              transform={`rotate(0 ${x} ${y})`}
              style={{ mixBlendMode: "screen" }}
            />
          );
        })}
      <circle cx={x} cy={y} r={r * 2.6} fill={`url(#${id}h)`} opacity={0.8} />
      <circle cx={x} cy={y} r={r} fill={core} />
    </g>
  );
};

/** حافّة جبال بضجيج متعدّد التوافقيات. */
export const ridgePath = (
  seed: number,
  x0: number,
  x1: number,
  baseY: number,
  amp: number,
  step = 14,
  freq = 1,
): string => {
  const r1 = hash1(seed) * 6.28;
  const r2 = hash1(seed + 3) * 6.28;
  const r3 = hash1(seed + 9) * 6.28;
  let d = `M${x0},900 L${x0},${baseY}`;
  for (let x = x0; x <= x1 + step; x += step) {
    const n =
      Math.sin(x * 0.0042 * freq + r1) * 0.55 +
      Math.sin(x * 0.0113 * freq + r2) * 0.28 +
      Math.sin(x * 0.0291 * freq + r3) * 0.12;
    d += ` L${x},${(baseY - (n + 0.6) * amp).toFixed(1)}`;
  }
  d += ` L${x1 + step},900Z`;
  return d;
};

/** ضباب أفقيّ: شريط متدرّج يتحرّك ببطء. */
export const FogBand: React.FC<{
  y: number;
  h: number;
  color: string;
  opacity: number;
  x?: number;
  w?: number;
}> = ({ y, h, color, opacity, x = -200, w = 1700 }) => {
  const id = useUid() + "fg";
  return (
    <g>
      <defs>
        <LinGrad
          id={id}
          stops={[
            { o: 0, c: color, a: 0 },
            { o: 0.5, c: color, a: opacity },
            { o: 1, c: color, a: 0 },
          ]}
        />
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${id})`} />
    </g>
  );
};

/** غبار/جسيمات عائمة حتميّة. */
export const Motes: React.FC<{
  t: number;
  count?: number;
  seed?: number;
  color?: string;
  area?: [number, number, number, number];
  opacity?: number;
  size?: number;
  drift?: number;
}> = ({
  t,
  count = 40,
  seed = 5,
  color = "#ffe2b8",
  area = [0, 150, 1280, 560],
  opacity = 0.6,
  size = 1.8,
  drift = 14,
}) => {
  const r = rng(seed);
  const [ax, ay, aw, ah] = area;
  return (
    <g style={{ mixBlendMode: "screen" }}>
      {Array.from({ length: count }, (_, i) => {
        const bx = r();
        const by = r();
        const sp = 0.3 + r() * 0.7;
        const rr = 0.5 + r() * 1.0;
        const ph = r() * 6.28;
        const x = ax + mod(bx * aw + t * drift * sp, aw);
        const y = ay + by * ah + Math.sin(t * 0.6 * sp + ph) * 14;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + ph));
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={size * rr}
            fill={color}
            opacity={opacity * tw * clamp(1 - by * 0.5)}
          />
        );
      })}
    </g>
  );
};

/** فينييت داكن بحواف الإطار. */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => {
  const id = useUid() + "vg";
  return (
    <g pointerEvents="none">
      <defs>
        <RadGrad
          id={id}
          cx={0.5}
          cy={0.5}
          r={0.75}
          stops={[
            { o: 0.55, c: "#02050d", a: 0 },
            { o: 1, c: "#02050d", a: strength },
          ]}
        />
      </defs>
      <rect x={0} y={0} width={1280} height={720} fill={`url(#${id})`} />
    </g>
  );
};

/** سحابة شريطيّة بحواف مريّشة (عدسة بتدرّج ألفا أفقيّ). */
export const Streak: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  opacity: number;
  under?: string;
}> = ({ x, y, w, h, color, opacity, under }) => {
  const id = useUid() + "st";
  return (
    <g>
      <defs>
        <LinGrad
          id={id}
          x1={0}
          y1={0}
          x2={1}
          y2={0}
          stops={[
            { o: 0, c: color, a: 0 },
            { o: 0.25, c: color, a: opacity },
            { o: 0.7, c: color, a: opacity * 0.8 },
            { o: 1, c: color, a: 0 },
          ]}
        />
        {under && (
          <LinGrad
            id={id + "u"}
            x1={0}
            y1={0}
            x2={1}
            y2={0}
            stops={[
              { o: 0, c: under, a: 0 },
              { o: 0.4, c: under, a: opacity * 0.9 },
              { o: 1, c: under, a: 0 },
            ]}
          />
        )}
      </defs>
      <path
        d={`M${x},${y} Q${x + w * 0.5},${y - h} ${x + w},${y} Q${x + w * 0.5},${y + h * 0.7} ${x},${y}Z`}
        fill={`url(#${id})`}
      />
      {under && (
        <path
          d={`M${x + w * 0.1},${y + h * 0.1} Q${x + w * 0.5},${y + h * 0.62} ${x + w * 0.92},${y + h * 0.06} Q${x + w * 0.5},${y + h * 0.3} ${x + w * 0.1},${y + h * 0.1}Z`}
          fill={`url(#${id}u)`}
        />
      )}
    </g>
  );
};
