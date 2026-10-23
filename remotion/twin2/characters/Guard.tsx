/**
 * مكوّن الحارس القابل لإعادة الاستعمال — رسم متّجه مسطّح بتظليل خلويّ (cel) وحافّة ضوء.
 * المنظر: side (جانبيّ) · front (أماميّ) · back (خلفيّ). الأوضاع من `poses.ts`.
 * الوجه مبسّط عمدًا (أنف وعين صغيرة وظلّ تحت الخوذة) لتجنّب الوادي الغريب.
 * لا شخصيةَ حقيقية ولا شعارَ جهة: الزيّ كحليّ عامّ وسترة عاكسة وخوذة.
 */
import React, { useId } from "react";
import { alpha, darken, lighten, mix } from "../kit/color";
import { C } from "../palette";
import { DIM, solveRig, type Pose, type V, type View } from "./rig";

export interface Look {
  skin: string;
  hair: string;
  beard?: "none" | "short" | "full";
  shirt: string;
  pants: string;
  /** لون السترة العاكسة (null بلا سترة). */
  vest: string | null;
  headgear: "helmet" | "cap" | "none";
  headColor: string;
  build: number;
  height: number;
  headset?: boolean;
  /** عدد شرائط الرتبة على الكتف. */
  rank?: number;
}

export type Item = "none" | "flashlight" | "radio" | "scanner" | "mirror" | "card" | "wand";

export interface Beam {
  /** زاوية الشعاع (درجات) بإطار الشخصية المحلّي، 0 = للأمام. */
  angle: number;
  length: number;
  spread: number;
  color?: string;
  opacity?: number;
}

export interface GuardProps {
  x: number;
  groundY: number;
  scale?: number;
  pose: Pose;
  view?: View;
  facing?: 1 | -1;
  look: Look;
  /** اتجاه الضوء (نحو المصدر) بإحداثيات المشهد. */
  light?: V;
  rim?: string;
  itemA?: Item;
  itemB?: Item;
  beam?: Beam;
  /** اليد الحاملة للكشّاف (مصدر الشعاع). */
  beamHand?: "A" | "B";
  shadow?: boolean;
  opacity?: number;
  /** زمن بالثواني لوميض مؤشّرات الأجهزة. */
  time?: number;
  /** وهج الأجهزة الأمامية. */
  scanGlow?: number;
}

const PI = Math.PI;
const deg = (r: number) => (r * 180) / PI;
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const len = (a: V) => Math.hypot(a[0], a[1]) || 1e-6;
const norm = (a: V): V => [a[0] / len(a), a[1] / len(a)];
const nrm = (a: V): V => [-a[1] / len(a), a[0] / len(a)];
const pt = (p: V) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;

export const LOOKS: Record<string, Look> = {
  leader: {
    skin: "#c98f62",
    hair: "#1d1612",
    beard: "short",
    shirt: C.uniform,
    pants: C.pants,
    vest: C.vest,
    headgear: "helmet",
    headColor: "#f1f5f9",
    build: 1.04,
    height: 1.02,
    rank: 2,
  },
  gate: {
    skin: "#8e5b3d",
    hair: "#120d0a",
    beard: "full",
    shirt: C.uniform,
    pants: C.pants,
    vest: "#ffb020",
    headgear: "cap",
    headColor: "#16284a",
    build: 1.14,
    height: 0.99,
    rank: 1,
  },
  scout: {
    skin: "#d9a37a",
    hair: "#2a1d16",
    beard: "none",
    shirt: "#2c4f8a",
    pants: C.pants,
    vest: C.vest,
    headgear: "helmet",
    headColor: "#ffd23f",
    build: 0.92,
    height: 1.05,
  },
  patrolB: {
    skin: "#a9714c",
    hair: "#17110d",
    beard: "short",
    shirt: C.uniform,
    pants: C.pants,
    vest: C.vest,
    headgear: "cap",
    headColor: "#16284a",
    build: 1.0,
    height: 0.96,
  },
  operator: {
    skin: "#cf9a70",
    hair: "#1b1411",
    beard: "none",
    shirt: "#35599a",
    pants: C.pants,
    vest: null,
    headgear: "none",
    headColor: "#1b1411",
    build: 1.02,
    height: 1,
    headset: true,
    rank: 1,
  },
  operator2: {
    skin: "#8a583a",
    hair: "#0f0b09",
    beard: "short",
    shirt: "#35599a",
    pants: C.pants,
    vest: null,
    headgear: "none",
    headColor: "#0f0b09",
    build: 1.12,
    height: 1,
    headset: true,
  },
};

