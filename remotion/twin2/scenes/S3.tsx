/**
 * S3 — الأمن في الميدان (24.0–38.0 ث). خمس لقطات بانتقالات «سحب أفقيّ» قصيرة:
 * البوّابة (24–30) · الكاميرات (30–32) · الدورية (32–34) · المسيّرة (34–36) · غرفة التحكّم (36–38).
 * ليلٌ أزرق بإضاءة عمليّة (أعمدة إنارة، مصابيح، شاشات) حتى تُقرأ السترات العاكسة ومخاريط الرؤية.
 */
import React from "react";
import { Guard, LOOKS } from "../characters/Guard";
import { blendPose, standFront, standSide } from "../characters/rig";
import { mirrorCheck, radioToMouth, reachTo, walkPose } from "../characters/poses";
import { Sky, Stars, ridgePath } from "../kit/atmo";
import { alpha, mix } from "../kit/color";
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
import { Barrier, Bokeh, Booth, Cctv, Drone, Fence, Lamp, Truck } from "../kit/station";
import { LinGrad, RadGrad, useUid } from "../kit/svgx";
import { Tower } from "../kit/tower";
import { C } from "../palette";

const NIGHT = [
  { o: 0, c: "#030a1e" },
  { o: 0.3, c: "#08193d" },
  { o: 0.52, c: "#10305f" },
  { o: 0.66, c: "#1b4a7c" },
  { o: 0.74, c: "#2b6a95" },
];

/** خلفيّة محطّة ليليّة: سماء، أبراج بعيدة، منشآت مضاءة، أرضيّة. */
const StationBack: React.FC<{
  t: number;
  x?: number;
  horizon?: number;
  k?: number;
  seed?: number;
}> = ({ t, x = 0, horizon = 520, k = 1, seed = 1 }) => {
  const sx = -x * 0.15 * k;
  const mx = -x * 0.4 * k;
  return (
    <g>
      <Sky stops={NIGHT} x={-200} y={-200} w={1700} h={1100} />
      <Stars opacity={0.6} t={t} count={90} h={300} seed={seed + 5} />
      <g transform={`translate(${sx} 0)`}>
        <path d={ridgePath(seed + 2, -400, 1800, horizon + 8, 38, 16, 1.4)} fill="#0e2850" />
      </g>
      <g transform={`translate(${mx} 0)`}>
        {[40, 330, 640, 930, 1230].map((px, i) => (
          <Tower
            key={i}
            x={px}
            baseY={horizon + 30}
            h={150}
            color="#10305a"
            rim="rgba(150,220,255,0.35)"
            rimSide={-1}
          />
        ))}
        {/* منشآت مضاءة بعيدة */}
        {[120, 470, 800, 1100].map((px, i) => (
          <g key={i}>
            <rect x={px} y={horizon - 40} width={110} height={70} fill="#0c2347" />
            <rect x={px} y={horizon - 40} width={110} height={2} fill="rgba(150,220,255,0.45)" />
            {[0, 1, 2, 3].map((j) => (
              <rect
                key={j}
                x={px + 12 + j * 24}
                y={horizon - 24}
                width={14}
                height={14}
                fill="#ffe0a0"
                opacity={0.35 + 0.5 * hash1(i * 5 + j)}
              />
            ))}
            <rect x={px + 130} y={horizon - 70} width={5} height={100} fill="#0c2347" />
            <circle
              cx={px + 132.5}
              cy={horizon - 72}
              r={2.4}
              fill="#ff6a5a"
              opacity={0.3 + 0.7 * (Math.sin(t * 2 + i) > 0.2 ? 1 : 0)}
            />
          </g>
        ))}
      </g>
      <rect x={-200} y={horizon + 28} width={1700} height={400} fill="#071530" />
    </g>
  );
};

