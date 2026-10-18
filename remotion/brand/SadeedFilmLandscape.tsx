/**
 * المشهد ٢ — المشهد الصناعي السعودي بخطوطٍ مضيئة (رسومٌ متحرّكة، لا لقطة مراقبة).
 *
 * أفق الرياض (مركز المملكة · الفيصلية · أبراجٌ مولَّدة)، ومجمّعٌ صناعي (أعمدة تقطير، شعلة،
 * خزّانات كروية وأسطوانية، مدخنة)، وحقل ألواح شمسية، وأبراج نقلٍ وأسلاكها، وطريقٌ بأضواء —
 * تُرسم خطوطها من اليسار إلى اليمين «من المخطّط إلى الضوء»، وتربطها شبكةٌ تجري فيها الحزم.
 * متّجهات كلّها: حادّة على أي دقّة، ولا تكبير لصورةٍ نقطية. الكاميرا تنساب جانبيًّا بطبقات
 * اختلاف منظر (البعيد أبطأ). الإحداثيات بكسلات اللوحة الأمّ 2172×724.
 */
import type { FC, ReactNode } from "react";
import { Easing, interpolate } from "remotion";

const W = 2172;
const H = 724;
const GY = 590;
const TAU = Math.PI * 2;
const LINE = "#8fe6ff";
const LINE_HOT = "#e9fbff";
const FILL = "rgba(7,30,82,0.88)";
const FILL_FAR = "rgba(40,96,180,0.34)";

