/**
 * فيلم التوأم الرقمي في أسفل الرئيسية — أمر المالك ٢٠٢٦/١٠/٢٩ بنصّه: «قم بنقل التوأم الرقمي
 * والفديو للتوأم الرقمي في اسفل الصفحة الرئيسية للنظام (فالمكان المشار له باللون الاحمر
 * فالمرفق)». المرفق لقطةٌ لأسفل `/` بدائرةٍ حمراء حول سطر الإفصاح وسهمٍ إلى أسفل.
 *
 * **نقلٌ لا نسخ:** القسم الذي كان في `/sec/twin` (العنوان والسطر ورابط `/cinematic` والمشغّل
 * المضمَّن) صار هنا، بين الخاتمة وسطر الإفصاح — فيبقى الإفصاح آخر سطرٍ في الصفحة. و`/sec/twin`
 * تحتفظ بشجرتها ولوحة تفاصيلها بلا فيلم، و`/cinematic` كما هي.
 *
 * ## لماذا لا يُحمَّل المشغّل مع الصفحة
 *
 * حزمة الرئيسية تحت سقف الميزانية بهامشٍ ضيّق، والمشغّل حزمةٌ مستقلّة أصلًا (يشترك فيها
 * `/cinematic`). فيُستورد **كسولًا** ولا يُركَّب إلا حين يقترب القسم من الإطار
 * (`IntersectionObserver` بهامش `APPROACH_MARGIN`): على الخادم وفي أوّل رسمٍ في العميل
 * يُرسم **البديل** وحده — لا نافذة ولا مستند أثناء الرسم، فلا يختلف HTML الخادم عن العميل.
 *
 * ## البديل يحجز ارتفاع المشغّل
 *
 * يرسم الصندوق نفسه الذي يرسمه المشغّل بأصناف `twin-film.css` ذاتها: الملصق في إطار 16:9
 * (`TWIN_FILM_POSTER` بأبعاده على الوسم)، وشريطٌ بارتفاع زرّ المشغّل، والتعليق النصّي نفسه
 * (`TWIN_FILM_TEXT`) — فلا يقفز شيءٌ حين يحلّ المشغّل محلّه. ولهذا تُستورد ورقة المشغّل هنا
 * ساكنةً: الرابط والبديل على الصفحة قبل أن تصل حزمته، وورقةٌ واحدة لا تُكرَّر.
 *
 * ## وتعذّر حزمة المشغّل لا يُسقط الصفحة
 *
 * الاستيراد الكسول يرفض حين تنقطع الشبكة أو تردّ الحزمة 404 (تبويبٌ قديم بعد نشرٍ بأسماء
 * مجزّأة جديدة). بلا التقاطٍ يصعد الرفض إلى أقرب حدّ خطأ — وهو حدّ الجذر — فتُهدم الرئيسية كلّها
 * إلى شاشة «حدث خطأ» برسالةٍ إنجليزية خام (قِيس ٢٠٢٦/١٠/٢٩ بقطع الطلب وبردّ 404). لذلك يُلتقط
 * الرفض في الاستيراد نفسه ويحلّ **البديل** محلّ المشغّل: العنوان ورابط `/cinematic` والملصق
 * باقيةٌ، وسطر الإفصاح آخر الصفحة كما أمر المالك. (في `/sec/twin` كان المشغّل ساكنًا فلم يكن
 * لهذا العطل وجود — النقل أحدثه، والنقل يسدّه.)
 *
 * ## ما لا يفعله
 *
 * لا رقم في نصّه المكتوب (المادة ٢٧؛ ومدّة الفيلم في التعليق من ثابتها لا رقمٌ يُكتب ثانيةً)،
 * ولا لون نهائي، ولا `speechSynthesis`. والرابط يسمّي ما يفعله — ينتقل إلى صفحة التجربة —
 * لا «ملء الشاشة» (ذاك زرّ `/cinematic` وحده).
 */
