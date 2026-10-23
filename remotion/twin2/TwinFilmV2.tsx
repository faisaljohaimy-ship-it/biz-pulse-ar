/**
 * فيلم التوأم الرقمي v2 — تجميع المشاهد والانتقالات.
 *  8.0  مسح ضوء (قطع مائل متوهّج يعبر من اليمين إلى اليسار)
 *  24.0 عبور بالتكبير + وهج (zoom-through) من أفق المدينة إلى البوّابة
 *  38.0 الصورة تفقد لونها وتتحوّل إلى خطوط (كشف حواف) ثم تذوب في المحطة الملوّنة
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Captions } from "./captions";
import { Vignette } from "./kit/atmo";
import { Grain } from "./kit/grain";
import { clamp, easeInOut, easeOut, lerp, prog } from "./kit/ease";
import { S1 } from "./scenes/S1";
import { S2 } from "./scenes/S2";
import { S3 } from "./scenes/S3";
import { S4 } from "./scenes/S4";
import { Brand, Network } from "./scenes/S5";
import { C } from "./palette";
import { FPS, H, W } from "./timeline";
import "./fonts";

const FREEZE = 53.5;

const SweepWipe: React.FC<{ t: number }> = ({ t }) => {
  const u = easeInOut(prog(t, 7.62, 8.38));
  const xb = lerp(1560, -380, u);
  const skew = 130;
  const barOp = Math.sin(Math.PI * clamp(u)) * 0.5;
  const oldVisible = t < 8.4;
  return (
    <g>
      {/* S2 قاعدة */}
      <S2 t={t} />
      {oldVisible && (
        <g>
          <defs>
            <clipPath id="wipeOld">
              <polygon points={`-400,-10 ${xb + skew},-10 ${xb - skew},730 -400,730`} />
            </clipPath>
          </defs>
          <g clipPath="url(#wipeOld)">
            <S1 t={Math.min(t, 8.0)} />
          </g>
        </g>
      )}
      <defs>
        <linearGradient id="wipeBar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#bff7ff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#d9fbff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="0.55" stopColor="#d9fbff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#bff7ff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform={`translate(${xb} 0)`} opacity={barOp} style={{ mixBlendMode: "screen" }}>
        <polygon
          points={`${-150 + skew},-10 ${150 + skew},-10 ${150 - skew},730 ${-150 - skew},730`}
          fill="url(#wipeBar)"
        />
      </g>
    </g>
  );
};

const ZoomThrough: React.FC<{ t: number }> = ({ t }) => {
  const u = easeInOut(prog(t, 23.55, 24.25));
  const outScale = lerp(1, 2.1, u);
  const outOp = 1 - easeInOut(prog(t, 23.8, 24.2));
  const inScale = lerp(1.35, 1, easeOut(prog(t, 23.85, 24.6)));
  const inOp = easeInOut(prog(t, 23.85, 24.35));
  const glow = Math.sin(Math.PI * clamp((t - 23.7) / 0.7)) * 0.3;
  return (
    <g>
      <g opacity={inOp} transform={`translate(640 360) scale(${inScale}) translate(-640 -360)`}>
        <S3 t={Math.max(0, t - 24)} />
      </g>
      <g opacity={outOp} transform={`translate(640 470) scale(${outScale}) translate(-640 -470)`}>
        <S2 t={Math.min(t, 24)} />
      </g>
      <defs>
        <radialGradient id="ztGlow" cx="0.5" cy="0.62" r="0.6">
          <stop offset="0" stopColor="#fff2d0" stopOpacity="1" />
          <stop offset="0.5" stopColor="#ffd88a" stopOpacity="0.4" />
          <stop offset="1" stopColor="#ffd88a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect
        x={0}
        y={0}
        width={W}
        height={H}
        fill="url(#ztGlow)"
        opacity={glow}
        style={{ mixBlendMode: "screen" }}
      />
    </g>
  );
};

const EdgeFilter: React.FC = () => (
  <defs>
    <filter id="edgeLines" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feColorMatrix
        type="matrix"
        values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0"
      />
      <feConvolveMatrix
        order="3"
        kernelMatrix="-1 -1 -1 -1 8 -1 -1 -1 -1"
        divisor="1"
        bias="0"
        edgeMode="duplicate"
        preserveAlpha="true"
      />
      <feComponentTransfer>
        <feFuncR type="linear" slope="6" intercept="-0.3" />
        <feFuncG type="linear" slope="6" intercept="-0.3" />
        <feFuncB type="linear" slope="6" intercept="-0.3" />
      </feComponentTransfer>
      <feColorMatrix
        type="matrix"
        values="0 0 0 0 0.35  0 0 0 0 0.9  0 0 0 0 0.97  0.9 0.9 0.9 0 0"
      />
    </filter>
    <filter id="desat" colorInterpolationFilters="sRGB">
      <feColorMatrix type="saturate" values="0" />
    </filter>
  </defs>
);

const ToLines: React.FC<{ t: number }> = ({ t }) => {
  const desat = easeInOut(prog(t, 37.35, 37.95));
  const lines = easeInOut(prog(t, 37.55, 38.05));
  const fade = easeInOut(prog(t, 38.05, 38.55));
  const s4 = easeInOut(prog(t, 38.0, 38.5));
  const s3 = <S3 t={Math.min(t - 24, 14)} />;
  return (
    <g>
      <EdgeFilter />
      <rect x={0} y={0} width={W} height={H} fill="#050d1f" />
      <g opacity={s4}>
        <S4 t={Math.max(t, 38)} />
      </g>
      <g opacity={1 - fade}>
        {/* الصورة الملوّنة تفقد لونها */}
        <g opacity={1 - lines * 0.9}>
          <g style={{ filter: `saturate(${(1 - desat).toFixed(3)})` }}>{s3}</g>
        </g>
        {/* ثم تظهر الخطوط */}
        <g opacity={lines}>
          <rect x={0} y={0} width={W} height={H} fill="#06122a" />
          <g filter="url(#edgeLines)">{s3}</g>
        </g>
      </g>
    </g>
  );
};

export const TwinFilmV2: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const ta = Math.min(t, FREEZE);
  let scene: React.ReactNode;
  if (t < 7.55) scene = <S1 t={t} />;
  else if (t < 8.45) scene = <SweepWipe t={t} />;
  else if (t < 23.55) scene = <S2 t={t} />;
  else if (t < 24.65) scene = <ZoomThrough t={t} />;
  else if (t < 37.35) scene = <S3 t={t - 24} />;
  else if (t < 38.6) scene = <ToLines t={t} />;
  else scene = <S4 t={ta} under={<Network t={ta} />} />;
  return (
    <AbsoluteFill style={{ background: "#040a18" }}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ position: "absolute", inset: 0 }}
      >
        {scene}
        <Vignette strength={0.5} />
      </svg>
      <Captions t={ta} />
      <Brand t={ta} />
      <Grain strength={0.024} />
    </AbsoluteFill>
  );
};
void C;
