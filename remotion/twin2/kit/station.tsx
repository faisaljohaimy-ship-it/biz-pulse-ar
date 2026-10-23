/** عناصر محطة ليليّة: سياج، عمود إنارة، كاميرا مراقبة، مركبة، مقصورة بوّابة، حاجز، مسيّرة. */
import React from "react";
import { alpha, darken, lighten, mix } from "./color";
import { clamp, hash1, mod } from "./ease";
import { LinGrad, RadGrad, useUid } from "./svgx";
import { C } from "../palette";

export const Fence: React.FC<{
  x0: number;
  x1: number;
  baseY: number;
  h: number;
  post?: string;
  mesh?: string;
  rim?: string;
  spacing?: number;
  barbed?: boolean;
}> = ({
  x0,
  x1,
  baseY,
  h,
  post = "#050e20",
  mesh = "#9fc4de",
  rim,
  spacing = 120,
  barbed = true,
}) => {
  const id = useUid() + "fn";
  const top = baseY - h;
  const n = Math.ceil((x1 - x0) / spacing) + 1;
  const sx = Math.floor(x0 / spacing) * spacing;
  return (
    <g>
      <defs>
        <pattern
          id={id}
          patternUnits="userSpaceOnUse"
          width={Math.max(10, h / 9)}
          height={Math.max(10, h / 9)}
          y={top}
        >
          <path
            d={`M0,0 L${h / 9},${h / 9} M${h / 9},0 L0,${h / 9}`}
            stroke={mesh}
            strokeWidth={Math.max(0.8, h / 150)}
            opacity={0.3}
          />
        </pattern>
      </defs>
      <rect x={x0} y={top + 4} width={x1 - x0} height={h - 6} fill={`url(#${id})`} />
      <rect x={x0} y={top + 3} width={x1 - x0} height={3} fill={post} />
      <rect x={x0} y={baseY - 4} width={x1 - x0} height={4} fill={post} />
      {rim && <rect x={x0} y={top + 3} width={x1 - x0} height={1} fill={alpha(rim, 0.5)} />}
      {Array.from({ length: n }, (_, i) => {
        const x = sx + i * spacing;
        return (
          <g key={i}>
            <rect x={x - 3} y={top - 2} width={6} height={h + 2} fill={post} />
            {rim && (
              <rect x={x + 1.4} y={top - 2} width={1.6} height={h + 2} fill={alpha(rim, 0.55)} />
            )}
            {barbed && (
              <path
                d={`M${x},${top - 1} L${x + 16},${top - 16}`}
                stroke={post}
                strokeWidth={2.6}
                strokeLinecap="round"
              />
            )}
          </g>
        );
      })}
      {barbed && (
        <>
          <path d={`M${x0},${top - 12} L${x1},${top - 12}`} stroke={post} strokeWidth={1.2} />
          <path d={`M${x0},${top - 6} L${x1},${top - 6}`} stroke={post} strokeWidth={1.2} />
        </>
      )}
    </g>
  );
};

