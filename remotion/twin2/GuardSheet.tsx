import React from "react";
import { AbsoluteFill } from "remotion";
import { Guard, LOOKS } from "./characters/Guard";
import { mirrorCheck, radioToMouth, reachTo, walkPose } from "./characters/poses";
import { standFront, standSide } from "./characters/rig";
import { C } from "./palette";
import "./fonts";

/** ورقة اختبار الشخصية — تُظهر الأوضاع كلها. */
export const GuardSheet: React.FC = () => {
  const L = LOOKS;
  const g = 560;
  const sc = 1.45;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(#10264a, #0a1530)` }}>
      <svg width={1280} height={720} viewBox="0 0 1280 720">
        <rect x={0} y={g} width={1280} height={160} fill="#0b1226" />
        {/* مشي: أربع لحظات من الدورة */}
        {[0, 0.28, 0.55, 0.83].map((t, i) => (
          <Guard
            key={i}
            x={90 + i * 135}
            groundY={g}
            scale={sc * 0.78}
            pose={walkPose(t, { speed: 90 })}
            look={L.leader}
            facing={-1}
            itemA="flashlight"
            beam={{ angle: 24, length: 90, spread: 7 }}
          />
        ))}
        {[0.1, 0.4, 0.7, 0.95].map((t, i) => (
          <Guard
            key={"b" + i}
            x={640 + i * 130}
            groundY={g}
            scale={sc * 0.78}
            pose={walkPose(t, { speed: 90 })}
            look={L.patrolB}
            facing={1}
          />
        ))}
        {/* أماميّ */}
        <Guard
          x={1160}
          groundY={g}
          scale={sc * 0.78}
          pose={standFront()}
          view="front"
          look={L.gate}
          itemA="none"
        />
        {/* صف ثانٍ أكبر */}
        <g transform="translate(0 0)">
          <rect x={0} y={0} width={0} height={0} />
        </g>
        <text x={20} y={30} fill="#fff" fontSize={14}>
          walk
        </text>
      </svg>
    </AbsoluteFill>
  );
};

export const GuardSheet2: React.FC = () => {
  const L = LOOKS;
  const g = 600;
  const sc = 2.0;
  const radioP = radioToMouth(standSide(), "A", 1);
  const scanP = reachTo(standSide(), "A", [46, -34], 1, -8);
  const pointP = reachTo(standSide(), "B", [54, -70], 1);
  const frontScan = reachTo(reachTo(standFront(), "A", [-22, -12], 1), "B", [26, -66], 1);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(#10264a, #0a1530)` }}>
      <svg width={1280} height={720} viewBox="0 0 1280 720">
        <rect x={0} y={g} width={1280} height={120} fill="#0b1226" />
        <Guard
          x={140}
          groundY={g}
          scale={sc}
          pose={radioP}
          look={L.leader}
          facing={-1}
          itemA="radio"
        />
        <Guard
          x={380}
          groundY={g}
          scale={sc}
          pose={scanP}
          look={L.gate}
          facing={1}
          itemA="scanner"
          itemB="card"
          scanGlow={1}
        />
        <Guard
          x={620}
          groundY={g}
          scale={sc}
          pose={mirrorCheck(1)}
          look={L.scout}
          facing={1}
          itemA="mirror"
        />
        <Guard
          x={860}
          groundY={g}
          scale={sc}
          pose={pointP}
          look={L.patrolB}
          facing={-1}
          itemB="none"
        />
        <Guard x={1100} groundY={g} scale={sc} pose={frontScan} view="front" look={L.leader} />
      </svg>
    </AbsoluteFill>
  );
};

export const GuardSheet3: React.FC = () => {
  const L = LOOKS;
  return (
    <AbsoluteFill style={{ background: `linear-gradient(#10264a, #0a1530)` }}>
      <svg width={1280} height={720} viewBox="0 0 1280 720">
        <rect x={0} y={640} width={1280} height={80} fill={C.navy} />
        {/* وجوه مكبّرة */}
        <Guard
          x={160}
          groundY={1380}
          scale={6.5}
          pose={standSide()}
          look={L.leader}
          facing={-1}
          shadow={false}
        />
        <Guard
          x={520}
          groundY={1380}
          scale={6.5}
          pose={standFront()}
          view="front"
          look={L.gate}
          shadow={false}
        />
        <Guard
          x={880}
          groundY={1380}
          scale={6.5}
          pose={standFront()}
          view="back"
          look={L.operator}
          shadow={false}
        />
        <Guard
          x={1180}
          groundY={1380}
          scale={6.5}
          pose={standSide()}
          look={L.operator2}
          facing={1}
          shadow={false}
        />
      </svg>
    </AbsoluteFill>
  );
};
