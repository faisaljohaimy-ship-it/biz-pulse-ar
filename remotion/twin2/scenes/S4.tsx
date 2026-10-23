/**
 * S4 — التوأم الرقمي (38.0–50.0 ث). المحطة بإسقاطٍ متساوي القياس (2:1) تُرسم مرّتين:
 * «طلاء» (ألوان مسطّحة) و«شبكة» (حواف متوهّجة)، وموجةُ مسحٍ بيضاويّةٌ على الأرض تحوّل الأولى إلى الثانية.
 * ثم عُقَد الحسّاسات: 41.0 نبضات بالترتيب · 44.0 كهرمانيّ ثم أحمر · 46.0 توجيه الحارس · 48.0 عودة للأخضر.
 * الحارسان «الحقيقيان» يبقيان ملوَّنين فوق التوأم. يُستعمل المكوّن نفسه في S5 (الابتعاد).
 */
import React from "react";
import { Guard, LOOKS } from "../characters/Guard";
import { blendPose, standSide } from "../characters/rig";
import { radioToMouth, walkPose } from "../characters/poses";
import { alpha, darken, lighten, mix } from "../kit/color";
import {
  clamp,
  easeInOut,
  easeInOutSoft,
  easeOut,
  hash1,
  keyframes,
  lerp,
  mod,
  prog,
  ramp,
} from "../kit/ease";
import { LinGrad, RadGrad, useUid } from "../kit/svgx";
import { C } from "../palette";
import type { V } from "../characters/rig";

// ——— الإسقاط ———
export const GX = 20;
export const GY = 14;
const A = 25;
const CX0 = 640;
const CY0 = 420;
const proj = (x: number, y: number, z = 0): V => [
  CX0 + (x - y - (10 - 7)) * A,
  CY0 + (x + y - 17) * (A / 2) - z * A * 0.92,
];
export const stationScreen = (x: number, y: number, z = 0): V => proj(x, y, z);
const P = (pts: Array<[number, number, number]>): string =>
  pts
    .map(
      (p, i) =>
        `${i ? "L" : "M"}${proj(p[0], p[1], p[2])
          .map((v) => v.toFixed(1))
          .join(",")}`,
    )
    .join("") + "Z";
const L3 = (pts: Array<[number, number, number]>): string =>
  pts
    .map(
      (p, i) =>
        `${i ? "L" : "M"}${proj(p[0], p[1], p[2])
          .map((v) => v.toFixed(1))
          .join(",")}`,
    )
    .join("");

interface Cs {
  top: string;
  left: string;
  right: string;
}
const CS = {
  slab: { top: "#1b3556", left: "#10233f", right: "#0b1b33" },
  yard: { top: "#24446b", left: "#10233f", right: "#0b1b33" },
  road: { top: "#0e1c33", left: "#0e1c33", right: "#0e1c33" },
  bld: { top: "#4a74a6", left: "#335c8c", right: "#234470" },
  bldRoof: { top: "#2c4d78", left: "#233f66", right: "#1a3050" },
  trf: { top: "#5b86b3", left: "#3b648f", right: "#27486d" },
  rad: { top: "#34587f", left: "#24415f", right: "#1a314c" },
  ins: { top: "#dcebf8", left: "#a9c6e0", right: "#7ea1c2" },
  post: { top: "#8fb2d4", left: "#5e84aa", right: "#3f6188" },
  car: { top: "#e8f0f7", left: "#b8c8d8", right: "#8fa4b9" },
  glass: { top: "#16304f", left: "#0c1e36", right: "#08162a" },
  pad: { top: "#2a4d77", left: "#1a3355", right: "#122644" },
  booth: { top: "#6a93bd", left: "#46709b", right: "#2f5176" },
} as const;

interface Obj {
  id: string;
  d: number; // مفتاح الترتيب
  faces: Array<{ path: string; c: string; k: "top" | "left" | "right" | "flat"; edge?: boolean }>;
  lines?: Array<{ path: string; c: string; w: number }>;
  extra?: React.ReactNode;
}

const boxObj = (
  id: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z0: number,
  z1: number,
  cs: Cs,
): Obj => ({
  id,
  d: (x0 + x1 + y0 + y1) / 2 + z1 * 0.01,
  faces: [
    {
      path: P([
        [x0, y1, z0],
        [x1, y1, z0],
        [x1, y1, z1],
        [x0, y1, z1],
      ]),
      c: cs.left,
      k: "left",
    },
    {
      path: P([
        [x1, y0, z0],
        [x1, y1, z0],
        [x1, y1, z1],
        [x1, y0, z1],
      ]),
      c: cs.right,
      k: "right",
    },
    {
      path: P([
        [x0, y0, z1],
        [x1, y0, z1],
        [x1, y1, z1],
        [x0, y1, z1],
      ]),
      c: cs.top,
      k: "top",
    },
  ],
});

const flatObj = (id: string, pts: Array<[number, number]>, z: number, c: string, d = -5): Obj => ({
  id,
  d,
  faces: [{ path: P(pts.map((p) => [p[0], p[1], z] as [number, number, number])), c, k: "flat" }],
});

