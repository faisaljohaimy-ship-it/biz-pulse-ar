/**
 * S2 — رحلة الكهرباء (8.0–24.0 ث). شريط جانبيّ مستمرّ بتدفّقٍ من اليمين إلى اليسار
 * (اتجاه القراءة العربية): التوليد ← رفع الجهد ← أبراج النقل ← محطة خفض الجهد ← المدينة.
 * الإحداثيّ القصصيّ p يزداد مع الرحلة؛ والشاشة x = 640 + cam·k − p (طبقات بمعامل بارالاكس k).
 */
import React from "react";
import { Motes, ridgePath, Sky, Stars, Streak, Sun } from "../kit/atmo";
import { Building, makeSkyline } from "../kit/city";
import { alpha, mix } from "../kit/color";
import { clamp, easeInOut, easeOut, hash1, keyframes, lerp, mod, prog, ramp } from "../kit/ease";
import { Pulses } from "../kit/pulses";
import { LinGrad, RadGrad, catenary, catenaryLen, useUid } from "../kit/svgx";
import { Tower, towerGeom } from "../kit/tower";
import { C } from "../palette";
import { CUE } from "../timeline";

// ——— الكاميرا: مفاتيح (ث ← p) بمنحنى أحاديّ الرتابة ———
export const camP = (t: number): number =>
  keyframes(t, [
    [8.0, -120],
    [9.5, 40],
    [10.6, 250],
    [11.4, 600],
    [12.6, 700],
    [13.4, 820],
    [14.0, 1010],
    [18.0, 2820],
    [19.2, 3330],
    [20.4, 3900],
    [22.0, 4780],
    [24.0, 5250],
  ]);

const skyKeys: Array<[number, string[]]> = [
  [8, ["#12326a", "#235f9c", "#4c93bd", "#f6ae6a", "#ffcc86"]],
  [13, ["#122a5c", "#26508e", "#7a78a8", "#f08e63", "#ffb46e"]],
  [17, ["#0c1e4a", "#1b3a78", "#4a4f92", "#c9708a", "#f59a6a"]],
  [20.5, ["#071436", "#102c5c", "#1f4a82", "#3a6f9a", "#6a96b0"]],
  [23.5, ["#040b22", "#0a1b42", "#12305e", "#1c4474", "#2a5c8a"]],
];
const skyAt = (t: number): string[] => {
  const tt = clamp(t, skyKeys[0][0], skyKeys[skyKeys.length - 1][0]);
  let i = 0;
  while (i < skyKeys.length - 2 && tt > skyKeys[i + 1][0]) i++;
  const [a, ca] = skyKeys[i];
  const [b, cb] = skyKeys[i + 1];
  const u = clamp((tt - a) / (b - a));
  return ca.map((c, j) => mix(c, cb[j], u));
};

interface Env {
  rim: string;
  warm: number; // 1 = ذهبيّ، 0 = ليليّ
  night: number;
  sil: string;
  silLite: string;
}
const envAt = (t: number): Env => {
  const night = ramp(t, 15, 22);
  const warm = 1 - ramp(t, 8, 16.5);
  return {
    rim: mix(mix("#8fd8ff", "#ffb87a", warm), "#7ac8ff", night * 0.4),
    warm,
    night,
    sil: mix(mix("#0d2243", "#0a1b36", 1 - warm), "#06122a", night),
    silLite: mix(mix("#17345e", "#112a4e", 1 - warm), "#0a1d3e", night),
  };
};

// ——— الشبكة: أبراج النقل ———
const TOWER_H = 330;
const TOWER_Y = 600;
const TOWER_P0 = 1250;
const TOWER_SP = 400;
const TOWER_N = 6;
const towerP = (i: number): number => TOWER_P0 + i * TOWER_SP;
const YARD_P = 640; // محوّل رفع الجهد
const SUBST_P = 3860; // محوّل خفض الجهد

const SAG = 34;

/** مسار الطور m عبر الأبراج: من قمم العوازل في ساحة الرفع حتى بوّابة المحطة الفرعية. */
const phasePath = (m: number): { d: string; len: number; x0: number } => {
  const bushX = [-YARD_P - 60, -YARD_P - 8, -YARD_P + 44][m];
  const bushY = 600 - 106 - 200 + 2;
  let d = `M${bushX},${bushY}`;
  let len = 0;
  let cx = bushX;
  let cy = bushY;
  for (let i = 0; i < TOWER_N; i++) {
    const g = towerGeom(-towerP(i), TOWER_Y, TOWER_H);
    const r = g.tips.right[m];
    const l = g.tips.left[m];
    d += catenary(cx, cy, r[0], r[1], i === 0 ? 46 : SAG);
    len += catenaryLen(cx, cy, r[0], r[1], i === 0 ? 46 : SAG);
    d += `L${l[0]},${l[1]}`;
    len += Math.abs(r[0] - l[0]);
    cx = l[0];
    cy = l[1];
  }
  const gx = -(SUBST_P - 260) - (m - 1) * 26;
  const gy = 600 - 150 + 12;
  d += catenary(cx, cy, gx, gy, SAG);
  len += catenaryLen(cx, cy, gx, gy, SAG);
  // إلى بوشنغ المحوّل الخافض
  const bx = -SUBST_P - (m - 1) * 34 + 10;
  const by = 600 - 70 - 90 + 6;
  d += `L${gx},${gy + 6} L${bx},${by}`;
  len += Math.hypot(bx - gx, by - gy) + 6;
  return { d, len, x0: bushX };
};

const PHASES = [0, 1, 2].map(phasePath);

// ——— مكوّنات ———
const GroundBand: React.FC<{ env: Env; t: number }> = ({ env }) => {
  const id = useUid() + "gb";
  return (
    <g>
      <defs>
        <LinGrad
          id={id}
          stops={[
            { o: 0, c: mix("#1c3b5e", "#0d2140", 1 - env.warm * 0.5) },
            { o: 0.25, c: "#0a1b36" },
            { o: 1, c: "#040b1b" },
          ]}
        />
      </defs>
      <rect x={-9000} y={598} width={20000} height={400} fill={`url(#${id})`} />
      <rect x={-9000} y={598} width={20000} height={1.6} fill={alpha(env.rim, 0.5)} />
    </g>
  );
};

