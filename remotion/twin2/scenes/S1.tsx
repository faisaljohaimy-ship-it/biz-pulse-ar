/**
 * S1 — الفجر والحارس (0.0–8.0 ث). كاميرا تتبّعٍ تدفع ببطء؛ حارسٌ يمشي دورةً كاملة
 * وكشّافه يمسح، ويرفع اللاسلكي إلى فمه عند 5.5 ث. شروق فوق محطة تحويل بأبراج وضباب.
 */
import React from "react";
import { Guard, LOOKS } from "../characters/Guard";
import { blendPose, standSide } from "../characters/rig";
import { radioToMouth, walkPose } from "../characters/poses";
import { FogBand, Motes, ridgePath, Sky, Stars, Streak, Sun } from "../kit/atmo";
import { alpha, mix } from "../kit/color";
import {
  clamp,
  easeInOut,
  easeInOutSoft,
  hash1,
  keyframes,
  lerp,
  mod,
  prog,
  ramp,
} from "../kit/ease";
import { LinGrad, RadGrad, catenary, useUid } from "../kit/svgx";
import { Tower, towerGeom } from "../kit/tower";
import { C } from "../palette";
import { CUE } from "../timeline";

const RIM = "#ffcf9a";
const SUNX = 960;

/** سرعة الحارس بالعالم (بكسل/ث) وموضعه — يتباطأ ويقف عند ~5.4 ث. */
const V0 = 235;
const guardWorldX = (t: number): number => {
  const X0 = 2200;
  const walkEnd = 4.7;
  const stopEnd = 5.45;
  if (t <= walkEnd) return X0 - V0 * t;
  const u = clamp((t - walkEnd) / (stopEnd - walkEnd));
  // تكامل 1 - (3u²-2u³) من 0..u = u - u³ + u⁴/2
  const integ = (u - u ** 3 + u ** 4 / 2) * (stopEnd - walkEnd) * V0;
  return X0 - V0 * walkEnd - integ;
};

const Ridge: React.FC<{
  seed: number;
  baseY: number;
  amp: number;
  fill: string;
  xc: number;
  k: number;
  freq?: number;
}> = ({ seed, baseY, amp, fill, xc, k, freq }) => (
  <g transform={`translate(${-xc * k} 0)`}>
    <path d={ridgePath(seed, xc * k - 200, xc * k + 1500, baseY, amp, 16, freq)} fill={fill} />
  </g>
);

/** صف أبراج بعيد بأسلاكه. */
const TowerRow: React.FC<{
  xc: number;
  k: number;
  baseY: number;
  h: number;
  spacing: number;
  color: string;
  rim: string;
  wire: string;
}> = ({ xc, k, baseY, h, spacing, color, rim, wire }) => {
  const x0 = Math.floor((xc * k - 800) / spacing) * spacing;
  const towers: number[] = [];
  for (let x = x0; x < xc * k + 1500; x += spacing) towers.push(x);
  let wires = "";
  towers.forEach((x, i) => {
    if (i === towers.length - 1) return;
    const a = towerGeom(x, baseY, h);
    const b = towerGeom(towers[i + 1], baseY, h);
    for (let m = 0; m < 3; m++) {
      const p0 = a.tips.right[m];
      const p1 = b.tips.left[m];
      wires += `M${p0[0].toFixed(1)},${p0[1].toFixed(1)}${catenary(p0[0], p0[1], p1[0], p1[1], h * 0.09)}`;
    }
  });
  return (
    <g transform={`translate(${-xc * k} 0)`}>
      <path d={wires} stroke={wire} strokeWidth={Math.max(0.8, h / 110)} fill="none" />
      {towers.map((x) => (
        <Tower key={x} x={x} baseY={baseY} h={h} color={color} rim={rim} rimSide={1} />
      ))}
    </g>
  );
};