/** حقول النوافذ على وجه صندوق (واجهة x=x1 «يمين» أو y=y1 «يسار»). */
const windowsOn = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  z0: number,
  z1: number,
  side: "left" | "right",
  cols: number,
  rows: number,
  litAt: (i: number) => number,
): Array<{ path: string; lit: number }> => {
  const out: Array<{ path: string; lit: number }> = [];
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const fu0 = (c + 0.2) / cols;
      const fu1 = (c + 0.8) / cols;
      const fz0 = z0 + ((r + 0.25) / rows) * (z1 - z0);
      const fz1 = z0 + ((r + 0.75) / rows) * (z1 - z0);
      let pts: Array<[number, number, number]>;
      if (side === "left") {
        const xa = lerp(x0, x1, fu0);
        const xb = lerp(x0, x1, fu1);
        pts = [
          [xa, y1, fz0],
          [xb, y1, fz0],
          [xb, y1, fz1],
          [xa, y1, fz1],
        ];
      } else {
        const ya = lerp(y0, y1, fu0);
        const yb = lerp(y0, y1, fu1);
        pts = [
          [x1, ya, fz0],
          [x1, yb, fz0],
          [x1, yb, fz1],
          [x1, ya, fz1],
        ];
      }
      out.push({ path: P(pts), lit: litAt(n++) });
    }
  }
  return out;
};

const buildObjs = (): Obj[] => {
  const o: Obj[] = [];
  // الأرضيّة والطرق
  o.push({
    id: "slab",
    d: -10,
    faces: [
      {
        path: P([
          [0, GY, -0.6],
          [GX, GY, -0.6],
          [GX, GY, 0],
          [0, GY, 0],
        ]),
        c: CS.slab.left,
        k: "left",
      },
      {
        path: P([
          [GX, 0, -0.6],
          [GX, GY, -0.6],
          [GX, GY, 0],
          [GX, 0, 0],
        ]),
        c: CS.slab.right,
        k: "right",
      },
      {
        path: P([
          [0, 0, 0],
          [GX, 0, 0],
          [GX, GY, 0],
          [0, GY, 0],
        ]),
        c: CS.slab.top,
        k: "top",
      },
    ],
  });
  o.push(
    flatObj(
      "yardA",
      [
        [9.2, 1.4],
        [18.6, 1.4],
        [18.6, 5.6],
        [9.2, 5.6],
      ],
      0.02,
      CS.yard.top,
      -9,
    ),
  );
  o.push(
    flatObj(
      "road1",
      [
        [7, 6.4],
        [GX, 6.4],
        [GX, 7.6],
        [7, 7.6],
      ],
      0.03,
      CS.road.top,
      -8,
    ),
  );
  o.push(
    flatObj(
      "road2",
      [
        [6.2, 1.2],
        [7.4, 1.2],
        [7.4, 12.8],
        [6.2, 12.8],
      ],
      0.03,
      CS.road.top,
      -8,
    ),
  );
  o.push(
    flatObj(
      "road3",
      [
        [7, 12],
        [14.5, 12],
        [14.5, 13],
        [7, 13],
      ],
      0.03,
      CS.road.top,
      -8,
    ),
  );
  o.push(
    flatObj(
      "road4",
      [
        [12.6, 7.6],
        [13.6, 7.6],
        [13.6, 12.4],
        [12.6, 12.4],
      ],
      0.03,
      CS.road.top,
      -8,
    ),
  );
  o.push(
    flatObj(
      "pad",
      [
        [2.2, 9],
        [5.2, 9],
        [5.2, 12],
        [2.2, 12],
      ],
      0.04,
      CS.pad.top,
      -7,
    ),
  );
  o.push(
    flatObj(
      "park",
      [
        [14.6, 9],
        [18.2, 9],
        [18.2, 12.2],
        [14.6, 12.2],
      ],
      0.03,
      "#16294a",
      -7,
    ),
  );
  // مبنى التحكّم (طابقان) + سطحه
  o.push(boxObj("ctrl", 1.6, 1.4, 6.0, 5.4, 0, 2.7, CS.bld));
  o.push(boxObj("ctrlRoof", 2.4, 2.2, 3.6, 3.4, 2.7, 3.2, CS.bldRoof));
  o.push(boxObj("ctrlRoof2", 4.2, 3.4, 5.4, 4.6, 2.7, 3.1, CS.bldRoof));
  o.push(boxObj("antenna", 4.8, 2.0, 4.95, 2.15, 2.7, 4.4, CS.post));
  // محوّلات وبوشنغ
  [
    [10.2, 2.0],
    [13.2, 2.0],
    [16.2, 2.0],
  ].forEach(([x, y], i) => {
    o.push(boxObj("trf" + i, x, y, x + 1.9, y + 1.7, 0, 1.25, CS.trf));
    o.push(boxObj("rad" + i, x - 0.5, y + 0.15, x, y + 1.55, 0, 0.95, CS.rad));
    [0.25, 0.9, 1.55].forEach((dy, j) =>
      o.push(
        boxObj(`bush${i}${j}`, x + 1.2, y + dy - 0.1, x + 1.4, y + dy + 0.1, 1.25, 2.4, CS.ins),
      ),
    );
  });
  // بوّابات الجهد
  [9.4, 18.4].forEach((gx, i) => {
    o.push(boxObj("gp" + i + "a", gx, 5.0, gx + 0.22, 5.22, 0, 2.9, CS.post));
    o.push(boxObj("gp" + i + "b", gx, 0.5, gx + 0.22, 0.72, 0, 2.9, CS.post));
    o.push(boxObj("gb" + i, gx - 0.06, 0.5, gx + 0.28, 5.22, 2.9, 3.1, CS.post));
  });
  // مركبات
  o.push(boxObj("car1", 15.2, 10.0, 17.2, 11.0, 0, 0.5, CS.car));
  o.push(boxObj("car1c", 15.8, 10.1, 16.8, 10.9, 0.5, 0.95, CS.glass));
  o.push(
    boxObj("car2", 15.0, 8.9, 16.8, 9.6, 0, 0.45, {
      top: "#2b6cb0",
      left: "#235a94",
      right: "#1b4676",
    }),
  );
  // مقصورة البوّابة والحاجز
  o.push(boxObj("booth", 18.2, 4.6, 19.4, 5.8, 0, 1.5, CS.booth));
  o.push(boxObj("boothRoof", 18.0, 4.4, 19.6, 6.0, 1.5, 1.68, CS.bldRoof));
  o.push(boxObj("barPost", 19.0, 6.15, 19.3, 6.4, 0, 0.9, CS.post));
  o.push(
    boxObj("barArm", 19.0, 6.25, 19.3, 8.1, 0.9, 1.04, {
      top: "#fff",
      left: "#e86a6a",
      right: "#c64545",
    }),
  );
  // خزانات
  o.push(boxObj("tank1", 8.2, 9.4, 10.4, 11.4, 0, 1.4, CS.rad));
  o.push(boxObj("tank2", 8.4, 6.0, 9.8, 7.0, 0, 0.9, CS.rad));
  return o;
};
const OBJS = buildObjs().sort((a, b) => a.d - b.d);

