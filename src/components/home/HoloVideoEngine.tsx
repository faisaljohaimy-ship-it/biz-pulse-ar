/**
 * HoloVideoEngine — خلفية النظام: **فيلمٌ صامتٌ بطيء** فوق سطحٍ داكن ثابت.
 *
 * ## تاريخُ القرار — ولماذا عاد الفيلم
 *
 * كانت هذه الطبقة فيلمًا، فأمر المالك ٢٠٢٦/٠٨/٠٩: «الخلفية تكون ثابتة
 * وغامقة فقط، وشيل زر إيقاف الخلفية» — فسقط الفيلم وسقط الزرّ معه.
 * وأمرَ المالكُ ٢٠٢٦/٠٩/٢٨ بإعادته: «ضع هذا الفيديو كخلفية لصفحة النظام
 * مع مراعاة تخفيض سرعة الفيديو وحذف الصوت». فالقرار ناسخٌ لسابقه،
 * والتوثيق يبقى ليُعرف **لِمَ** كان الحال على ما كان.
 *
 * ## والمخرَج الوصوليّ عاد مع الحركة — بلا زرّ
 *
 * WCAG 2.2.2 توجب مخرجًا للحركة الدائمة (ما تجاوز خمس ثوانٍ وبدأ
 * تلقائيًّا). وكان الزرُّ مخرجَ الفيلم القديم **لأنه كان يتجاهل
 * `prefers-reduced-motion` بقرارٍ سابق**، فلم يبق له مخرجٌ سواه.
 *
 * فالمخرَج هنا هو التفضيل نفسه: من طلب تقليل الحركة **لا يُركَّب له
 * الفيلم أصلًا** — لا يُحمَّل ولا يُفكّ ترميزه ولا يعمل. فيُستوفى البند
 * ويبقى أمرُ المالك «لا زرّ» قائمًا: لا زرَّ لأن لا حاجةَ إليه، لا لأن
 * الموجِب أُهمل.
 *
 * ## والصوت — **محذوفٌ من الملفّ، لا مكتومًا فيه**
 *
 * أمرُ المالك «حذف الصوت»، والحذفُ وقع في الحاوية نفسها: كان فيها مسار
 * `aac` (‏`mp4a`+`esds`) فنُزع بـremux بلا إعادة ترميز — الفيديو منسوخٌ
 * بتًّا بتًّا، والملفّ اليوم **بلا صندوق `mp4a` ولا `esds` ولا `soun`
 * ولا `smhd`**، ويحرسه بندٌ يقرأ بايتات الملفّ لا سمةَ العنصر.
 *
 * و`muted` باقٍ حزامًا ثانيًا لا مُسكِتَ مسارٍ قائم: هو شرطُ المتصفّحات
 * لقبول التشغيل التلقائيّ أصلًا، ويقطع الطريق لو عاد مسارٌ يومًا.
 * **فلا يُقرأ أحدُهما مُغنيًا عن الآخر.**
 *
 * ## والسرعة
 *
 * `PLAYBACK_RATE` = 1 (الطبيعية) بأمر المالك ٢٠٢٦/١٠/٢٣، ناسخًا تخفيضها إلى 0.5 (٢٠٢٦/٠٩/٢٨).
 *
 * ## وأوّلُ رسمةٍ محميّة
 *
 * `<video>` يبدأ التحميل وفكّ الترميز من مُحلِّل HTML **قبل أيّ JS**،
 * وذلك ما كان يُثقل أوّل رسمة. فلا يُركَّب إلا **بعد** أوّل رسمة عبر
 * `useEffect`، والسطحُ الساكن (الشفق والشبكة والأفق والنسيج) يرسم
 * الصفحة فورًا ويبقى تحته — فإن تعذّر الفيلم بقيت الخلفية كاملة.
 *
 * ## والفيلم يقف تحت لوحة سَدِيد على اللمس (P0 ٢٠٢٦/١٠/١٤)
 *
 * قِيس على محاكاة iPhone 14 Pro: الفيلم يبقى يفكّ ترميزه تحت غطاء اللوحة،
 * فكلّ إطار فيديو يعيد تركيب ما فوقه. فتحت `(pointer: coarse)` أو
 * `html.safe-mode`، ما دامت اللوحة مفتوحة (`data-sadeed-panel="open"` على
 * `<html>`، يكتبه `SadeedCopilot`)، يُوقف الفيلم على إطاره، ويُستأنف عند
 * الإغلاق إن كان يعمل حين أُوقف (لا يُشغَّل فيلمٌ منعه الجهاز). وسطح المكتب
 * لا يمسّه شيء. وفي الوضع الآمن لا يُركَّب الفيلم أصلًا. الحارس:
 * `src/components/sadeed-core/sadeed-panel-touch.contract.test.tsx`.
 *
 * ## والفيلم للرئيسية وحدها، والسطح لكل صفحة (أمر المالك ٢٠٢٦/١٠/١٨)
 *
 * «اجعل جميع صفحات النظام بنفس تخطيط وهيئة الصفحة الرئيسية»: الطبقة تُركَّب
 * مرّةً واحدة في قشرة النظام (`SystemChrome`) خلف كل صفحة، فتصير الخلفية
 * خلفيةً واحدة لا خلفيات. و`film` يقرّر الفيلم وحده: على الرئيسية `true`،
 * وعلى الصفحات الداخلية `false` — السطح الساكن كاملًا (الغطاء والشفق والشبكة
 * والأفق والتعتيم والنسيج) بلا `<video>`. لِمَ لا فيلم تحت الجداول: فحص
 * التباين (`check-background-contrast.mjs`) يقيس أحبار الرئيسية وحدها فوقه،
 * وفكّ ترميز حلقةٍ تحت جداول البيانات يعيد تركيب كل إطار سكرول.
 * والافتراض `true` فالصفحتان العامّتان (`/nx-agents` · `/rag-search`) كما هما.
 *
 * **الاسم يبقى `HoloVideoEngine` عقدًا حيًّا:** القشرة وصفحتان تستورده.
 */
