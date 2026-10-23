/** مبانٍ بنوافذ تُضاء تدريجيًّا. الإضاءة دالّة نقيّة في (الزمن، رقم المبنى، رقم النافذة). */
import React from "react";
import { clamp, hash1 } from "./ease";
import { LinGrad, useUid } from "./svgx";
import { alpha } from "./color";

export interface BuildingSpec {
  x: number; // يسار
  w: number;
  h: number;
  /** زمن بدء الإضاءة (ث) للمبنى. */
  on: number;
  /** مبنى بشكل علوي: 0 مسطّح · 1 هوائيّ · 2 مدرّج · 3 قبّة. */
  top?: number;
}

const WARM = ["#ffd88a", "#ffe8b0", "#ffc870"];
const COOL = ["#bfeeff", "#9fe2ff"];

export const Building: React.FC<{
  b: BuildingSpec;
  baseY: number;
  idx: number;
  t: number;
  body: string;
  bodyTop: string;
  rim: string;
  winW?: number;
  winH?: number;
  gap?: number;
  dim?: number;
  litBoost?: number;
}> = ({
  b,
  baseY,
  idx,
  t,
  body,
  bodyTop,
  rim,
  winW: winW0,
  winH: winH0,
  gap: gap0,
  dim = 1,
  litBoost = 1,
}) => {
  const uid = useUid() + "b";
  const winW = winW0 ?? 5 + Math.floor(hash1(idx * 7.1) * 6);
  const winH = winH0 ?? 7 + Math.floor(hash1(idx * 3.3) * 6);
  const gap = gap0 ?? 5 + Math.floor(hash1(idx * 5.9) * 6);
  const cols = Math.max(1, Math.floor((b.w - 12) / (winW + gap)));
  const rows = Math.max(1, Math.floor((b.h - 24) / (winH + gap)));
  const ox = b.x + (b.w - (cols * (winW + gap) - gap)) / 2;
  const oy = baseY - b.h + 16;
  let off = "";
  const onW: string[] = [];
  const onC: string[] = [];
  const mid: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = idx * 977 + r * 31 + c * 7;
      const x = ox + c * (winW + gap);
      const y = oy + r * (winH + gap);
      const rect = `M${x.toFixed(1)},${y.toFixed(1)}h${winW}v${winH}h${-winW}Z`;
      const rowOn = hash1(idx * 53 + r * 11.7) < 0.7;
      const never = !rowOn || hash1(k + 0.5) < 0.12;
      if (never) {
        off += rect;
        continue;
      }
      const tOn = b.on + hash1(k) * 1.1 + (1 - r / rows) * 0.25;
      const p = clamp((t - tOn) / 0.28);
      if (p <= 0) off += rect;
      else if (p >= 1) {
        const h = hash1(k + 9);
        (h < 0.75 ? onW : onC).push(rect);
      } else {
        mid.push(
          <rect
            key={k}
            x={x}
            y={y}
            width={winW}
            height={winH}
            fill={WARM[0]}
            opacity={p * 0.95 * litBoost}
          />,
        );
        off += rect;
      }
    }
  }
  const topEl: React.ReactNode =
    b.top === 1 ? (
      <g>
        <rect x={b.x + b.w / 2 - 1.6} y={baseY - b.h - 46} width={3.2} height={46} fill={body} />
        <circle
          cx={b.x + b.w / 2}
          cy={baseY - b.h - 47}
          r={2.4}
          fill="#ff6b5a"
          opacity={0.3 + 0.7 * Math.max(0, Math.sin(t * 2.1 + idx))}
        />
      </g>
    ) : b.top === 2 ? (
      <g>
        <rect
          x={b.x + b.w * 0.18}
          y={baseY - b.h - 22}
          width={b.w * 0.64}
          height={22}
          fill={bodyTop}
        />
        <rect
          x={b.x + b.w * 0.32}
          y={baseY - b.h - 40}
          width={b.w * 0.36}
          height={18}
          fill={bodyTop}
        />
      </g>
    ) : b.top === 3 ? (
      <g>
        <path
          d={`M${b.x + b.w * 0.2},${baseY - b.h} Q${b.x + b.w / 2},${baseY - b.h - b.w * 0.55} ${b.x + b.w * 0.8},${baseY - b.h}Z`}
          fill={bodyTop}
        />
        <rect
          x={b.x + b.w / 2 - 1}
          y={baseY - b.h - b.w * 0.55 - 14}
          width={2}
          height={14}
          fill={body}
        />
      </g>
    ) : null;
  return (
    <g>
      <defs>
        <LinGrad
          id={uid}
          stops={[
            { o: 0, c: bodyTop },
            { o: 0.5, c: body },
            { o: 1, c: body },
          ]}
        />
      </defs>
      <rect x={b.x} y={baseY - b.h} width={b.w} height={b.h} fill={`url(#${uid})`} />
      <rect x={b.x} y={baseY - b.h} width={b.w} height={2} fill={alpha(rim, 0.45 * dim)} />
      <rect
        x={b.x + b.w - 1.6}
        y={baseY - b.h}
        width={1.6}
        height={b.h}
        fill={alpha(rim, 0.3 * dim)}
      />
      {topEl}
      <path d={off} fill="#0a1a33" opacity={0.55 * dim + 0.2} />
      {mid}
      <path d={onW.join("")} fill={WARM[0]} opacity={0.95 * litBoost} />
      <path d={onC.join("")} fill={COOL[0]} opacity={0.92 * litBoost} />
    </g>
  );
};

/** حزمة مبانٍ مولَّدة حتميًّا بين p0 وp1. */
export const makeSkyline = (
  seed: number,
  p0: number,
  p1: number,
  hMin: number,
  hMax: number,
  wMin: number,
  wMax: number,
  onStart: number,
  onSpan: number,
  src0: number,
  dir: 1 | -1,
): BuildingSpec[] => {
  const out: BuildingSpec[] = [];
  let x = p0;
  let i = 0;
  while (x < p1) {
    const w = wMin + hash1(seed + i * 3.1) * (wMax - wMin);
    const h = hMin + Math.pow(hash1(seed + i * 5.7 + 1), 1.3) * (hMax - hMin);
    const top =
      hash1(seed + i * 2.3 + 4) < 0.28
        ? 1
        : hash1(seed + i * 8.1) < 0.2
          ? 2
          : hash1(seed + i * 4.4) < 0.08
            ? 3
            : 0;
    const dist = Math.abs(x + w / 2 - src0);
    out.push({
      x,
      w,
      h,
      top,
      on: onStart + (dist / Math.max(1, Math.abs(p1 - p0))) * onSpan * dir * dir,
    });
    x += w + 4 + hash1(seed + i) * 14;
    i++;
  }
  return out;
};