// أبراج النقل (خارج السياج) — خطوط ثلاثيّة الأبعاد
const towerLines = (cx: number, cy: number, h: number, w0: number, w1: number): string => {
  const rings = 6;
  const pt = (k: number, i: number): [number, number, number] => {
    const f = k / rings;
    const w = lerp(w0, w1, f);
    const sx = i === 0 || i === 3 ? -1 : 1;
    const sy = i < 2 ? -1 : 1;
    return [cx + sx * w, cy + sy * w, f * h];
  };
  let d = "";
  for (let i = 0; i < 4; i++) d += L3([pt(0, i), pt(rings, i)]);
  for (let k = 0; k <= rings; k++) d += L3([pt(k, 0), pt(k, 1), pt(k, 2), pt(k, 3), pt(k, 0)]);
  for (let k = 0; k < rings; k++) {
    d += L3([pt(k, 0), pt(k + 1, 1)]) + L3([pt(k, 1), pt(k + 1, 0)]);
    d += L3([pt(k, 2), pt(k + 1, 3)]) + L3([pt(k, 3), pt(k + 1, 2)]);
    d += L3([pt(k, 1), pt(k + 1, 2)]) + L3([pt(k, 2), pt(k + 1, 1)]);
  }
  return d;
};
const TOWERS: Array<[number, number]> = [
  [-3.2, 3.0],
  [-3.2, 10.5],
];
const TW_H = 8.2;

// الحسّاسات (عُقَد)
interface NodeDef {
  id: string;
  x: number;
  y: number;
  z: number;
  kind: "cam" | "temp" | "fence" | "gate" | "door";
}
export const NODES: NodeDef[] = [
  { id: "n0", x: 19.4, y: 6.8, z: 2.0, kind: "gate" },
  { id: "n1", x: 1.0, y: 1.0, z: 3.2, kind: "cam" },
  { id: "n2", x: 19.0, y: 1.0, z: 3.2, kind: "cam" },
  { id: "n3", x: 11.1, y: 2.9, z: 2.9, kind: "temp" },
  { id: "n4", x: 14.1, y: 2.9, z: 2.9, kind: "temp" },
  { id: "n5", x: 17.1, y: 2.9, z: 2.9, kind: "temp" },
  { id: "n6", x: 4.0, y: 5.4, z: 1.6, kind: "door" },
  { id: "n7", x: 13.2, y: 13.3, z: 1.7, kind: "fence" }, // العقدة التي تُنذر
  { id: "n8", x: 3.6, y: 10.5, z: 1.6, kind: "cam" },
  { id: "n9", x: 19.0, y: 13.0, z: 3.2, kind: "cam" },
];
const ALARM_ID = "n7";
const CTRL: [number, number, number] = [3.8, 3.4, 3.4];

export const nodeScreen = (n: NodeDef): V => proj(n.x, n.y, n.z);

// مسار الحارس على الأرض (إحداثيّات شبكة)
const GUARD_PATH: Array<[number, number]> = [
  [6.7, 5.7],
  [6.8, 7.0],
  [13.1, 7.0],
  [13.1, 12.5],
];
const pathLen = (): number[] => {
  const ls = [0];
  for (let i = 1; i < GUARD_PATH.length; i++)
    ls.push(
      ls[i - 1] +
        Math.hypot(
          GUARD_PATH[i][0] - GUARD_PATH[i - 1][0],
          GUARD_PATH[i][1] - GUARD_PATH[i - 1][1],
        ),
    );
  return ls;
};
const PL = pathLen();
const pathAt = (u: number): { x: number; y: number; dir: V } => {
  const d = clamp(u) * PL[PL.length - 1];
  let i = 1;
  while (i < PL.length - 1 && d > PL[i]) i++;
  const f = (d - PL[i - 1]) / (PL[i] - PL[i - 1]);
  const a = GUARD_PATH[i - 1];
  const b = GUARD_PATH[i];
  return { x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f), dir: [b[0] - a[0], b[1] - a[1]] };
};