import { memo, useEffect, useRef, useState } from "react";
import { isSafeMode } from "@/lib/sadeed/self-healing/crash-loop";

/** نسيج حبيبي دقيق — SVG turbulence مضمّن، لا أصل شبكي (CSP آمن). */
const NOISE_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E";

/**
 * سرعةُ العرض — **الطبيعية (1)** بأمر المالك ٢٠٢٦/١٠/٢٣: «اضبط سرعة الفيديو بأن تكون السرعة
 * طبيعية». نسخ قرارَ ٢٠٢٦/٠٩/٢٨ («تخفيض سرعة الفيديو») الذي جعلها 0.5. والثابت باقٍ مضبوطًا على
 * العنصر صراحةً لا محذوفًا: `defaultPlaybackRate` يحمي من تعطيل مستعرضٍ أو إضافةٍ للسرعة بين تحميلين.
 */
const PLAYBACK_RATE = 1;

/** مصدرُ الفيلم — أصلٌ ساكن في `public/`، لا واصفَ شبكةٍ بعيدًا. */
const FILM_SRC = "/sadeed-home-bg.mp4";

/**
 * إشارة «لوحة سَدِيد مفتوحة» على `<html>` — يكتبها `SadeedCopilot` بالنصّ
 * نفسه، ويربط الحارسُ الطرفين.
 */
export const SADEED_PANEL_ATTR = "data-sadeed-panel";

/** الجهاز الذي يُوقف عليه الفيلم تحت اللوحة — نصّ كتل اللمس في `styles.css`. */
export const FILM_HOLD_QUERY = "(pointer: coarse)";