/** عمود إنارة بمخروط ضوء أرضيّ. */
export const Lamp: React.FC<{
  x: number;
  baseY: number;
  h: number;
  on?: number;
  color?: string;
  dir?: 1 | -1;
  reach?: number;
  t?: number;
}> = ({ x, baseY, h, on = 1, color = "#ffe3ac", dir = 1, reach = 190, t = 0 }) => {
  const id = useUid() + "lp";
  const hy = baseY - h;
  const hx = x + dir * 46;
  return (
    <g>
      <defs>
        <LinGrad
          id={id}
          stops={[
            { o: 0, c: color, a: 0.5 },
            { o: 0.5, c: color, a: 0.2 },
            { o: 1, c: color, a: 0.06 },
          ]}
        />
        <RadGrad
          id={id + "g"}
          stops={[
            { o: 0, c: color, a: 0.9 },
            { o: 0.25, c: color, a: 0.3 },
            { o: 1, c: color, a: 0 },
          ]}
        />
      </defs>
      <filter id={id + "f"} x="-30%" y="-10%" width="160%" height="130%">
        <feGaussianBlur stdDeviation="9" />
      </filter>
      <g filter={`url(#${id}f)`} style={{ mixBlendMode: "screen" }}>
        <path
          d={`M${hx - 34},${hy + 8} L${hx + 34},${hy + 8} L${hx + reach * 0.92},${baseY} L${hx - reach * 0.92},${baseY}Z`}
          fill={`url(#${id})`}
          opacity={on * (0.8 + 0.05 * Math.sin(t * 3.1 + x))}
        />
        <ellipse cx={hx} cy={baseY - 2} rx={reach * 0.8} ry={9} fill={color} opacity={0.22 * on} />
      </g>
      <rect x={x - 4} y={hy} width={8} height={h} fill="#040c1c" />
      <rect x={x + 1.4} y={hy} width={2} height={h} fill="rgba(160,215,255,0.35)" />
      <path
        d={`M${x},${hy + 6} Q${x + dir * 20},${hy - 6} ${hx},${hy + 2} L${hx},${hy + 8} Q${x + dir * 20},${hy + 2} ${x},${hy + 14}Z`}
        fill="#040c1c"
      />
      <rect x={hx - 16} y={hy + 2} width={32} height={8} rx={3} fill="#0a1830" />
      <rect x={hx - 13} y={hy + 8} width={26} height={3} rx={1.5} fill={color} opacity={on} />
      <circle
        cx={hx}
        cy={hy + 12}
        r={46}
        fill={`url(#${id}g)`}
        opacity={on * 0.9}
        style={{ mixBlendMode: "screen" }}
      />
    </g>
  );
};

/** كاميرا مراقبة على عمود: زاوية الرأس بالدرجات (0 = أفقيّ نحو dir)، مخروط رؤية. */
export const Cctv: React.FC<{
  x: number;
  baseY: number;
  h: number;
  ang: number;
  dir?: 1 | -1;
  cone?: number;
  coneLen?: number;
  t?: number;
  color?: string;
  rim?: string;
  coneOpacity?: number;
  s?: number;
}> = ({
  x,
  baseY,
  h,
  ang,
  dir = -1,
  cone = 24,
  coneLen = 330,
  t = 0,
  color = C.cyan,
  rim = "#9fe3ff",
  coneOpacity = 0.5,
  s: hs = 1,
}) => {
  const id = useUid() + "cc";
  const hy = baseY - h;
  const hx = x + dir * 24;
  const a = (ang * Math.PI) / 180;
  // الاتجاه: نحو dir وبانحدار ang لأسفل
  const dx = Math.cos(a) * dir;
  const dy = Math.sin(a);
  const w = (cone * Math.PI) / 180;
  const rot = (vx: number, vy: number, r: number): [number, number] => [
    vx * Math.cos(r) - vy * Math.sin(r),
    vx * Math.sin(r) + vy * Math.cos(r),
  ];
  const p1 = rot(dx, dy, w);
  const p2 = rot(dx, dy, -w);
  const lx = hx + dx * 14;
  const ly = hy + dy * 14;
  const e1: [number, number] = [lx + p1[0] * coneLen, ly + p1[1] * coneLen];
  const e2: [number, number] = [lx + p2[0] * coneLen, ly + p2[1] * coneLen];
  const mid: [number, number] = [lx + dx * coneLen, ly + dy * coneLen];
  return (
    <g>
      <defs>
        <LinGrad
          id={id}
          units="userSpaceOnUse"
          x1={lx}
          y1={ly}
          x2={mid[0]}
          y2={mid[1]}
          stops={[
            { o: 0, c: color, a: coneOpacity },
            { o: 0.6, c: color, a: coneOpacity * 0.28 },
            { o: 1, c: color, a: 0 },
          ]}
        />
      </defs>
      <path
        d={`M${lx},${ly} L${e1[0]},${e1[1]} L${e2[0]},${e2[1]}Z`}
        fill={`url(#${id})`}
        style={{ mixBlendMode: "screen" }}
      />
      <path d={`M${lx},${ly} L${e1[0]},${e1[1]}`} stroke={color} strokeWidth={1} opacity={0.35} />
      <path d={`M${lx},${ly} L${e2[0]},${e2[1]}`} stroke={color} strokeWidth={1} opacity={0.35} />
      <rect x={x - 4.5} y={hy} width={9} height={h} fill="#06101f" />
      <rect x={x + 1.5} y={hy} width={2} height={h} fill={alpha(rim, 0.35)} />
      <path d={`M${x},${hy + 4} L${hx},${hy + 4}`} stroke="#06101f" strokeWidth={5} />
      <g transform={`translate(${hx} ${hy + 4}) rotate(${dir === 1 ? ang : -ang})`}>
        <g transform={`scale(${dir * hs} ${hs})`}>
          <rect x={-6} y={-9} width={36} height={18} rx={5} fill="#0c1b34" />
          <rect x={-6} y={-9} width={36} height={4} rx={2} fill={alpha(rim, 0.55)} />
          <rect x={24} y={-7} width={8} height={14} rx={2} fill="#05101f" />
          <circle cx={30} cy={0} r={4.4} fill="#0c3d57" />
          <circle cx={30} cy={0} r={2.2} fill={C.cyanSoft} opacity={0.8} />
          <circle
            cx={8}
            cy={-3}
            r={2}
            fill="#ff4a3d"
            opacity={0.35 + 0.65 * (Math.sin(t * 4) > 0.2 ? 1 : 0)}
          />
        </g>
      </g>
    </g>
  );
};