/** قطعة كبسولة مظلّلة بين نقطتين. */
interface SegProps {
  a: V;
  b: V;
  w0: number;
  w1: number;
  base: string;
  light: V;
  rim: string;
  id: string;
  stroke?: string;
}
const Seg: React.FC<SegProps> = ({ a, b, w0, w1, base, light, rim, id, stroke }) => {
  const d = sub(b, a);
  const n = nrm(d);
  const s = n[0] * light[0] + n[1] * light[1] >= 0 ? 1 : -1;
  const mid: V = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const w = (w0 + w1) / 2;
  const g0: V = [mid[0] + s * n[0] * w, mid[1] + s * n[1] * w];
  const g1: V = [mid[0] - s * n[0] * w, mid[1] - s * n[1] * w];
  const p = (pp: V, nn: V, ww: number, sg: number): V => [
    pp[0] + sg * nn[0] * ww,
    pp[1] + sg * nn[1] * ww,
  ];
  const a1 = p(a, n, w0, 1);
  const a2 = p(a, n, w0, -1);
  const b1 = p(b, n, w1, 1);
  const b2 = p(b, n, w1, -1);
  const path = `M${pt(a1)} L${pt(b1)} A${w1},${w1} 0 0 ${s > 0 ? 0 : 1} ${pt(b2)} L${pt(a2)} A${w0},${w0} 0 0 ${s > 0 ? 0 : 1} ${pt(a1)}Z`;
  const shade = darken(base, 0.34);
  const lit = lighten(base, 0.1);
  return (
    <>
      <defs>
        <linearGradient
          id={id}
          gradientUnits="userSpaceOnUse"
          x1={g0[0]}
          y1={g0[1]}
          x2={g1[0]}
          y2={g1[1]}
        >
          <stop offset="0" stopColor={rim} />
          <stop offset="0.13" stopColor={lit} />
          <stop offset="0.52" stopColor={base} />
          <stop offset="0.6" stopColor={shade} />
          <stop offset="1" stopColor={darken(base, 0.45)} />
        </linearGradient>
      </defs>
      <path
        d={path}
        fill={`url(#${id})`}
        stroke={stroke}
        strokeWidth={stroke ? 0.6 : 0}
        strokeLinejoin="round"
      />
    </>
  );
};

const Hand: React.FC<{ p: V; skin: string; r?: number; rim: string }> = ({
  p,
  skin,
  r = 4.3,
  rim,
}) => (
  <g>
    <circle cx={p[0]} cy={p[1]} r={r} fill={darken(skin, 0.18)} />
    <circle cx={p[0] - 0.5} cy={p[1] - 0.6} r={r * 0.82} fill={skin} />
    <circle cx={p[0] + 0.6} cy={p[1] - 1.2} r={r * 0.34} fill={alpha(rim, 0.55)} />
  </g>
);

/** حذاء جانبيّ. ang درجات (+ = الأصابع لأسفل). */
const BootSide: React.FC<{
  p: V;
  ang: number;
  id: string;
  light: V;
  rim: string;
  far?: boolean;
}> = ({ p, ang, id, rim, far }) => {
  const base = far ? darken(C.boot, 0.1) : C.boot;
  return (
    <g transform={`translate(${p[0].toFixed(2)} ${p[1].toFixed(2)}) rotate(${ang.toFixed(2)})`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lighten(base, 0.22)} />
          <stop offset="0.45" stopColor={base} />
          <stop offset="1" stopColor={darken(base, 0.4)} />
        </linearGradient>
      </defs>
      <path
        d="M-4.6,-5.4 L3.6,-5.4 L5.4,-0.6 C11,0.4 16.6,2.2 17.4,6.4 C17.6,8.2 16.4,9 15,9 L-5.4,9 Q-7.6,9 -7.6,6.8 L-7,0 Z"
        fill={`url(#${id})`}
      />
      <path d="M-7,6.6 L16.6,6.6 L17,9 L-6.8,9 Z" fill="#05080d" opacity={0.85} />
      <path
        d="M-4.2,-5.2 L3.4,-5.2"
        stroke={alpha(rim, 0.7)}
        strokeWidth={0.9}
        strokeLinecap="round"
      />
    </g>
  );
};

const BootFront: React.FC<{ p: V; id: string; rim: string; dir: number }> = ({
  p,
  id,
  rim,
  dir,
}) => (
  <g transform={`translate(${p[0].toFixed(2)} ${p[1].toFixed(2)})`}>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={lighten(C.boot, 0.2)} />
        <stop offset="0.5" stopColor={C.boot} />
        <stop offset="1" stopColor={darken(C.boot, 0.4)} />
      </linearGradient>
    </defs>
    <path
      d={`M-5.2,-5 L5.2,-5 L6,2 C8.6,3.6 9.2,7 8.4,8.6 L-8.4,8.6 C-9.2,7 -8.6,3.6 -6,2 Z`}
      transform={`rotate(${dir * 4})`}
      fill={`url(#${id})`}
    />
    <path
      d="M-5.2,-4.8 L5.2,-4.8"
      stroke={alpha(rim, 0.6)}
      strokeWidth={0.9}
      strokeLinecap="round"
    />
    <path d="M-8,6.4 L8,6.4 L8.4,8.6 L-8.4,8.6 Z" fill="#05080d" opacity={0.8} />
  </g>
);

const Flashlight: React.FC<{ ang: number; on: boolean }> = ({ ang, on }) => (
  <g transform={`rotate(${ang.toFixed(2)})`}>
    <rect x={-4} y={-2.7} width={15} height={5.4} rx={1.8} fill="#242c38" />
    <rect x={-4} y={-2.7} width={15} height={1.6} rx={0.8} fill="#4b5766" />
    <path d="M11,-3.9 L17.5,-5.4 L17.5,5.4 L11,3.9 Z" fill="#39434f" />
    <ellipse cx={17.8} cy={0} rx={1.6} ry={5} fill={on ? "#fff8d6" : "#9aa5b3"} />
    <rect x={2} y={-3.2} width={2.4} height={6.4} fill="#10151c" opacity={0.7} />
  </g>
);

const Radio: React.FC<{ ang: number; time: number }> = ({ ang, time }) => (
  <g transform={`rotate(${ang.toFixed(2)})`}>
    <rect x={-5} y={-3.3} width={15} height={6.6} rx={1.6} fill="#161b24" />
    <rect x={-5} y={-3.3} width={15} height={1.4} rx={0.7} fill="#3b4656" />
    <rect x={1.4} y={-1.8} width={5.2} height={3.4} rx={0.8} fill="#2b78a8" opacity={0.9} />
    <rect x={10} y={-0.8} width={9} height={1.6} rx={0.8} fill="#0d1117" />
    <circle cx={8} cy={-2.2} r={0.95} fill={Math.sin(time * 5.2) > 0.1 ? "#ff6a5a" : "#6b2a26"} />
  </g>
);

