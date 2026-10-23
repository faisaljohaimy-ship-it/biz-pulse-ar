/**
 * S5 — الخاتمة (50.0–56.0 ث). الكاميرا (من S4) تبتعد فتصير المحطة نقطةً مضيئة ضمن شبكةٍ
 * وطنيّة من نقاطٍ وخطوطٍ بلا أسماء ولا حدود خرائط. عند 52.0 يتشكّل «SADEED | سَدِيد»
 * وسطر «الأمن الصناعي»؛ وثبات الإطار الأخير 53.5–56.0 (الحركة كلّها تتجمّد).
 */
import React from "react";
import { easeInOut, easeOut, hash1, lerp, mod, prog, ramp } from "../kit/ease";
import { RadGrad, useUid } from "../kit/svgx";
import { C, FONT } from "../palette";
import { DISCLOSURE } from "../timeline";

interface Pt {
  x: number;
  y: number;
  r: number;
}

/** نقاط الشبكة: توزيعٌ حتميّ فضفاض (ليس حدودًا ولا مواقع حقيقية). */
const buildNet = (): { pts: Pt[]; edges: Array<[number, number]> } => {
  const pts: Pt[] = [];
  let tries = 0;
  const target = 56;
  while (pts.length < target && tries < 4000) {
    tries++;
    const i = tries;
    const x = 90 + hash1(i * 1.7) * 1100;
    const y = 300 + hash1(i * 2.3 + 5) * 390;
    // كتلةٌ مائلة بشكلٍ عامّ، لا حدود: تستبعد المنطقة قرب عنوان الختام
    const inTitle = y < 400 && x > 330 && x < 950;
    const blob = Math.pow((x - 640) / 560, 2) + Math.pow((y - 490) / 220, 2) < 1.15;
    const upper = y < 300;
    if (inTitle || !blob) continue;
    if (upper) continue;
    if (pts.some((p) => Math.hypot(p.x - x, p.y - y) < 66) || Math.hypot(x - 640, y - 490) < 120)
      continue;
    pts.push({ x, y, r: 3 + hash1(i * 7.7) * 3.2 });
  }
  // نقاط علويّة قليلة على الجانبين
  [
    [130, 170],
    [230, 250],
    [1130, 190],
    [1040, 266],
    [90, 330],
    [1200, 360],
  ].forEach(([x, y], k) => pts.push({ x, y, r: 2.6 + (k % 3) }));
  const edges: Array<[number, number]> = [];
  const seen = new Set<string>();
  pts.forEach((p, i) => {
    const d = pts
      .map((q, j) => ({ j, d: Math.hypot(p.x - q.x, p.y - q.y) }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 2);
    d.forEach((o) => {
      const key = i < o.j ? `${i}-${o.j}` : `${o.j}-${i}`;
      if (!seen.has(key) && o.d < 250) {
        seen.add(key);
        edges.push([i, o.j]);
      }
    });
  });
  return { pts, edges };
};
const NET = buildNet();
/** موضع المحطة النهائيّ (مركز مجسّم المحطة بعد الابتعاد). */
export const STATION_END: [number, number] = [640, 490];

export const Network: React.FC<{ t: number }> = ({ t }) => {
  const uid = useUid();
  const k = easeInOut(prog(t, 50.3, 52.0));
  if (k <= 0.001) return null;
  const dist = (p: Pt) => Math.hypot(p.x - STATION_END[0], p.y - STATION_END[1]);
  const maxD = 620;
  const wave = (p: Pt) => ramp(t, 50.9 + (dist(p) / maxD) * 1.6, 51.3 + (dist(p) / maxD) * 1.6);
  return (
    <g opacity={k}>
      <defs>
        <RadGrad
          id={uid + "n"}
          stops={[
            { o: 0, c: C.cyanSoft, a: 0.95 },
            { o: 0.35, c: C.cyan, a: 0.35 },
            { o: 1, c: C.cyan, a: 0 },
          ]}
        />
        <RadGrad
          id={uid + "h"}
          stops={[
            { o: 0, c: C.cyan, a: 0.35 },
            { o: 1, c: C.cyan, a: 0 },
          ]}
        />
      </defs>
      <ellipse cx={640} cy={470} rx={720} ry={300} fill={`url(#${uid}h)`} opacity={0.5} />
      {NET.edges.map(([a, b], i) => {
        const p = NET.pts[a];
        const q = NET.pts[b];
        const w = Math.min(wave(p), wave(q));
        const mx = (p.x + q.x) / 2 + (hash1(i) - 0.5) * 36;
        const my = (p.y + q.y) / 2 - 18 - hash1(i + 3) * 18;
        const u = mod(t * 0.28 + hash1(i * 5) * 3, 1);
        const px = (1 - u) * (1 - u) * p.x + 2 * (1 - u) * u * mx + u * u * q.x;
        const py = (1 - u) * (1 - u) * p.y + 2 * (1 - u) * u * my + u * u * q.y;
        return (
          <g key={i} opacity={w}>
            <path
              d={`M${p.x},${p.y} Q${mx},${my} ${q.x},${q.y}`}
              stroke={C.cyan}
              strokeWidth={1.1}
              fill="none"
              opacity={0.42}
            />
            <circle cx={px} cy={py} r={2.4} fill="#e8fdff" />
            <circle cx={px} cy={py} r={7} fill={`url(#${uid}n)`} />
          </g>
        );
      })}
      {NET.pts.map((p, i) => {
        const w = wave(p);
        const tw = 0.7 + 0.3 * Math.sin(t * 1.3 + i);
        return (
          <g key={i} opacity={w}>
            <circle cx={p.x} cy={p.y} r={p.r * 4.2} fill={`url(#${uid}n)`} opacity={0.5 * tw} />
            <circle cx={p.x} cy={p.y} r={p.r} fill="#e8fdff" />
            <circle
              cx={p.x}
              cy={p.y}
              r={p.r + 3.2}
              fill="none"
              stroke={C.cyan}
              strokeWidth={0.9}
              opacity={0.5}
            />
          </g>
        );
      })}
      {/* خطوط ربط المحطة بأقرب نقاط الشبكة */}
      {NET.pts
        .map((p, i) => ({ i, d: dist(p) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 4)
        .map(({ i }) => {
          const p = NET.pts[i];
          const w = wave(p);
          const u = mod(t * 0.4 + i * 0.2, 1);
          return (
            <g key={"s" + i} opacity={w}>
              <path
                d={`M${STATION_END[0]},${STATION_END[1]} L${p.x},${p.y}`}
                stroke={C.cyanSoft}
                strokeWidth={1.4}
                opacity={0.5}
              />
              <circle
                cx={lerp(STATION_END[0], p.x, u)}
                cy={lerp(STATION_END[1], p.y, u)}
                r={2.8}
                fill="#fff"
              />
            </g>
          );
        })}
      {/* هالة المحطة */}
      <ellipse
        cx={STATION_END[0]}
        cy={STATION_END[1] + 6}
        rx={92 + 10 * Math.sin(t * 2)}
        ry={44 + 5 * Math.sin(t * 2)}
        fill="none"
        stroke={C.cyanSoft}
        strokeWidth={1.6}
        opacity={0.55 * ramp(t, 51.2, 52.0)}
      />
      <ellipse
        cx={STATION_END[0]}
        cy={STATION_END[1] + 6}
        rx={140}
        ry={66}
        fill={`url(#${uid}h)`}
        opacity={0.8 * ramp(t, 51.2, 52.2)}
      />
    </g>
  );
};

/** كتلة العلامة: HTML. تُستدعى بزمن مجمَّد بعد 53.5. */
export const Brand: React.FC<{ t: number }> = ({ t }) => {
  const a = 52.0;
  if (t < a - 0.02) return null;
  const arP = easeOut(prog(t, a + 0.0, a + 0.75));
  const laP = easeOut(prog(t, a + 0.25, a + 0.95));
  const divP = easeInOut(prog(t, a + 0.1, a + 0.7));
  const subP = easeOut(prog(t, a + 0.7, a + 1.3));
  const lineP = easeInOut(prog(t, a + 0.75, a + 1.4));
  const shine = easeInOut(prog(t, a + 0.8, a + 1.4));
  const discl = ramp(t, a + 0.6, a + 1.2);
  const glow = 0.5 + 0.12 * Math.sin(Math.min(t, 53.5) * 2.4);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        direction: "rtl",
        fontFamily: FONT,
        pointerEvents: "none",
      }}
    >
      {/* هالة خلف العلامة */}
      <div
        style={{
          position: "absolute",
          left: 240,
          top: 110,
          width: 800,
          height: 340,
          background: `radial-gradient(closest-side, rgba(34,211,238,${0.2 * glow * arP}), rgba(34,211,238,0))`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 150,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 38,
          direction: "ltr",
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 92,
            letterSpacing: `${lerp(0.5, 0.14, laP)}em`,
            color: "#fff",
            opacity: laP,
            textShadow: "0 0 28px rgba(34,211,238,0.55), 0 2px 18px rgba(2,8,20,0.7)",
            transform: `translateX(${(1 - laP) * -26}px)`,
            paddingLeft: "0.14em",
          }}
        >
          SADEED
        </div>
        <div
          style={{
            width: 4,
            height: 118 * divP,
            borderRadius: 2,
            background: `linear-gradient(180deg, ${C.cyanSoft}, ${C.cyan})`,
            boxShadow: `0 0 20px ${C.cyan}`,
          }}
        />
        <div style={{ position: "relative", direction: "rtl" }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 138,
              lineHeight: 1.1,
              color: "#fff",
              textShadow: "0 0 34px rgba(34,211,238,0.6), 0 2px 18px rgba(2,8,20,0.7)",
              clipPath: `inset(-30px ${0}% -30px ${(1 - arP) * 100}%)`,
            }}
          >
            سَدِيد
          </div>
          <div
            style={{
              position: "absolute",
              top: 14,
              bottom: 14,
              left: `${(1 - arP) * 100}%`,
              width: 3,
              background: C.cyanSoft,
              boxShadow: `0 0 20px ${C.cyan}`,
              opacity: arP < 0.999 ? 1 : 0,
            }}
          />
        </div>
      </div>
      {/* لمعة تعبر العلامة */}
      <div
        style={{
          position: "absolute",
          left: 250 + shine * 780,
          top: 140,
          width: 90,
          height: 160,
          transform: "skewX(-18deg)",
          background:
            "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.4), rgba(255,255,255,0))",
          mixBlendMode: "screen",
          opacity: shine > 0 && shine < 1 ? 1 : 0,
        }}
      />
      {/* السطر الفرعيّ */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 322,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 22,
          opacity: subP,
          transform: `translateY(${(1 - subP) * 12}px)`,
        }}
      >
        <div
          style={{
            height: 2,
            width: 120 * lineP,
            background: `linear-gradient(270deg, ${C.cyan}, rgba(34,211,238,0))`,
            boxShadow: `0 0 10px ${C.cyan}`,
          }}
        />
        <div
          style={{
            fontWeight: 400,
            fontSize: 40,
            color: C.cyanSoft,
            textShadow: "0 2px 16px rgba(2,8,20,0.7)",
          }}
        >
          الأمن الصناعي
        </div>
        <div
          style={{
            height: 2,
            width: 120 * lineP,
            background: `linear-gradient(90deg, ${C.cyan}, rgba(34,211,238,0))`,
            boxShadow: `0 0 10px ${C.cyan}`,
          }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 90,
          background: "linear-gradient(180deg, rgba(3,10,24,0), rgba(3,10,24,0.65))",
          opacity: discl,
        }}
      />
      {/* سطر الإفصاح */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 26,
          textAlign: "center",
          fontSize: 16,
          color: "rgba(214,232,246,0.78)",
          opacity: discl,
          textShadow: "0 1px 8px rgba(2,8,20,0.9)",
        }}
      >
        {DISCLOSURE}
      </div>
    </div>
  );
};