/** مركبة جانبيّة تتّجه يسارًا (مقياس 1: طول 560). */
export const Truck: React.FC<{
  x: number;
  groundY: number;
  t: number;
  speed: number;
  lights?: number;
  driver?: boolean;
  armOut?: number;
  scale?: number;
}> = ({ x, groundY, t, speed, lights = 1, driver = true, armOut = 0, scale = 1 }) => {
  const id = useUid() + "tk";
  const wheel = (cx: number) => (
    <g transform={`translate(${cx} -34)`}>
      <circle r={34} fill="#05080f" />
      <circle r={21} fill="#9aa9bb" />
      <circle r={17} fill="#2b3644" />
      <g transform={`rotate(${(-(t * speed) / 34) * (180 / Math.PI)})`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x={-1.6}
            y={-17}
            width={3.2}
            height={14}
            fill="#c1ced9"
            transform={`rotate(${i * 72})`}
          />
        ))}
      </g>
      <circle r={5} fill="#dfe8ef" />
    </g>
  );
  return (
    <g transform={`translate(${x} ${groundY}) scale(${scale})`}>
      <defs>
        <LinGrad
          id={id}
          stops={[
            { o: 0, c: "#f2f6fa" },
            { o: 0.5, c: "#c9d4df" },
            { o: 1, c: "#7f90a4" },
          ]}
        />
        <LinGrad
          id={id + "b"}
          x1={1}
          y1={0}
          x2={0}
          y2={0}
          stops={[
            { o: 0, c: "#fff6d0", a: 0.85 },
            { o: 1, c: "#fff6d0", a: 0 },
          ]}
        />
        <LinGrad
          id={id + "w"}
          stops={[
            { o: 0, c: "#1c3550" },
            { o: 1, c: "#0a1830" },
          ]}
        />
      </defs>
      {/* ظلّ */}
      <ellipse cx={280} cy={4} rx={300} ry={9} fill="#000" opacity={0.45} />
      {/* حزمة المصابيح */}
      <path
        d={`M2,-62 L-420,-110 L-420,10 L2,-30Z`}
        fill={`url(#${id}b)`}
        opacity={0.5 * lights}
        style={{ mixBlendMode: "screen" }}
      />
      {/* الهيكل: سيّارة دفع رباعيّ */}
      <path
        d="M2,-34 L2,-66 Q4,-84 26,-90 L150,-98 L205,-160 Q210,-164 222,-164 L420,-164 Q436,-164 446,-152 L498,-120 L548,-112 Q560,-108 560,-90 L560,-34Z"
        fill={`url(#${id})`}
      />
      <path
        d="M26,-90 L150,-98 L205,-160 Q210,-164 222,-164 L420,-164 Q436,-164 446,-152"
        stroke="#ffffff"
        strokeWidth={2.4}
        fill="none"
        opacity={0.75}
      />
      <rect x={2} y={-52} width={558} height={18} fill="#0c1a30" opacity={0.28} />
      <path d="M2,-76 L560,-76" stroke="#1a3a5c" strokeWidth={5} opacity={0.5} />
      <path d="M2,-82 L560,-82" stroke={C.cyan} strokeWidth={2.6} opacity={0.6} />
      {/* قوس الإطارات */}
      <circle cx={100} cy={-34} r={43} fill="#0a1424" />
      <circle cx={450} cy={-34} r={43} fill="#0a1424" />
      {/* نوافذ */}
      <path d="M212,-152 L322,-152 L322,-104 L160,-104Z" fill={`url(#${id}w)`} />
      <path
        d="M332,-152 L424,-152 Q432,-152 438,-146 L480,-116 L480,-104 L332,-104Z"
        fill={`url(#${id}w)`}
      />
      <path d="M216,-148 L262,-148 L226,-116Z" fill="#8fc4e0" opacity={0.22} />
      <rect x={322} y={-156} width={10} height={54} fill="#c3d0dc" />
      {/* خطوط الأبواب */}
      <path
        d="M326,-100 L326,-52 M200,-100 L190,-52 M440,-100 L444,-52"
        stroke="#6f8196"
        strokeWidth={1.6}
        opacity={0.7}
      />
      <rect x={290} y={-98} width={22} height={5} rx={2.5} fill="#7e91a6" />
      {/* حامل السقف */}
      <rect x={236} y={-171} width={176} height={5} rx={2.5} fill="#2a3a52" />
      <rect x={250} y={-168} width={5} height={6} fill="#2a3a52" />
      <rect x={390} y={-168} width={5} height={6} fill="#2a3a52" />
      {/* السائق */}
      {driver && (
        <g>
          <path
            d="M262,-104 L262,-122 Q262,-136 276,-138 Q290,-136 290,-122 L290,-104Z"
            fill="#27477c"
          />
          <circle cx={276} cy={-130} r={13} fill="#8c5a3c" />
          <path d="M263,-134 Q276,-152 289,-134 L291,-131 L261,-131Z" fill="#14305a" />
          <path d="M262,-104 L290,-104" stroke="#0b1a33" strokeWidth={2} />
        </g>
      )}
      {armOut > 0.01 && (
        <g opacity={armOut}>
          <path
            d={`M262,-112 Q${252 - 18 * armOut},-108 ${236 - 6 * armOut},-108`}
            stroke="#27477c"
            strokeWidth={13}
            strokeLinecap="round"
            fill="none"
          />
          <circle cx={234 - 6 * armOut} cy={-108} r={6.4} fill="#8c5a3c" />
          <rect
            x={222 - 6 * armOut}
            y={-122}
            width={15}
            height={10}
            rx={1.6}
            fill="#f4f8fb"
            transform={`rotate(-8 ${230 - 6 * armOut} -117)`}
          />
          <rect
            x={222 - 6 * armOut}
            y={-122}
            width={15}
            height={2.6}
            rx={1}
            fill={C.cyan}
            transform={`rotate(-8 ${230 - 6 * armOut} -117)`}
          />
        </g>
      )}
      {/* أضواء */}
      <rect
        x={0}
        y={-80}
        width={22}
        height={9}
        rx={3}
        fill="#fff6d0"
        opacity={0.55 + 0.45 * lights}
      />
      <rect x={0} y={-69} width={8} height={4} rx={1} fill="#ffd06a" opacity={0.8} />
      <rect x={544} y={-96} width={14} height={14} rx={3} fill="#ff4a3d" opacity={0.9} />
      <rect x={4} y={-60} width={30} height={5} rx={2} fill="#0a1424" opacity={0.6} />
      <rect x={156} y={-114} width={13} height={7} rx={3} fill="#1a3a5c" />
      {wheel(100)}
      {wheel(450)}
    </g>
  );
};