// ——— رسم الأجسام بنمطين ———
const PaintLayer: React.FC<{ t: number; id: string }> = ({ t, id }) => {
  const winLit = (i: number) => (hash1(i * 3.7) < 0.55 ? 1 : 0);
  return (
    <g>
      {OBJS.map((ob) => (
        <g key={ob.id}>
          {ob.faces.map((f, i) => (
            <path key={i} d={f.path} fill={f.c} />
          ))}
          {ob.id === "ctrl" && (
            <g>
              {windowsOn(1.6, 1.4, 6.0, 5.4, 0.35, 2.4, "left", 5, 2, winLit).map((w, i) => (
                <path
                  key={"l" + i}
                  d={w.path}
                  fill={w.lit ? "#ffd88a" : "#16304f"}
                  opacity={w.lit ? 0.95 : 0.9}
                />
              ))}
              {windowsOn(1.6, 1.4, 6.0, 5.4, 0.35, 2.4, "right", 4, 2, (i) => winLit(i + 9)).map(
                (w, i) => (
                  <path
                    key={"r" + i}
                    d={w.path}
                    fill={w.lit ? "#ffd88a" : "#16304f"}
                    opacity={w.lit ? 0.9 : 0.9}
                  />
                ),
              )}
            </g>
          )}
          {ob.id === "booth" &&
            windowsOn(18.2, 4.6, 19.4, 5.8, 0.5, 1.3, "left", 1, 1, () => 1).map((w, i) => (
              <path key={i} d={w.path} fill="#ffe0a0" />
            ))}
        </g>
      ))}
      {/* سياج */}
      <g>
        {[
          [0, 0, GX, 0],
          [0, 0, 0, GY],
          [GX, 0, GX, GY],
          [0, GY, GX, GY],
        ].map(([x0, y0, x1, y1], i) => {
          const ix = (v: number, lo: number, hi: number) =>
            v === lo ? v + 0.55 : v === hi ? v - 0.55 : v;
          const a: [number, number] = [ix(x0, 0, GX), ix(y0, 0, GY)];
          const b: [number, number] = [ix(x1, 0, GX), ix(y1, 0, GY)];
          return (
            <path
              key={i}
              d={P([
                [a[0], a[1], 0],
                [b[0], b[1], 0],
                [b[0], b[1], 1.15],
                [a[0], a[1], 1.15],
              ])}
              fill={alpha("#a9cfe6", 0.1)}
              stroke={alpha("#a9cfe6", 0.55)}
              strokeWidth={1}
            />
          );
        })}
        {Array.from({ length: 11 }).map((_, i) => {
          const x = 0.55 + i * 1.89;
          return (
            <g key={i}>
              <path
                d={L3([
                  [x, GY - 0.55, 0],
                  [x, GY - 0.55, 1.3],
                ])}
                stroke="#5d7da0"
                strokeWidth={1.6}
              />
              <path
                d={L3([
                  [x, 0.55, 0],
                  [x, 0.55, 1.3],
                ])}
                stroke="#5d7da0"
                strokeWidth={1.6}
              />
            </g>
          );
        })}
        {Array.from({ length: 8 }).map((_, i) => {
          const y = 0.55 + i * 1.84;
          return (
            <g key={i}>
              <path
                d={L3([
                  [GX - 0.55, y, 0],
                  [GX - 0.55, y, 1.3],
                ])}
                stroke="#5d7da0"
                strokeWidth={1.6}
              />
              <path
                d={L3([
                  [0.55, y, 0],
                  [0.55, y, 1.3],
                ])}
                stroke="#5d7da0"
                strokeWidth={1.6}
              />
            </g>
          );
        })}
      </g>
      {/* أبراج + أسلاك */}
      {TOWERS.map(([cx, cy], i) => (
        <path
          key={i}
          d={towerLines(cx, cy, TW_H, 0.9, 0.18)}
          stroke="#6f93b8"
          strokeWidth={1.2}
          fill="none"
        />
      ))}
      <path
        d={`${L3([
          [-3.2, 3.0, 7.6],
          [9.4, 2.6, 3.1],
        ])} ${L3([
          [-3.2, 3.0, 6.6],
          [9.4, 3.2, 3.1],
        ])}`}
        stroke="#6f93b8"
        strokeWidth={0.9}
        fill="none"
      />
      {/* أعمدة كاميرات */}
      {[
        [1, 1],
        [19, 1],
        [19, 13],
        [3.6, 10.5],
      ].map(([x, y], i) => (
        <g key={i}>
          <path
            d={L3([
              [x, y, 0],
              [x, y, 3.0],
            ])}
            stroke="#8fb2d4"
            strokeWidth={2.4}
          />
          <path
            d={P([
              [x - 0.3, y - 0.2, 3.0],
              [x + 0.3, y - 0.2, 3.0],
              [x + 0.3, y + 0.2, 3.0],
              [x - 0.3, y + 0.2, 3.0],
            ])}
            fill="#1b3556"
          />
        </g>
      ))}
      {/* منصّة الإقلاع */}
      <path
        d={P(
          Array.from(
            { length: 24 },
            (_, i) =>
              [
                3.7 + Math.cos((i / 24) * 6.2832) * 1.2,
                10.5 + Math.sin((i / 24) * 6.2832) * 1.2,
                0.05,
              ] as [number, number, number],
          ),
        )}
        fill="none"
        stroke="#8fb2d4"
        strokeWidth={1.4}
        opacity={0.8}
      />
      <text x={0} y={0} fontSize={0} />
      <rect width={0} height={0} id={id} />
    </g>
  );
};

