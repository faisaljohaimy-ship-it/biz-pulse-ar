/**
 * فيلم بانر سَدِيد — 24 ث تُعرض مرّةً بلا نصّ (الاسم والسطر HTML فوقها في الصفحة).
 *
 * أمر المالك ٢٠٢٦/١٠/١٨ (R4) بنصّه: «اجعل فديو الموشن جرافتي يبدأ اولاً بصور وذكاء مبهر لمدة ٢٤
 * ثانيه بسرعة في اجزاء من الثانية وبمجرد فتح الموقع والدخول عليه وفي اخر الفديو تبنى وتتكون علامة
 * سديد بلمعان وليزر مذهل واشعاع ثم تثبت اللوحة الاخيرة تدريجياً حتى تتكون وحين اكتمال اللوحة يكون
 * لها بريق ولمعان». فالفيلم قسمان على زمنٍ واحد (`film/timeline.ts`، وعليه تُبنى الموسيقى):
 *
 *   • `film/Montage.tsx` — اشتعالٌ من اللوحة نفسها (الإطار 0 هو الملصق) ثم مونتاجٌ سريع لقطعاتٍ على
 *     شبكة الموسيقى: لقطاتٌ واقعية لمنشآتٍ متخيَّلة عامّة وطبقاتُ «ذكاء» رقيقة — لا نصّ ولا رقم ولا
 *     شعار ولا أشخاص (المادة ٢٧).
 *   • `film/Forge.tsx` — يُصاغ الرمز بالليزر ويكتمل بإشعاع، ثم تتكوّن اللوحة حوله تدريجيًّا ويهبط في
 *     موضعه منها، ثم بريقٌ ختاميّ ينتهي على اللوحة نفسها مكتملةً (الإطار الأخير).
 *
 * وبعد الفيلم «الجوهرة» الدائمة (توهّجٌ لولبيّ ولمعانٌ صاعد) في CSS الصفحة لا في الإطارات — حلقةٌ بلا
 * ملفّ ولا فكّ ترميز، وخلف بوابات الحركة نفسها.
 */
import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Forge } from "./film/Forge";
import { box, H, W } from "./film/kit";
import { Montage } from "./film/Montage";
import { FILM_FPS } from "./film/timeline";

export { ACT, FILM_FPS, FILM_FRAMES, FILM_SECONDS } from "./film/timeline";

export const SadeedFilm: FC = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const t = frame / FILM_FPS;
  return (
    <AbsoluteFill style={{ background: "#030d27", overflow: "hidden" }}>
      <div style={{ ...box(0, 0, W, H), transform: `scale(${width / W})`, transformOrigin: "0 0" }}>
        <Montage t={t} />
        <Forge t={t} />
      </div>
    </AbsoluteFill>
  );
};