const Smoke: React.FC<{
  x: number;
  y: number;
  t: number;
  n?: number;
  seed?: number;
  wind?: number;
}> = ({ x, y, t, n = 8, seed = 1, wind = -1 }) => {
  const id = useUid() + "sm";
  return (
    <g>
      <defs>
        <RadGrad
          id={id}
          stops={[
            { o: 0, c: "#b8cbe0", a: 0.5 },
            { o: 0.6, c: "#9fb6cf", a: 0.2 },
            { o: 1, c: "#9fb6cf", a: 0 },
          ]}
        />
      </defs>
      {Array.from({ length: n }, (_, i) => {
        const u = mod(t * 0.14 + i / n + seed * 0.13, 1);
        const rr = 18 + u * 62;
        return (
          <circle
            key={i}
            cx={x + wind * u * 130 + Math.sin(u * 6 + i) * 9}
            cy={y - u * 230}
            r={rr}
            fill={`url(#${id})`}
            opacity={0.8 * (1 - u) * Math.min(1, u * 8)}
          />
        );
      })}
    </g>
  );
};

/** محطة التوليد (إحداثيّ محلّيّ: الأصل = p=0 على الأرض y=600؛ x يزداد يمينًا). */
const Plant: React.FC<{ t: number; env: Env }> = ({ t, env }) => {
  const uid = useUid() + "pt";
  const g = (s: string) => uid + s;
  const glow = easeOut(prog(t, 8.0, 9.2));
  const spin = t * 260;
  const pulse = 0.55 + 0.45 * Math.sin(t * 3.2);
  return (
    <g>
      <defs>
        <LinGrad
          id={g("hall")}
          stops={[
            { o: 0, c: "#244b7a" },
            { o: 0.5, c: "#183a64" },
            { o: 1, c: "#0e2748" },
          ]}
        />
        <LinGrad
          id={g("boil")}
          stops={[
            { o: 0, c: "#2a5686" },
            { o: 1, c: "#12305a" },
          ]}
        />
        <LinGrad
          id={g("in")}
          stops={[
            { o: 0, c: "#0a1d3c" },
            { o: 1, c: "#143a66" },
          ]}
        />
        <LinGrad
          id={g("gen")}
          stops={[
            { o: 0, c: "#8ad9f0" },
            { o: 0.35, c: "#3a8fb8" },
            { o: 1, c: "#12456f" },
          ]}
        />
        <LinGrad
          id={g("cas")}
          stops={[
            { o: 0, c: "#7da4c8" },
            { o: 0.5, c: "#41678c" },
            { o: 1, c: "#223f61" },
          ]}
        />
        <RadGrad
          id={g("cg")}
          stops={[
            { o: 0, c: "#bff7ff", a: 0.85 },
            { o: 0.4, c: C.cyan, a: 0.35 },
            { o: 1, c: C.cyan, a: 0 },
          ]}
        />
        <LinGrad
          id={g("chim")}
          stops={[
            { o: 0, c: "#d9e4ee" },
            { o: 0.55, c: "#8fa6bd" },
            { o: 1, c: "#3b5878" },
          ]}
        />
      </defs>
      {/* مبنى الغلّاية والمداخن */}
      <rect x={60} y={300} width={200} height={300} fill={`url(#${g("boil")})`} />
      <rect x={60} y={300} width={200} height={3} fill={alpha(env.rim, 0.55)} />
      <rect x={258} y={300} width={2} height={300} fill={alpha(env.rim, 0.4)} />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={60} y={330 + i * 52} width={200} height={3} fill="#0d2748" opacity={0.7} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={"p" + i}
          x={84 + i * 44}
          y={310}
          width={9}
          height={290}
          fill="#102c52"
          opacity={0.85}
        />
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect
          key={"w" + i}
          x={86 + (i % 3) * 60}
          y={350 + Math.floor(i / 3) * 74}
          width={26}
          height={34}
          fill="#ffd88a"
          opacity={0.2 + 0.7 * glow * (0.6 + 0.4 * Math.sin(t * 0.9 + i))}
        />
      ))}
      <path
        d="M72,600 L72,420 L96,420 M96,420 L96,360"
        stroke="#0b2142"
        strokeWidth={3}
        fill="none"
        opacity={0.0}
      />
      {[290, 350].map((cx, i) => {
        const top = i === 0 ? 150 : 205;
        const w0 = i === 0 ? 50 : 42;
        const w1 = i === 0 ? 30 : 26;
        return (
          <g key={i}>
            <path
              d={`M${cx - w0 / 2},600 L${cx - w1 / 2},${top} L${cx + w1 / 2},${top} L${cx + w0 / 2},600Z`}
              fill={`url(#${g("chim")})`}
            />
            <path
              d={`M${cx - w1 / 2 - 1.8},${top + 38} L${cx + w1 / 2 + 1.8},${top + 38} L${cx + w1 / 2 + 2.6},${top + 86} L${cx - w1 / 2 - 2.6},${top + 86}Z`}
              fill="#c74a46"
              opacity={0.92}
            />
            <path
              d={`M${cx + w0 / 2},600 L${cx + w1 / 2},${top}`}
              stroke={alpha(env.rim, 0.7)}
              strokeWidth={2}
            />
            <rect x={cx - w1 / 2 - 2} y={top - 4} width={w1 + 4} height={6} fill="#27415f" />
            <circle
              cx={cx}
              cy={top - 10}
              r={3}
              fill="#ff6b5a"
              opacity={0.25 + 0.75 * Math.max(0, Math.sin(t * 2.4 + i * 1.7))}
            />
            <Smoke x={cx} y={top - 6} t={t} seed={i + 1} />
          </g>
        );
      })}
      {/* صالة التوربينات */}
      <rect x={-352} y={412} width={394} height={188} fill={`url(#${g("hall")})`} />
      <path d="M-364,414 L-352,396 L54,396 L54,414Z" fill="#12315a" />
      <rect x={-364} y={412} width={418} height={3} fill={alpha(env.rim, 0.65)} />
      <rect x={52} y={414} width={2.4} height={186} fill={alpha(env.rim, 0.45)} />
      {Array.from({ length: 12 }).map((_, i) => (
        <rect
          key={i}
          x={-340 + i * 33}
          y={420}
          width={20}
          height={20}
          rx={2}
          fill="#ffe0a0"
          opacity={0.18 + 0.7 * glow * (0.5 + 0.5 * Math.sin(t * 1.1 + i * 2.1))}
        />
      ))}
      {/* نافذة المقطع */}
      <rect
        x={-330}
        y={452}
        width={360}
        height={134}
        rx={9}
        fill="#06132b"
        stroke="#6bb6d6"
        strokeOpacity={0.55}
        strokeWidth={2.4}
      />
      <rect x={-326} y={456} width={352} height={126} rx={6} fill={`url(#${g("in")})`} />
      <rect x={-326} y={566} width={352} height={16} fill="#0a1b36" />
      <circle
        cx={-80}
        cy={520}
        r={90}
        fill={`url(#${g("cg")})`}
        opacity={glow * (0.5 + 0.3 * pulse)}
      />
      {/* عمود الإدارة */}
      <rect x={-250} y={516} width={190} height={8} fill="#8fb6d6" />
      <g opacity={0.55}>
        {Array.from({ length: 12 }).map((_, i) => (
          <rect
            key={i}
            x={-246 + mod(i * 16 + t * 90, 190)}
            y={516}
            width={5}
            height={8}
            fill="#e9fbff"
          />
        ))}
      </g>
      {/* المولّد */}
      <g>
        <rect x={-318} y={484} width={22} height={64} rx={8} fill="#2c5885" />
        <rect x={-300} y={478} width={160} height={84} rx={14} fill={`url(#${g("gen")})`} />
        <rect x={-300} y={478} width={160} height={5} rx={2.5} fill="#d8f7ff" opacity={0.7} />
        {Array.from({ length: 13 }).map((_, i) => (
          <rect
            key={i}
            x={-292 + i * 12}
            y={492}
            width={4.4}
            height={56}
            rx={2}
            fill="#e6fdff"
            opacity={(0.18 + 0.82 * Math.max(0, Math.sin(t * 5 - i * 0.55))) * glow}
          />
        ))}
        <rect x={-148} y={486} width={14} height={68} rx={6} fill="#2c5885" />
      </g>
      {/* التوربين (منظر أماميّ) */}
      <g transform="translate(-82 520)">
        <circle r={56} fill="#0b1f3d" stroke="#7fb4d6" strokeWidth={3} />
        <circle r={50} fill="#112f55" />
        <g transform={`rotate(${spin})`}>
          {Array.from({ length: 24 }).map((_, i) => (
            <path
              key={i}
              transform={`rotate(${(i * 360) / 24})`}
              d="M-2.6,-12 L-1.6,-48 L2.8,-46 L3.6,-12Z"
              fill="#8cc2e6"
              opacity={0.9}
            />
          ))}
        </g>
        <g transform={`rotate(${-spin * 0.7})`} opacity={0.35}>
          <circle r={36} fill="none" stroke="#cdeeff" strokeWidth={5} strokeDasharray="10 14" />
        </g>
        <circle r={13} fill="#2a5b8a" />
        <circle r={6} fill="#cdf6ff" opacity={0.5 + 0.5 * pulse} />
      </g>
      {/* بسبار */}
      <rect x={-398} y={514} width={84} height={12} fill="#35628f" />
      <rect x={-398} y={514} width={84} height={3} fill="#c8efff" opacity={0.6} />
      {/* خزّانات وأنابيب */}
      <rect x={64} y={582} width={196} height={8} fill="#0c2547" />
      <rect x={-420} y={566} width={46} height={34} rx={4} fill="#1b3d68" />
      <rect x={-420} y={566} width={46} height={3} fill={alpha(env.rim, 0.5)} />
    </g>
  );
};

