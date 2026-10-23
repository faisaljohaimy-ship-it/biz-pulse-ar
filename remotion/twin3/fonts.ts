/**
 * الخطّ العربي: IBM Plex Sans Arabic من `fonts/` في مجلّد public المُمرَّر عند التصيير
 * (نسختان: عاديّ وعريض — انظر RENDER.md). لا شبكة. `delayRender` يمنع التقاط
 * أي إطار قبل اكتمال التحميل، فلا يخرج نصٌّ بخطّ احتياطي.
 */
import { continueRender, delayRender, staticFile } from "remotion";

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
    loaded.forEach((f) => (document.fonts as unknown as { add(face: FontFace): void }).add(f));
    return document.fonts.ready;
  })
  .then(() => continueRender(handle))
  .catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error("تعذّر تحميل الخطّ العربي:", error);
    continueRender(handle);
  });