/** مقصورة حراسة البوّابة. */
export const Booth: React.FC<{ x: number; baseY: number; t: number; rim?: string }> = ({
  x,
  baseY,
  t,
  rim = "#ffe3ac",
}) => {
  const id = useUid() + "bt";
  return (
    <g transform={`translate(${x} ${baseY})`}>
      <defs>
        <LinGrad
          id={id}
          stops={[
            { o: 0, c: "#2b4e7e" },
            { o: 1, c: "#12305a" },
          ]}
        />
        <LinGrad
          id={id + "w"}
          stops={[
            { o: 0, c: "#ffe6b0" },
            { o: 1, c: "#f4b86a" },
          ]}
        />
        <RadGrad
          id={id + "g"}
          stops={[
            { o: 0, c: "#ffd88a", a: 0.6 },
            { o: 1, c: "#ffd88a", a: 0 },
          ]}
        />
      </defs>
      <ellipse
        cx={90}
        cy={-80}
        rx={230}
        ry={150}
        fill={`url(#${id}g)`}
        style={{ mixBlendMode: "screen" }}
        opacity={0.5}
      />
      <rect x={-10} y={-8} width={200} height={8} fill="#0b1a33" />
      <rect x={0} y={-210} width={180} height={202} fill={`url(#${id})`} />
      <rect x={178} y={-210} width={2.6} height={202} fill={alpha(rim, 0.5)} />
      <path d="M-16,-210 L196,-210 L186,-232 L-6,-232Z" fill="#0b1a33" />
      <rect x={-16} y={-212} width={212} height={3} fill={alpha(rim, 0.7)} />
      <rect x={16} y={-176} width={148} height={92} rx={6} fill={`url(#${id}w)`} />
      <rect
        x={16}
        y={-176}
        width={148}
        height={92}
        rx={6}
        fill="none"
        stroke="#0b1a33"
        strokeWidth={5}
      />
      <rect x={88} y={-176} width={4} height={92} fill="#0b1a33" />
      {/* مكتب وشاشة داخل المقصورة */}
      <rect x={24} y={-112} width={132} height={22} fill="#7a5a3a" opacity={0.85} />
      <rect x={104} y={-142} width={36} height={26} rx={3} fill="#0a2038" />
      <rect
        x={107}
        y={-139}
        width={30}
        height={19}
        fill={C.cyan}
        opacity={0.45 + 0.1 * Math.sin(t * 2)}
      />
      <rect x={60} y={-80} width={60} height={72} rx={3} fill="#0d2240" />
      {/* كاميرا على السطح + ضوء */}
      <rect x={160} y={-258} width={4} height={26} fill="#040c1c" />
      <rect x={150} y={-266} width={26} height={12} rx={4} fill="#0a1830" />
      <circle
        cx={152}
        cy={-260}
        r={2}
        fill="#ff4a3d"
        opacity={0.3 + 0.7 * (Math.sin(t * 3) > 0 ? 1 : 0)}
      />
    </g>
  );
};