/** ساحة محوّل رفع الجهد. */
const StepUp: React.FC<{ t: number; env: Env }> = ({ t, env }) => {
  const uid = useUid() + "su";
  const g = (s: string) => uid + s;
  const on = easeOut(prog(t, 10.6, 11.6));
  const flash = Math.max(0, 1 - Math.abs(t - 11.0) * 2.4);
  const flick = 0.55 + 0.45 * Math.sin(t * 7.3);
  return (
    <g>
      <defs>
        <LinGrad
          id={g("tank")}
          stops={[
            { o: 0, c: "#3b6a9a" },
            { o: 0.15, c: "#2a527e" },
            { o: 1, c: "#12335c" },
          ]}
        />
        <LinGrad
          id={g("ins")}
          x1={0}
          x2={1}
          y1={0}
          y2={0}
          stops={[
            { o: 0, c: "#d9e6f2" },
            { o: 0.4, c: "#8fb0cf" },
            { o: 1, c: "#476a8f" },
          ]}
        />
        <RadGrad
          id={g("gl")}
          stops={[
            { o: 0, c: "#d9fbff", a: 0.95 },
            { o: 0.35, c: C.cyan, a: 0.4 },
            { o: 1, c: C.cyan, a: 0 },
          ]}
        />
      </defs>
      {/* حلقات الطنين */}
      {[0, 1, 2].map((i) => {
        const u = mod(t * 0.9 + i / 3, 1);
        return (
          <ellipse
            key={i}
            cx={-10}
            cy={548}
            rx={90 + u * 190}
            ry={60 + u * 100}
            fill="none"
            stroke={C.cyan}
            strokeWidth={2.6 * (1 - u) + 0.4}
            opacity={0.36 * (1 - u) * on * ramp(t, 10.6, 11.3) * (1 - ramp(t, 14, 15.5))}
          />
        );
      })}
      <rect x={-170} y={590} width={250} height={14} fill="#0b2244" />
      <rect x={-170} y={590} width={250} height={2} fill={alpha(env.rim, 0.4)} />
      {/* مشعّات */}
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={i} x={-176 + i * 12} y={512} width={8} height={78} rx={3} fill="#1d426e" />
      ))}
      <rect x={-180} y={506} width={106} height={8} rx={3} fill="#2c5885" />
      <rect x={-180} y={586} width={106} height={8} rx={3} fill="#2c5885" />
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(${-146 + i * 46} 560)`}>
          <circle r={14} fill="#0b2244" stroke="#6ba2cc" strokeWidth={1.6} />
          <g transform={`rotate(${t * 480 * (i ? -1 : 1)})`}>
            {[0, 1, 2, 3].map((k) => (
              <ellipse
                key={k}
                cx={0}
                cy={-6}
                rx={3}
                ry={7}
                fill="#9cc7e6"
                opacity={0.85}
                transform={`rotate(${k * 90})`}
              />
            ))}
          </g>
        </g>
      ))}
      {/* خزّان المحوّل */}
      <rect x={-74} y={494} width={150} height={98} rx={9} fill={`url(#${g("tank")})`} />
      <rect x={-74} y={494} width={150} height={4} rx={2} fill={alpha(env.rim, 0.85)} />
      <rect x={74} y={496} width={2.4} height={94} fill={alpha(env.rim, 0.5)} />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={-58 + i * 36}
          y={508}
          width={4}
          height={72}
          rx={2}
          fill="#0d2850"
          opacity={0.7}
        />
      ))}
      <rect x={-60} y={464} width={112} height={30} rx={15} fill="#2a527e" />
      <rect x={-52} y={467} width={96} height={4} rx={2} fill={alpha(env.rim, 0.7)} />
      <rect x={-54} y={540} width={100} height={26} rx={6} fill="#0a1d3c" opacity={0.85} />
      <rect
        x={-48}
        y={546}
        width={88}
        height={14}
        rx={4}
        fill={C.cyan}
        opacity={0.15 + 0.5 * on * flick}
      />
      {/* بوشنغ الجهد العالي */}
      {[-60, -8, 44].map((bx, i) => (
        <g key={i}>
          <rect x={bx - 6} y={494 - 4} width={12} height={8} fill="#183a63" />
          <rect x={bx - 4} y={300} width={8} height={196} fill={`url(#${g("ins")})`} />
          {Array.from({ length: 12 }).map((_, k) => (
            <ellipse
              key={k}
              cx={bx}
              cy={320 + k * 14.5}
              rx={12}
              ry={3.8}
              fill={`url(#${g("ins")})`}
              stroke="#33597f"
              strokeWidth={0.6}
            />
          ))}
          <rect x={bx - 7} y={292} width={14} height={14} rx={3} fill="#bfe0f6" />
          <circle
            cx={bx}
            cy={296}
            r={44}
            fill={`url(#${g("gl")})`}
            opacity={on * (0.35 + 0.35 * flick) * 0.9}
          />
          <circle cx={bx} cy={296} r={70 * flash} fill={`url(#${g("gl")})`} opacity={flash} />
          {/* لمعة نجميّة */}
          <g opacity={flash * 0.9} transform={`translate(${bx} 296)`}>
            <path
              d="M0,-34 L2.4,-2.4 L34,0 L2.4,2.4 L0,34 L-2.4,2.4 L-34,0 L-2.4,-2.4Z"
              fill="#ffffff"
            />
          </g>
        </g>
      ))}
      {/* قوس كهربائيّ خفيف بين رؤوس البوشنغ */}
      <path
        d={`M-60,292 Q-34,${278 + Math.sin(t * 22) * 5} -8,292 Q18,${276 + Math.sin(t * 19 + 2) * 6} 44,292`}
        stroke="#e8fdff"
        strokeWidth={1.4}
        fill="none"
        opacity={on * (0.15 + 0.35 * Math.max(0, Math.sin(t * 9)))}
      />
      {/* مانعات صواعق */}
      {[-118, 106].map((bx, i) => (
        <g key={i}>
          <rect x={bx - 3} y={470} width={6} height={122} fill="#315f8e" />
          {[0, 1, 2, 3, 4].map((k) => (
            <rect key={k} x={bx - 8} y={474 + k * 22} width={16} height={5} rx={2} fill="#6fa0cc" />
          ))}
        </g>
      ))}
    </g>
  );
};