const Scanner: React.FC<{ ang: number; glow: number; id: string }> = ({ ang, glow, id }) => (
  <g transform={`rotate(${ang.toFixed(2)})`}>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#bff7ff" />
        <stop offset="1" stopColor={C.cyan} />
      </linearGradient>
    </defs>
    <rect x={-3} y={-5.4} width={17} height={10.8} rx={2.6} fill="#1c2430" />
    <rect x={-3} y={-5.4} width={17} height={2} rx={1} fill="#46566b" />
    <rect x={14} y={-4.4} width={4} height={8.8} rx={1.2} fill="#0f141b" />
    <rect
      x={0}
      y={-3.2}
      width={10}
      height={6}
      rx={1.2}
      fill={`url(#${id})`}
      opacity={0.5 + glow * 0.5}
    />
    <path
      d="M2.5,0 L4.8,1.8 L8,-1.6"
      stroke="#0a3a45"
      strokeWidth={1.1}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.4 + glow * 0.6}
    />
    <rect x={-1.2} y={4.4} width={5.2} height={7.5} rx={1.6} fill="#161d27" />
  </g>
);

const Mirror: React.FC<{ ang: number }> = ({ ang }) => (
  <g transform={`rotate(${ang.toFixed(2)})`}>
    <rect x={-6} y={-1.8} width={9} height={3.6} rx={1.6} fill="#242c38" />
    <rect x={3} y={-0.7} width={38} height={1.4} rx={0.7} fill="#8b9bb0" />
    <g transform="translate(43 0) rotate(28)">
      <ellipse cx={0} cy={0} rx={8.4} ry={5.8} fill="#1d2733" />
      <ellipse cx={0} cy={0} rx={7.2} ry={4.8} fill="#9fd9ec" />
      <path
        d="M-5,-1.6 Q0,-4.4 5,-2"
        stroke="#ffffff"
        strokeWidth={1.2}
        fill="none"
        opacity={0.85}
        strokeLinecap="round"
      />
    </g>
  </g>
);

const Card: React.FC<{ ang: number }> = ({ ang }) => (
  <g transform={`rotate(${ang.toFixed(2)})`}>
    <rect x={-2} y={-8} width={14} height={9.6} rx={1.3} fill="#f4f8fb" />
    <rect x={-2} y={-8} width={14} height={2.2} rx={1} fill={C.cyan} />
    <circle cx={2.2} cy={-2.2} r={2} fill="#9db0c4" />
    <rect x={5.4} y={-3.8} width={5} height={1} rx={0.5} fill="#9db0c4" />
    <rect x={5.4} y={-1.6} width={3.6} height={1} rx={0.5} fill="#c0cdda" />
  </g>
);

const Wand: React.FC<{ ang: number; glow: number }> = ({ ang, glow }) => (
  <g transform={`rotate(${ang.toFixed(2)})`}>
    <rect x={-4} y={-2.4} width={9} height={4.8} rx={1.6} fill="#242c38" />
    <rect x={5} y={-1.4} width={22} height={2.8} rx={1.2} fill="#ffb020" />
    <rect x={5} y={-1.4} width={22} height={0.9} rx={0.5} fill="#ffe08a" />
    <circle cx={28} cy={0} r={1.6} fill={glow > 0.5 ? "#ffe9a8" : "#a46d12"} />
  </g>
);

const useUid = (): string => useId().replace(/[^a-zA-Z0-9]/g, "");

