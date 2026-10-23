/**
 * S5 — الخاتمة (50–56 ث): الكاميرا تبتعد عن 08 المعتَّمة فتصير المحطة نقطةً مضيئة ضمن شبكةٍ من نقاطٍ وخطوطٍ بلا
 * أسماء ولا حدود ولا أرقام؛ موجة إضاءةٍ تعبر الشبكة 50.9–52.5؛ ثم العلامة (`Brand.tsx`) عند 52.0 ويُجمَّد كلّ شيءٍ من 53.5.
 */
import React from "react";
import { clamp, easeInOut, hash1, lerp, prog } from "../kit/ease";
import { camAt, Over, PlateImg, view, World, type CamKey } from "../kit";

export const S5_KEYS: ReadonlyArray<CamKey> = [
  [49.2, 860, 500, 1.25],
  [53.0, 836, 470, 1.0],
];

interface Node {
  x: number;
  y: number;
  r: number;
}
const HUB = { x: 836, y: 470 };
const build = (): { pts: Node[]; edges: Array<[number, number]> } => {
  const pts: Node[] = [{ x: HUB.x, y: HUB.y, r: 6 }];
  for (let i = 0; i < 52; i++) {
    const a = hash1(i * 3.1 + 1) * Math.PI * 2;
    const d = 170 + Math.pow(hash1(i * 5.7 + 2), 0.8) * 700;
    const x = HUB.x + Math.cos(a) * d * 1.15;
    const y = HUB.y + Math.sin(a) * d * 0.62;
    if (x < 20 || x > 1650 || y < 20 || y > 920) continue;
    pts.push({ x, y, r: 2.6 + hash1(i * 9.3) * 2.4 });
  }
  const edges: Array<[number, number]> = [];
  pts.forEach((p, i) => {
    const near = pts
      .map((q, j) => ({ j, d: Math.hypot(p.x - q.x, (p.y - q.y) * 1.4) }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, i === 0 ? 5 : 2);
    near.forEach((o) => {
      if (!edges.some(([a, b]) => (a === i && b === o.j) || (a === o.j && b === i)))
        edges.push([i, o.j]);
    });
  });
  return { pts, edges };
};
const NET = build();

export const S5Network: React.FC<{ t: number }> = ({ t }) => {
  const v = view(camAt(S5_KEYS, t));
  const appear = easeInOut(prog(t, 49.9, 51.0));
  const front = lerp(0, 1000, easeInOut(prog(t, 50.9, 52.5)));
  const dark = 0.42 * prog(t, 51.2, 52.2);
  const netA = 1 - 0.4 * prog(t, 51.8, 52.6);
  return (
    <World v={v}>
      <PlateImg
        file="p08.jpg"
        filter={`brightness(${(0.62 - 0.12 * prog(t, 51.2, 52.2)).toFixed(3)}) saturate(0.85)`}
      />
      <PlateImg file="p08-glow.jpg" blend="screen" opacity={0.3} />
      <Over blend="screen">
        <defs>
          <radialGradient id="plantGlow">
            <stop offset="0" stopColor="#bff7ff" stopOpacity="0.9" />
            <stop offset="0.35" stopColor="#22d3ee" stopOpacity="0.35" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
        </defs>
        {NET.edges.map(([a, b], i) => {
          const p = NET.pts[a];
          const q = NET.pts[b];
          const dm = Math.hypot((p.x + q.x) / 2 - HUB.x, ((p.y + q.y) / 2 - HUB.y) * 1.6);
          const lit = clamp((front - dm) / 110);
          const w = (0.9 + 1.5 * lit) / v.k;
          return (
            <g key={i} opacity={appear * netA}>
              <line
                x1={p.x}
                y1={p.y}
                x2={q.x}
                y2={q.y}
                stroke="#22d3ee"
                strokeWidth={w * 3.4}
                opacity={0.1 + 0.2 * lit}
              />
              <line
                x1={p.x}
                y1={p.y}
                x2={q.x}
                y2={q.y}
                stroke="#9defff"
                strokeWidth={w}
                opacity={0.3 + 0.62 * lit}
              />
            </g>
          );
        })}
        {NET.pts.map((p, i) => {
          const dm = Math.hypot(p.x - HUB.x, (p.y - HUB.y) * 1.6);
          const lit = clamp((front - dm) / 80);
          const r = ((p.r + 2.8 * lit) * (i === 0 ? 1.6 : 1)) / Math.sqrt(v.k);
          return (
            <g key={i} opacity={appear * netA}>
              <circle cx={p.x} cy={p.y} r={r * 2.4} fill="#22d3ee" opacity={0.06 + 0.14 * lit} />
              <circle cx={p.x} cy={p.y} r={r} fill="#dffbff" opacity={0.55 + 0.45 * lit} />
            </g>
          );
        })}
        <circle
          cx={HUB.x}
          cy={HUB.y}
          r={130}
          fill="url(#plantGlow)"
          opacity={appear * (0.55 + 0.1 * Math.sin(Math.min(t, 53.5) * 2.4))}
        />
      </Over>
      <div style={{ position: "absolute", inset: 0, background: `rgba(2,8,20,${dark})` }} />
    </World>
  );
};
