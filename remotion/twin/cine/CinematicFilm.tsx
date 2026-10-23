/**
 * غلاف Remotion لمصيِّر الفيلم: إطارٌ واحد = استدعاءٌ واحد لـ`TwinRenderer`
 * على لوحة Canvas 2D. كلّ المنطق في `render.ts` (دالّة نقيّة حتميّة)،
 * فالنتيجة هي نفسها في المصيِّر وفي أي معاينة خارج Remotion.
 *
 * لا نصّ ولا خطّ ولا صورة: لا `delayRender` ولا أصول خارجية.
 */
import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { TwinRenderer } from "./render";

let shared: TwinRenderer | null = null;
let sharedKey = "";

const makeCanvas = (w: number, h: number): HTMLCanvasElement => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

export const CinematicFilm: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const key = `${width}x${height}`;
    if (!shared || sharedKey !== key) {
      shared = new TwinRenderer(width, height, makeCanvas);
      sharedKey = key;
    }
    shared.renderFrame(ctx, frame);
  }, [frame, width, height]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#030812" }}>
      <canvas ref={ref} width={width} height={height} style={{ width, height, display: "block" }} />
    </AbsoluteFill>
  );
};