/**
 * «إيقاف الحركة» الواحد على الرئيسية — **واجهةٌ مجمَّدة بين المسارات**: زرّ الحركة
 * (مسار البانر) يكتب `data-nx-motion-paused="1"` على `<html>` حين يوقف، ويرفعها
 * حين يستأنف، ويطلق على `window` الحدث `nx:motion-pause` (`detail.paused`).
 * فيقف فيلم الخلفية معه (WCAG 2.2.2: مخرجٌ واحد لكل حركةٍ دائمة على الصفحة).
 * **ولا زرّ هنا ولا حالة محفوظة** — قرار المالك ٢٠٢٦/٠٨/٠٩ باقٍ: المكوّن يقرأ
 * السمة كما يقرأ إشارة اللوحة، لا يملك مفتاحًا.
 */
export const MOTION_PAUSED_ATTR = "data-nx-motion-paused";
export const MOTION_PAUSE_EVENT = "nx:motion-pause";

// **هل الإيقاف مشروعٌ الآن؟** القاعدة الواحدة التي تقرّر الإيقاف، يقرؤها `holdFilmUnderPanel`
// وحارسُ استئناف فيلم الهوية (`HomeBrandRow`): فيلمٌ ساكن **بلا** سببٍ من هذه الأسباب توقّف
// بغير حقّ ويُستأنف.
export function filmHoldActive(): boolean {
  const root = document.documentElement;
  const touch = typeof window.matchMedia === "function" ? window.matchMedia(FILM_HOLD_QUERY) : null;
  return (
    root.getAttribute(MOTION_PAUSED_ATTR) === "1" ||
    (root.getAttribute(SADEED_PANEL_ATTR) === "open" && (touch?.matches === true || isSafeMode()))
  );
}

/**
 * يُوقف الفيلم ما دامت اللوحة مفتوحة على اللمس أو في الوضع الآمن، **أو ما دامت
 * الحركة موقوفةً بزرّها** (`MOTION_PAUSED_ATTR`)، ويستأنفه حين تزول الأسباب كلّها
 * — **إن كان يعمل حين أُوقف**. فيلمٌ ساكن قبل الإيقاف (وضع توفير الطاقة على iOS
 * يمنع التشغيل التلقائيّ فيقف على إطاره) لا يُشغَّل عند الإغلاق: لمسة الإغلاق قد
 * تحمل تفعيل المستخدم بعدُ، فيبدأ الفيلم رغم سياسة الجهاز. والتشغيل التلقائيّ
 * الذي يصل والإيقاف قائم (اللوحة مفتوحة أو الحركة موقوفة عند التركيب) يُوقف حين
 * يبدأ ويُستأنف عند الزوال: كان سيعمل لولا السبب.
 *
 * والأسباب **سببٌ واحد مجمَّع لا متحكّمان**: لو أوقف كلٌّ منها الفيلم بمعزل لاستأنفه
 * إغلاقُ اللوحة والحركة ما زالت موقوفة.
 */
// مُصدَّرة لأن فيلم الهوية على الرئيسية (`HomeBrandRow`) يقف بالقاعدة نفسها خارج الإطار
// وتحت لوحة سَدِيد — طبقةٌ واحدة لا نسخةٌ ثانية (المادة ٣١).
export function holdFilmUnderPanel(video: HTMLVideoElement): () => void {
  const root = document.documentElement;
  const touch = typeof window.matchMedia === "function" ? window.matchMedia(FILM_HOLD_QUERY) : null;
  let held = false;
  /** هل يُستأنف عند زوال الإيقاف؟ — كان يعمل حين أُوقف، أو بدأ في أثنائه. */
  let resumeOnRelease = false;
  const sync = () => {
    const hold = filmHoldActive();
    if (hold === held) return;
    held = hold;
    if (hold) {
      resumeOnRelease = !video.paused;
      if (resumeOnRelease) video.pause();
      return;
    }
    if (!resumeOnRelease) return;
    resumeOnRelease = false;
    // `play()` قد يُرفض (وضع توفير الطاقة يمنع التشغيل التلقائيّ): يبقى الإطار.
    const resumed = video.play() as Promise<void> | undefined;
    resumed?.catch(() => {});
  };
  // التشغيل التلقائيّ يصل بعد التركيب: إن بدأ والإيقاف قائم أُوقف، وصار له استئناف.
  const onPlay = () => {
    if (!held) return;
    resumeOnRelease = true;
    video.pause();
  };
  // `class` لأن الوضع الآمن قد يُدخل في أثناء الجلسة (المعالج الدائم). والحدث مع
  // السمة: المراقِب يصل في مهمّةٍ دقيقة لاحقة، والحدث متزامن — والمزامنة متساوية
  // القوى، فلا يضرّ وصولهما معًا.
  const observer = new MutationObserver(sync);
  observer.observe(root, {
    attributes: true,
    attributeFilter: [SADEED_PANEL_ATTR, MOTION_PAUSED_ATTR, "class"],
  });
  touch?.addEventListener?.("change", sync);
  window.addEventListener(MOTION_PAUSE_EVENT, sync);
  video.addEventListener("play", onPlay);
  sync();
  return () => {
    observer.disconnect();
    touch?.removeEventListener?.("change", sync);
    window.removeEventListener(MOTION_PAUSE_EVENT, sync);
    video.removeEventListener("play", onPlay);
  };
}