const cine = Easing.bezier(0.45, 0, 0.2, 1);
function ramp(t: number, a: number, b: number, ease: (x: number) => number = cine): number {
  return interpolate(t, [a, b], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
}
function frac(x: number): number {
  return x - Math.floor(x);
}
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type Tower = { x: number; w: number; h: number; spire: number; step: number; windows: boolean };

/** أبراج الأفق المتوسّط — مولَّدة ببذرةٍ ثابتة حول المعلمين. */
const MID_TOWERS: Tower[] = (() => {
  const rnd = seeded(7);
  const out: Tower[] = [];
  let x = 150;
  while (x < 1010) {
    const w = 30 + rnd() * 34;
    const nearIcon = Math.abs(x + w / 2 - 520) < 70 || Math.abs(x + w / 2 - 820) < 70;
    if (!nearIcon) {
      out.push({
        x,
        w,
        h: 110 + rnd() * 190,
        spire: rnd() < 0.35 ? 20 + rnd() * 40 : 0,
        step: rnd() < 0.4 ? 0.25 + rnd() * 0.2 : 0,
        windows: rnd() < 0.75,
      });
    }
    x += w + 6 + rnd() * 16;
  }
  return out;
})();

const FAR_TOWERS = (() => {
  const rnd = seeded(19);
  const out: { x: number; w: number; h: number }[] = [];
  let x = 40;
  while (x < 2140) {
    const w = 18 + rnd() * 30;
    out.push({ x, w, h: 30 + rnd() * (x < 1100 ? 150 : 70) });
    x += w + 4 + rnd() * 10;
  }
  return out;
})();

function towerPath(t: Tower): string {
  const top = GY - t.h;
  if (!t.step) return `M${t.x},${GY} V${top} H${t.x + t.w} V${GY} Z`;
  const inset = t.w * 0.22;
  const stepY = top + t.h * t.step;
  return `M${t.x},${GY} V${stepY} H${t.x + inset} V${top} H${t.x + t.w - inset} V${stepY} H${t.x + t.w} V${GY} Z`;
}

/** خطٌّ يُرسم من الصفر إلى الكامل، ثم يمتلئ الشكل — «من المخطّط إلى الضوء». */
const Drawn: FC<{ d: string; p: number; fill?: string; width?: number; hot?: boolean }> = ({
  d,
  p,
  fill = FILL,
  width = 2.2,
  hot = false,
}) =>
  p <= 0 ? null : (
    <g>
      <path d={d} fill={fill} fillOpacity={ramp(p, 0.55, 1, (x) => x)} stroke="none" />
      <path
        d={d}
        fill="none"
        stroke={LINE}
        strokeWidth={width * 3}
        strokeOpacity={0.35}
        pathLength={1}
        strokeDasharray={`${p} 1`}
        filter="url(#lsGlow)"
      />
      <path
        d={d}
        fill="none"
        stroke={hot ? LINE_HOT : LINE}
        strokeWidth={width}
        pathLength={1}
        strokeDasharray={`${p} 1`}
        strokeLinejoin="round"
      />
    </g>
  );

const Layer: FC<{ dx: number; children: ReactNode }> = ({ dx, children }) => (
  <g transform={`translate(${dx} 0)`}>{children}</g>
);

export const Landscape: FC<{ t: number; start: number; end: number }> = ({ t, start, end }) => {
  if (t < start - 0.4 || t > end + 0.7) return null;
  const vis = ramp(t, start - 0.4, start + 0.35) * (1 - ramp(t, end - 0.1, end + 0.6));
  const pan = ramp(t, start - 0.3, end + 0.4, Easing.bezier(0.33, 0, 0.3, 1));
  const zoom = 1.06 - 0.06 * pan;
  const dawn = ramp(t, start, end - 0.4);
  /** تقدّم رسم عنصرٍ بحسب موضعه: الخطوط تُضاء من اليسار إلى اليمين. */
  const draw = (x: number, extra = 0) =>
    ramp(t, start - 0.1 + (x / W) * 0.9 + extra, start + 0.7 + (x / W) * 0.9 + extra);

  const K = 520;
  const kingdom = `M${K - 40},${GY} L${K - 30},236 C${K - 28},204 ${K - 26},188 ${K - 23},170 L${K - 16},170 C${K - 11},214 ${K + 11},214 ${K + 16},170 L${K + 23},170 C${K + 26},188 ${K + 28},204 ${K + 30},236 L${K + 40},${GY} Z`;
  const F = 820;
  const faisaliah = `M${F - 46},${GY} L${F - 8},262 L${F},240 L${F + 8},262 L${F + 46},${GY} Z`;

  const columns = [
    { x: 1250, w: 26, h: 232 },
    { x: 1296, w: 36, h: 304 },
    { x: 1350, w: 22, h: 192 },
    { x: 1418, w: 30, h: 262 },
    { x: 1466, w: 24, h: 210 },
  ];
  const spheres = [
    { cx: 1660, r: 48 },
    { cx: 1772, r: 42 },
  ];
  const tanks = [
    { x: 1846, w: 74, h: 58 },
    { x: 1932, w: 62, h: 48 },
  ];
  const flame = 0.82 + 0.18 * Math.sin(TAU * 3.1 * t) * Math.sin(TAU * 1.7 * t + 1);

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ position: "absolute", left: 0, top: 0, opacity: vis }}
    >
      <defs>
        <linearGradient id="lsSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#030f33" />
          <stop offset="58%" stopColor="#0a2d73" />
          <stop offset="82%" stopColor="#1557b0" />
          <stop offset="100%" stopColor="#0b2a68" />
        </linearGradient>
        <radialGradient id="lsDawn" cx="0.6" cy="0.82" r="0.6">
          <stop offset="0%" stopColor="#7fd6ff" stopOpacity="0.75" />
          <stop offset="45%" stopColor="#2f8be6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#2f8be6" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lsGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b2a68" />
          <stop offset="100%" stopColor="#020a22" />
        </linearGradient>
        <radialGradient id="lsFlame">
          <stop offset="0%" stopColor="#fff6d6" />
          <stop offset="35%" stopColor="#ffc15a" />
          <stop offset="75%" stopColor="#ff7a2e" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#ff7a2e" stopOpacity="0" />
        </radialGradient>
        <filter id="lsGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <filter id="lsBloom" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      <rect width={W} height={H} fill="url(#lsSky)" />
      <rect width={W} height={H} fill="url(#lsDawn)" opacity={0.35 + 0.65 * dawn} />

      <g transform={`translate(${W / 2} ${GY}) scale(${zoom}) translate(${-W / 2} ${-GY})`}>
        {/* البعيد: أفقٌ شاحب وكثبان */}
        <Layer dx={60 - 120 * pan}>
          {FAR_TOWERS.map((f, i) => (
            <rect
              key={i}
              x={f.x}
              y={GY - 26 - f.h}
              width={f.w}
              height={f.h}
              fill={FILL_FAR}
              opacity={0.45 + 0.4 * draw(f.x)}
            />
          ))}
          <path
            d={`M0,${GY - 18} C300,${GY - 46} 620,${GY - 6} 980,${GY - 28} S1640,${GY - 50} 2172,${GY - 20} V${H} H0 Z`}
            fill="rgba(22,70,150,0.55)"
          />
        </Layer>

        {/* الأفق المتوسّط: الرياض */}
        <Layer dx={150 - 300 * pan}>
          {MID_TOWERS.map((tw, i) => {
            const p = draw(tw.x);
            return (
              <g key={i}>
                <Drawn d={towerPath(tw)} p={p} width={1.8} />
                {tw.spire && p > 0.8 ? (
                  <line
                    x1={tw.x + tw.w / 2}
                    y1={GY - tw.h}
                    x2={tw.x + tw.w / 2}
                    y2={GY - tw.h - tw.spire}
                    stroke={LINE}
                    strokeWidth={1.6}
                  />
                ) : null}
                {tw.windows && p > 0.9
                  ? Array.from({ length: Math.floor((tw.h - 30) / 22) }, (_, r) =>
                      Array.from({ length: Math.max(1, Math.floor((tw.w - 10) / 12)) }, (_, c) => {
                        const k = (i * 31 + r * 7 + c * 13) % 17;
                        const on =
                          0.25 + 0.75 * (0.5 + 0.5 * Math.sin(TAU * (t * (0.25 + k * 0.03)) + k));
                        return (
                          <rect
                            key={`${r}-${c}`}
                            x={tw.x + 7 + c * 12}
                            y={GY - tw.h + 18 + r * 22}
                            width={4}
                            height={6}
                            fill="#bff0ff"
                            opacity={(k % 3 === 0 ? 0.15 : 0.7) * on * ramp(p, 0.9, 1, (x) => x)}
                          />
                        );
                      }),
                    )
                  : null}
              </g>
            );
          })}
          {/* مركز المملكة: القوس المقلوب بين القرنين */}
          <Drawn d={kingdom} p={draw(K, 0.15)} width={2.6} hot />
          <line
            x1={K - 13}
            y1={196}
            x2={K + 13}
            y2={196}
            stroke={LINE_HOT}
            strokeWidth={2.2}
            opacity={draw(K, 0.4)}
          />
          <circle
            cx={K}
            cy={166}
            r={5}
            fill="#ff5148"
            opacity={draw(K, 0.5) * (0.3 + 0.7 * Math.pow(Math.max(0, Math.sin(TAU * t * 0.5)), 8))}
          />
          {/* برج الفيصلية: الهرم والكرة الذهبية */}
          <Drawn d={faisaliah} p={draw(F, 0.15)} width={2.4} hot />
          {[300, 360, 430, 500].map((y, i) => {
            const half = 8 + ((y - 262) / (GY - 262)) * 38;
            return (
              <line
                key={i}
                x1={F - half}
                y1={y}
                x2={F + half}
                y2={y}
                stroke={LINE}
                strokeWidth={1.4}
                opacity={draw(F, 0.3)}
              />
            );
          })}
          <line
            x1={F}
            y1={240}
            x2={F}
            y2={210}
            stroke={LINE_HOT}
            strokeWidth={2}
            opacity={draw(F, 0.35)}
          />
          <circle
            cx={F}
            cy={318}
            r={14}
            fill="#ffd27a"
            opacity={0.85 * draw(F, 0.45)}
            filter="url(#lsGlow)"
          />
          <circle cx={F} cy={318} r={9} fill="#fff1c9" opacity={draw(F, 0.45)} />
        </Layer>

        {/* أبراج النقل وأسلاكها بين المدينة والصناعة */}
        <Layer dx={170 - 340 * pan}>
          {[1075, 1175].map((x, i) => {
            const p = draw(x, 0.1);
            const d = `M${x - 30},${GY} L${x - 6},${GY - 210} L${x + 6},${GY - 210} L${x + 30},${GY} M${x - 22},${GY - 60} L${x + 22},${GY - 60} M${x - 15},${GY - 120} L${x + 15},${GY - 120} M${x - 34},${GY - 170} L${x + 34},${GY - 170} M${x - 22},${GY - 60} L${x + 15},${GY - 120} M${x + 22},${GY - 60} L${x - 15},${GY - 120}`;
            return <Drawn key={i} d={d} p={p} fill="none" width={1.8} />;
          })}
          {[-34, 34].map((o, i) => {
            const p = draw(1125, 0.3);
            const d = `M${1075 + o},${GY - 170} Q1125,${GY - 120} ${1175 + o},${GY - 170} M${1175 + o},${GY - 170} Q1215,${GY - 140} 1250,${GY - 150} M${1075 + o},${GY - 170} Q1040,${GY - 130} 1000,${GY - 150}`;
            return <Drawn key={i} d={d} p={p} fill="none" width={1.3} />;
          })}
        </Layer>

        {/* المجمّع الصناعي */}
        <Layer dx={190 - 380 * pan}>
          {columns.map((c, i) => {
            const p = draw(c.x);
            const d = `M${c.x},${GY} V${GY - c.h + 10} Q${c.x + c.w / 2},${GY - c.h - 8} ${c.x + c.w},${GY - c.h + 10} V${GY} Z`;
            return (
              <g key={i}>
                <Drawn d={d} p={p} width={2} />
                {p > 0.7
                  ? Array.from({ length: Math.floor(c.h / 36) }, (_, r) => (
                      <line
                        key={r}
                        x1={c.x}
                        y1={GY - 26 - r * 36}
                        x2={c.x + c.w}
                        y2={GY - 26 - r * 36}
                        stroke={LINE}
                        strokeWidth={1.2}
                        opacity={0.75 * ramp(p, 0.7, 1, (x) => x)}
                      />
                    ))
                  : null}
                <circle
                  cx={c.x + c.w / 2}
                  cy={GY - c.h - 2}
                  r={3.4}
                  fill="#ff5148"
                  opacity={p * (0.3 + 0.7 * Math.pow(Math.max(0, Math.sin(TAU * t * 0.5 + i)), 8))}
                />
              </g>
            );
          })}
          {/* الأنابيب الأفقية */}
          <Drawn
            d={`M1230,${GY - 44} H2010 M1230,${GY - 60} H1640 M1300,${GY - 44} V${GY} M1560,${GY - 44} V${GY} M1820,${GY - 44} V${GY}`}
            p={draw(1500, 0.25)}
            fill="none"
            width={1.4}
          />
          {/* مدخنة الشعلة */}
          <Drawn
            d={`M1553,${GY} L1557,150 L1563,150 L1567,${GY} Z`}
            p={draw(1560)}
            width={1.8}
            hot
          />
          <g opacity={draw(1560, 0.4)}>
            <ellipse
              cx={1560}
              cy={132}
              rx={26 * flame}
              ry={44 * flame}
              fill="url(#lsFlame)"
              filter="url(#lsBloom)"
            />
            <ellipse cx={1560} cy={138} rx={10 * flame} ry={22 * flame} fill="url(#lsFlame)" />
          </g>
          {/* خزّانات كروية على أرجل */}
          {spheres.map((s, i) => {
            const cy = GY - s.r - 26;
            const d = `M${s.cx - s.r},${cy} A${s.r},${s.r} 0 1 1 ${s.cx + s.r},${cy} A${s.r},${s.r} 0 1 1 ${s.cx - s.r},${cy} Z M${s.cx - s.r * 0.6},${cy + s.r * 0.8} L${s.cx - s.r * 0.75},${GY} M${s.cx + s.r * 0.6},${cy + s.r * 0.8} L${s.cx + s.r * 0.75},${GY} M${s.cx},${cy + s.r} L${s.cx},${GY}`;
            return <Drawn key={i} d={d} p={draw(s.cx)} width={2} />;
          })}
          {/* خزّانات أسطوانية */}
          {tanks.map((k, i) => {
            const d = `M${k.x},${GY} V${GY - k.h} A${k.w / 2},10 0 0 1 ${k.x + k.w},${GY - k.h} V${GY} Z M${k.x},${GY - k.h} A${k.w / 2},10 0 0 0 ${k.x + k.w},${GY - k.h}`;
            return <Drawn key={i} d={d} p={draw(k.x)} width={1.8} />;
          })}
          {/* مدخنة وبخارٌ صاعد */}
          <Drawn d={`M1996,${GY} L2002,300 L2018,300 L2024,${GY} Z`} p={draw(2010)} width={1.8} />
          {Array.from({ length: 5 }, (_, i) => {
            const u = frac(t / 2.4 + i / 5);
            return (
              <circle
                key={i}
                cx={2010 + 18 * u + 6 * Math.sin(TAU * u)}
                cy={292 - 120 * u}
                r={8 + 26 * u}
                fill="#cfeaff"
                opacity={0.22 * (1 - u) * draw(2010, 0.4)}
                filter="url(#lsGlow)"
              />
            );
          })}
        </Layer>

        {/* شبكة التشغيل: أقواسٌ تربط المعالم وتجري فيها الحزم */}
        <Layer dx={150 - 300 * pan}>
          {[
            { a: { x: K, y: 168 }, c: { x: 1060, y: 20 }, b: { x: 1560 + 40 - 80 * pan, y: 150 } },
            {
              a: { x: F, y: 212 },
              c: { x: 1080, y: 120 },
              b: { x: 1314 + 40 - 80 * pan, y: GY - 306 },
            },
            {
              a: { x: 300, y: 330 },
              c: { x: 900, y: 150 },
              b: { x: 1660 + 40 - 80 * pan, y: GY - 120 },
            },
          ].map((l, i) => {
            const grow = ramp(t, start + 1.1 + i * 0.2, start + 2.0 + i * 0.2);
            if (grow <= 0) return null;
            const pts = Array.from({ length: 41 }, (_, j) => {
              const u = (j / 40) * grow;
              const v = 1 - u;
              return {
                x: v * v * l.a.x + 2 * v * u * l.c.x + u * u * l.b.x,
                y: v * v * l.a.y + 2 * v * u * l.c.y + u * u * l.b.y,
              };
            });
            const pk = frac((t - start) / 1.4 + i * 0.33);
            const pv = 1 - pk;
            const packet = {
              x: pv * pv * l.a.x + 2 * pv * pk * l.c.x + pk * pk * l.b.x,
              y: pv * pv * l.a.y + 2 * pv * pk * l.c.y + pk * pk * l.b.y,
            };
            return (
              <g key={i}>
                <polyline
                  points={pts.map((q) => `${q.x},${q.y}`).join(" ")}
                  fill="none"
                  stroke="#62e6ff"
                  strokeWidth={6}
                  opacity={0.3}
                  filter="url(#lsGlow)"
                />
                <polyline
                  points={pts.map((q) => `${q.x},${q.y}`).join(" ")}
                  fill="none"
                  stroke="#dffaff"
                  strokeWidth={1.6}
                  strokeDasharray="4 8"
                />
                {grow >= 1 ? (
                  <>
                    <circle
                      cx={packet.x}
                      cy={packet.y}
                      r={12}
                      fill="#7feaff"
                      opacity={0.7}
                      filter="url(#lsGlow)"
                    />
                    <circle cx={packet.x} cy={packet.y} r={3.6} fill="#ffffff" />
                  </>
                ) : null}
              </g>
            );
          })}
        </Layer>

        {/* الأرض والطريق المضيء */}
        <rect x={-200} y={GY} width={W + 400} height={H - GY + 40} fill="url(#lsGround)" />
        <Layer dx={220 - 440 * pan}>
          {[0, 1].map((lane) => {
            const y0 = 704 - lane * 16;
            const d = `M-200,${y0} C500,${y0 - 70} 1300,${y0 - 40} ${W + 300},${y0 - 64}`;
            return (
              <g key={lane}>
                <path d={d} fill="none" stroke="rgba(120,200,255,0.25)" strokeWidth={1.2} />
                <path
                  d={d}
                  fill="none"
                  stroke={lane ? "#ff6a5c" : "#fff0cf"}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeDasharray="18 46 6 90"
                  strokeDashoffset={(lane ? 1 : -1) * t * 220}
                  filter="url(#lsGlow)"
                  opacity={0.95 * draw(0, 0.3)}
                />
              </g>
            );
          })}
          {/* الألواح الشمسية: صفوفٌ مائلة يعبرها بريقٌ هادئ */}
          {[0, 1].map((row) =>
            Array.from({ length: 9 }, (_, i) => {
              const x = 40 + i * 78 + row * 30;
              const y = 618 + row * 40;
              const p = draw(x, 0.2);
              const d = `M${x},${y + 30} L${x + 18},${y} L${x + 82},${y} L${x + 64},${y + 30} Z M${x + 9},${y + 15} L${x + 73},${y + 15} M${x + 39},${y + 30} L${x + 51},${y} M${x + 18 + 1},${y + 30} L${x + 31},${y} M${x + 60},${y + 30} L${x + 72},${y}`;
              const glint = Math.max(0, 1 - Math.abs(frac(t / 3 - i * 0.06 - row * 0.1) - 0.5) * 8);
              return (
                <g key={`${row}-${i}`}>
                  <Drawn d={d} p={p} fill="rgba(16,60,140,0.9)" width={1.3} />
                  <path
                    d={`M${x},${y + 30} L${x + 18},${y} L${x + 82},${y} L${x + 64},${y + 30} Z`}
                    fill="#bfeeff"
                    opacity={0.35 * glint * p}
                  />
                </g>
              );
            }),
          )}
        </Layer>
      </g>
    </svg>
  );
};