import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from "react";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { TWIN_FILM_POSTER, TWIN_FILM_TEXT } from "@/components/twin/twin-film-model";
import "@/styles/twin-film.css";

/** حزمة المشغّل تعذّرت: البديل بلغة الواجهة مكانه — لا حدّ خطأ يهدم الصفحة. */
function FilmUnavailable() {
  const { locale } = useI18n();
  return <FilmPlaceholder lang={locale === "ar" ? "ar" : "en"} state="unavailable" />;
}

const TwinFilmPlayer = lazy<ComponentType>(() =>
  import("@/components/twin/TwinFilmPlayer")
    .then((m) => ({ default: m.TwinFilmPlayer }))
    .catch(() => ({ default: FilmUnavailable })),
);

/** مسافة الاقتراب (حول الإطار) التي يُطلب عندها المشغّل قبل أن يبلغ القسم الإطار. */
export const APPROACH_MARGIN = "600px";

/**
 * صندوق المشغّل بلا مشغّل: الإطار والملصق والشريط والتعليق — الارتفاع نفسه. `state` يسمّي سببه
 * على الوسم (ينتظر الحزمة، أو تعذّرت) فيُقرأ في الفحص ولا يُخمَّن.
 */
function FilmPlaceholder({
  lang,
  state,
}: {
  readonly lang: "ar" | "en";
  readonly state: "pending" | "unavailable";
}) {
  const text = TWIN_FILM_TEXT[lang];
  return (
    <div className="twin-film" data-placeholder={state}>
      <div className="twin-film-frame">
        <img
          className="twin-film-poster"
          src={TWIN_FILM_POSTER.src}
          width={TWIN_FILM_POSTER.width}
          height={TWIN_FILM_POSTER.height}
          alt=""
          decoding="async"
          loading="lazy"
        />
      </div>
      <div className="twin-film-bar nx-home-twin-bar" aria-hidden />
      <p className="twin-film-caption">
        <strong>{text.kind}</strong>
        <span aria-hidden> · </span>
        <span>{text.meta}</span>
        <br />
        {text.disclosure}
      </p>
    </div>
  );
}

export function HomeTwinSection() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const lang = ar ? "ar" : "en";
  const stageRef = useRef<HTMLDivElement>(null);
  /** اقترب القسم من الإطار مرّةً — بعدها يُطلب المشغّل ولا يعود البديل. */
  const [near, setNear] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (near || !stage) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const watcher = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setNear(true);
        watcher.disconnect();
      },
      { rootMargin: APPROACH_MARGIN },
    );
    watcher.observe(stage);
    return () => watcher.disconnect();
  }, [near]);

  const placeholder = <FilmPlaceholder lang={lang} state="pending" />;

  return (
    <section aria-labelledby="nx-home-twin-title" dir={ar ? "rtl" : "ltr"} className="nx-home-twin">
      <div className="nx-home-twin-head">
        <div className="min-w-0">
          <h2 id="nx-home-twin-title" className="nx-home-twin-title">
            {ar ? "التوأم الرقمي السينمائي" : "The cinematic digital twin"}
          </h2>
          <p className="nx-home-twin-text">
            {ar
              ? "فيلم موشن جرافيك توضيحي يشرح فكرة التوأم الرقمي للأمن الصناعي، مستقلّ عن بيانات المراقبة الحقيقية."
              : "An illustrative motion-graphics film that explains the digital-twin idea for industrial security, independent of real monitoring data."}
          </p>
        </div>
        <Link to="/cinematic" className="twin-film-btn nx-focus-ring">
          {ar ? "فتح التجربة السينمائية" : "Open the cinematic experience"}
        </Link>
      </div>
      <div ref={stageRef} className="nx-home-twin-stage">
        {near ? (
          <Suspense fallback={placeholder}>
            <TwinFilmPlayer />
          </Suspense>
        ) : (
          placeholder
        )}
      </div>
    </section>
  );
}