/**
 * يحرّر مفكّك الترميز فور فكّ الفيلم — لا عند جمع المهملات.
 *
 * الفيلم يُفكّ عند مغادرة الرئيسية إلى صفحةٍ داخلية (القشرة باقية، والفيلم
 * للرئيسية وحدها)، ثم يُركَّب من جديد عند العودة. وعنصر وسائط منزوعٌ من الشجرة
 * يحتفظ بمفكّكه ومخزنه المؤقّت حتى يُجمع — وعلى iOS ذاكرةٌ تُحتسب على الصفحة
 * (درس P0 ٢٠٢٦/١٠/١٤). فنزعُ المصدر ثم `load()` يفرغ الحِمل الآن. والفحص
 * بـ`canPlayType` قدرةٌ لا متصفّح بعينه: ما لا يشغّل MP4 لا مفكّك له.
 */
function releaseFilm(video: HTMLVideoElement): void {
  if (video.canPlayType("video/mp4") === "") return;
  video.removeAttribute("src");
  video.load();
}

/**
 * خلفية واحدة للنظام كلّه. `memo` لأن الناتج لا يتبدّل بإعادة رسم الصفحة
 * الحاضنة — والحالتان فيه تفضيلُ الحركة و`film` الممرَّرة، لا شيء غيرهما.
 *
 * `film` (الافتراض `true`): هل يُركَّب الفيلم أصلًا. `false` ⇐ السطح الساكن
 * وحده بطبقاته كلّها — لا عنصر وسائط ولا تحميل ولا فكّ ترميز.
 */
