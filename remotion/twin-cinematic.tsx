/**
 * مدخل تصيير «فيلم التوأم الرقمي السينمائي» (30 ث · 30 إطارًا/ث · 1280×720).
 *
 * أداة بناء عابرة خارج `src/` — لا تدخل حزمة التطبيق. المخرَج ملفّات وسائط
 * ساكنة تُشحن كما هي؛ والأمر الحرفي للتصيير والترميز في `twin/RENDER.md`.
 * الفيلم إجرائيّ بالكامل: لا صور ولا نصوص ولا خطوط ولا صوت.
 */
import React from "react";
import { Composition, registerRoot } from "remotion";
import { CinematicFilm } from "./twin/cine/CinematicFilm";
import {
  TWIN_FILM_FPS,
  TWIN_FILM_FRAMES,
  TWIN_FILM_HEIGHT,
  TWIN_FILM_WIDTH,
} from "./twin/timeline";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="TwinCinematic"
    component={CinematicFilm}
    durationInFrames={TWIN_FILM_FRAMES}
    fps={TWIN_FILM_FPS}
    width={TWIN_FILM_WIDTH}
    height={TWIN_FILM_HEIGHT}
  />
);

registerRoot(RemotionRoot);