export const Guard: React.FC<GuardProps> = ({
  x,
  groundY,
  scale = 1,
  pose,
  view = "side",
  facing = 1,
  look,
  light = [-0.5, -0.6],
  rim = "#9be8ff",
  itemA = "none",
  itemB = "none",
  beam,
  beamHand = "A",
  shadow = true,
  opacity = 1,
  time = 0,
  scanGlow = 0,
}) => {
  const uid = useUid();
  const side = view === "side";
  const back = view === "back";
  const bw = look.build;
  const j = solveRig(pose, view, { w: bw });
  const L: V = norm([light[0] * facing, light[1]]);
  const sc = scale * look.height;
  const idn = (s: string) => `${uid}${s}`;

  const shirt = look.shirt;
  const sleeveRim = rim;
  const skin = look.skin;
  const pantsC = look.pants;

  const lean = pose.lean;
  const py = pose.pelvisY;

  // ---- أجزاء ----
  const legW0 = 8.6 * (side ? 1 : 0.95) * (0.9 + 0.1 * bw);
  const Leg = (hip: V, knee: V, ankle: V, id: string, far: boolean) => {
    const pc = far ? darken(pantsC, 0.18) : pantsC;
    return (
      <g>
        <Seg
          a={hip}
          b={knee}
          w0={legW0}
          w1={6.9}
          base={pc}
          light={L}
          rim={sleeveRim}
          id={idn(id + "t")}
        />
        <Seg
          a={knee}
          b={ankle}
          w0={6.6}
          w1={4.9}
          base={pc}
          light={L}
          rim={sleeveRim}
          id={idn(id + "s")}
        />
        <circle cx={knee[0]} cy={knee[1]} r={6.1} fill={pc} opacity={0.0} />
      </g>
    );
  };
  const footA = side ? (
    <BootSide p={[j.ankleA[0], j.ankleA[1]]} ang={pose.footA} id={idn("ba")} light={L} rim={rim} />
  ) : (
    <BootFront p={[j.ankleA[0], j.ankleA[1] + 4]} id={idn("ba")} rim={rim} dir={-1} />
  );
  const footB = side ? (
    <BootSide
      p={[j.ankleB[0], j.ankleB[1]]}
      ang={pose.footB}
      id={idn("bb")}
      light={L}
      rim={rim}
      far
    />
  ) : (
    <BootFront p={[j.ankleB[0], j.ankleB[1] + 4]} id={idn("bb")} rim={rim} dir={1} />
  );

  const Arm = (sh: V, el: V, wr: V, id: string, far: boolean, item: Item, grip: number) => {
    const sc2 = far ? darken(shirt, 0.2) : shirt;
    const fa = deg(Math.atan2(wr[1] - el[1], wr[0] - el[0]));
    const itemAng = fa + grip;
    const handP: V = [
      wr[0] + Math.cos((fa * PI) / 180) * 3.2,
      wr[1] + Math.sin((fa * PI) / 180) * 3.2,
    ];
    return (
      <g>
        <Seg
          a={sh}
          b={el}
          w0={5.8}
          w1={4.9}
          base={sc2}
          light={L}
          rim={sleeveRim}
          id={idn(id + "u")}
        />
        <Seg
          a={el}
          b={wr}
          w0={4.8}
          w1={3.9}
          base={sc2}
          light={L}
          rim={sleeveRim}
          id={idn(id + "f")}
        />
        <rect
          x={wr[0] - 4.1}
          y={wr[1] - 1}
          width={8.2}
          height={2}
          rx={1}
          fill={darken(sc2, 0.2)}
          transform={`rotate(${fa + 90} ${wr[0]} ${wr[1]})`}
        />
        <Hand p={handP} skin={far ? darken(skin, 0.12) : skin} rim={rim} />
        <g transform={`translate(${handP[0].toFixed(2)} ${handP[1].toFixed(2)})`}>
          {item === "flashlight" && <Flashlight ang={itemAng} on />}
          {item === "radio" && <Radio ang={itemAng} time={time} />}
          {item === "scanner" && <Scanner ang={itemAng} glow={scanGlow} id={idn(id + "sc")} />}
          {item === "mirror" && <Mirror ang={itemAng} />}
          {item === "card" && <Card ang={itemAng} />}
          {item === "wand" && <Wand ang={itemAng} glow={Math.sin(time * 6) > 0 ? 1 : 0} />}
        </g>
        {item !== "none" && (
          <circle cx={handP[0]} cy={handP[1]} r={2.4} fill={skin} opacity={0.0} />
        )}
      </g>
    );
  };

  // ---- الجذع ----
  const vestC = look.vest;
  const torsoSide = (
    <g transform={`translate(0 ${py}) rotate(${lean})`}>
      <defs>
        <clipPath id={idn("tc")}>
          <path
            d={`M${-9 * bw},7 C${-12 * bw},-8 ${-13 * bw},-24 ${-11 * bw},-40 Q${-9 * bw},-49 0,-51 Q${9 * bw},-51 ${11 * bw},-44 C${14.5 * bw},-34 ${13.5 * bw},-22 ${12.5 * bw},-12 C${12 * bw},-4 ${13 * bw},2 ${12.5 * bw},8 Q0,11 ${-9 * bw},7Z`}
          />
        </clipPath>
        <linearGradient
          id={idn("tg")}
          gradientUnits="userSpaceOnUse"
          x1={L[0] > 0 ? 14 * bw : -14 * bw}
          y1="0"
          x2={L[0] > 0 ? -14 * bw : 14 * bw}
          y2="0"
        >
          <stop offset="0" stopColor={rim} />
          <stop offset="0.12" stopColor={lighten(vestC ?? shirt, 0.1)} />
          <stop offset="0.52" stopColor={vestC ?? shirt} />
          <stop offset="0.6" stopColor={darken(vestC ?? shirt, 0.3)} />
          <stop offset="1" stopColor={darken(vestC ?? shirt, 0.42)} />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${idn("tc")})`}>
        <rect x={-20} y={-56} width={40} height={72} fill={`url(#${idn("tg")})`} />
        {vestC && (
          <>
            <rect
              x={-20}
              y={-34}
              width={40}
              height={4.6}
              fill={look.vest === C.vest ? C.reflect : "#f4f1e6"}
              opacity={0.94}
            />
            <rect
              x={-20}
              y={-16.5}
              width={40}
              height={4.6}
              fill={look.vest === C.vest ? C.reflect : "#f4f1e6"}
              opacity={0.94}
            />
            <rect x={-20} y={-34} width={40} height={1.2} fill="#ffffff" opacity={0.55} />
            <rect x={-20} y={-16.5} width={40} height={1.2} fill="#ffffff" opacity={0.55} />
            <path
              d={`M${3 * bw},-52 L${6 * bw},-40`}
              stroke={darken(vestC, 0.4)}
              strokeWidth={1}
              opacity={0.5}
            />
          </>
        )}
        {/* حزام */}
        <rect x={-20} y={1.2} width={40} height={4.2} fill="#0d141f" />
        <rect x={5 * bw} y={0.8} width={4.2} height={5} rx={0.8} fill="#9aa8b8" />
        <rect x={-20} y={5.4} width={40} height={6} fill={pantsC} />
      </g>
      {/* جهاز لاسلكي على الصدر */}
      {vestC && <rect x={5.5 * bw} y={-46} width={4.4} height={8.6} rx={1.2} fill="#10151d" />}
      {vestC && (
        <circle
          cx={7.7 * bw}
          cy={-44.4}
          r={0.9}
          fill="#ff6a5a"
          opacity={Math.sin(time * 3.1) > 0.3 ? 1 : 0.35}
        />
      )}
    </g>
  );

  const hw = 17 * bw;
  const torsoFront = (
    <g transform={`translate(0 ${py}) rotate(${lean})`}>
      <defs>
        <clipPath id={idn("tc")}>
          <path
            d={`M${-hw},-44 Q${-hw},-49 ${-hw * 0.55},-50.6 Q0,-53 ${hw * 0.55},-50.6 Q${hw},-49 ${hw},-44 L${hw * 0.9},-10 Q${hw * 0.96},0 ${hw * 0.94},9 L${-hw * 0.94},9 Q${-hw * 0.96},0 ${-hw * 0.9},-10Z`}
          />
        </clipPath>
        <linearGradient
          id={idn("tg")}
          gradientUnits="userSpaceOnUse"
          x1={L[0] > 0 ? hw : -hw}
          y1="0"
          x2={L[0] > 0 ? -hw : hw}
          y2="0"
        >
          <stop offset="0" stopColor={rim} />
          <stop offset="0.09" stopColor={lighten(vestC ?? shirt, 0.1)} />
          <stop offset="0.5" stopColor={vestC ?? shirt} />
          <stop offset="0.62" stopColor={darken(vestC ?? shirt, 0.22)} />
          <stop offset="1" stopColor={darken(vestC ?? shirt, 0.36)} />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${idn("tc")})`}>
        <rect x={-30} y={-56} width={60} height={72} fill={`url(#${idn("tg")})`} />
        {vestC && (
          <>
            {!back && <path d={`M${-6.5 * bw},-54 L${6.5 * bw},-54 L0,-36Z`} fill={shirt} />}
            {!back && (
              <path
                d={`M${-6.5 * bw},-54 L0,-36 L${6.5 * bw},-54`}
                stroke={darken(vestC, 0.4)}
                strokeWidth={0.9}
                fill="none"
              />
            )}
            {!back && <path d="M0,-36 L0,9" stroke={darken(vestC, 0.45)} strokeWidth={1} />}
            <rect x={-30} y={-26} width={60} height={5} fill={C.reflect} opacity={0.95} />
            <rect x={-30} y={-26} width={60} height={1.3} fill="#fff" opacity={0.6} />
            <rect x={-30} y={-8} width={60} height={4.6} fill={C.reflect} opacity={0.95} />
            <path
              d={`M${-9.5 * bw},-52 L${-8.6 * bw},9`}
              stroke={C.reflect}
              strokeWidth={5}
              opacity={0.92}
            />
            <path
              d={`M${9.5 * bw},-52 L${8.6 * bw},9`}
              stroke={C.reflect}
              strokeWidth={5}
              opacity={0.92}
            />
          </>
        )}
        {!vestC && (
          <>
            {!back && (
              <path d={`M${-5 * bw},-54 L${5 * bw},-54 L0,-42Z`} fill={darken(shirt, 0.5)} />
            )}
            <path
              d="M-30,-14 L30,-14"
              stroke={darken(shirt, 0.25)}
              strokeWidth={0.8}
              opacity={0.5}
            />
          </>
        )}
        <rect x={-30} y={0.6} width={60} height={4.4} fill="#0d141f" />
        <rect x={-2.4} y={0.2} width={4.8} height={5.2} rx={0.8} fill="#9aa8b8" />
        <rect x={-30} y={5} width={60} height={8} fill={pantsC} />
      </g>
      {/* الكتفان: كتّافات الرتبة */}
      {look.rank && (
        <>
          <rect x={-hw - 2.6} y={-50} width={9} height={3.4} rx={1} fill={darken(shirt, 0.35)} />
          <rect x={hw - 6.4} y={-50} width={9} height={3.4} rx={1} fill={darken(shirt, 0.35)} />
          {Array.from({ length: look.rank }).map((_, i) => (
            <g key={i}>
              <rect x={-hw - 0.4 + i * 2.6} y={-50} width={1.3} height={3.4} fill="#e9c46a" />
              <rect x={hw - 4.2 + i * 2.6} y={-50} width={1.3} height={3.4} fill="#e9c46a" />
            </g>
          ))}
        </>
      )}
    </g>
  );

  // ---- الرأس ----
  const headG = (() => {
    const hc = j.headC;
    const skinD = darken(skin, 0.22);
    const skinL = lighten(skin, 0.08);
    const g = look.beard ?? "none";
    const hair = look.hair;
    const ear = <ellipse cx={-2.6} cy={1.2} rx={2.7} ry={3.4} fill={skinD} />;
    const faceId = idn("fc");
    if (side) {
      const face =
        "M0,-12.6 C7,-12.6 11.6,-8 11.6,-2.4 L13.7,3.2 Q13.9,4 12.9,4.4 L11.2,5 C11.6,7.4 10.6,10.6 6.2,12.2 Q0.5,13.8 -5,11.6 C-11,8.4 -12.2,-5.6 -7,-11 Q-3.6,-12.6 0,-12.6Z";
      return (
        <g
          transform={`translate(${hc[0].toFixed(2)} ${hc[1].toFixed(2)}) rotate(${j.headAng.toFixed(2)})`}
        >
          <defs>
            <linearGradient
              id={faceId}
              gradientUnits="userSpaceOnUse"
              x1={L[0] > 0 ? 13 : -13}
              y1="0"
              x2={L[0] > 0 ? -13 : 13}
              y2="0"
            >
              <stop offset="0" stopColor={rim} />
              <stop offset="0.12" stopColor={skinL} />
              <stop offset="0.6" stopColor={skin} />
              <stop offset="0.74" stopColor={darken(skin, 0.12)} />
              <stop offset="1" stopColor={darken(skin, 0.2)} />
            </linearGradient>
            <linearGradient id={idn("fs")} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#000" stopOpacity="0.55" />
              <stop offset="0.42" stopColor="#000" stopOpacity="0.18" />
              <stop offset="0.6" stopColor="#000" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect x={-3.6} y={7} width={8.4} height={11} rx={3} fill={darken(skin, 0.22)} />
          <path d={face} fill={`url(#${faceId})`} />
          {ear}
          {g !== "none" && (
            <path
              d={
                g === "full"
                  ? "M-10.4,-1.6 C-11,6 -7,12.6 0,13.4 C6,13.6 10.2,10.6 11,6.4 C8.6,7.6 6.2,6.6 4.4,7.4 C2,6.2 -2.4,6 -3.4,2.4 L-6.6,-2.4Z"
                  : "M-10.2,3 C-10.8,8 -6.4,12.4 0,13 C4,13.2 8,11 9.4,8.4 C7,8.4 5,7.4 3.4,7.8 C1,6.4 -2.6,6.2 -3.6,3.6 L-6.6,0Z"
              }
              fill={hair}
              opacity={0.93}
            />
          )}
          {/* العين والحاجب */}
          <ellipse cx={6.4} cy={-2.2} rx={1.2} ry={1.45} fill="#1a1210" />
          <path
            d="M3.4,-5.4 Q6.4,-6.8 9.6,-5"
            stroke={hair}
            strokeWidth={1.1}
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M8.4,6.4 Q10,6.6 11,6"
            stroke={darken(skin, 0.45)}
            strokeWidth={0.9}
            fill="none"
            strokeLinecap="round"
          />
          {headgear(look, "side", rim, idn)}
          {look.headgear !== "none" && <path d={face} fill={`url(#${idn("fs")})`} opacity={0.6} />}
          {look.headset && (
            <g>
              <path
                d="M-4,-11 C-1,-18 8,-17 9.4,-9"
                stroke="#161d28"
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
              />
              <ellipse cx={-2.2} cy={1.6} rx={4.4} ry={5.6} fill="#161d28" />
              <ellipse cx={-2.6} cy={1} rx={2.4} ry={3.4} fill="#2a3547" />
              <path d="M-5,8 C-2,12 4,12 7,9" stroke="#161d28" strokeWidth={1.2} fill="none" />
              <circle cx={7.4} cy={8.8} r={1.6} fill="#161d28" />
            </g>
          )}
        </g>
      );
    }
    // أماميّ / خلفيّ
    return (
      <g
        transform={`translate(${hc[0].toFixed(2)} ${hc[1].toFixed(2)}) rotate(${j.headAng.toFixed(2)})`}
      >
        <defs>
          <linearGradient
            id={faceId}
            gradientUnits="userSpaceOnUse"
            x1={L[0] > 0 ? 11 : -11}
            y1="0"
            x2={L[0] > 0 ? -11 : 11}
            y2="0"
          >
            <stop offset="0" stopColor={rim} />
            <stop offset="0.12" stopColor={skinL} />
            <stop offset="0.6" stopColor={skin} />
            <stop offset="0.74" stopColor={darken(skin, 0.12)} />
            <stop offset="1" stopColor={darken(skin, 0.2)} />
          </linearGradient>
          <linearGradient id={idn("fs")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#000" stopOpacity="0.55" />
            <stop offset="0.42" stopColor="#000" stopOpacity="0.18" />
            <stop offset="0.6" stopColor="#000" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x={-4.4} y={8} width={8.8} height={10} rx={3} fill={darken(skin, 0.22)} />
        <ellipse cx={-10.4} cy={1} rx={2.2} ry={3.2} fill={skinD} />
        <ellipse cx={10.4} cy={1} rx={2.2} ry={3.2} fill={skinD} />
        <ellipse
          cx={0}
          cy={0}
          rx={10.4}
          ry={12.6}
          fill={back ? darken(skin, 0.1) : `url(#${faceId})`}
        />
        {!back && (
          <>
            {g !== "none" && (
              <path
                d={
                  g === "full"
                    ? "M-10,-1 C-10.6,7 -6,13 0,13.4 C6,13 10.6,7 10,-1 C8.6,2.6 6.6,4.2 4.4,4.4 C2,3.4 -2,3.4 -4.4,4.4 C-6.6,4.2 -8.6,2.6 -10,-1Z"
                    : "M-10.2,2 C-10.4,8 -6,13 0,13.2 C6,13 10.4,8 10.2,2 C8,6 5,6.6 3,6.2 C1,5.4 -1,5.4 -3,6.2 C-5,6.6 -8,6 -10.2,2Z"
                }
                fill={look.hair}
                opacity={0.93}
              />
            )}
            <ellipse cx={-4} cy={-1.6} rx={1.2} ry={1.4} fill="#1a1210" />
            <ellipse cx={4} cy={-1.6} rx={1.2} ry={1.4} fill="#1a1210" />
            <path
              d="M-6.4,-4.6 Q-4,-5.8 -1.8,-4.8 M1.8,-4.8 Q4,-5.8 6.4,-4.6"
              stroke={look.hair}
              strokeWidth={1}
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M0,0 L-0.8,3.6 L1,3.6"
              stroke={darken(skin, 0.4)}
              strokeWidth={0.8}
              fill="none"
              strokeLinecap="round"
              opacity={0.7}
            />
            {look.beard === "none" && (
              <path
                d="M-2.6,7 Q0,8 2.6,7"
                stroke={darken(skin, 0.45)}
                strokeWidth={0.9}
                fill="none"
                strokeLinecap="round"
              />
            )}
          </>
        )}
        {back && (
          <path
            d="M-10.4,-1 C-10.6,-14 10.6,-14 10.4,-1 C9,6 6,8 0,8 C-6,8 -9,6 -10.4,-1Z"
            fill={look.hair}
          />
        )}
        {headgear(look, back ? "back" : "front", rim, idn)}
        {!back && look.headgear !== "none" && (
          <ellipse cx={0} cy={0} rx={10.4} ry={12.6} fill={`url(#${idn("fs")})`} opacity={0.6} />
        )}
        {look.headset && (
          <g>
            <path
              d="M-10.8,0 C-11,-17 11,-17 10.8,0"
              stroke="#161d28"
              strokeWidth={2.1}
              fill="none"
              strokeLinecap="round"
            />
            <ellipse cx={-11} cy={2} rx={2.8} ry={4.6} fill="#161d28" />
            <ellipse cx={11} cy={2} rx={2.8} ry={4.6} fill="#161d28" />
            {!back && (
              <path d="M11,6 C10,11 6,12.4 3,11.6" stroke="#161d28" strokeWidth={1.1} fill="none" />
            )}
          </g>
        )}
      </g>
    );
  })();

  const nearArmFirst = side;
  const layerBack = side ? (
    <>
      {Arm(j.shB, j.elbowB, j.wristB, "ab", true, itemB, pose.gripB)}
      {Leg(j.hipB, j.kneeB, j.ankleB, "lb", true)}
      {footB}
    </>
  ) : (
    <>
      {Leg(j.hipA, j.kneeA, j.ankleA, "la", false)}
      {Leg(j.hipB, j.kneeB, j.ankleB, "lb", false)}
      {footA}
      {footB}
    </>
  );

  // الرقبة (جانبيّ: ضمن الرأس)
  const beamEl = beam
    ? (() => {
        const wr = beamHand === "A" ? j.wristA : j.wristB;
        const el = beamHand === "A" ? j.elbowA : j.elbowB;
        const grip = beamHand === "A" ? pose.gripA : pose.gripB;
        const h = wr;
        const fa = Math.atan2(wr[1] - el[1], wr[0] - el[0]) + (grip * PI) / 180;
        const tip: V = [
          h[0] + Math.cos(fa) * 21 + Math.cos(fa) * 3.2,
          h[1] + Math.sin(fa) * 21 + Math.sin(fa) * 3.2,
        ];
        const a0 = fa + (beam.angle * PI) / 180;
        const sp = (beam.spread * PI) / 180;
        const p1: V = [
          tip[0] + Math.cos(a0 - sp) * beam.length,
          tip[1] + Math.sin(a0 - sp) * beam.length,
        ];
        const p2: V = [
          tip[0] + Math.cos(a0 + sp) * beam.length,
          tip[1] + Math.sin(a0 + sp) * beam.length,
        ];
        const bc = beam.color ?? "#fff6d0";
        const mid: V = [tip[0] + Math.cos(a0) * beam.length, tip[1] + Math.sin(a0) * beam.length];
        return (
          <g style={{ mixBlendMode: "screen" }}>
            <defs>
              <linearGradient
                id={idn("bm")}
                gradientUnits="userSpaceOnUse"
                x1={tip[0]}
                y1={tip[1]}
                x2={mid[0]}
                y2={mid[1]}
              >
                <stop offset="0" stopColor={bc} stopOpacity={(beam.opacity ?? 0.6) * 1} />
                <stop offset="0.5" stopColor={bc} stopOpacity={(beam.opacity ?? 0.6) * 0.34} />
                <stop offset="1" stopColor={bc} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`M${pt(tip)} L${pt(p1)} L${pt(p2)}Z`} fill={`url(#${idn("bm")})`} />
          </g>
        );
      })()
    : null;

  const body = (
    <g>
      {layerBack}
      {side ? torsoSide : torsoFront}
      {side && (
        <>
          {Leg(j.hipA, j.kneeA, j.ankleA, "la", false)}
          {footA}
        </>
      )}
      {/* رقبة الأمام */}
      {!side && (
        <g>
          <rect
            x={j.neckBase[0] - 4.2}
            y={j.neckTop[1] - 2}
            width={8.4}
            height={9}
            rx={2.5}
            fill={darken(skin, 0.2)}
            opacity={0}
          />
        </g>
      )}
      {headG}
      {side ? (
        Arm(j.shA, j.elbowA, j.wristA, "aa", false, itemA, pose.gripA)
      ) : (
        <>
          {Arm(j.shA, j.elbowA, j.wristA, "aa", false, itemA, pose.gripA)}
          {Arm(j.shB, j.elbowB, j.wristB, "ab", false, itemB, pose.gripB)}
        </>
      )}
      {beamEl}
    </g>
  );

  void nearArmFirst;
  void mix;
  const standH = DIM.standPelvis;
  return (
    <g
      opacity={opacity}
      transform={`translate(${x.toFixed(2)} ${(groundY - standH * sc).toFixed(2)}) scale(${(sc * facing).toFixed(4)} ${sc.toFixed(4)})`}
    >
      {shadow && (
        <g transform={`translate(0 ${standH})`}>
          <defs>
            <radialGradient id={idn("sh")}>
              <stop offset="0" stopColor="#000" stopOpacity="0.5" />
              <stop offset="0.6" stopColor="#000" stopOpacity="0.22" />
              <stop offset="1" stopColor="#000" stopOpacity="0" />
            </radialGradient>
          </defs>
          <ellipse cx={0} cy={0} rx={40} ry={7} fill={`url(#${idn("sh")})`} />
        </g>
      )}
      {body}
    </g>
  );
};