export const HoloVideoEngine = memo(function HoloVideoEngine({
  film: filmWanted = true,
}: {
  film?: boolean;
}) {
  // يُركَّب بعد أوّل رسمة فقط، ولمن لم يطلب تقليل الحركة. والاستماع
  // لـ`change` يعني أن تبديل التفضيل أثناء الجلسة يفكّ الفيلم فورًا.
  // ولا يُركَّب في الوضع الآمن: إقلاع التعافي قشرةٌ ساكنة، و`display: none`
  // في الأنماط يُخفي العنصر ولا يمنع `preload="auto"` من تنزيل الفيلم
  // (‎576×1024‎ H.264) وتخزينه — فلا يُنشأ عنصر الوسائط أصلًا.
  const [motionOk, setMotionOk] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setMotionOk(!q.matches && !isSafeMode());
    sync();
    q.addEventListener("change", sync);
    return () => q.removeEventListener("change", sync);
  }, []);
  const film = filmWanted && motionOk;

  // اللمس: لا فكّ ترميزٍ تحت لوحة سَدِيد (انظر رأس الملف)، ولا حركة حين يوقفها
  // زرّها الواحد. وعند الفكّ يُحرَّر المفكّك فورًا (`releaseFilm`).
  const filmRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = filmRef.current;
    if (!film || !video) return;
    const stopHold = holdFilmUnderPanel(video);
    return () => {
      stopHold();
      releaseFilm(video);
    };
  }, [film]);

  return (
    <div aria-hidden dir="ltr" className="nx-hv pointer-events-none fixed inset-0 z-0">
      {/*
       * الفيلم **قبل** الغطاء وطبقات العمق في ترتيب المصدر: فيقع تحتها
       * جميعًا. ولو كُتب بعدها لعلا الغطاءَ فصار بلا أثر — وانقلب المعنى
       * بلا أن يمسكه tsc ولا البناء.
       *
       * والملفّ **بلا مسار صوتٍ أصلًا** (نُزع من الحاوية). و`muted` هنا
       * شرطُ قبول التشغيل التلقائيّ وحزامٌ ثانٍ، لا مُسكِتُ مسارٍ قائم.
       * و`playsInline` يمنع ملء الشاشة على iOS.
       */}
      {film && (
        <video
          ref={filmRef}
          className="nx-hv-film"
          src={FILM_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
          tabIndex={-1}
          disablePictureInPicture
          onLoadedMetadata={(e) => {
            // السرعة تُضبط على العنصر: لا سمة HTML لها. و`defaultPlaybackRate`
            // معها تُغلق نافذة الإطار الواحد: `load()` يُعيد `playbackRate`
            // إلى الافتراضيّ، فلو أُعيد تحميل المورد عاد بغير السرعة المقرَّرة.
            e.currentTarget.defaultPlaybackRate = PLAYBACK_RATE;
            e.currentTarget.playbackRate = PLAYBACK_RATE;
          }}
        />
      )}
      {/*
       * الغطاء — **أرضيةُ تباينٍ مقيسة فوق الفيلم**، لا زخرفة.
       *
       * أسطعُ بكسلٍ في الملفّ ٢٥٥ (مقيسًا على ٤٦٥ إطارًا)، وعنده يهبط
       * `text-nx-pearl/64` على الخلفية العارية دون أرضية AA. وحارسُ العقد
       * يحسب التباين من نسبة هذا الغطاء ويسقط إن نزل عن ٤٫٥:١.
       *
       * وموضعُه هنا — بعد الفيلم — هو ما يجعله غطاءً: قبله لا يغطّي شيئًا.
       */}
      <span className="nx-hv-scrim" />
      {/*
       * طبقاتُ العمق — **ساكنةٌ كلُّها** وإن عاد الفيلم: الحركة في عنصر
       * `<video>` وحده، ومخرجُها أنه لا يُركَّب لمن طلب تقليلها. وتسميتُها
       * `.nx-hv-*` تُدخلها تحت حارس «بلا حركة» نفسه، فأيُّ `animation`
       * تتسلّل إليها تصير حركةً بلا مخرجٍ البتّة — وهناك يسقط الحارس.
       *
       * وهي ما يُلوّن الفيلم لا ما يحفظ قراءة الحبر فوقه (ذاك الغطاء
       * أعلاه): شفقٌ خافت من رموز النبرة، وشبكةُ مسحٍ تتلاشى نحو الأطراف
       * فلا تصير ورقًا مسطَّرًا خلف الحبر، وخطُّ أفقٍ واحد، وتعتيمُ أطرافٍ
       * **شفّافٌ في الوسط** فلا يُنسب إليه ما لا يفعله. وكلُّها من طبقة
       * الرموز فتنقلب مع الوضع — الفاتح لا يُطلى بلوحٍ أسود (٣٢–٣٤).
       */}
      <span className="nx-hv-aurora" />
      <span className="nx-hv-grid" />
      <span className="nx-hv-horizon" />
      <span className="nx-hv-vignette" />
      <span className="nx-hv-noise" style={{ backgroundImage: `url("${NOISE_URI}")` }} />
    </div>
  );
});

export default HoloVideoEngine;