/** ذراع الحاجز: pivot عند (px,py)، زاوية 0 = أفقيّ نحو اليمين، سالب = يرتفع. */
export const Barrier: React.FC<{ px: number; py: number; len: number; ang: number; t: number }> = ({
  px,
  py,
  len,
  ang,
  t,
}) => {
  const stripes = 9;
  const sl = len / stripes;
  return (
    <g>
      <rect x={px - 16} y={py - 6} width={30} height={90} rx={4} fill="#0c2142" />
      <rect x={px - 16} y={py - 6} width={30} height={5} rx={2} fill="rgba(160,215,255,0.5)" />
      <g transform={`rotate(${ang} ${px} ${py})`}>
        <rect x={px} y={py - 8} width={len} height={16} rx={3} fill="#f4f7fa" />
        {Array.from({ length: stripes }).map((_, i) =>
          i % 2 === 0 ? (
            <rect key={i} x={px + i * sl} y={py - 8} width={sl} height={16} fill="#e54848" />
          ) : null,
        )}
        <rect x={px} y={py - 8} width={len} height={4} rx={2} fill="#ffffff" opacity={0.35} />
        <circle
          cx={px + len - 10}
          cy={py}
          r={4.4}
          fill="#ffb020"
          opacity={0.3 + 0.7 * (Math.sin(t * 5) > 0 ? 1 : 0)}
        />
        <circle
          cx={px + len - 10}
          cy={py}
          r={16}
          fill="#ffb020"
          opacity={0.18 * (Math.sin(t * 5) > 0 ? 1 : 0)}
        />
      </g>
      <circle cx={px} cy={py} r={9} fill="#1c3a62" />
      <circle cx={px} cy={py} r={4} fill="#9fcdf0" />
    </g>
  );
};