// ————————————————————— A: البوّابة (محليّ 0–6 ث) —————————————————————
const GATE_GROUND = 650;
const GateShot: React.FC<{ lt: number }> = ({ lt }) => {
  const uid = useUid();
  const g = (s: string) => uid + s;
  const t = lt + 24;
  const barAng = -easeOut(prog(lt, 0.0, 0.9)) * 78 + easeInOut(prog(lt, 5.3, 5.9)) * 0; // يبقى مرفوعًا
  // الشاحنة: تدخل من اليمين وتتوقّف أمام الحارس، ثم تنطلق يسارًا
  const truckStop = 640;
  const arrive = easeOut(prog(lt, 0.2, 2.2));
  const leave = easeInOut(prog(lt, 5.0, 6.0));
  const truckX = lerp(1500, truckStop, arrive) - leave * 1100;
  const truckSpeed = (1 - arrive) * 650 * 0 + 0;
  const wheelRoll = truckX * 1; // دوران العجلات بحسب الإزاحة
  const lights = 1;
  // الحارس A: يمشي من المقصورة نحو النافذة ثم يفحص
  const walkA = prog(lt, 0.8, 2.4);
  const axBase = lerp(250, 770, easeInOutSoft(walkA));
  const scanAmt = easeInOut(prog(lt, 2.3, 2.9));
  const waveAmt = easeInOut(prog(lt, 4.5, 4.95)) * (1 - easeInOut(prog(lt, 5.5, 5.9)));
  const stepBack = easeInOut(prog(lt, 4.3, 4.9));
  const axA = axBase + stepBack * 0;
  const walking = walkA < 1 && walkA > 0;
  const poseWalk = walkPose(lt, { speed: 110, cycle: 1.0, swingA: 0.3, lean: 3 });
  let poseA = walking ? poseWalk : standSide();
  poseA = blendPose(poseA, standSide(), walking ? 0 : 1);
  poseA = reachTo(poseA, "A", [48, -32], scanAmt * (1 - waveAmt), -6);
  poseA = reachTo(poseA, "B", [40, -34], clamp(scanAmt - 0.1) * (1 - waveAmt), 0);
  poseA = reachTo(poseA, "B", [44, -62], waveAmt, 0);
  const scanGlow = 0.35 + 0.65 * clamp(prog(lt, 3.0, 3.9)) + 0.0;
  const check = easeOut(prog(lt, 3.6, 4.0));
  // الحارس B: مرآة فحص تحت المركبة
  const mir = easeInOut(prog(lt, 0.6, 1.3)) * (1 - easeInOut(prog(lt, 5.0, 5.5)));
  const poseB = blendPose(standSide(), mirrorCheck(1), mir);
  // الكاميرا: لقطة واسعة ثم تقريب على الجهاز
  const focus = { x: 842, y: 520 };
  const zoomIn = easeInOutSoft(prog(lt, 2.55, 3.5)) * (1 - easeInOutSoft(prog(lt, 4.2, 5.2)));
  const zoom = lerp(1.0, 3.0, zoomIn) + 0.05 * prog(lt, 0, 6);
  const cx = lerp(640, focus.x, zoomIn);
  const cy = lerp(380, focus.y, zoomIn);
  const lampOn = 1 - 0.0 * zoomIn;
  return (
    <g>
      <g transform={`translate(640 360) scale(${zoom}) translate(${-cx} ${-cy})`}>
        <StationBack t={t} x={0} horizon={500} seed={3} />
        <Fence x0={-400} x1={1700} baseY={GATE_GROUND - 18} h={110} rim="#9fd8ff" spacing={140} />
        <Bokeh
          seed={3}
          n={16}
          area={[-100, 380, 1500, 160]}
          colors={["#ffd88a", "#9fe8ff", "#ffffff"]}
          t={t}
          opacity={0.45}
          r0={3}
          r1={8}
        />
        {/* الطريق */}
        <rect x={-400} y={GATE_GROUND - 20} width={1800} height={200} fill="#0a1a34" />
        <rect x={-400} y={GATE_GROUND - 20} width={1800} height={3} fill="rgba(160,215,255,0.35)" />
        <rect x={-400} y={GATE_GROUND + 38} width={1800} height={60} fill="#0d2140" opacity={0.7} />
        {Array.from({ length: 9 }).map((_, i) => (
          <rect
            key={i}
            x={-300 + i * 220}
            y={GATE_GROUND + 90}
            width={110}
            height={5}
            rx={2}
            fill="#dbe6f0"
            opacity={0.35}
          />
        ))}
        <Lamp x={540} baseY={GATE_GROUND} h={330} on={lampOn} dir={1} reach={230} t={t} />
        <Lamp x={1160} baseY={GATE_GROUND} h={310} on={lampOn} dir={-1} reach={220} t={t} />
        <Booth x={40} baseY={GATE_GROUND} t={t} />
        <Barrier px={250} py={GATE_GROUND - 66} len={240} ang={barAng} t={t} />
        <Truck
          x={truckX}
          groundY={GATE_GROUND}
          t={t}
          speed={0}
          scale={0.85}
          lights={lights}
          armOut={easeOut(prog(lt, 2.6, 3.0)) * (1 - easeInOut(prog(lt, 4.2, 4.6)))}
        />
        {/* عجلات الشاحنة تدور حسب الإزاحة (تعليق فوق عنصر Truck) */}
        <g opacity={0}>
          <circle cx={wheelRoll} cy={0} r={1} />
        </g>
        <Guard
          x={axA}
          groundY={GATE_GROUND + 28}
          scale={1.25}
          pose={poseA}
          look={LOOKS.gate}
          facing={1}
          light={[-0.6, -0.7]}
          rim="#ffe3b0"
          itemA="scanner"
          itemB={waveAmt > 0.05 || scanAmt < 0.95 ? "none" : "card"}
          scanGlow={scanGlow}
          time={t}
        />
        <Guard
          x={1170}
          groundY={GATE_GROUND + 28}
          scale={1.25}
          pose={poseB}
          look={LOOKS.scout}
          facing={-1}
          light={[0.6, -0.7]}
          rim="#bfe6ff"
          itemA={mir > 0.1 ? "mirror" : "none"}
          time={t}
        />
        {/* شعاع الفحص + علامة التحقّق عند الجهاز */}
        {scanAmt > 0.5 && (
          <g
            transform={`translate(${axA + 1.25 * 1.0 * 62} ${GATE_GROUND + 28 - 125 - 32 * 1.25})`}
            style={{ mixBlendMode: "screen" }}
          >
            <path d="M0,0 L50,-16 L50,16Z" fill={C.cyan} opacity={0.22 + 0.2 * Math.sin(t * 14)} />
            <g opacity={check}>
              <circle
                cx={30}
                cy={-46}
                r={20 * check}
                fill="none"
                stroke={C.mint}
                strokeWidth={3}
                opacity={1 - check * 0.5}
              />
              <circle cx={30} cy={-46} r={13} fill={alpha(C.emerald, 0.85)} />
              <path
                d="M24,-46 L28.5,-41 L37,-52"
                stroke="#fff"
                strokeWidth={3.2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </g>
        )}
        {/* ضبابٌ أرضيّ خفيف */}
        <rect
          x={-400}
          y={GATE_GROUND - 40}
          width={1800}
          height={80}
          fill={alpha("#9fd2f0", 0.05)}
        />
      </g>
    </g>
  );
};

// ————————————————————— B: كاميرات المراقبة (محليّ 0–2) —————————————————————
const CamShot: React.FC<{ lt: number }> = ({ lt }) => {
  const t = lt + 30;
  const dolly = lt * -52;
  const G = 640;
  return (
    <g>
      <StationBack t={t} x={dolly} horizon={470} seed={7} />
      <g transform={`translate(${dolly} 0)`}>
        <Fence x0={-300} x1={1700} baseY={G - 10} h={170} rim="#9fd8ff" spacing={130} />
        <Bokeh
          seed={9}
          n={14}
          area={[-100, 360, 1500, 140]}
          colors={["#ffd88a", "#9fe8ff"]}
          t={t}
          opacity={0.4}
        />
        <rect x={-300} y={G - 12} width={2000} height={200} fill="#08162e" />
        <rect x={-300} y={G - 12} width={2000} height={2} fill="rgba(160,215,255,0.35)" />
        {[0, 1, 2, 3].map((i) => {
          const px = 130 + i * 400;
          const swing = Math.sin(t * 1.9 + i * 1.7);
          return (
            <g key={i}>
              {/* بقعة مضيئة على الأرض حيث يسقط المخروط */}
              <ellipse
                cx={px - 180 + swing * 30}
                cy={G + 28}
                rx={150}
                ry={20}
                fill={C.cyan}
                opacity={0.15}
                style={{ mixBlendMode: "screen" }}
              />
              <Cctv
                x={px}
                baseY={G}
                h={330}
                ang={24 + swing * 12}
                dir={-1}
                cone={20}
                coneLen={400}
                t={t + i}
                s={1.7}
              />
            </g>
          );
        })}
        <Lamp x={330} baseY={G} h={300} dir={1} reach={190} t={t} />
        <Lamp x={1130} baseY={G} h={300} dir={1} reach={190} t={t} />
        {/* حارس بعيد يتحرّك ويقفل عليه مخروط الكاميرا */}
        {(() => {
          const gx = 880 - lt * 100;
          const poseW = walkPose(lt + 3.1, {
            speed: 100,
            cycle: 1.0,
            lean: 3,
            swingA: 0.8,
            swingB: 0.8,
          });
          const bw = 70;
          const bh = 150;
          const bp = ramp(lt, 0.3, 0.8);
          const bx = gx - bw / 2;
          const by = G + 6 - bh;
          const L = 16;
          return (
            <g>
              <Guard
                x={gx}
                groundY={G + 6}
                scale={0.95}
                pose={poseW}
                look={LOOKS.leader}
                facing={-1}
                light={[0, -1]}
                rim="#bfe6ff"
                shadow
                time={t}
              />
              <g
                opacity={bp}
                stroke={C.cyanSoft}
                strokeWidth={2.4}
                fill="none"
                strokeLinecap="round"
              >
                <path d={`M${bx},${by + L} L${bx},${by} L${bx + L},${by}`} />
                <path d={`M${bx + bw - L},${by} L${bx + bw},${by} L${bx + bw},${by + L}`} />
                <path d={`M${bx},${by + bh - L} L${bx},${by + bh} L${bx + L},${by + bh}`} />
                <path
                  d={`M${bx + bw - L},${by + bh} L${bx + bw},${by + bh} L${bx + bw},${by + bh - L}`}
                />
              </g>
            </g>
          );
        })()}
      </g>
    </g>
  );
};

// ————————————————————— C: الدورية (محليّ 0–2) —————————————————————
const PatrolShot: React.FC<{ lt: number }> = ({ lt }) => {
  const t = lt + 32;
  const V = 250; // سرعة العالم
  const scale = 2.05;
  const sp = V / scale;
  const camX = -lt * V * 0.9;
  const G = 668;
  const walkA = walkPose(lt + 5.2, { speed: sp, cycle: 1.0, swingB: 0.25, lean: 3 });
  const walkB = walkPose(lt + 5.28, { speed: sp, cycle: 1.0, swingA: 0.2, lean: 3 });
  const poseA = { ...walkA, handB: [walkA.handB[0] * 0.2 + 30, 18] as [number, number], gripB: 12 };
  const poseB = radioToMouth({ ...walkB, handA: walkB.handA }, "A", 0.0);
  const beam = 22 + Math.sin(t * 1.6) * 10;
  const lampX = (i: number) => 140 + i * 460 + camX * 0 - mod(lt * V * 0.9, 460) + 460;
  return (
    <g>
      <StationBack t={t} x={camX * 0.6} horizon={470} seed={11} />
      <g transform={`translate(${-mod(lt * V * 0.9 * 0.3, 1000)} 0)`}>
        <Fence x0={-300} x1={2600} baseY={G - 60} h={190} rim="#9fd8ff" spacing={160} />
      </g>
      <rect x={-300} y={G - 62} width={2000} height={200} fill="#08162e" />
      <rect x={-300} y={G - 62} width={2000} height={2} fill="rgba(160,215,255,0.35)" />
      <rect x={-300} y={G - 20} width={2000} height={110} fill="#0b1c38" />
      {Array.from({ length: 5 }).map((_, i) => (
        <rect
          key={i}
          x={mod(i * 340 - lt * V, 1700) - 200}
          y={G + 36}
          width={140}
          height={4}
          rx={2}
          fill="#dbe6f0"
          opacity={0.28}
        />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <Lamp key={i} x={lampX(i) - 300} baseY={G - 50} h={340} dir={1} reach={250} t={t} />
      ))}
      <Guard
        x={760}
        groundY={G + 20}
        scale={scale}
        pose={poseA}
        look={LOOKS.leader}
        facing={-1}
        light={[0.1, -0.9]}
        rim="#ffe3b0"
        itemB="flashlight"
        beamHand="B"
        beam={{ angle: beam, length: 360, spread: 8, opacity: 0.55 }}
        time={t}
      />
      <Guard
        x={1010}
        groundY={G + 20}
        scale={scale * 0.97}
        pose={poseB}
        look={LOOKS.patrolB}
        facing={-1}
        light={[0.1, -0.9]}
        rim="#ffe3b0"
        itemB="flashlight"
        beamHand="B"
        beam={{ angle: beam - 8, length: 330, spread: 8, opacity: 0.5 }}
        time={t + 1}
      />
      <Bokeh
        seed={4}
        n={10}
        area={[0, 560, 1280, 160]}
        colors={["#ffd88a", "#9fe8ff"]}
        t={t}
        opacity={0.3}
        r0={6}
        r1={16}
      />
    </g>
  );
};

// ————————————————————— D: المسيّرة (محليّ 0–2) —————————————————————
const DroneShot: React.FC<{ lt: number }> = ({ lt }) => {
  const t = lt + 34;
  const G = 640;
  const rise = easeInOut(prog(lt, 0.0, 1.1));
  const dy = lerp(-60, -340, rise); // المسيّرة تصعد
  const dx = 700 + Math.sin(lt * 1.2) * 22 + prog(lt, 0, 2) * 40;
  const spotAng = lerp(-26, 28, easeInOutSoft(prog(lt, 0.55, 2.0)));
  const camTilt = lerp(0, 70, easeInOutSoft(prog(lt, 0.0, 1.4)));
  const droneScreenY = G + dy + 0;
  // موضع بقعة الكشّاف على الأرض
  const spotLen = (G + 20 - (droneScreenY + 24)) / Math.cos((spotAng * Math.PI) / 180);
  const hitX = dx + Math.sin((spotAng * Math.PI) / 180) * spotLen;
  const hit = ramp(lt, 0.7, 1.3);
  return (
    <g transform={`translate(0 ${camTilt * 0.55})`}>
      <StationBack t={t} x={0} horizon={450} seed={21} />
      {/* ساحة المحطة من بعيد: بوّابات ومحوّلات وأبراج مضاءة */}
      <g>
        {[90, 360, 630, 930, 1190].map((px, i) => (
          <g key={i} transform={`translate(${px} ${G - 60})`}>
            <rect x={-40} y={-14} width={80} height={14} fill="#0b2145" />
            <rect x={-34} y={-54} width={68} height={42} rx={3} fill="#0d2850" />
            <rect x={-34} y={-54} width={68} height={2} fill="rgba(150,220,255,0.5)" />
            {[-20, 0, 20].map((bx, k) => (
              <g key={k}>
                <rect x={bx - 2} y={-94} width={4} height={42} fill="#102f58" />
                <circle
                  cx={bx}
                  cy={-96}
                  r={3}
                  fill={k === 1 ? C.cyanSoft : "#8fb6d8"}
                  opacity={0.6 + 0.4 * Math.sin(t * 2 + i + k)}
                />
              </g>
            ))}
            <rect x={-34} y={-30} width={68} height={4} fill={C.cyan} opacity={0.35} />
          </g>
        ))}
        <Tower
          x={500}
          baseY={G - 56}
          h={190}
          color="#0f2c55"
          rim="rgba(150,220,255,0.45)"
          rimSide={-1}
        />
        <Tower
          x={1060}
          baseY={G - 56}
          h={190}
          color="#0f2c55"
          rim="rgba(150,220,255,0.45)"
          rimSide={-1}
        />
        <Bokeh
          seed={13}
          n={26}
          area={[0, G - 140, 1280, 120]}
          colors={["#ffd88a", "#9fe8ff", "#ffffff"]}
          t={t}
          opacity={0.5}
          r0={2}
          r1={6}
        />
      </g>
      <g>
        <Fence x0={-300} x1={1700} baseY={G + 10} h={130} rim="#9fd8ff" spacing={140} />
        <rect x={-300} y={G + 8} width={2000} height={300} fill="#08162e" />
        <Lamp x={220} baseY={G + 8} h={300} dir={1} reach={200} t={t} />
        <Lamp x={1130} baseY={G + 8} h={300} dir={-1} reach={200} t={t} />
        {/* منصّة الإقلاع */}
        <ellipse cx={700} cy={G + 30} rx={120} ry={18} fill="#0e2a4f" />
        <ellipse
          cx={700}
          cy={G + 30}
          rx={90}
          ry={12}
          fill="none"
          stroke={C.cyan}
          strokeWidth={2}
          opacity={0.5}
        />
        {/* بقعة الكشّاف على الأرض */}
        <ellipse
          cx={hitX}
          cy={G + 26}
          rx={120}
          ry={22}
          fill="#e8fbff"
          opacity={0.5 * hit}
          style={{ mixBlendMode: "screen" }}
        />
        <ellipse
          cx={hitX}
          cy={G + 26}
          rx={60}
          ry={10}
          fill="#ffffff"
          opacity={0.5 * hit}
          style={{ mixBlendMode: "screen" }}
        />
        <Drone
          x={dx}
          y={droneScreenY}
          scale={2.0}
          t={t}
          tilt={Math.sin(lt * 2) * 3 + spotAng * 0.12}
          spot={spotAng}
          spotLen={Math.max(300, spotLen)}
          spotOn={1}
        />
        {/* الحارس المشغّل */}
        <Guard
          x={330}
          groundY={G + 34}
          scale={1.7}
          pose={reachTo({ ...standSide(), headTilt: -14, lean: -1 }, "A", [26, -38], 1, 20)}
          look={LOOKS.scout}
          facing={1}
          light={[0.3, -0.8]}
          rim="#bfe6ff"
          itemA="scanner"
          scanGlow={0.8}
          time={t}
        />
      </g>
    </g>
  );
};

// ————————————————————— E: غرفة التحكّم (محليّ 0–2) —————————————————————
const Screen: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  kind: number;
  on: number;
  t: number;
}> = ({ x, y, w, h, kind, on, t }) => {
  const id = useUid() + "sc";
  const content = (() => {
    if (kind === 0) {
      // شبكة محطّات: نقاط وخطوط
      const pts = Array.from(
        { length: 14 },
        (_, i) =>
          [x + 18 + hash1(i * 3.1) * (w - 36), y + 22 + hash1(i * 5.3 + 1) * (h - 40)] as [
            number,
            number,
          ],
      );
      return (
        <g>
          {pts.map((p, i) =>
            i > 0 ? (
              <line
                key={i}
                x1={pts[i - 1][0]}
                y1={pts[i - 1][1]}
                x2={p[0]}
                y2={p[1]}
                stroke={C.cyan}
                strokeWidth={0.9}
                opacity={0.4}
              />
            ) : null,
          )}
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p[0]} cy={p[1]} r={3} fill={i === 5 ? C.amber : C.mint} />
              <circle
                cx={p[0]}
                cy={p[1]}
                r={3 + mod(t * 7 + i * 3, 14)}
                fill="none"
                stroke={C.cyan}
                strokeWidth={1}
                opacity={0.35 * (1 - mod(t * 7 + i * 3, 14) / 14)}
              />
            </g>
          ))}
        </g>
      );
    }
    if (kind === 1 || kind === 4) {
      // موجز كاميرا: سماء ليليّة + سياج + شخص
      const px = x + mod(t * (kind === 1 ? 14 : -10) + (kind === 4 ? w : 0), w);
      return (
        <g>
          <rect x={x + 6} y={y + h * 0.58} width={w - 12} height={h * 0.38} fill="#0a2040" />
          {Array.from({ length: 9 }).map((_, i) => (
            <line
              key={i}
              x1={x + 10 + (i * (w - 20)) / 8}
              y1={y + h * 0.35}
              x2={x + 10 + (i * (w - 20)) / 8}
              y2={y + h * 0.6}
              stroke="#6fa8c8"
              strokeWidth={1}
              opacity={0.5}
            />
          ))}
          <rect
            x={x + 6}
            y={y + h * 0.35}
            width={w - 12}
            height={1.4}
            fill="#6fa8c8"
            opacity={0.6}
          />
          <g transform={`translate(${clamp(px, x + 14, x + w - 14)} ${y + h * 0.78})`}>
            <circle cy={-14} r={3.4} fill="#e7f2fa" />
            <rect x={-3.6} y={-10} width={7.2} height={16} rx={2.4} fill="#c6f21f" />
          </g>
          <rect
            x={x + w - 48}
            y={y + 8}
            width={6}
            height={6}
            rx={3}
            fill="#ff4a3d"
            opacity={Math.sin(t * 3) > 0 ? 1 : 0.3}
          />
        </g>
      );
    }
    if (kind === 2) {
      // رادار
      const cx = x + w / 2;
      const cy = y + h / 2 + 4;
      const r = Math.min(w, h) * 0.38;
      const a = (t * 140) % 360;
      return (
        <g>
          {[0.4, 0.7, 1].map((f, i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r * f}
              fill="none"
              stroke={C.cyan}
              strokeWidth={1}
              opacity={0.35}
            />
          ))}
          <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke={C.cyan} opacity={0.2} />
          <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke={C.cyan} opacity={0.2} />
          <path
            d={`M${cx},${cy} L${cx + r * Math.cos(((a - 40) * Math.PI) / 180)},${cy + r * Math.sin(((a - 40) * Math.PI) / 180)} A${r},${r} 0 0 1 ${cx + r * Math.cos((a * Math.PI) / 180)},${cy + r * Math.sin((a * Math.PI) / 180)}Z`}
            fill={C.cyan}
            opacity={0.3}
          />
          {[0, 1, 2].map((i) => (
            <circle
              key={i}
              cx={cx + (hash1(i * 7) - 0.5) * r * 1.2}
              cy={cy + (hash1(i * 4 + 2) - 0.5) * r * 1.2}
              r={2.6}
              fill={C.mint}
            />
          ))}
        </g>
      );
    }
    if (kind === 3) {
      // مخطّطات خطّية
      return (
        <g fill="none" strokeLinejoin="round">
          {[0, 1, 2].map((k) => {
            const pts = Array.from(
              { length: 22 },
              (_, i) =>
                `${x + 10 + (i * (w - 20)) / 21},${y + h * (0.3 + k * 0.22) + Math.sin(i * 0.7 + t * 2 + k * 2) * 9 * (0.6 + 0.4 * Math.sin(i + k))}`,
            ).join(" ");
            return (
              <polyline
                key={k}
                points={pts}
                stroke={[C.cyan, C.mint, C.cyanSoft][k]}
                strokeWidth={1.8}
                opacity={0.9}
              />
            );
          })}
        </g>
      );
    }
    // شبكة حالات
    return (
      <g>
        {Array.from({ length: 24 }).map((_, i) => {
          const c = i % 6;
          const r = Math.floor(i / 6);
          const warn = i === 9;
          return (
            <rect
              key={i}
              x={x + 12 + c * ((w - 24) / 6)}
              y={y + 14 + r * ((h - 28) / 4)}
              width={(w - 24) / 6 - 5}
              height={(h - 28) / 4 - 5}
              rx={2}
              fill={warn ? C.amber : C.emerald}
              opacity={0.35 + 0.35 * Math.sin(t * 1.4 + i * 1.3) ** 2}
            />
          );
        })}
      </g>
    );
  })();
  const flash = Math.max(0, 1 - Math.abs(on - 0.22) * 6) * 0.35;
  return (
    <g>
      <rect
        x={x - 5}
        y={y - 5}
        width={w + 10}
        height={h + 10}
        rx={8}
        fill="#050e1f"
        stroke="#274a78"
        strokeWidth={2}
      />
      <rect x={x} y={y} width={w} height={h} rx={5} fill="#06152c" />
      <g opacity={clamp((on - 0.25) / 0.5)}>
        <defs>
          <clipPath id={id}>
            <rect x={x} y={y} width={w} height={h} rx={5} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${id})`}>
          <rect x={x} y={y} width={w} height={h} fill={mix("#0b2a4f", "#0e3a62", kind / 6)} />
          {content}
          {Array.from({ length: Math.floor(h / 4) }).map((_, i) => (
            <rect key={i} x={x} y={y + i * 4} width={w} height={1} fill="#000" opacity={0.12} />
          ))}
          <rect
            x={x}
            y={y + mod(t * 40 + kind * 20, h + 40) - 20}
            width={w}
            height={14}
            fill="#fff"
            opacity={0.04}
          />
        </g>
      </g>
      <rect x={x} y={y} width={w} height={h} rx={5} fill="#ffffff" opacity={flash} />
      <rect
        x={x - 12}
        y={y - 12}
        width={w + 24}
        height={h + 24}
        rx={14}
        fill={C.cyan}
        opacity={0.05 * on}
        style={{ mixBlendMode: "screen" }}
      />
    </g>
  );
};

const ControlShot: React.FC<{ lt: number }> = ({ lt }) => {
  const t = lt + 36;
  const id = useUid() + "cr";
  const push = easeInOutSoft(prog(lt, 0, 2.2));
  const zoom = 1 + 0.07 * push;
  const screens: Array<[number, number, number, number]> = [];
  const sw = 290;
  const sh = 150;
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 3; c++) screens.push([190 + c * (sw + 12), 120 + r * (sh + 12), sw, sh]);
  const heads = (i: number) => {
    const look = i === 0 ? LOOKS.operator : LOOKS.operator2;
    const x = i === 0 ? 470 : 810;
    const bob = Math.sin(t * 1.3 + i * 2) * 0.6;
    const pose = {
      ...standFront(),
      handA: [-27, 22 + bob] as [number, number],
      handB: [27, 22 - bob] as [number, number],
      headTilt: -3 + Math.sin(t * 0.8 + i) * 2,
    };
    return (
      <g key={i}>
        <g clipPath={`url(#${id}cl${i})`}>
          <Guard
            x={x}
            groundY={800}
            scale={2.35}
            pose={pose}
            view="back"
            look={look}
            facing={1}
            light={[0, -1]}
            rim="#6fd8ff"
            shadow={false}
            time={t}
          />
        </g>
        <defs>
          <clipPath id={`${id}cl${i}`}>
            <rect x={x - 120} y={300} width={240} height={430 - 0} />
          </clipPath>
        </defs>
        {/* مقعد */}
        <rect x={x - 60} y={654} width={120} height={80} rx={26} fill="#0a1830" />
        <rect x={x - 60} y={654} width={120} height={5} rx={2} fill="rgba(140,210,255,0.35)" />
        <rect x={x - 8} y={730} width={16} height={30} fill="#0a1830" />
      </g>
    );
  };
  return (
    <g>
      <g transform={`translate(640 360) scale(${zoom}) translate(-640 -360)`}>
        <defs>
          <LinGrad
            id={id + "w"}
            stops={[
              { o: 0, c: "#0d2548" },
              { o: 1, c: "#061230" },
            ]}
          />
          <LinGrad
            id={id + "f"}
            stops={[
              { o: 0, c: "#0a1c3a" },
              { o: 1, c: "#040b1c" },
            ]}
          />
          <RadGrad
            id={id + "g"}
            stops={[
              { o: 0, c: C.cyan, a: 0.28 },
              { o: 1, c: C.cyan, a: 0 },
            ]}
          />
        </defs>
        <rect x={-100} y={-100} width={1500} height={900} fill={`url(#${id}w)`} />
        {/* ألواح الجدار */}
        {Array.from({ length: 9 }).map((_, i) => (
          <rect
            key={i}
            x={-60 + i * 170}
            y={0}
            width={4}
            height={560}
            fill="#04101f"
            opacity={0.6}
          />
        ))}
        <rect x={-100} y={40} width={1500} height={10} fill="#0b3156" opacity={0.7} />
        {/* إضاءة سقفيّة */}
        <rect x={150} y={22} width={980} height={8} rx={4} fill="#cfeeff" opacity={0.85} />
        <ellipse cx={640} cy={30} rx={620} ry={46} fill={`url(#${id}g)`} />
        {screens.map((s, i) => (
          <Screen
            key={i}
            x={s[0]}
            y={s[1]}
            w={s[2]}
            h={s[3]}
            kind={i}
            on={clamp((lt - i * 0.25) / 0.9)}
            t={t}
          />
        ))}
        <ellipse cx={640} cy={290} rx={560} ry={200} fill={`url(#${id}g)`} />
        {/* أرضيّة */}
        <rect x={-100} y={560} width={1500} height={300} fill={`url(#${id}f)`} />
        <rect x={-100} y={560} width={1500} height={2} fill="rgba(140,210,255,0.4)" />
        <rect
          x={150}
          y={572}
          width={980}
          height={60}
          fill={C.cyan}
          opacity={0.06}
          style={{ mixBlendMode: "screen" }}
        />
        {/* مكتب ومحطات عمل (شاشات تواجه المشغّلين) */}
        <rect x={190} y={540} width={900} height={22} rx={6} fill="#0b2342" />
        <rect x={190} y={540} width={900} height={3} rx={1.5} fill="rgba(140,210,255,0.55)" />
        {[0, 1, 2, 3].map((i) => {
          const mx = 330 + i * 230;
          const on = clamp((lt - 0.4 - i * 0.18) / 0.5);
          return (
            <g key={i}>
              <rect
                x={mx - 78}
                y={436}
                width={156}
                height={102}
                rx={8}
                fill="#050e1f"
                stroke="#274a78"
                strokeWidth={2}
              />
              <rect
                x={mx - 72}
                y={442}
                width={144}
                height={90}
                rx={5}
                fill={mix("#06152c", "#0d4a73", 0.4 + 0.6 * on)}
                opacity={0.4 + 0.6 * on}
              />
              {[0, 1, 2].map((k) => (
                <rect
                  key={k}
                  x={mx - 62}
                  y={452 + k * 18}
                  width={40 + hash1(i * 3 + k) * 70}
                  height={5}
                  rx={2.5}
                  fill={[C.cyan, C.mint, C.cyanSoft][k]}
                  opacity={0.7 * on}
                />
              ))}
              <rect x={mx - 6} y={536} width={12} height={6} fill="#0a1830" />
            </g>
          );
        })}
        {/* بقع ضوء على الأرضيّة من الشاشات */}
        <ellipse
          cx={640}
          cy={640}
          rx={520}
          ry={64}
          fill={C.cyan}
          opacity={0.08}
          style={{ mixBlendMode: "screen" }}
        />
        {/* شريطا إضاءة جانبيّان */}
        <rect x={34} y={80} width={5} height={440} rx={2.5} fill={C.cyan} opacity={0.55} />
        <rect x={1241} y={80} width={5} height={440} rx={2.5} fill={C.cyan} opacity={0.55} />
        <ellipse
          cx={36}
          cy={300}
          rx={70}
          ry={260}
          fill={C.cyan}
          opacity={0.06}
          style={{ mixBlendMode: "screen" }}
        />
        <ellipse
          cx={1244}
          cy={300}
          rx={70}
          ry={260}
          fill={C.cyan}
          opacity={0.06}
          style={{ mixBlendMode: "screen" }}
        />
        {/* مصابيح سقفيّة */}
        {[300, 520, 760, 980].map((lx, i) => (
          <g key={i}>
            <circle cx={lx} cy={64} r={7} fill="#e9fbff" opacity={0.9} />
            <ellipse
              cx={lx}
              cy={72}
              rx={60}
              ry={26}
              fill="#bfeeff"
              opacity={0.07}
              style={{ mixBlendMode: "screen" }}
            />
          </g>
        ))}
        {/* مشرف واقف يتابع الجدار */}
        <Guard
          x={1150}
          groundY={742}
          scale={1.95}
          pose={{
            ...standFront(),
            handA: [-22, 18] as [number, number],
            handB: [28, 4] as [number, number],
          }}
          view="back"
          look={LOOKS.patrolB}
          facing={1}
          light={[0, -1]}
          rim="#6fd8ff"
          itemB="card"
          time={t}
        />
        {heads(0)}
        {heads(1)}
        <rect x={-100} y={700} width={1500} height={120} fill="#030a18" opacity={0.55} />
      </g>
    </g>
  );
};

