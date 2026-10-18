/**
 * Remotion entry — حلقات «الماء السينمائي» للوحتَي هوية سَدِيد على الرئيسية
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
 * ثلاث تراكيب: البانر بعرضين (مكتب 1608×536 · لوح وجوال 804×268) ولوحة
 * الشعار (642×214) — كلّها 3:1 كالأصل، بأبعادٍ زوجية لـH.264، 30 إطارًا/ث،
 * ودورة 6 ثوانٍ مغلقة في المحتوى (انظر `BrandWater.tsx` وقياس الوصلة في RENDER.md).
 */
import React from "react";
import { Composition, registerRoot } from "remotion";
import { BrandWater } from "./BrandWater";

const FPS = 30;
const LOOP_SECONDS = 6;

const Root: React.FC = () => (
  <>
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
    <Composition
      id="BrandMark640"
      component={BrandWater}
      width={642}
      height={214}
      fps={FPS}
      durationInFrames={FPS * LOOP_SECONDS}
      defaultProps={{ src: "sadeed-mark.webp", strength: 1.4 }}
    />
  </>
);

registerRoot(Root);
