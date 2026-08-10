/**
 * مدخل تصيير فيلم «التوأم الحيّ».
 *
 * أداة بناء عابرة — تعيش خارج `src/` ولا تدخل حزمة التطبيق إطلاقًا.
 * المخرَج ملفّ وسائط يُشحن أصلًا ساكنًا: ميزانية الجافاسكربت شبه
 * ممتلئة (٩٫٦٨ من ١٠ ميغابايت) بينما ميزانية الوسائط فارغة تمامًا
 * (٠ من ١٤)، فالفيلم المُصيَّر يكلّف من الفارغة لا من الممتلئة —
 * وهذا وحده سبب أن يكون فيلمًا لا مكتبةَ رسومٍ في المتصفّح.
 *
 * التصيير (من داخل `remotion/`):
 *
 *   ./node_modules/.bin/remotion render twin-film.tsx TwinFilm \
 *     ../public/media/twin/twin-loop.webm \
 *     --public-dir=../public --codec=vp9 --crf=34 \
 *     --browser-executable=<مسار Chrome>
 *
 * `--public-dir=../public` شرطٌ لا خيار: الخطّ العربي يُقرأ من هناك.
 */
import React from "react";
import { Composition, registerRoot } from "remotion";
import { TwinFilm } from "./twin/film";

const FPS = 30;
/** عشر ثوانٍ بالتمام — والحركة كلّها دوريّة بهذه الدورة، فالحلقة تصل. */
const DURATION = 300;

export const RemotionRoot: React.FC = () => (
  <Composition
    id="TwinFilm"
    component={TwinFilm}
    durationInFrames={DURATION}
    fps={FPS}
    width={1920}
    height={1080}
  />
);

registerRoot(RemotionRoot);