export const S3: React.FC<{ t: number }> = ({ t }) => {
  // t: ثوانٍ محليّة من بدء المشهد (0 = 24.0 ث)
  const bounds = [0, 6, 8, 10, 12, 14];
  const W = 1280;
  const shots: React.ReactNode[] = [];
  const pad = 0.22;
  const comps = [
    (lt: number) => <GateShot lt={lt} />,
    (lt: number) => <CamShot lt={lt} />,
    (lt: number) => <PatrolShot lt={lt} />,
    (lt: number) => <DroneShot lt={lt} />,
    (lt: number) => <ControlShot lt={lt} />,
  ];
  comps.forEach((render, i) => {
    const a = bounds[i];
    const b = bounds[i + 1];
    // الانتقال عند الحدّ b (للّقطة i: خروج) وعند a (للّقطة i: دخول)
    const inP = i === 0 ? 1 : easeInOut(prog(t, a - pad, a + pad));
    const outP = i === comps.length - 1 ? 0 : easeInOut(prog(t, b - pad, b + pad));
    if (t < a - pad - 0.01 || t > b + pad + 0.01) return;
    // الدخول من اليسار، والخروج نحو اليمين
    const dx = (1 - inP) * -W + outP * W;
    const vel =
      Math.abs(inP < 1 ? 1 - inP : outP) > 0 && (inP < 1 || outP > 0)
        ? Math.sin(Math.PI * (inP < 1 ? inP : outP))
        : 0;
    const blur = vel * 14;
    const fid = `s3blur${i}`;
    shots.push(
      <g
        key={i}
        transform={`translate(${dx.toFixed(1)} 0)`}
        filter={blur > 0.5 ? `url(#${fid})` : undefined}
      >
        {blur > 0.5 && (
          <defs>
            <filter id={fid} x="-10%" y="0" width="120%" height="100%">
              <feGaussianBlur stdDeviation={`${blur.toFixed(1)} 0`} />
            </filter>
          </defs>
        )}
        {render(clamp(t - a, -pad, 99) + (i === 0 ? 0 : 0))}
      </g>,
    );
  });
  return <g>{shots}</g>;
};