/** منشآت ساحة المحطة (ظلال بحافّة ضوء). */
const YardStructure: React.FC<{ kind: number; x: number; baseY: number; t: number; k: number }> = ({
  kind,
  x,
  baseY,
  t,
  k,
}) => {
  const body = "#0b2140";
  const body2 = "#102b4f";
  const rim = alpha(RIM, 0.7);
  const blink = (ph: number) => 0.45 + 0.55 * Math.max(0, Math.sin(t * 2.2 + ph));
  if (kind === 0) {
    // بوّابة جهد (gantry)
    const w = 190;
    const h = 150;
    return (
      <g transform={`translate(${x} ${baseY})`}>
        {[-w / 2, w / 2].map((px, i) => (
          <g key={i}>
            <path d={`M${px - 9},0 L${px - 3},${-h} L${px + 3},${-h} L${px + 9},0Z`} fill={body} />
            <path
              d={`M${px - 7},${-10} L${px + 7},${-40} M${px + 7},${-10} L${px - 7},${-40} M${px - 5},${-50} L${px + 5},${-84} M${px + 5},${-50} L${px - 5},${-84}`}
              stroke={body2}
              strokeWidth={1.4}
            />
          </g>
        ))}
        <rect x={-w / 2 - 14} y={-h - 6} width={w + 28} height={9} rx={2} fill={body} />
        <rect x={-w / 2 - 14} y={-h - 6} width={w + 28} height={2} fill={rim} />
        {[-w / 3, 0, w / 3].map((px, i) => (
          <g key={i}>
            <line x1={px} y1={-h + 3} x2={px} y2={-h + 30} stroke={body2} strokeWidth={2} />
            {[0.2, 0.4, 0.6, 0.8].map((f, j) => (
              <rect key={j} x={px - 4} y={-h + 3 + 27 * f} width={8} height={2.4} fill={body2} />
            ))}
          </g>
        ))}
        <path
          d={`M${-w / 2 + 8},${-h * 0.5} L${w / 2 - 8},${-h * 0.5}`}
          stroke={body}
          strokeWidth={4}
        />
        <path d={`M${w / 2 + 9},0 L${w / 2 + 3},${-h}`} stroke={rim} strokeWidth={1.4} />
      </g>
    );
  }
  if (kind === 1) {
    // محوّل قدرة
    const w = 150;
    const h = 62;
    return (
      <g transform={`translate(${x} ${baseY})`}>
        <rect x={-w / 2 - 8} y={-8} width={w + 16} height={8} fill={body} />
        <rect x={-w / 2} y={-8 - h} width={w} height={h} rx={5} fill={body2} />
        <rect x={-w / 2} y={-8 - h} width={w} height={3} fill={rim} />
        {Array.from({ length: 9 }).map((_, i) => (
          <rect
            key={i}
            x={w / 2 + 2 + i * 6}
            y={-8 - h + 10}
            width={4}
            height={h - 14}
            rx={1}
            fill={body}
          />
        ))}
        <rect x={-w / 2 + 12} y={-8 - h - 26} width={w * 0.5} height={22} rx={11} fill={body} />
        {[-40, 0, 40].map((px, i) => (
          <g key={i}>
            <path
              d={`M${px - 6},${-8 - h} L${px - 3},${-8 - h - 58} L${px + 3},${-8 - h - 58} L${px + 6},${-8 - h}Z`}
              fill={body}
            />
            {[0.2, 0.38, 0.56, 0.74].map((f, j) => (
              <rect
                key={j}
                x={px - 9}
                y={-8 - h - 58 * f - 2}
                width={18}
                height={3.4}
                rx={1.4}
                fill={body}
              />
            ))}
            <circle cx={px} cy={-8 - h - 60} r={2} fill={C.cyanSoft} opacity={blink(i * 1.3)} />
          </g>
        ))}
        <circle cx={-w / 2 + 14} cy={-8 - h + 14} r={2.4} fill={C.mint} opacity={blink(0.7)} />
        <circle cx={-w / 2 + 24} cy={-8 - h + 14} r={2.4} fill={C.cyan} opacity={blink(2.1)} />
      </g>
    );
  }
  if (kind === 2) {
    // سارية مانعة صواعق
    return (
      <g transform={`translate(${x} ${baseY})`}>
        <path d={`M-5,0 L-1.6,-230 L1.6,-230 L5,0Z`} fill={body} />
        <path d={`M-1.6,-230 L0,-258 L1.6,-230Z`} fill={body} />
        <path d={`M5,0 L1.6,-230`} stroke={rim} strokeWidth={1.2} />
        <circle
          cx={0}
          cy={-258}
          r={2.2}
          fill="#ff6b5a"
          opacity={0.35 + 0.65 * Math.max(0, Math.sin(t * 1.9 + k))}
        />
      </g>
    );
  }
  // مبنى تحكّم
  return (
    <g transform={`translate(${x} ${baseY})`}>
      <rect x={-90} y={-78} width={180} height={78} fill={body2} />
      <rect x={-98} y={-86} width={196} height={10} fill={body} />
      <rect x={-98} y={-86} width={196} height={2} fill={rim} />
      <path d={`M90,0 L90,-78`} stroke={rim} strokeWidth={1.4} />
      {[-62, -22, 18, 58].map((px, i) => (
        <rect
          key={i}
          x={px - 11}
          y={-60}
          width={22}
          height={26}
          fill={i === 1 ? "#ffd9a0" : "#2b6f95"}
          opacity={i === 1 ? 0.95 : 0.65}
        />
      ))}
      <rect x={-6} y={-120} width={3} height={34} fill={body} />
      <circle
        cx={-4.5}
        cy={-122}
        r={2}
        fill="#ff6b5a"
        opacity={0.3 + 0.7 * Math.max(0, Math.sin(t * 2 + 3))}
      />
      <rect x={30} y={-104} width={30} height={18} fill={body} />
    </g>
  );
};

