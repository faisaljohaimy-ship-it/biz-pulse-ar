/**
 * الكاميرا الفوتوغرافية: صورةٌ مصدرها 1672×941 (16:9 أصليّ) تملأ إطار 1280×720 بالغطاء ثم تتحرّك
 * الكاميرا بتكبيرٍ z ∈ [1, 1.25] فوق الغطاء — فلا تظهر حافّة صورةٍ، ولا تكبيرَ فوق دقّة المصدر
 * (k = 0.766·z ≤ 0.96 بكسل شاشة لكلّ بكسل مصدر: الصورة تُصغَّر دائمًا لا تُكبَّر).
 *
 * العالم = بكسلات المصدر. الطبقات الرسومية فوق الصورة (نبضات على الأسلاك، لمعات، أطر HUD) تُرسم إمّا في
 * إحداثيات المصدر داخل <World> (`Over`) فتلتصق بمنشآتها، أو في إحداثيات الشاشة (`Screen`) عبر `toScreen`.
 */
import React, { createContext, useContext } from "react";
import { Img, staticFile } from "remotion";
import { clamp, keyframes } from "./ease";

export const SW = 1672;
export const SH = 941;
export const FW = 1280;
export const FH = 720;
export const COVER = Math.max(FW / SW, FH / SH);
export const Z_MAX = 1.25;

export interface Cam {
  cx: number;
  cy: number;
  z: number;
}
export interface View {
  k: number;
  cx: number;
  cy: number;
  tx: number;
  ty: number;
  z: number;
}

/** المنظور بعد حصر الكاميرا داخل الصورة. */
export const view = (c: Cam): View => {
  const z = clamp(c.z, 1, Z_MAX);
  const k = COVER * z;
  const hw = FW / 2 / k;
  const hh = FH / 2 / k;
  const cx = clamp(c.cx, hw, SW - hw);
  const cy = clamp(c.cy, hh, SH - hh);
  return { k, cx, cy, tx: FW / 2 - cx * k, ty: FH / 2 - cy * k, z };
};

export const toScreen = (v: View, x: number, y: number) => ({
  x: v.tx + x * v.k,
  y: v.ty + y * v.k,
});

/** مفاتيح [زمن، cx، cy، z] بمنحنى أحاديّ الرتابة. */
export type CamKey = readonly [number, number, number, number];
export const camAt = (keys: ReadonlyArray<CamKey>, t: number): Cam => ({
  cx: keyframes(
    t,
    keys.map((k) => [k[0], k[1]] as const),
  ),
  cy: keyframes(
    t,
    keys.map((k) => [k[0], k[2]] as const),
  ),
  z: keyframes(
    t,
    keys.map((k) => [k[0], k[3]] as const),
  ),
});

const KCtx = createContext(1);
export const useK = (): number => useContext(KCtx);

export const plateUrl = (name: string): string => staticFile(`plates/${name}`);

/** العالم: صندوقٌ بمقاس 1672k × 941k عند (tx, ty) — أبناؤه بإحداثيات المصدر. */
export const World: React.FC<{ v: View; children?: React.ReactNode; opacity?: number }> = ({
  v,
  children,
  opacity = 1,
}) => (
  <KCtx.Provider value={v.k}>
    <div
      style={{
        position: "absolute",
        left: v.tx,
        top: v.ty,
        width: SW * v.k,
        height: SH * v.k,
        opacity,
      }}
    >
      {children}
    </div>
  </KCtx.Provider>
);

/** صورةٌ تملأ العالم. `file` = اسم الملف في public/plates (مثلًا p03.jpg). */
export const PlateImg: React.FC<{
  file: string;
  opacity?: number;
  blend?: React.CSSProperties["mixBlendMode"];
  mask?: string;
  filter?: string;
}> = ({ file, opacity = 1, blend, mask, filter }) => (
  <Img
    src={plateUrl(file)}
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      width: "100%",
      height: "100%",
      opacity,
      mixBlendMode: blend,
      WebkitMaskImage: mask,
      maskImage: mask,
      filter,
      display: "block",
    }}
  />
);

/** طبقة SVG بإحداثيات المصدر فوق العالم. */
export const Over: React.FC<{
  children?: React.ReactNode;
  blend?: React.CSSProperties["mixBlendMode"];
  opacity?: number;
}> = ({ children, blend, opacity = 1 }) => (
  <svg
    viewBox={`0 0 ${SW} ${SH}`}
    width="100%"
    height="100%"
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      overflow: "visible",
      mixBlendMode: blend,
      opacity,
    }}
  >
    {children}
  </svg>
);

/** طبقة SVG بإحداثيات الشاشة 1280×720. */
export const Screen: React.FC<{
  children?: React.ReactNode;
  blend?: React.CSSProperties["mixBlendMode"];
  opacity?: number;
}> = ({ children, blend, opacity = 1 }) => (
  <svg
    viewBox={`0 0 ${FW} ${FH}`}
    width={FW}
    height={FH}
    style={{ position: "absolute", left: 0, top: 0, mixBlendMode: blend, opacity }}
  >
    {children}
  </svg>
);