const WireLayer: React.FC<{ t: number; gridOn: number }> = ({ t, gridOn }) => {
  const stroke = "#62e3f5";
  return (
    <g>
      {/* شبكة الأرض */}
      <g opacity={gridOn}>
        <path
          d={P([
            [0, 0, 0],
            [GX, 0, 0],
            [GX, GY, 0],
            [0, GY, 0],
          ])}
          fill="rgba(6,24,52,0.78)"
          stroke={stroke}
          strokeWidth={1.6}
          opacity={0.9}
        />
        {Array.from({ length: GX - 1 }).map((_, i) => (
          <path
            key={"gx" + i}
            d={L3([
              [i + 1, 0, 0],
              [i + 1, GY, 0],
            ])}
            stroke={stroke}
            strokeWidth={(i + 1) % 5 === 0 ? 0.9 : 0.5}
            opacity={(i + 1) % 5 === 0 ? 0.3 : 0.14}
          />
        ))}
        {Array.from({ length: GY - 1 }).map((_, i) => (
          <path
            key={"gy" + i}
            d={L3([
              [0, i + 1, 0],
              [GX, i + 1, 0],
            ])}
            stroke={stroke}
            strokeWidth={(i + 1) % 5 === 0 ? 0.9 : 0.5}
            opacity={(i + 1) % 5 === 0 ? 0.3 : 0.14}
          />
        ))}
        <path
          d={P([
            [0, GY, -0.6],
            [GX, GY, -0.6],
            [GX, GY, 0],
            [0, GY, 0],
          ])}
          fill="rgba(34,211,238,0.08)"
          stroke={stroke}
          strokeWidth={1}
          opacity={0.7}
        />
        <path
          d={P([
            [GX, 0, -0.6],
            [GX, GY, -0.6],
            [GX, GY, 0],
            [GX, 0, 0],
          ])}
          fill="rgba(34,211,238,0.05)"
          stroke={stroke}
          strokeWidth={1}
          opacity={0.7}
        />
      </g>
      {OBJS.filter((o) => o.id !== "slab").map((ob) => (
        <g key={ob.id}>
          {ob.faces.map((f, i) => {
            if (f.k === "flat")
              return (
                <path
                  key={i}
                  d={f.path}
                  fill="rgba(34,211,238,0.05)"
                  stroke={stroke}
                  strokeWidth={0.9}
                  opacity={0.5}
                />
              );
            const fa = f.k === "top" ? 0.16 : f.k === "left" ? 0.075 : 0.045;
            return (
              <path
                key={i}
                d={f.path}
                fill={`rgba(40,200,235,${fa})`}
                stroke={stroke}
                strokeWidth={1.25}
                strokeLinejoin="round"
                opacity={0.95}
              />
            );
          })}
        </g>
      ))}
      {/* نوافذ مبنى التحكّم كشبكة */}
      {windowsOn(1.6, 1.4, 6.0, 5.4, 0.35, 2.4, "left", 5, 2, () => 1).map((w, i) => (
        <path
          key={"wl" + i}
          d={w.path}
          fill="rgba(122,232,247,0.18)"
          stroke={stroke}
          strokeWidth={0.7}
          opacity={0.8}
        />
      ))}
      {windowsOn(1.6, 1.4, 6.0, 5.4, 0.35, 2.4, "right", 4, 2, () => 1).map((w, i) => (
        <path
          key={"wr" + i}
          d={w.path}
          fill="rgba(122,232,247,0.12)"
          stroke={stroke}
          strokeWidth={0.7}
          opacity={0.7}
        />
      ))}
      {/* سياج */}
      {[
        [0.55, 0.55, GX - 0.55, 0.55],
        [0.55, 0.55, 0.55, GY - 0.55],
        [GX - 0.55, 0.55, GX - 0.55, GY - 0.55],
        [0.55, GY - 0.55, GX - 0.55, GY - 0.55],
      ].map(([x0, y0, x1, y1], i) => (
        <g key={i}>
          <path
            d={P([
              [x0, y0, 0],
              [x1, y1, 0],
              [x1, y1, 1.15],
              [x0, y0, 1.15],
            ])}
            fill="rgba(34,211,238,0.05)"
            stroke={stroke}
            strokeWidth={1}
            opacity={0.7}
          />
        </g>
      ))}
      {TOWERS.map(([cx, cy], i) => (
        <path
          key={i}
          d={towerLines(cx, cy, TW_H, 0.9, 0.18)}
          stroke={stroke}
          strokeWidth={1}
          fill="none"
          opacity={0.9}
        />
      ))}
      <path
        d={`${L3([
          [-3.2, 3.0, 7.6],
          [9.4, 2.6, 3.1],
        ])} ${L3([
          [-3.2, 3.0, 6.6],
          [9.4, 3.2, 3.1],
        ])}`}
        stroke={stroke}
        strokeWidth={1}
        fill="none"
        opacity={0.7}
      />
      {[
        [1, 1],
        [19, 1],
        [19, 13],
        [3.6, 10.5],
      ].map(([x, y], i) => (
        <g key={i}>
          <path
            d={L3([
              [x, y, 0],
              [x, y, 3.0],
            ])}
            stroke={stroke}
            strokeWidth={1.8}
            opacity={0.9}
          />
          <path
            d={P([
              [x - 0.3, y - 0.2, 3.0],
              [x + 0.3, y - 0.2, 3.0],
              [x + 0.3, y + 0.2, 3.0],
              [x - 0.3, y + 0.2, 3.0],
            ])}
            fill="rgba(34,211,238,0.35)"
            stroke={stroke}
            strokeWidth={1}
          />
          {/* مخروط رؤية مماسح على الأرض */}
          {(() => {
            const base = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, -Math.PI * 0.25][i];
            const sw = Math.sin(t * 1.4 + i * 1.9) * 0.35;
            const r = 4.6;
            const a0 = base + sw - 0.34;
            const a1 = base + sw + 0.34;
            const dir = i === 0 ? 1 : 1;
            void dir;
            return (
              <path
                d={P([
                  [x, y, 0.05],
                  [x + Math.cos(a0) * r, y + Math.sin(a0) * r, 0.05],
                  [x + Math.cos(a1) * r, y + Math.sin(a1) * r, 0.05],
                ])}
                fill="rgba(34,211,238,0.10)"
                stroke={stroke}
                strokeWidth={0.6}
                opacity={0.55}
              />
            );
          })()}
        </g>
      ))}
    </g>
  );
};