/** مسيّرة بمنظر أماميّ ثلاثيّ. rot زاوية الدوّارات؛ spot زاوية الكشّاف (درجات من العمودي). */
export const Drone: React.FC<{
  x: number;
  y: number;
  scale?: number;
  t: number;
  tilt?: number;
  spot?: number;
  spotLen?: number;
  spotOn?: number;
  rim?: string;
}> = ({ x, y, scale = 1, t, tilt = 0, spot = 0, spotLen = 520, spotOn = 1, rim = "#9fe3ff" }) => {
  const id = useUid() + "dr";
  const a = (spot * Math.PI) / 180;
  const sx = Math.sin(a);
  const sy = Math.cos(a);
  const spread = 0.2;
  const bx0 = sx * spotLen;
  const by0 = sy * spotLen;
  const nx = sy * spotLen * spread;
  const ny = -sx * spotLen * spread;
  const rotor = (cx: number, cy: number, i: number) => (
    <g transform={`translate(${cx} ${cy})`}>
      <ellipse rx={36} ry={7} fill="#cfeaff" opacity={0.16} />
      <ellipse
        rx={36}
        ry={7}
        fill="none"
        stroke="#cfeaff"
        strokeWidth={1.4}
        opacity={0.25}
        strokeDasharray="14 10"
        strokeDashoffset={-t * 220 * (i % 2 ? 1 : -1)}
      />
      <rect x={-3} y={-9} width={6} height={10} rx={2} fill="#101c30" />
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) scale(${scale}) rotate(${tilt})`}>
      <defs>
        <LinGrad
          id={id}
          units="userSpaceOnUse"
          x1={0}
          y1={24}
          x2={bx0}
          y2={24 + by0}
          stops={[
            { o: 0, c: "#f3fcff", a: 0.8 * spotOn },
            { o: 0.45, c: "#dff6ff", a: 0.22 * spotOn },
            { o: 1, c: "#dff6ff", a: 0 },
          ]}
        />
        <LinGrad
          id={id + "b"}
          stops={[
            { o: 0, c: "#4a6788" },
            { o: 0.5, c: "#223a5e" },
            { o: 1, c: "#0c1a32" },
          ]}
        />
      </defs>
      <path
        d={`M0,24 L${bx0 - nx},${24 + by0 - ny} L${bx0 + nx},${24 + by0 + ny}Z`}
        fill={`url(#${id})`}
        style={{ mixBlendMode: "screen" }}
      />
      {/* الأذرع */}
      <path
        d="M-18,0 L-70,-18 M18,0 L70,-18 M-14,8 L-58,22 M14,8 L58,22"
        stroke="#0d1a30"
        strokeWidth={7}
        strokeLinecap="round"
      />
      <path
        d="M-18,0 L-70,-18 M18,0 L70,-18"
        stroke={alpha(rim, 0.35)}
        strokeWidth={1.6}
        strokeLinecap="round"
        transform="translate(0 -2)"
      />
      {rotor(-70, -22, 0)}
      {rotor(70, -22, 1)}
      {rotor(-58, 18, 1)}
      {rotor(58, 18, 0)}
      {/* الجسم */}
      <rect x={-26} y={-12} width={52} height={28} rx={11} fill={`url(#${id}b)`} />
      <rect x={-26} y={-12} width={52} height={5} rx={2.5} fill={alpha(rim, 0.65)} />
      <rect x={-14} y={-3} width={28} height={7} rx={3} fill="#0a1830" />
      <circle
        cx={-8}
        cy={0.5}
        r={2}
        fill={C.cyan}
        opacity={0.4 + 0.6 * (Math.sin(t * 3) > 0 ? 1 : 0.4)}
      />
      <circle cx={8} cy={0.5} r={2} fill={C.mint} />
      {/* حاضنة الكاميرا */}
      <circle cx={0} cy={22} r={10} fill="#0b1830" />
      <circle cx={0} cy={22} r={6.4} fill="#143a58" />
      <circle cx={0} cy={22} r={3.4} fill="#eafcff" opacity={0.5 + 0.5 * spotOn} />
      {/* أضواء الملاحة */}
      <circle
        cx={-26}
        cy={4}
        r={2.6}
        fill="#ff4a3d"
        opacity={0.4 + 0.6 * (Math.sin(t * 5.5) > 0 ? 1 : 0)}
      />
      <circle
        cx={26}
        cy={4}
        r={2.6}
        fill={C.emerald}
        opacity={0.4 + 0.6 * (Math.sin(t * 5.5 + 3) > 0 ? 1 : 0)}
      />
      <g stroke="#0d1a30" strokeWidth={3} strokeLinecap="round">
        <path d="M-16,16 L-22,28 M16,16 L22,28" />
      </g>
    </g>
  );
};

