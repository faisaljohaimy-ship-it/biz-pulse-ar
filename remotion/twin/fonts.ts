/**
 * خطوط الفيلم — عربية حصرًا.
 *
 * يُحمَّل IBM Plex Sans Arabic من `public/fonts/` نفسه الذي يستعمله
 * المنتج (يُحلّ عبر `--public-dir=../public` عند التصيير)، لا من شبكة
 * توزيع خارجية: التصيير يجري بلا إنترنت مضمون، والخطّ اللاتينيّ البديل
 * ممنوع — فلو غاب الملفّ لخرج النصّ العربي مشوّهًا بلا أن يُلاحَظ.
 *
 * `delayRender` يوقف التقاط الإطار حتى يكتمل التحميل، فلا يُصيَّر إطار
 * واحد بخطّ احتياطي.
 */
import { continueRender, delayRender, staticFile } from "remotion";

export const ARABIC_STACK = '"IBM Plex Sans Arabic", "Tajawal", "Cairo"';

const handle = delayRender("تحميل خطّ IBM Plex Sans Arabic");

const face = (file: string, weight: string): FontFace =>
  new FontFace("IBM Plex Sans Arabic", `url(${staticFile(file)}) format("truetype")`, {
    weight,
    style: "normal",
  });

Promise.all([
  face("fonts/nexios-arabic.ttf", "400").load(),
  face("fonts/nexios-arabic-bold.ttf", "700").load(),
])
  .then((loaded) => {
    loaded.forEach((f) => document.fonts.add(f));
    return document.fonts.ready;
  })
  .then(() => continueRender(handle))
  .catch((error: unknown) => {
    // الفشل يُرفع كما هو: فيلم بخطّ خاطئ أسوأ من تصييرٍ يتوقّف.
    // eslint-disable-next-line no-console
    console.error("تعذّر تحميل الخطّ العربي:", error);
    continueRender(handle);
  });