// ——— العقد والمؤشّرات ———
type NState = "ok" | "ping" | "warn" | "danger" | "fixed";

const Marker: React.FC<{ n: NodeDef; t: number; state: NState; on: number; ringP: number }> = ({
  n,
  t,
  state,
  on,
  ringP,
}) => {
  if (on <= 0.001) return null;
  const [sx, sy] = proj(n.x, n.y, n.z);
  const [bx, by] = proj(n.x, n.y, 0.05);
  const col =
    state === "warn"
      ? C.amber
      : state === "danger"
        ? C.danger
        : state === "fixed"
          ? C.emerald
          : C.cyan;
  const soft =
    state === "warn"
      ? C.amberSoft
      : state === "danger"
        ? C.dangerSoft
        : state === "fixed"
          ? C.mint
          : C.cyanSoft;
  const r = 8 * easeOut(clamp(on)) * (state === "danger" ? 1.15 : 1);
  const pulse =
    state === "danger"
      ? 0.5 + 0.5 * Math.sin(t * 9.4)
      : state === "warn"
        ? 0.5 + 0.5 * Math.sin(t * 5)
        : 0.5 + 0.5 * Math.sin(t * 2 + n.x);
  // شكل الدلالة: دائرة سليم، مثلّث تحذير، مثمّن خطر
  const shape = (() => {
    if (state === "warn")
      return (
        <path
          d={`M0,${-r * 1.15} L${r * 1.05},${r * 0.8} L${-r * 1.05},${r * 0.8}Z`}
          fill={col}
          stroke="#fff"
          strokeWidth={1.4}
          strokeLinejoin="round"
        />
      );
    if (state === "danger") {
      const pts = Array.from(
        { length: 8 },
        (_, i) =>
          `${(Math.cos((i / 8) * 6.2832 + 0.3927) * r * 1.12).toFixed(1)},${(Math.sin((i / 8) * 6.2832 + 0.3927) * r * 1.12).toFixed(1)}`,
      ).join(" ");
      return (
        <polygon points={pts} fill={col} stroke="#fff" strokeWidth={1.4} strokeLinejoin="round" />
      );
    }
    return <circle r={r} fill={col} stroke="#fff" strokeWidth={1.4} />;
  })();
  const glyph = (() => {
    if (state === "warn")
      return (
        <path
          d="M0,-3 L0,2.2 M0,4.4 L0,4.6"
          stroke="#2a1a00"
          strokeWidth={1.8}
          strokeLinecap="round"
        />
      );
    if (state === "danger")
      return (
        <path
          d="M0,-4.4 L0,1.4 M0,4.2 L0,4.4"
          stroke="#fff"
          strokeWidth={2}
          strokeLinecap="round"
        />
      );
    if (state === "fixed")
      return (
        <path
          d="M-3.6,0.4 L-1,3 L3.8,-2.6"
          stroke="#06231a"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    return <circle r={2.6} fill="#05243a" />;
  })();
  return (
    <g opacity={on}>
      {/* عمود هولوغرافيّ */}
      <path
        d={`M${bx},${by} L${sx},${sy + r}`}
        stroke={col}
        strokeWidth={1.6}
        opacity={0.55}
        strokeDasharray="3 3"
      />
      {/* حلقات النبض على الأرض (دوائر ISO) */}
      {[0, 1].map((k) => {
        const u = mod(ringP + k * 0.5, 1);
        const rr = (0.3 + u * (state === "danger" ? 3.4 : 2.1)) * A;
        return (
          <ellipse
            key={k}
            cx={bx}
            cy={by}
            rx={rr * 1.41}
            ry={rr * 0.705}
            fill="none"
            stroke={col}
            strokeWidth={2 * (1 - u) + 0.4}
            opacity={(1 - u) * (state === "ok" || state === "fixed" ? 0.55 : 0.85)}
          />
        );
      })}
      <ellipse cx={bx} cy={by} rx={7} ry={3.5} fill={col} opacity={0.45} />
      <circle cx={sx} cy={sy} r={r + 9 + pulse * 5} fill={col} opacity={0.2 + 0.1 * pulse} />
      <g transform={`translate(${sx} ${sy})`}>
        {shape}
        {glyph}
      </g>
      <circle cx={sx} cy={sy} r={r + 2} fill="none" stroke={soft} strokeWidth={0.8} opacity={0.0} />
    </g>
  );
};

/** أيقونة الحارس على التوأم: شارة دائريّة بخوذة وسترة. */
const GuardBadge: React.FC<{ x: number; y: number; on: number; t: number }> = ({ x, y, on, t }) => (
  <g transform={`translate(${x} ${y - 16 * 1}) scale(${easeOut(on)})`} opacity={on}>
    <circle r={19 + 2 * Math.sin(t * 6)} fill={C.cyan} opacity={0.22} />
    <circle r={14.5} fill="#06203c" stroke={C.cyanSoft} strokeWidth={2} />
    <clipPath id="gbclip">
      <circle r={13.4} />
    </clipPath>
    <g clipPath="url(#gbclip)">
      <path d="M-11,13 Q-10,3 0,2 Q10,3 11,13Z" fill="#c6f21f" />
      <path d="M-9,8 L9,8 M-10,11 L10,11" stroke="#fff" strokeWidth={1.4} opacity={0.9} />
      <circle cy={-2} r={5.2} fill="#d9a37a" />
      <path d="M-6.4,-3 Q0,-11.5 6.4,-3 L7.4,-1.6 L-7.4,-1.6Z" fill="#fff" />
    </g>
    <path d="M0,17 L-5,24 L5,24Z" fill={C.cyan} transform="translate(0 -3)" />
  </g>
);

// ——— الكاميرا ———
export const camS4 = (t: number): { z: number; fx: number; fy: number } => ({
  // z: تكبير؛ (fx,fy): نقطة الشاشة التي تُبقى ثابتة
  z: keyframes(t, [
    [37.5, 1.06],
    [41, 1.04],
    [45, 1.08],
    [48, 1.3],
    [50, 1.3],
    [52.6, 0.2],
  ]),
  fx: keyframes(t, [
    [37.5, 640],
    [44, 640],
    [48, 690],
    [50, 690],
    [52.6, 640],
  ]),
  fy: keyframes(t, [
    [37.5, 420],
    [44, 430],
    [48, 470],
    [50, 470],
    [52.6, 508],
  ]),
});

export const S4: React.FC<{ t: number; under?: React.ReactNode }> = ({ t, under }) => {
  const uid = useUid();
  const g = (s: string) => uid + s;
  const cam = camS4(t);
  const R = easeInOut(prog(t, 38.9, 41.0)) * 15;
  const cx0 = proj(10, 7)[0];
  const cy0 = proj(10, 7)[1];
  const rx = R * A * 1.41;
  const ry = R * A * 0.705;
  const gridOn = ramp(t, 39.0, 40.2);
  const wireOn = t > 38.85;
  const ghost = 0.1 * ramp(t, 40.4, 41.6);
  // حالة العقد
  const pingAt = (i: number) => CUE_PING + i * 0.22;
  const stateOf = (n: NodeDef): NState => {
    if (n.id === ALARM_ID) {
      if (t >= 48.0) return "fixed";
      if (t >= 45.0) return "danger";
      if (t >= 44.0) return "warn";
      return "ping";
    }
    return "ping";
  };
  const alarmN = NODES.find((n) => n.id === ALARM_ID)!;
  // مسار الحارس (الأيقونة تتقدّم قليلًا عن الحارس الحقيقيّ)
  const guideU = easeInOutSoft(prog(t, 46.0, 47.9));
  const realU = easeInOutSoft(prog(t, 46.3, 48.0));
  const iconPos = pathAt(guideU);
  const realPos = pathAt(realU);
  const moving = realU > 0.001 && realU < 0.999;
  const gPos = proj(realPos.x, realPos.y, 0);
  const faceLeft = realPos.dir[0] - realPos.dir[1] < 0 ? -1 : 1;
  const sdir = (dx: number, dy: number) => (dx - dy >= 0 ? 1 : -1) as 1 | -1;
  const facing = moving ? sdir(realPos.dir[0], realPos.dir[1]) : (-1 as 1 | -1);
  void faceLeft;
  const walk = walkPose(t, { speed: 70, cycle: 0.7, swingA: 1, swingB: 1, lean: 8, bob: 3 });
  const gPose = moving
    ? blendPose(walk, walk, 0)
    : realU >= 0.999
      ? radioToMouth(standSide(), "A", easeInOut(prog(t, 48.0, 48.4)))
      : standSide();
  const gateGuardPos = proj(19.2, 7.0, 0);
  const routeA = proj(GUARD_PATH[0][0], GUARD_PATH[0][1], 0.05);
  const routeD = GUARD_PATH.map((p, i) => proj(p[0], p[1], 0.06))
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join("");
  const alarmA = ramp(t, 44.0, 44.4) * (1 - ramp(t, 48.0, 48.2));
  const dispatchA = ramp(t, 45.6, 46.0) * (1 - ramp(t, 48.0, 48.4));
  const [ax, ay] = nodeScreen(alarmN);
  const [ccx, ccy] = proj(CTRL[0], CTRL[1], CTRL[2]);
  const labelFade = ramp(t, 38.0, 38.8);
  return (
    <g>
      <defs>
        <RadGrad
          id={g("bg")}
          cx={0.5}
          cy={0.55}
          r={0.75}
          stops={[
            { o: 0, c: "#10335e" },
            { o: 0.6, c: "#07142b" },
            { o: 1, c: "#030a18" },
          ]}
        />
        <filter id={g("glow")} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="3.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id={g("inside")}>
          <ellipse cx={cx0} cy={cy0} rx={Math.max(0.1, rx)} ry={Math.max(0.1, ry)} />
        </clipPath>
        <clipPath id={g("outside")} clipRule="evenodd">
          <path
            clipRule="evenodd"
            d={`M-2000,-2000 H3000 V3000 H-2000Z M${cx0 - rx},${cy0} a${rx},${ry} 0 1,0 ${2 * rx},0 a${rx},${ry} 0 1,0 ${-2 * rx},0Z`}
          />
        </clipPath>
        <LinGrad
          id={g("ring")}
          stops={[
            { o: 0, c: "#ffffff", a: 0.9 },
            { o: 1, c: C.cyan, a: 0.2 },
          ]}
        />
      </defs>
      <rect x={-300} y={-200} width={1900} height={1100} fill={`url(#${g("bg")})`} />
      {/* جسيمات خلفيّة */}
      {Array.from({ length: 40 }).map((_, i) => (
        <circle
          key={i}
          cx={hash1(i * 1.3) * 1280}
          cy={hash1(i * 2.9 + 1) * 720}
          r={0.8 + hash1(i) * 1.4}
          fill="#7ae8f7"
          opacity={0.18 * (0.5 + 0.5 * Math.sin(t * 0.8 + i)) * ramp(t, 39, 41)}
        />
      ))}
      {under}
      <g
        transform={`translate(${cam.fx} ${cam.fy}) scale(${cam.z}) translate(${-cam.fx} ${-cam.fy})`}
      >
        {/* الطبقة الملوّنة: خارج موجة المسح */}
        <g clipPath={`url(#${g("outside")})`}>
          <PaintLayer t={t} id={g("p")} />
        </g>
        {/* ظلّ الطبقة الملوّنة باهتًا بعد التحوّل */}
        <g opacity={ghost}>
          <PaintLayer t={t} id={g("p2")} />
        </g>
        {/* طبقة الشبكة داخل الموجة */}
        {wireOn && (
          <g clipPath={`url(#${g("inside")})`}>
            <g filter={`url(#${g("glow")})`}>
              <WireLayer t={t} gridOn={gridOn} />
            </g>
          </g>
        )}
        {/* حلقة الموجة */}
        {R > 0.2 && R < 14.9 && (
          <g>
            <ellipse
              cx={cx0}
              cy={cy0}
              rx={rx}
              ry={ry}
              fill="none"
              stroke={`url(#${g("ring")})`}
              strokeWidth={5}
              opacity={0.9}
              filter={`url(#${g("glow")})`}
            />
            <ellipse
              cx={cx0}
              cy={cy0}
              rx={rx * 0.93}
              ry={ry * 0.93}
              fill="none"
              stroke={C.cyan}
              strokeWidth={14}
              opacity={0.12}
            />
          </g>
        )}
        {/* مسار التوجيه على الأرض */}
        {t > 45.9 && t < 48.8 && (
          <g opacity={dispatchA}>
            <path
              d={routeD}
              stroke={C.cyan}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeDasharray="2 9"
              strokeDashoffset={-t * 40}
            />
            <path
              d={routeD}
              stroke={C.cyan}
              strokeWidth={9}
              fill="none"
              opacity={0.14}
              strokeLinecap="round"
            />
          </g>
        )}
        {/* خطّ الإنذار من العقدة إلى غرفة التحكّم */}
        {alarmA > 0.01 && (
          <g opacity={alarmA}>
            <path
              d={`M${ax},${ay} Q${(ax + ccx) / 2},${Math.min(ay, ccy) - 90} ${ccx},${ccy}`}
              stroke={t >= 45 ? C.danger : C.amber}
              strokeWidth={2.4}
              fill="none"
              strokeDasharray="6 8"
              strokeDashoffset={t * 60}
            />
            <circle
              r={4}
              fill="#fff"
              cx={lerp(ax, ccx, mod(t * 1.2, 1))}
              cy={lerp(ay, ccy, mod(t * 1.2, 1)) - Math.sin(mod(t * 1.2, 1) * 3.14) * 60}
            />
          </g>
        )}
        {/* العقد */}
        {NODES.map((n, i) => {
          const on = clamp((t - pingAt(i)) / 0.35);
          const ringP = mod((t - pingAt(i)) * 0.8, 1);
          return <Marker key={n.id} n={n} t={t} state={stateOf(n)} on={on} ringP={ringP} />;
        })}
        {/* أيقونة التوجيه */}
        <GuardBadge
          x={proj(iconPos.x, iconPos.y, 0.6)[0]}
          y={proj(iconPos.x, iconPos.y, 0.6)[1] - 14}
          on={ramp(t, 45.9, 46.3) * (1 - ramp(t, 48.4, 48.9))}
          t={t}
        />
        {/* الحارسان «الحقيقيّان» */}
        <Guard
          x={gateGuardPos[0]}
          groundY={gateGuardPos[1] + 6}
          scale={0.5}
          pose={standSide()}
          look={LOOKS.gate}
          facing={-1}
          light={[0.3, -0.8]}
          rim="#9fe3ff"
          time={t}
        />
        <Guard
          x={moving || realU >= 0.999 ? gPos[0] : proj(GUARD_PATH[0][0], GUARD_PATH[0][1], 0)[0]}
          groundY={
            (moving || realU >= 0.999 ? gPos[1] : proj(GUARD_PATH[0][0], GUARD_PATH[0][1], 0)[1]) +
            4
          }
          scale={0.5}
          pose={gPose}
          look={LOOKS.leader}
          facing={facing}
          light={[0.3, -0.8]}
          rim="#9fe3ff"
          itemA={realU >= 0.999 && t > 48.0 ? "radio" : "none"}
          time={t}
        />
      </g>
      {/* إطار HUD */}
      <g
        opacity={0.8 * labelFade}
        stroke={C.cyan}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      >
        <path d="M34,84 L34,52 L66,52" />
        <path d="M1246,84 L1246,52 L1214,52" />
        <path d="M34,636 L34,668 L66,668" />
        <path d="M1246,636 L1246,668 L1214,668" />
      </g>
    </g>
  );
};
const CUE_PING = 41.0;
void darken;
void lighten;
void mix;
void easeOut;
