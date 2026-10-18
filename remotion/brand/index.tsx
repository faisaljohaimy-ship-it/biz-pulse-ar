/**
 * Remotion entry — فيلم بانر سَدِيد السينمائي على الرئيسية.
 *
 * أمر المالك ٢٠٢٦/١٠/١٨ بنصّه («SADEED AI OS — CINEMATIC MOTION GRAPHICS VIDEO ENGINE»): «Replace
 * the static banner artwork in that exact location with the new cinematic experience». فحلّ هذا
 * الفيلم محلّ حلقات «الماء السينمائي» الثلاث (أمر ٢٠٢٦/١٠/١٧) وتركيبها `BrandWater` — حُذفت
 * مخرجاتها من `public/` ومصدرها معها، وتاريخها في RENDER.md.
 *
 * أداةُ بناءٍ عابرة، لا كودَ تطبيق: يُصيَّر الفيلم مرّةً إلى `public/media/brand/` ويعرضه المتصفّح
 * صامتًا فوق اللوحة الساكنة نفسها (`HomeBrandRow`)، والاسم والسطر HTML فوقهما. فلا مظلِّل ولا
 * WebGL في حزمة التطبيق، والحركة بكلفة فكّ ترميزٍ لا حساب.
 *
 * المصادر في `brand/assets/` وتُقرأ عبر `--public-dir=brand/assets`: لوحة المالك بلا نصّها
 * (`sadeed-banner-clean.webp`) والرمز مقطوعًا منها (`sadeed-emblem.webp`)، ولقطات القصّة الواقعية
 * (`industrial/*.jpg` — معايناتٌ مولَّدة لمنشآتٍ متخيَّلة عامّة، بأمر المالك الثاني ٢٠٢٦/١٠/١٨؛
 * ومعرّفات توليدها وخطوة استبدالها بالدقّة الكاملة في `RENDER.md`).
 *
 * تركيبٌ واحد 1608×536 (3:1 كاللوحة، أبعادٌ زوجية لـH.264)، 30 إطارًا/ث، 24 ث؛ ودرجة الجوال 804
 * تُصغَّر من التسلسل نفسه. المسار العامل وأوامره وقياس الوصلة في `RENDER.md`.
 */
import React from "react";
import { Composition, registerRoot } from "remotion";
import { FILM_FPS, FILM_FRAMES, SadeedFilm } from "./SadeedFilm";

const Root: React.FC = () => (
  <Composition
    id="SadeedFilm"
    component={SadeedFilm}
    width={1608}
    height={536}
    fps={FILM_FPS}
    durationInFrames={FILM_FRAMES}
  />
);

registerRoot(Root);