/** سياج شبكيّ بأسلاك شائكة. k=1 طبقة الأرض. */
const Fence: React.FC<{ xc: number; baseY: number; h: number; id: string }> = ({
  xc,
  baseY,
  h,
  id,
}) => {
  const sp = 150;
  const x0 = Math.floor((xc - 900) / sp) * sp;
  const posts: number[] = [];
  for (let x = x0; x < xc + 900; x += sp) posts.push(x);
  const top = baseY - h;
  const post = "#081630";
  return (
    <g transform={`translate(${-xc} 0)`}>
      <defs>
        <pattern id={id} patternUnits="userSpaceOnUse" width={20} height={20} x={0} y={top}>
          <path d="M0,0 L20,20 M20,0 L0,20" stroke="#a9cfe6" strokeWidth={1.1} opacity={0.3} />
        </pattern>
      </defs>
      <rect x={xc - 760} y={top + 6} width={1560} height={h - 6} fill={`url(#${id})`} />
      <rect x={xc - 760} y={top + 4} width={1560} height={3} fill={post} />
      <rect x={xc - 760} y={baseY - 5} width={1560} height={5} fill={post} />
      {/* حواف الإضاءة */}
      <rect x={xc - 760} y={top + 4} width={1560} height={1} fill={alpha(RIM, 0.55)} />
      {posts.map((x) => (
        <g key={x}>
          <rect x={x - 3} y={top - 2} width={6} height={h + 2} fill={post} />
          <rect x={x + 1.4} y={top - 2} width={1.6} height={h + 2} fill={alpha(RIM, 0.6)} />
          <path
            d={`M${x},${top - 2} L${x + 20},${top - 22}`}
            stroke={post}
            strokeWidth={3.2}
            strokeLinecap="round"
          />
        </g>
      ))}
      {/* أسلاك شائكة */}
      {[0, 7].map((o) => (
        <path
          key={o}
          d={`M${xc - 760},${top - 14 + o} L${xc + 800},${top - 14 + o}`}
          stroke={post}
          strokeWidth={1.5}
        />
      ))}
      <path
        d={posts
          .flatMap((x) =>
            [0, 1, 2, 3].map((i) => `M${x + i * 24 - 3},${top - 18} l6,6 m-6,0 l6,-6`),
          )
          .join("")}
        stroke={post}
        strokeWidth={1.1}
        fill="none"
      />
      {posts.map((x) => (
        <path
          key={"b" + x}
          d={`M${x + 20},${top - 22} L${x + 20},${top - 21}`}
          stroke={post}
          strokeWidth={2}
        />
      ))}
    </g>
  );
};

const pylonSil = (x: number, h: number, w: number, color: string) => (
  <g>
    <rect x={x - w / 2} y={720 - h} width={w} height={h} fill={color} />
  </g>
);

