/**
 * نبضات التيار على مسار سلكيّ: ثلاث طبقات شُرط (dash) متراصفة الرأس تعطي ذيلًا مدرّجًا،
 * مع توهّجٍ خلفيّ. تتحرّك على المسار نفسه بسرعة حقيقية (بكسل/ث) فتتّصل عبر الأبراج.
 * قصّ «جبهة التنشيط»: السلك يضيء من نقطة البدء حتى الجبهة فقط.
 */
import React from "react";
import { useUid } from "./svgx";

export interface PulseProps {
  d: string;
  /** طول المسار التقريبيّ (بكسل) — يُمرَّر كـpathLength فتُقاس الشُّرط بالبكسل. */
  len: number;
  t: number;
  /** سرعة النبضة بالبكسل/ث (على المسار). */
  speed: number;
  /** الفترة بين النبضات (بكسل). */
  period?: number;
  color?: string;
  core?: string;
  width?: number;
  /** زمن بدء التنشيط وسرعة الجبهة (بكسل/ث). */
  start?: number;
  front?: number;
  /** إزاحة الطور (بكسل). */
  phase?: number;
  opacity?: number;
  /** قصّ إضافيّ: مستطيل [x, y, w, h] لقصّ المنطقة المضيئة بدل الجبهة. */
  clip?: [number, number, number, number];
  dark?: string;
  darkWidth?: number;
  showBase?: boolean;
}

export const Pulses: React.FC<PulseProps> = ({
  d,
  len,
  t,
  speed,
  period = 300,
  color = "#22d3ee",
  core = "#e8fdff",
  width = 3,
  phase = 0,
  opacity = 1,
  clip,
  dark = "#0a1a33",
  darkWidth,
  showBase = true,
}) => {
  const id = useUid() + "pl";
  const head = (((t * speed + phase) % period) + period) % period;
  const layers: Array<[number, number, string, number]> = [
    [150, width * 3.4, color, 0.12],
    [96, width * 2.1, color, 0.3],
    [54, width * 1.4, color, 0.62],
    [22, width * 0.9, core, 1],
  ];
  const maxL = 150;
  return (
    <g opacity={opacity}>
      {showBase && (
        <path
          d={d}
          stroke={dark}
          strokeWidth={darkWidth ?? width * 0.7}
          fill="none"
          strokeLinecap="round"
        />
      )}
      {clip && (
        <defs>
          <clipPath id={id}>
            <rect x={clip[0]} y={clip[1]} width={clip[2]} height={clip[3]} />
          </clipPath>
        </defs>
      )}
      <g clipPath={clip ? `url(#${id})` : undefined}>
        <path
          d={d}
          stroke={color}
          strokeWidth={width * 1.1}
          fill="none"
          opacity={0.2}
          strokeLinecap="round"
        />
        {layers.map(([L, w, c, a], i) => (
          <path
            key={i}
            d={d}
            pathLength={len}
            stroke={c}
            strokeWidth={w}
            fill="none"
            strokeLinecap="round"
            opacity={a}
            strokeDasharray={`${L} ${Math.max(1, period - L)}`}
            strokeDashoffset={-(head + (maxL - L))}
          />
        ))}
      </g>
    </g>
  );
};
