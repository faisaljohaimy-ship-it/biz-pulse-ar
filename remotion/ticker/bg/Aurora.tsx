import React, { useLayoutEffect, useRef } from "react";
import { useCurrentFrame } from "remotion";
import { H, W, renderField, toBytes, type Theme } from "./field";

/** يرسم إطار الشفق على canvas شفّاف 1200×96 بلا خلفية (PNG بألفا). */
export const Aurora: React.FC<{ theme: Theme }> = ({ theme }) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const buf = new Float32Array(W * H * 4);
    renderField(theme, frame, buf);
    const img = ctx.createImageData(W, H);
    toBytes(theme, frame, buf, img.data, false);
    ctx.putImageData(img, 0, 0);
  }, [frame, theme]);
  return (
    <canvas ref={ref} width={W} height={H} style={{ display: "block", width: W, height: H }} />
  );
};
