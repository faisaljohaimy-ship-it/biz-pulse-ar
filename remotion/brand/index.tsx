/**
 * Remotion entry — حلقات «الماء السينمائي» للوحة هوية سَدِيد على الرئيسية
 * (أمر المالك ٢٠٢٦/١٠/١٧: «اجعلها تتحرك بحركة مائية سينمائية عصرية»).
 *
 * أداةُ بناءٍ عابرة، لا كودَ تطبيق: تُصيَّر الحلقات مرّةً إلى `public/media/brand/`
 * ويعرضها المتصفّح فيلمًا صامتًا فوق الصورة الساكنة نفسها (`HomeBrandRow`).
 * فلا مظلِّل ولا WebGL في حزمة التطبيق، والحركة بكلفة فكّ ترميزٍ لا حساب.
 *
 * المصادر الأصلية بدقّتها الكاملة في `brand/assets/` (WebP بجودة 92 من ملفّي
 * المالك PNG 2172×724)، وتُقرأ عبر `--public-dir=brand/assets`.
 *
 * التصيير: المسار العامل فعلًا وأوامره في `RENDER.md` — تسلسل PNG بلا ضياع من
 * `chrome-headless-shell` بـ`--gl=swangle`، ثم ترميزٌ بجودةٍ ثابتة عبر الحلقة
 * (Chromium 141 الكامل لا يصيّر: أسقط الوضع المقطوع الرأس القديم). والتثبيت في
 * مجلّدٍ عابر من registry.npmjs.org — لا يُنشأ قفلٌ ثانٍ في المستودع.
 *
 * ثلاث تراكيب للبانر وحده — كلّها 3:1 كالأصل، بأبعادٍ زوجية لـH.264، 30 إطارًا/ث،
 * ودورة 6 ثوانٍ مغلقة في المحتوى (انظر `BrandWater.tsx` وقياس الوصلة في RENDER.md):
 *   • `BrandBanner2172` (2172×724) — دقّة اللوحة الأصلية نفسها. أُضيفت ٢٠٢٦/١٠/١٨ حين
 *     صار البانر بعرض العمود كاملًا (أمر المالك R3 «على امتداد الصفحة»): على حاسوبٍ
 *     بكثافة 2× يُرسم 1170–1394px نقطيًّا، أي 2340–2788 بكسلًا فعليًّا، فكانت حلقة
 *     1608 تُكبَّر 1.5–1.7× فوق صورةٍ أحدّ منها (2172) ويلين نصّ اللوحة لحظة يظهر الفيلم؛
 *   • `BrandBanner1600` (1608×536) — المكتب بكثافة 1× وما يقاربها؛
 *   • `BrandBanner800` (804×268) — الجوال واللوح الصغير.
 * والاختيار بينها بالحاجة المقيسة لا باستعلام عرض (`pickFilm` في `HomeBrandRow`).
 * **وتركيب لوحة الشعار (`BrandMark640`) حُذف** مع خروج اللوحة من صفّ الهوية (R4 نقلها
 * إلى رأس الشريط الجانبي بلا فيلم)؛ وأصلها `assets/sadeed-mark.webp` باقٍ مصدرًا للوحة
 * R4 المشتقّة منه.
 */
import React from "react";
import { Composition, registerRoot } from "remotion";
import { BrandWater } from "./BrandWater";

const FPS = 30;
const LOOP_SECONDS = 6;

const Root: React.FC = () => (
  <>
    <Composition
      id="BrandBanner2172"
      component={BrandWater}
      width={2172}
      height={724}
      fps={FPS}
      durationInFrames={FPS * LOOP_SECONDS}
      defaultProps={{ src: "sadeed-banner.webp", strength: 1.4 }}
    />
    <Composition
      id="BrandBanner1600"
      component={BrandWater}
      width={1608}
      height={536}
      fps={FPS}
      durationInFrames={FPS * LOOP_SECONDS}
      defaultProps={{ src: "sadeed-banner.webp", strength: 1.4 }}
    />
    <Composition
      id="BrandBanner800"
      component={BrandWater}
      width={804}
      height={268}
      fps={FPS}
      durationInFrames={FPS * LOOP_SECONDS}
      defaultProps={{ src: "sadeed-banner.webp", strength: 1.4 }}
    />
  </>
);

registerRoot(Root);