/** بقع ضوء خارجة عن البؤرة (bokeh) للعمق. */
export const Bokeh: React.FC<{
  seed: number;
  n: number;
  area: [number, number, number, number];
  colors: string[];
  t: number;
  opacity?: number;
  r0?: number;
  r1?: number;
}> = ({ seed, n, area, colors, t, opacity = 0.5, r0 = 3, r1 = 9 }) => {
  const id = useUid() + "bk";
  return (
    <g style={{ mixBlendMode: "screen" }}>
      <defs>
        <RadGrad
          id={id}
          stops={[
            { o: 0, c: "#fff", a: 0.9 },
            { o: 0.6, c: "#fff", a: 0.4 },
            { o: 1, c: "#fff", a: 0 },
          ]}
        />
      </defs>
      {Array.from({ length: n }, (_, i) => {
        const x = area[0] + hash1(seed + i * 1.37) * area[2];
        const y = area[1] + hash1(seed + i * 2.11 + 3) * area[3];
        const r = r0 + hash1(seed + i * 3.7 + 1) * (r1 - r0);
        const c = colors[Math.floor(hash1(seed + i * 5.3) * colors.length)];
        const tw = 0.7 + 0.3 * Math.sin(t * (0.6 + hash1(i + seed) * 0.8) + i);
        return <circle key={i} cx={x} cy={y} r={r} fill={c} opacity={opacity * tw} />;
      })}
    </g>
  );
};

void clamp;
void mod;
void darken;
void lighten;
void mix;