function headgear(
  look: Look,
  v: "side" | "front" | "back",
  rim: string,
  idn: (s: string) => string,
): React.ReactNode {
  if (look.headgear === "none") return null;
  const c = look.headColor;
  const cD = darken(c, 0.28);
  const cL = lighten(c, 0.16);
  const gid = idn("hg");
  const grad = (
    <defs>
      <linearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={cD} />
        <stop offset="0.5" stopColor={c} />
        <stop offset="0.85" stopColor={cL} />
        <stop offset="1" stopColor={rim} />
      </linearGradient>
    </defs>
  );
  if (look.headgear === "helmet") {
    if (v === "side") {
      return (
        <g>
          {grad}
          <path
            d="M-12.4,-1.8 C-13,-14.6 -5,-19.8 2.6,-19.4 C10.4,-19 14,-12.4 13.8,-4.6 L19.4,-3.6 Q20.2,-3.2 19.8,-2.2 L13.2,-1.1 L-12.6,-1.1Z"
            fill={`url(#${gid})`}
          />
          <path d="M-12.8,-1.4 L-13.4,2.4 Q-13.6,3.4 -12.4,3.4 L-9,3.4 L-9,-1.2Z" fill={cD} />
          <path
            d="M-5,-18.6 C0,-20.6 7,-19.6 11,-14"
            stroke={cL}
            strokeWidth={1.1}
            fill="none"
            strokeLinecap="round"
            opacity={0.9}
          />
          <path d="M2,-19.4 L2.6,-1.2" stroke={cD} strokeWidth={1.2} opacity={0.5} />
          <rect x={-12.4} y={-4.4} width={26} height={2.1} fill={C.vest} opacity={0.0} />
          <path d="M12.5,-1.1 L19.4,-2.2" stroke={darken(c, 0.5)} strokeWidth={0.8} opacity={0.7} />
        </g>
      );
    }
    if (v === "front") {
      return (
        <g>
          {grad}
          <path
            d="M-11.8,-1.6 C-12.4,-14.6 -5,-19.8 0,-19.8 C5,-19.8 12.4,-14.6 11.8,-1.6 L14.4,-1.2 Q15.2,-0.6 14.6,0.4 L-14.6,0.4 Q-15.2,-0.6 -14.4,-1.2Z"
            fill={`url(#${gid})`}
          />
          <path d="M-1.2,-19.8 L-1.2,-1.4 L1.2,-1.4 L1.2,-19.8Z" fill={cD} opacity={0.5} />
          <path
            d="M-8,-17 C-3,-20 3,-20 8,-17"
            stroke={cL}
            strokeWidth={1}
            fill="none"
            opacity={0.85}
            strokeLinecap="round"
          />
          <rect x={-14.4} y={-0.4} width={28.8} height={1.4} fill={darken(c, 0.45)} opacity={0.6} />
        </g>
      );
    }
    return (
      <g>
        {grad}
        <path
          d="M-11.8,2.4 C-12.4,-14.6 -5,-19.8 0,-19.8 C5,-19.8 12.4,-14.6 11.8,2.4 L9.6,5.2 L-9.6,5.2Z"
          fill={`url(#${gid})`}
        />
        <path d="M-1.2,-19.8 L-1.2,4 L1.2,4 L1.2,-19.8Z" fill={cD} opacity={0.5} />
        <path d="M-9.6,5.2 L9.6,5.2 L8.4,7.6 L-8.4,7.6Z" fill={cD} />
      </g>
    );
  }
  // قبعة
  if (v === "side") {
    return (
      <g>
        {grad}
        <path
          d="M-12,-2.2 C-12.6,-12.8 -4.6,-17 3,-16.6 C9.6,-16.2 13.2,-11 13,-3.4 L13,-1.6 L-12,-1.6Z"
          fill={`url(#${gid})`}
        />
        <path d="M10.6,-3.8 L19.6,-2.6 Q20.8,-1.8 19.4,-0.8 L10.4,-1.4Z" fill={darken(c, 0.35)} />
        <rect x={-12.2} y={-4.6} width={25.4} height={2.2} fill="#0b1222" opacity={0.7} />
        <circle cx={9.2} cy={-8.4} r={2.1} fill="#e9c46a" />
        <circle cx={9.2} cy={-8.4} r={1.1} fill="#a07a1e" />
      </g>
    );
  }
  if (v === "front") {
    return (
      <g>
        {grad}
        <path
          d="M-11.6,-1.8 C-12.2,-13.4 -4.8,-17.2 0,-17.2 C4.8,-17.2 12.2,-13.4 11.6,-1.8 L11.6,0 L-11.6,0Z"
          fill={`url(#${gid})`}
        />
        <path
          d="M-12.4,-0.6 L12.4,-0.6 Q13.4,1.4 11,2.2 L-11,2.2 Q-13.4,1.4 -12.4,-0.6Z"
          fill={darken(c, 0.4)}
        />
        <rect x={-11.8} y={-4.4} width={23.6} height={2.2} fill="#0b1222" opacity={0.7} />
        <circle cx={0} cy={-9.6} r={2.3} fill="#e9c46a" />
        <circle cx={0} cy={-9.6} r={1.2} fill="#a07a1e" />
      </g>
    );
  }
  return (
    <g>
      {grad}
      <path
        d="M-11.8,3 C-12.4,-13.4 -4.8,-17.2 0,-17.2 C4.8,-17.2 12.4,-13.4 11.8,3 L-11.8,3Z"
        fill={`url(#${gid})`}
      />
    </g>
  );
}

export default Guard;