/** مسار الشحنة (بسبار) من المولّد إلى ساحة الرفع: خطّ منخفض على الأرض. */
const busbarPath = (): { d: string; len: number } => {
  const x0 = -398;
  const y0 = 520;
  const x1 = -YARD_P + 0;
  const y1 = 540;
  const d = `M${x0},${y0} L${x0 - 40},${y0} L${x0 - 40},${y1} L${x1 + 80},${y1} L${x1 + 80},${y1 - 24}`;
  const len = 40 + 20 + Math.abs(x0 - 40 - x1 - 80) + 24;
  return { d, len };
};

/** جزء جسم المحطة الفرعية: بوّابة + قاطع + محوّل خفض + خزانة ريليه. */
const Substation: React.FC<{ t: number; env: Env }> = ({ t, env }) => {
  const uid = useUid() + "ss";
  const g = (s: string) => uid + s;
  const on = easeOut(prog(t, 19.8, 20.8));
  const flick = 0.55 + 0.45 * Math.sin(t * 6.1);
  const ring = prog(t, 20.0, 21.4);
  return (
    <g>
      <defs>
        <LinGrad
          id={g("tank")}
          stops={[
            { o: 0, c: "#3b6a9a" },
            { o: 0.2, c: "#2a527e" },
            { o: 1, c: "#12335c" },
          ]}
        />
        <LinGrad
          id={g("ins")}
          x1={0}
          x2={1}
          y1={0}
          y2={0}
          stops={[
            { o: 0, c: "#d9e6f2" },
            { o: 0.4, c: "#8fb0cf" },
            { o: 1, c: "#476a8f" },
          ]}
        />
        <RadGrad
          id={g("gl")}
          stops={[
            { o: 0, c: "#d9fbff", a: 0.9 },
            { o: 0.4, c: C.cyan, a: 0.35 },
            { o: 1, c: C.cyan, a: 0 },
          ]}
        />
        <RadGrad
          id={g("gg")}
          stops={[
            { o: 0, c: C.mint, a: 0.9 },
            { o: 0.5, c: C.emerald, a: 0.35 },
            { o: 1, c: C.emerald, a: 0 },
          ]}
        />
      </defs>
      {/* بوّابة الدخول */}
      <g transform={`translate(${-(SUBST_P - 260)} 0)`}>
        {[-92, 92].map((px, i) => (
          <g key={i}>
            <path
              d={`M${px - 8},600 L${px - 3},450 L${px + 3},450 L${px + 8},600Z`}
              fill="#16365e"
            />
            <path
              d={`M${px + 8},600 L${px + 3},450`}
              stroke={alpha(env.rim, 0.65)}
              strokeWidth={1.6}
            />
          </g>
        ))}
        <rect x={-104} y={444} width={208} height={9} rx={2} fill="#1b4070" />
        <rect x={-104} y={444} width={208} height={2} fill={alpha(env.rim, 0.7)} />
        {[-26, 0, 26].map((px, i) => (
          <g key={i}>
            <rect x={px - 1} y={453} width={2} height={20} fill="#5d89b3" />
            {[0.1, 0.35, 0.6, 0.85].map((f, j) => (
              <rect
                key={j}
                x={px - 6}
                y={453 + 20 * f}
                width={12}
                height={2.6}
                rx={1.2}
                fill="#a8cde8"
              />
            ))}
          </g>
        ))}
      </g>
      {/* قاطع دائرة (3 أعمدة) */}
      <g transform={`translate(${-(SUBST_P - 70)} 0)`}>
        <rect x={-62} y={586} width={124} height={14} fill="#0b2244" />
        {[-34, 0, 34].map((px, i) => (
          <g key={i}>
            <rect x={px - 5} y={470} width={10} height={118} rx={4} fill={`url(#${g("ins")})`} />
            {[0, 1, 2, 3, 4].map((k) => (
              <ellipse
                key={k}
                cx={px}
                cy={484 + k * 22}
                rx={11}
                ry={3.4}
                fill={`url(#${g("ins")})`}
                stroke="#33597f"
                strokeWidth={0.6}
              />
            ))}
            <circle cx={px} cy={468} r={5} fill="#bfe0f6" />
          </g>
        ))}
        <rect x={-44} y={466} width={88} height={6} fill="#2c5885" />
      </g>
      {/* محوّل الخفض */}
      <g transform={`translate(${-SUBST_P} 0)`}>
        <rect x={-96} y={592} width={192} height={12} fill="#0b2244" />
        <rect x={-76} y={516} width={116} height={76} rx={8} fill={`url(#${g("tank")})`} />
        <rect x={-76} y={516} width={116} height={4} rx={2} fill={alpha(env.rim, 0.85)} />
        {Array.from({ length: 7 }).map((_, i) => (
          <rect key={i} x={-98 + i * 3 - 0} y={526} width={0} height={0} fill="none" />
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <rect key={"r" + i} x={42 + i * 8} y={528} width={5} height={60} rx={2} fill="#1d426e" />
        ))}
        <rect x={-62} y={492} width={80} height={24} rx={12} fill="#2a527e" />
        {[-44, -10, 24].map((bx, i) => (
          <g key={i}>
            <rect x={bx - 4} y={430} width={8} height={88} fill={`url(#${g("ins")})`} />
            {Array.from({ length: 5 }).map((_, k) => (
              <ellipse
                key={k}
                cx={bx}
                cy={440 + k * 15}
                rx={10}
                ry={3.2}
                fill={`url(#${g("ins")})`}
                stroke="#33597f"
                strokeWidth={0.6}
              />
            ))}
            <circle
              cx={bx}
              cy={428}
              r={30}
              fill={`url(#${g("gl")})`}
              opacity={on * (0.5 + 0.4 * flick)}
            />
          </g>
        ))}
        <rect x={-62} y={548} width={100} height={20} rx={5} fill="#0a1d3c" opacity={0.85} />
        <rect
          x={-56}
          y={553}
          width={88}
          height={10}
          rx={3}
          fill={C.cyan}
          opacity={0.12 + 0.55 * on * flick}
        />
        {/* مخرج الجهد المنخفض */}
        {[0, 1].map((i) => (
          <g key={i}>
            <rect x={96 + i * 22} y={500} width={7} height={28} fill={`url(#${g("ins")})`} />
            <circle cx={99.5 + i * 22} cy={498} r={4} fill="#cfe9fb" />
          </g>
        ))}
        <rect x={40} y={528} width={74} height={4} fill="#2a527e" />
        <rect x={96} y={528} width={18} height={64} fill="#2a527e" />
      </g>
      {/* خزانة الريليه — تُضاء عند 20.0 */}
      <g transform={`translate(${-(SUBST_P + 250)} 600) scale(1.45) translate(0 -600)`}>
        <circle
          cx={0}
          cy={540}
          r={20 + ring * 150}
          fill="none"
          stroke={C.mint}
          strokeWidth={3 * (1 - ring) + 0.2}
          opacity={(1 - ring) * 0.7 * on}
        />
        <circle cx={0} cy={528} r={120} fill={`url(#${g("gg")})`} opacity={on * 0.55} />
        <rect x={-34} y={470} width={68} height={130} rx={6} fill="#183a63" />
        <rect x={-34} y={470} width={68} height={3} fill={alpha(env.rim, 0.8)} />
        <rect x={-26} y={482} width={52} height={36} rx={4} fill="#06142b" />
        <rect x={-22} y={486} width={44} height={28} rx={3} fill={mix("#0e2a4d", "#1d5f7a", on)} />
        <path
          d="M-12,500 L-4,508 L12,492"
          stroke={C.mint}
          strokeWidth={3.2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={on}
        />
        {[0, 1, 2, 3].map((i) => (
          <circle
            key={i}
            cx={-20 + i * 13}
            cy={532}
            r={3.2}
            fill={i < 3 ? C.emerald : C.amber}
            opacity={0.2 + 0.8 * on * (i === 3 ? 0.25 : 0.6 + 0.4 * Math.sin(t * 4 + i))}
          />
        ))}
        {[0, 1, 2].map((i) => (
          <rect key={i} x={-24} y={546 + i * 14} width={48} height={8} rx={2} fill="#0a1d3c" />
        ))}
        {[0, 1, 2].map((i) => (
          <rect
            key={"l" + i}
            x={-20}
            y={548 + i * 14}
            width={18 + i * 6}
            height={4}
            rx={2}
            fill={C.cyan}
            opacity={0.25 + 0.5 * on}
          />
        ))}
      </g>
    </g>
  );
};

/** أعمدة التوزيع + أسلاكها بنبضات دافئة، من المحطة الفرعية إلى المدينة. */
const DIST_P0 = 4180;
const DIST_N = 12;
const DIST_SP = 150;
const distPath = (lvl: number): { d: string; len: number } => {
  const y = 600 - 150 + lvl * 30;
  const x0 = -(SUBST_P - 110);
  let d = `M${x0},${528}`;
  let len = 0;
  let cx = x0;
  let cy = 528;
  for (let i = 0; i < DIST_N; i++) {
    const px = -(DIST_P0 + i * DIST_SP);
    d += catenary(cx, cy, px, y, 12);
    len += catenaryLen(cx, cy, px, y, 12);
    cx = px;
    cy = y;
  }
  return { d, len };
};

const DistLine: React.FC<{ t: number; env: Env }> = ({ t, env }) => {
  const lines = [0, 1].map(distPath);
  const front = (t - 20.6) * 1300;
  return (
    <g>
      {Array.from({ length: DIST_N }).map((_, i) => {
        const px = -(DIST_P0 + i * DIST_SP);
        return (
          <g key={i}>
            <rect x={px - 3.5} y={440} width={7} height={162} fill="#12305a" />
            <rect x={px + 1} y={440} width={2.4} height={162} fill={alpha(env.rim, 0.5)} />
            <rect x={px - 24} y={448} width={48} height={5} fill="#12305a" />
            <rect x={px - 18} y={478} width={36} height={4} fill="#12305a" />
            {[-20, 20].map((o, j) => (
              <rect key={j} x={px + o - 1.4} y={440} width={2.8} height={9} fill="#9cc2e4" />
            ))}
          </g>
        );
      })}
      {lines.map((l, i) => (
        <Pulses
          key={i}
          d={l.d}
          len={l.len}
          t={t}
          speed={620}
          period={230}
          color="#ffd88a"
          core="#fffbe6"
          width={2.3}
          phase={i * 90}
          clip={[
            -(DIST_P0 + DIST_N * DIST_SP) - 100,
            300,
            Math.max(0, front + (DIST_P0 + DIST_N * DIST_SP) + 100 - (SUBST_P - 110) + 0),
            400,
          ]}
          dark="#0a1b36"
        />
      ))}
    </g>
  );
};

const RailGlyph: React.FC<{ i: number; x: number; y: number; c: string }> = ({ i, x, y, c }) => {
  const sw = 1.7;
  return (
    <g
      transform={`translate(${x} ${y})`}
      stroke={c}
      strokeWidth={sw}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {i === 0 && <path d="M2,-9 L-5,1 L0,1 L-2,9 L5,-2 L0,-2Z" />}
      {i === 1 && (
        <>
          <circle cx={-4} cy={0} r={5.4} />
          <circle cx={4} cy={0} r={5.4} />
        </>
      )}
      {i === 2 && <path d="M-8,9 L-2,-9 L2,-9 L8,9 M-6,3 L6,3 M-4,-3 L4,-3" />}
      {i === 3 && (
        <>
          <rect x={-8} y={-7} width={16} height={14} rx={2.4} />
          <path d="M-4,0 L-1,3 L5,-3" />
        </>
      )}
      {i === 4 && <path d="M-9,9 L-9,-1 L-3,-1 L-3,-9 L3,-9 L3,9 M3,2 L9,2 L9,9 M-9,9 L9,9" />}
    </g>
  );
};

/** شريط المراحل السفلي (أيقونات بلا نصوص ولا أرقام). */
const Rail: React.FC<{ t: number }> = ({ t }) => {
  const stages = [CUE.gen, CUE.stepUp, CUE.lines, CUE.stepDown, CUE.city];
  const x = (i: number) => 640 + 270 - i * 135;
  const y = 678;
  const cur = stages.reduce((a, s, i) => (t >= s - 0.05 ? i : a), 0);
  const fadeIn = easeOut(prog(t, 8.0, 8.7)) * (1 - easeInOut(prog(t, 23.6, 24.0)));
  const fillU = clamp(
    cur +
      easeInOut(prog(t, stages[Math.min(4, cur)], stages[Math.min(4, cur + 1)] ?? 24)) *
        (cur < 4 ? 1 : 0),
    0,
    4,
  );
  return (
    <g opacity={fadeIn}>
      <rect
        x={640 - 310}
        y={y - 28}
        width={620}
        height={56}
        rx={28}
        fill="rgba(4,10,24,0.62)"
        stroke="rgba(122,232,247,0.22)"
      />
      <line
        x1={x(0)}
        y1={y}
        x2={x(4)}
        y2={y}
        stroke="#1a3a62"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <line
        x1={x(0)}
        y1={y}
        x2={x(0) - (x(0) - x(4)) * (fillU / 4)}
        y2={y}
        stroke={C.cyan}
        strokeWidth={3}
        strokeLinecap="round"
        opacity={0.95}
      />
      {stages.map((s, i) => {
        const act = i === cur;
        const done = i < cur;
        const k = easeOut(prog(t, s - 0.05, s + 0.4));
        return (
          <g key={i}>
            {act && (
              <circle cx={x(i)} cy={y} r={22 + 3 * Math.sin(t * 4)} fill={C.cyan} opacity={0.18} />
            )}
            <circle
              cx={x(i)}
              cy={y}
              r={17}
              fill={act || done ? mix("#0c2a4a", C.cyan, 0.25 + 0.2 * k) : "#0a1d3a"}
              stroke={act ? C.cyanSoft : done ? C.cyan : "#2b4d78"}
              strokeWidth={act ? 2.4 : 1.6}
            />
            <RailGlyph i={i} x={x(i)} y={y} c={act || done ? "#eaffff" : "#7f9cc0"} />
          </g>
        );
      })}
    </g>
  );
};

/** سيّارة صغيرة بمصابيح أماميّة (منظر جانبيّ). dir=-1 تتّجه يسارًا. */
const Car: React.FC<{
  x: number;
  y: number;
  dir: 1 | -1;
  color: string;
  night: number;
  sc?: number;
}> = ({ x, y, dir, color, night, sc = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${dir * sc} ${sc})`}>
    <path
      d="M-52,-10 L-52,-20 Q-50,-26 -42,-27 L-26,-30 L-14,-42 Q-12,-45 -6,-45 L22,-45 Q28,-45 32,-38 L40,-28 L50,-26 Q54,-24 54,-18 L54,-10Z"
      fill={color}
    />
    <path d="M-10,-40 L22,-40 Q25,-40 28,-35 L33,-28 L-18,-28Z" fill="#0b1c36" opacity={0.85} />
    <circle cx={-30} cy={-9} r={9} fill="#05080f" />
    <circle cx={32} cy={-9} r={9} fill="#05080f" />
    <circle cx={-30} cy={-9} r={4} fill="#8fa3b8" />
    <circle cx={32} cy={-9} r={4} fill="#8fa3b8" />
    <path
      d="M54,-22 L190,-48 L190,6 L54,-14Z"
      fill="#fff0c0"
      opacity={0.26 * night}
      style={{ mixBlendMode: "screen" }}
    />
    <rect x={50} y={-24} width={6} height={5} rx={2} fill="#fff6d0" />
    <rect
      x={-54}
      y={-22}
      width={4}
      height={5}
      rx={1.5}
      fill="#ff4a3d"
      opacity={0.5 + 0.5 * night}
    />
  </g>
);

/** توربين رياح بعيد. */
const WindTurbine: React.FC<{
  x: number;
  baseY: number;
  h: number;
  t: number;
  color: string;
  seed: number;
}> = ({ x, baseY, h, t, color, seed }) => (
  <g>
    <path
      d={`M${x - h * 0.02},${baseY} L${x - h * 0.01},${baseY - h} L${x + h * 0.01},${baseY - h} L${x + h * 0.02},${baseY}Z`}
      fill={color}
    />
    <g transform={`translate(${x} ${baseY - h}) rotate(${t * (28 + seed * 6) + seed * 50})`}>
      {[0, 120, 240].map((a) => (
        <path
          key={a}
          transform={`rotate(${a})`}
          d={`M${-h * 0.012},0 L0,${-h * 0.5} L${h * 0.012},0Z`}
          fill={color}
        />
      ))}
      <circle r={h * 0.03} fill={color} />
    </g>
  </g>
);

const Foreground: React.FC<{ env: Env; cam: number }> = ({ env, cam }) => (
  <g>
    {Array.from({ length: 22 }).map((_, i) => {
      const px = -9000 + i * 520 + hash1(i * 3.3) * 200;
      const rr = 26 + hash1(i) * 38;
      return (
        <g key={i} transform={`translate(${px} 0)`}>
          <ellipse cx={0} cy={724} rx={rr * 1.8} ry={rr} fill="#030812" />
          <ellipse cx={rr * 0.7} cy={716} rx={rr} ry={rr * 0.7} fill="#030812" />
          <path
            d={`M${-rr},722 l-4,-${rr * 1.2} l9,${rr * 0.9} l4,-${rr * 1.5} l6,${rr * 1.3} l8,-${rr} l2,${rr}Z`}
            fill="#040a16"
          />
        </g>
      );
    })}
    <rect x={-9000} y={706} width={20000} height={30} fill="#030812" opacity={0.0} />
  </g>
);

const FarTowers: React.FC<{
  t: number;
  env: Env;
  k: number;
  h: number;
  baseY: number;
  spacing: number;
  color: string;
  pulses?: boolean;
  seed: number;
  cam: number;
}> = ({ t, env, k, h, baseY, spacing, color, pulses, seed, cam }) => {
  const n = 22;
  const x0 = Math.floor((-cam * k - 800) / spacing) * spacing;
  const towers: number[] = [];
  for (let i = 0; i < n; i++) towers.push(x0 - 0 + i * spacing);
  let wires: string[] = ["", "", ""];
  let lens = [0, 0, 0];
  towers.forEach((x, i) => {
    if (i === towers.length - 1) return;
    const a = towerGeom(x, baseY, h);
    const b = towerGeom(towers[i + 1], baseY, h);
    for (let m = 0; m < 3; m++) {
      const p0 = a.tips.right[m];
      const p1 = b.tips.left[m];
      wires[m] +=
        `${i === 0 ? "M" + p0[0] + "," + p0[1] : "L" + p0[0] + "," + p0[1]}${catenary(p0[0], p0[1], p1[0], p1[1], h * 0.1)}`;
      lens[m] += catenaryLen(p0[0], p0[1], p1[0], p1[1], h * 0.1);
    }
  });
  return (
    <g>
      {wires.map((d, m) => (
        <g key={m}>
          <path d={d} stroke={color} strokeWidth={Math.max(0.8, h / 150)} fill="none" />
          {pulses && (
            <Pulses
              d={d}
              len={lens[m]}
              t={t}
              speed={-500}
              period={420}
              color="#6fdcf0"
              core="#e0fbff"
              width={Math.max(1, h / 120)}
              phase={m * 140}
              opacity={0.55 * ramp(t, 14.2, 15.4)}
              showBase={false}
              clip={[-9000, 0, 20000, 800]}
            />
          )}
        </g>
      ))}
      {towers.map((x, i) => (
        <Tower
          key={i}
          x={x}
          baseY={baseY}
          h={h}
          color={color}
          rim={alpha(env.rim, 0.5)}
          rimSide={-1}
        />
      ))}
    </g>
  );
};

export const S2: React.FC<{ t: number }> = ({ t }) => {
  const uid = useUid();
  const g = (s: string) => uid + s;
  const cam = camP(t);
  const env = envAt(t);
  const sky = skyAt(t);
  const sunY = lerp(466, 640, ramp(t, 8, 16.5));
  const sunA = 1 - ramp(t, 14.5, 17.2);
  const moonA = ramp(t, 16.5, 20);
  const camY = lerp(0, 24, ramp(t, 13.4, 15.5)) - lerp(0, 24, ramp(t, 21, 23.5));
  const zoom = 1 + 0.03 * Math.sin(prog(t, 8, 24) * Math.PI);
  const bus = busbarPath();
  // الخطوط الأفقية — كل طور له إزاحة
  const phaseColor = (m: number) => (m === 1 ? "#c8f4ff" : "#7ee4f6");
  const frontX = (tStart: number, x0: number, v: number) => {
    // الجبهة تتقدّم نحو اليسار (x يتناقص)
    return x0 - (t - tStart) * v;
  };
  const hvX = frontX(13.3, -YARD_P, 1500);
  const city = makeSkyline(11, 4300, 6700, 150, 430, 56, 118, 21.7, 1.9, 4300, 1).map((b) => ({
    ...b,
    x: -b.x - b.w,
  }));
  const cityBack = makeSkyline(29, 4000, 7200, 230, 560, 70, 140, 21.9, 1.8, 4300, 1).map((b) => ({
    ...b,
    x: -b.x - b.w,
  }));
  return (
    <g>
      <g transform={`translate(640 ${360 + camY * 0.2}) scale(${zoom}) translate(-640 -360)`}>
        <Sky
          stops={sky.map((c, i) => ({ o: [0, 0.28, 0.5, 0.64, 0.7][i], c }))}
          x={-300}
          y={-100}
          w={1900}
          h={860}
        />
        <Stars opacity={ramp(t, 14, 20) * 0.95} t={t} count={130} h={360} />
        <g opacity={sunA}>
          <Sun
            x={170}
            y={sunY}
            r={36}
            t={t}
            core="#fff2d0"
            halo="#ff9a52"
            rays={0.12}
            haloR={560}
          />
        </g>
        {/* قمر هلاليّ */}
        <g opacity={moonA} transform="translate(1010 150)">
          <defs>
            <mask id={g("mm")}>
              <rect x={-60} y={-60} width={120} height={120} fill="#000" />
              <circle r={26} fill="#fff" />
              <circle cx={11} cy={-5} r={23} fill="#000" />
            </mask>
            <RadGrad
              id={g("mg")}
              stops={[
                { o: 0, c: "#cfe6ff", a: 0.35 },
                { o: 1, c: "#cfe6ff", a: 0 },
              ]}
            />
          </defs>
          <circle r={90} fill={`url(#${g("mg")})`} />
          <rect x={-60} y={-60} width={120} height={120} fill="#e8f2ff" mask={`url(#${g("mm")})`} />
        </g>
        <Streak
          x={mod(60 - cam * 0.03 + t * 3, 1900) - 400}
          y={190}
          w={560}
          h={13}
          color="#b4cfe8"
          opacity={0.16 * (0.5 + env.warm * 0.6)}
          under={mix("#ffa86a", "#6b86c2", 1 - env.warm)}
        />
        <Streak
          x={mod(760 - cam * 0.04 + t * 4, 1900) - 400}
          y={300}
          w={640}
          h={14}
          color="#c8d6e6"
          opacity={0.2 * (0.4 + env.warm * 0.6)}
          under={mix("#ff9a60", "#5a74b0", 1 - env.warm)}
        />
        <Streak
          x={mod(300 - cam * 0.05 + t * 5, 1900) - 400}
          y={380}
          w={560}
          h={10}
          color="#e8cfb0"
          opacity={0.22 * env.warm + 0.04}
          under="#ff9457"
        />
        {/* تلال بعيدة */}
        <g transform={`translate(${640 + cam * 0.06} 0)`}>
          <path
            d={ridgePath(5, -1500 - 640, 1500, 500, 70, 16, 1)}
            fill={mix("#3f78a2", "#16335c", 1 - env.warm)}
            opacity={0.9}
          />
        </g>
        <g transform={`translate(${640 + cam * 0.14} 0)`}>
          <path
            d={ridgePath(17, -2400, 800, 535, 48, 16, 1.4)}
            fill={mix("#2a5a86", "#0f2549", 1 - env.warm)}
          />
        </g>
        {/* أبراج بعيدة (طبقة 0.3) وأبراج متوسّطة (0.55) */}
        <g transform={`translate(${640 + cam * 0.3} 0)`}>
          <FarTowers
            t={t}
            env={env}
            k={0.3}
            h={110}
            baseY={560}
            spacing={300}
            color={mix("#24527e", "#0d2142", 1 - env.warm)}
            seed={1}
            cam={-cam + 640 - 640}
          />
        </g>
        <g transform={`translate(${640 + cam * 0.18} 0)`}>
          {Array.from({ length: 22 }).map((_, i) => (
            <WindTurbine
              key={i}
              x={-4200 + i * 330 + hash1(i * 3.3) * 80}
              baseY={548}
              h={120 + hash1(i) * 40}
              t={t}
              color={mix("#2c5f8c", "#102a4f", 1 - env.warm)}
              seed={i}
            />
          ))}
        </g>
        {/* مدينة خلفيّة (0.7) */}
        <g transform={`translate(${640 + cam * 0.72} 0)`}>
          {cityBack.map((b, i) => (
            <Building
              key={i}
              b={b}
              baseY={600}
              idx={100 + i}
              t={t}
              body="#0d2144"
              bodyTop="#14305a"
              rim={env.rim}
              winW={5}
              winH={7}
              gap={6}
              dim={0.7}
              litBoost={0.8}
            />
          ))}
        </g>
        <g transform={`translate(${640 + cam * 0.55} 0)`}>
          <FarTowers
            t={t}
            env={env}
            k={0.55}
            h={190}
            baseY={588}
            spacing={340}
            color={mix("#1a406a", "#0a1c3a", 1 - env.warm)}
            pulses
            seed={2}
            cam={-cam + 640 - 640}
          />
        </g>
        {/* تلال متوسّطة بمنازل صغيرة */}
        <g transform={`translate(${640 + cam * 0.85} 0)`}>
          <path
            d={ridgePath(31, -9000, 1200, 580, 26, 16, 2.2)}
            fill={mix("#1c4574", "#0a1c3a", 1 - env.warm)}
          />
          {Array.from({ length: 26 }).map((_, i) => {
            const hx = -9000 + i * 380 + hash1(i * 2.7) * 200;
            const lit = ramp(t, 20.6 + hash1(i) * 2.6, 21.2 + hash1(i) * 2.6);
            return (
              <g key={i}>
                <rect x={hx} y={572} width={22} height={14} fill="#0b1e3d" />
                <path d={`M${hx - 2},572 L${hx + 11},562 L${hx + 24},572Z`} fill="#0b1e3d" />
                <rect
                  x={hx + 6}
                  y={576}
                  width={5}
                  height={5}
                  fill="#ffd88a"
                  opacity={0.15 + 0.85 * lit}
                />
              </g>
            );
          })}
        </g>
        {/* وهج المدينة */}
        <g transform={`translate(${640 + cam * 0.9} 0)`}>
          <ellipse
            cx={-5500}
            cy={560}
            rx={900}
            ry={190}
            fill="#ffb867"
            opacity={0.28 * ramp(t, 21.2, 23.6)}
            style={{ mixBlendMode: "screen" }}
          />
        </g>
        {/* ——— الطبقة القريبة ——— */}
        <g transform={`translate(${640 + cam} 0)`}>
          <GroundBand env={env} t={t} />
          {/* سياج/أرضيّة الممرّ */}
          <rect x={-9000} y={600} width={20000} height={4} fill="#0e2a4f" />
          <Plant t={t} env={env} />
          <g transform={`translate(${-YARD_P} 0)`}>
            <StepUp t={t} env={{ ...env }} />
          </g>
          {/* بسبار المولّد → محوّل الرفع */}
          <g transform={`translate(${-YARD_P} 0)`} />
          <Pulses
            d={bus.d}
            len={bus.len}
            t={t}
            speed={520}
            period={220}
            color={C.cyan}
            core="#e8fdff"
            width={3.4}
            clip={[
              -398 - Math.max(0, (t - 8.6) * 900) - 40,
              300,
              Math.max(0, (t - 8.6) * 900) + 80,
              400,
            ]}
          />
          {/* أبراج النقل */}
          {Array.from({ length: TOWER_N }).map((_, i) => (
            <Tower
              key={i}
              x={-towerP(i)}
              baseY={TOWER_Y}
              h={TOWER_H}
              color={env.sil}
              rim={alpha(env.rim, 0.85)}
              rimSide={-1}
              lw={2.1}
            />
          ))}
          {PHASES.map((ph, m) => (
            <Pulses
              key={m}
              d={ph.d}
              len={ph.len}
              t={t}
              speed={1000}
              period={310}
              color={phaseColor(m)}
              core="#ffffff"
              width={3.4}
              phase={m * 100}
              dark={mix("#27496f", "#0a1a33", 0.4)}
              darkWidth={2}
              clip={
                [Math.max(-SUBST_P - 800, hvX), 200, YARD_P + 99999, 500].map((v, i) => v) as [
                  number,
                  number,
                  number,
                  number,
                ]
              }
            />
          ))}
          <Substation t={t} env={env} />
          <DistLine t={t} env={env} />
          {/* المدينة */}
          {city.map((b, i) => (
            <Building
              key={i}
              b={b}
              baseY={600}
              idx={i}
              t={t}
              body="#0f2850"
              bodyTop="#1a3c70"
              rim={env.rim}
            />
          ))}
          {/* سيّارات على الطريق */}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const dir = (i % 2 ? 1 : -1) as 1 | -1;
            const sp = 150 + (i % 3) * 55;
            const x = mod(1500 * i + dir * sp * t, 9600) - 7600;
            return (
              <Car
                key={i}
                x={x}
                y={dir === -1 ? 656 : 676}
                dir={dir}
                color={
                  ["#cfd9e4", "#2f6fb0", "#e8eef4", "#8aa4bf", "#1d4f86", "#d9a441", "#f0f4f8"][i]
                }
                night={env.night}
                sc={dir === -1 ? 1.15 : 1.0}
              />
            );
          })}
          {/* أضواء الشارع */}
          {Array.from({ length: 14 }).map((_, i) => {
            const px = -(4300 + i * 150 + 40);
            const on = ramp(t, 21.4 + i * 0.07, 22.1 + i * 0.07);
            return (
              <g key={i}>
                <rect x={px - 1.6} y={540} width={3.2} height={60} fill="#0a1a33" />
                <circle cx={px} cy={538} r={3.4} fill="#ffe1a0" opacity={on} />
                <ellipse cx={px} cy={600} rx={42} ry={6} fill="#ffd88a" opacity={0.2 * on} />
                <circle cx={px} cy={538} r={26} fill="#ffd88a" opacity={0.2 * on} />
              </g>
            );
          })}
          <g transform="translate(0 0)">
            <Foreground env={env} cam={cam} />
          </g>
        </g>
        <Motes
          t={t}
          count={26}
          color="#bfe8ff"
          opacity={0.35 * (1 - env.warm * 0.4)}
          area={[0, 250, 1280, 380]}
          size={1.6}
          drift={-18}
        />
      </g>
      <Rail t={t} />
    </g>
  );
};
