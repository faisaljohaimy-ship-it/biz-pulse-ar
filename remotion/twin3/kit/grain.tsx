/**
 * حبيباتٌ ثابتة (غير متحرّكة) تكسر تشرّط التدرّجات الناعمة بعد الترميز 8 بت.
 * تُولَّد مرّةً بمولّدٍ حتميّ على لوحة 256×256 وتُلصَق كمربّعات؛ لا تتغيّر بين الإطارات
 * فلا تكلّف بتات في المناطق الثابتة. الشدّة صغيرة (±3 مستويات تقريبًا).
 */
import React, { useMemo } from "react";
import { rng } from "./ease";

export const Grain: React.FC<{ strength?: number }> = ({ strength = 0.05 }) => {
  const url = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext("2d");
    if (!ctx) return "";
    const img = ctx.createImageData(256, 256);
    const r = rng(1234);
    for (let i = 0; i < 256 * 256; i++) {
      const v = Math.floor(128 + (r() + r() + r() - 1.5) * 90);
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL("image/png");
  }, []);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `url(${url})`,
        backgroundSize: "256px 256px",
        mixBlendMode: "soft-light",
        opacity: strength * 10,
        pointerEvents: "none",
      }}
    />
  );
};