export const S1: React.FC<{ t: number }> = ({ t }) => {
  const uid = useUid();
  const g = (s: string) => `${uid}${s}`;
  const gx = guardWorldX(t);
  const xc = gx - 150;
  const zoom = 1 + 0.07 * easeInOutSoft(prog(t, 0, 8));
  const dawn = easeInOut(prog(t, 0, 8));
  const sunY = lerp(478, 392, easeInOutSoft(prog(t, 0, 8)));
  const camY = lerp(0, -8, dawn);

  // ألوان السماء تتحوّل ببطء من الفجر الأزرق إلى الذهبيّ
  const sky = [
    { o: 0, c: "#030a1c" },
    { o: 0.17, c: "#0a1d46" },
    { o: 0.33, c: "#14407e" },
    { o: 0.45, c: mix("#2a6ba3", "#3b86b8", dawn) },
    { o: 0.54, c: mix("#4d9db3", "#79c0c0", dawn) },
    { o: 0.6, c: mix("#d89a85", "#f0b48a", dawn) },
    { o: 0.645, c: mix("#ff9a60", "#ffb870", dawn) },
    { o: 0.7, c: "#ffcf8e" },
  ];

  // وضع الحارس
  const walkT = Math.min(t, 4.75);
  const base = walkPose(walkT, { speed: V0 / 2.4, cycle: 1.06, swingB: 0.12, lean: 3.2 });
  // اليد B تمسك الكشّاف أمامها
  const flashHold: [number, number] = [30, 14 + Math.sin(t * 1.3) * 3];
  const withLight = {
    ...base,
    handB: [lerp(base.handB[0], flashHold[0], 0.82), lerp(base.handB[1], flashHold[1], 0.82)] as [
      number,
      number,
    ],
    gripB: 18,
  };
  const toStand = easeInOut(prog(t, 4.7, 5.4));
  const stand = { ...standSide(), handB: flashHold as [number, number], gripB: 18, lean: 2 };
  let pose = blendPose(withLight, stand, toStand);
  const radioAmt = easeInOut(prog(t, CUE.s1RadioUp, CUE.s1RadioUp + 0.45));
  pose = radioToMouth(pose, "A", radioAmt);
  const talk = radioAmt > 0.99 ? Math.sin((t - CUE.s1RadioUp) * 7.2) * 0.7 : 0;
  pose = {
    ...pose,
    handA: [pose.handA[0] + talk * 0.4, pose.handA[1] - Math.abs(talk) * 0.6],
    headTilt: pose.headTilt + talk * 0.5,
  };

  const beamAng = 20 + Math.sin(t * 1.15 + 0.6) * 11;
  const guardScale = 2.4;
  const gScreenX = 640 + (gx - xc);
  const gGround = 708;

  const fenceId = g("fn");
  return (
    <g>
      <defs>
        <LinGrad
          id={g("gr")}
          stops={[
            { o: 0, c: "#16324f" },
            { o: 0.18, c: "#0d2240" },
            { o: 1, c: "#040b19" },
          ]}
        />
        <LinGrad
          id={g("rd")}
          stops={[
            { o: 0, c: "#244763", a: 0.0 },
            { o: 0.3, c: "#31587a", a: 0.55 },
            { o: 1, c: "#1d3a58", a: 0.25 },
          ]}
        />
        <LinGrad
          id={g("pd")}
          stops={[
            { o: 0, c: "#f7c58c" },
            { o: 0.5, c: "#7fb5b6" },
            { o: 1, c: "#1d4a76" },
          ]}
        />
        <RadGrad
          id={g("gl")}
          stops={[
            { o: 0, c: "#ffd7a0", a: 0.55 },
            { o: 1, c: "#ffd7a0", a: 0 },
          ]}
        />
        <LinGrad
          id={g("lg")}
          stops={[
            { o: 0, c: "#ffe6bd", a: 0.9 },
            { o: 1, c: "#ffe6bd", a: 0 },
          ]}
        />
        <LinGrad
          id={g("vgb")}
          stops={[
            { o: 0, c: "#02060f", a: 0 },
            { o: 1, c: "#02060f", a: 0.55 },
          ]}
        />
        <LinGrad
          id={g("scrim")}
          stops={[
            { o: 0, c: "#020814", a: 0.5 },
            { o: 0.55, c: "#020814", a: 0.18 },
            { o: 1, c: "#020814", a: 0 },
          ]}
        />
        <RadGrad
          id={g("bloom")}
          stops={[
            { o: 0, c: "#ffd29a", a: 0.8 },
            { o: 0.5, c: "#ff9f5a", a: 0.25 },
            { o: 1, c: "#ff9f5a", a: 0 },
          ]}
        />
      </defs>
      <g
        transform={`translate(${(Math.sin(t * 0.9) * 1.8).toFixed(2)} ${(Math.cos(t * 1.3) * 1.2).toFixed(2)})`}
      >
        <g transform={`translate(640 ${520}) scale(${zoom}) translate(-640 ${-520 + camY})`}>
          <Sky stops={sky} x={-300} w={1900} h={760} y={-40} />
          <Stars opacity={0.8 * (1 - dawn * 0.9)} t={t} count={110} h={330} />
          <Sun
            x={SUNX - xc * 0.02}
            y={sunY}
            r={42}
            t={t}
            core="#fff6e2"
            halo="#ff9a58"
            rays={0}
            haloR={640}
          />
          <ellipse
            cx={SUNX - xc * 0.02}
            cy={sunY + 2}
            rx={520}
            ry={5}
            fill="#ffe2b8"
            opacity={0.28}
            style={{ mixBlendMode: "screen" }}
          />
          {/* سحب شريطيّة */}
          <g>
            {[
              [60, 150, 520, 12, "#8fb4dc", 0.22, "#ffb88a"],
              [640, 205, 560, 14, "#a4c6e4", 0.2, "#ffc08e"],
              [-80, 262, 640, 16, "#b9d3e4", 0.22, "#ffbf8c"],
              [520, 318, 700, 14, "#e5cdb4", 0.26, "#ffb27e"],
              [180, 372, 520, 10, "#e9c9a6", 0.24, "#ff9f6a"],
              [900, 345, 520, 12, "#f0c9a0", 0.28, "#ffa66e"],
            ].map(([cx, cy, cw, ch, col, op, un], i) => (
              <Streak
                key={i}
                x={mod((cx as number) - xc * (0.025 + i * 0.006) + t * (2.5 + i), 2100) - 380}
                y={cy as number}
                w={cw as number}
                h={ch as number}
                color={col as string}
                opacity={op as number}
                under={un as string}
              />
            ))}
          </g>
          <Ridge seed={3} baseY={470} amp={52} fill="#4a88a8" xc={xc} k={0.05} />
          <rect x={-300} y={440} width={1900} height={140} fill={alpha("#f3c48f", 0.18)} />
          <Ridge seed={11} baseY={486} amp={56} fill="#32678e" xc={xc} k={0.1} freq={1.3} />
          <FogBand y={430} h={90} color="#f1c398" opacity={0.28} />
          <TowerRow
            xc={xc}
            k={0.22}
            baseY={500}
            h={105}
            spacing={235}
            color="#2a5a82"
            rim={alpha(RIM, 0.55)}
            wire="#2a5a82"
          />
          <Ridge seed={21} baseY={520} amp={34} fill="#1d466f" xc={xc} k={0.3} freq={1.7} />
          <FogBand y={470} h={80} color="#b9d6e6" opacity={0.22} />
          <TowerRow
            xc={xc}
            k={0.42}
            baseY={560}
            h={190}
            spacing={400}
            color="#16345c"
            rim={alpha(RIM, 0.65)}
            wire="#183862"
          />
          <FogBand y={500} h={70} color="#d7c2a8" opacity={0.2} />
          {/* ساحة المحطة */}
          <g
            transform={`translate(${-xc * 0.62} 0) translate(${xc * 0.62} 590) scale(1.32) translate(${-xc * 0.62} -590)`}
          >
            <path
              d={`M${xc * 0.62 - 1100},590 L${xc * 0.62 + 1700},590 L${xc * 0.62 + 1700},720 L${xc * 0.62 - 1100},720Z`}
              fill="#0c2342"
            />
            {Array.from({ length: 14 }).map((_, i) => {
              const idx = Math.floor((xc * 0.62 - 900) / 260) + i;
              const kind = ((idx % 4) + 4) % 4;
              const px = idx * 260 + (kind === 2 ? 40 : 0) + hash1(idx) * 30;
              return <YardStructure key={idx} kind={kind} x={px} baseY={590} t={t} k={idx} />;
            })}
          </g>
          <FogBand y={520} h={80} color="#f0c9a2" opacity={0.18} />
          {/* الأرض */}
          <rect x={-300} y={596} width={1900} height={200} fill={`url(#${g("gr")})`} />
          <rect x={-300} y={596} width={1900} height={2} fill={alpha(RIM, 0.35)} />
          <Fence xc={xc} baseY={622} h={205} id={fenceId} />
          {/* الطريق */}
          <g transform={`translate(${-xc} 0)`}>
            <path
              d={`M${xc - 760},640 L${xc + 800},640 L${xc + 800},720 L${xc - 760},720Z`}
              fill={`url(#${g("rd")})`}
            />
            <path
              d={`M${xc - 760},640 L${xc + 800},640`}
              stroke={alpha("#9fcbe0", 0.35)}
              strokeWidth={1.2}
            />
            {Array.from({ length: 70 }).map((_, i) => {
              const rx = Math.floor(xc / 1560) * 1560 - 760 + hash1(i * 1.7) * 1560;
              const ry = 646 + hash1(i * 3.1 + 2) * 70;
              return (
                <circle
                  key={i}
                  cx={rx}
                  cy={ry}
                  r={0.9 + hash1(i) * 1.4}
                  fill="#6f97b4"
                  opacity={0.2 + hash1(i + 4) * 0.25}
                />
              );
            })}
            {[0, 1, 2].map((i) => {
              const px = Math.floor(xc / 1000) * 1000 + 200 + i * 520;
              return (
                <g key={i}>
                  <ellipse
                    cx={px}
                    cy={682 + (i % 2) * 14}
                    rx={120}
                    ry={11}
                    fill={`url(#${g("pd")})`}
                    opacity={0.75}
                  />
                  <ellipse
                    cx={px - 30}
                    cy={680 + (i % 2) * 14}
                    rx={50}
                    ry={2.4}
                    fill="#fff"
                    opacity={0.25}
                  />
                </g>
              );
            })}
          </g>
          {/* ظلّ الحارس الطويل (الشمس عن اليمين) */}
          <ellipse
            cx={gScreenX - 130}
            cy={gGround + 4}
            rx={190}
            ry={9}
            fill="#02060f"
            opacity={0.5}
          />
          <ellipse cx={gScreenX} cy={gGround + 3} rx={50} ry={9} fill="#02060f" opacity={0.55} />
          <Guard
            x={gScreenX}
            groundY={gGround}
            scale={guardScale}
            pose={pose}
            look={LOOKS.leader}
            facing={-1}
            light={[0.95, -0.3]}
            rim={RIM}
            itemA={radioAmt > 0.02 ? "radio" : "none"}
            itemB="flashlight"
            beam={{ angle: beamAng, length: 330, spread: 7.5, color: "#fff1c9", opacity: 0.5 }}
            beamHand="B"
            shadow={false}
            time={t}
          />
          <FogBand y={640} h={90} color="#f4cba0" opacity={0.1} />
          <Motes
            t={t}
            count={46}
            area={[0, 180, 1280, 480]}
            color="#ffe0b4"
            opacity={0.7}
            size={1.9}
            drift={10}
          />
          {/* بقع ضوء دافئة أماميّة خارجة عن البؤرة */}
          {Array.from({ length: 9 }).map((_, i) => (
            <circle
              key={i}
              cx={mod(120 + i * 190 - xc * 1.2, 1700) - 200}
              cy={668 + hash1(i * 2.1) * 46}
              r={10 + hash1(i * 3.3) * 20}
              fill="#ffd9a6"
              opacity={0.07 + 0.05 * hash1(i)}
              style={{ mixBlendMode: "screen" }}
            />
          ))}
          <rect x={-300} y={600} width={1900} height={160} fill={`url(#${g("vgb")})`} />
          <rect x={-300} y={-60} width={1900} height={380} fill={`url(#${g("scrim")})`} />
          <ellipse
            cx={SUNX - xc * 0.02}
            cy={sunY}
            rx={780}
            ry={420}
            fill={`url(#${g("bloom")})`}
            opacity={0.25 + 0.2 * dawn}
            style={{ mixBlendMode: "screen" }}
          />
        </g>
      </g>
    </g>
  );
};
void pylonSil;
