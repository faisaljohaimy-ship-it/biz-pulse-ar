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
import { DEFAULT_REGION_ID } from "@/lib/regions";
import { TwinLoadState } from "@/components/twin/executive/TwinLoadState";
import { TWIN_FILM_CATALOG, type TwinFilmId } from "@/components/twin/twin-film-catalog";
import type { TwinFilmPlayerProps } from "@/components/twin/TwinFilmPlayer";
import "@/styles/twin-film.css";

/** حزمة المشغّل تعذّرت: البديل بلغة الواجهة مكانه — لا حدّ خطأ يهدم الصفحة. */
function FilmUnavailable({ film = "twin" }: TwinFilmPlayerProps) {
  const { locale } = useI18n();
  return <FilmPlaceholder lang={locale === "ar" ? "ar" : "en"} film={film} state="unavailable" />;
}

const TwinFilmPlayer = lazy<ComponentType<TwinFilmPlayerProps>>(() =>
  import("@/components/twin/TwinFilmPlayer")
    .then((m) => ({ default: m.TwinFilmPlayer }))
    .catch(() => ({ default: FilmUnavailable })),
);

const TwinReferencePanel = lazy(() =>
  import("@/components/twin/executive/TwinReferencePanel")
    .then((m) => ({ default: m.TwinReferencePanel }))
    .catch(() => ({ default: ReferenceUnavailable })),
);

function ReferenceUnavailable() {
  return <TwinLoadState failed />;
}

/** مسافة الاقتراب (حول الإطار) التي يُطلب عندها المشغّل قبل أن يبلغ القسم الإطار. */
export const APPROACH_MARGIN = "600px";

/**
 * صندوق المشغّل بلا مشغّل: الإطار والملصق والشريط والتعليق — الارتفاع نفسه. `state` يسمّي سببه
 * على الوسم (ينتظر الحزمة، أو تعذّرت) فيُقرأ في الفحص ولا يُخمَّن.
 */
function FilmPlaceholder({
  lang,
  film = "twin",
  state,
}: {
  readonly lang: "ar" | "en";
  readonly film?: TwinFilmId;
  readonly state: "pending" | "unavailable";
}) {
  const media = TWIN_FILM_CATALOG[film];
  const text = media.text[lang];
  return (
    <div className="twin-film" data-placeholder={state}>
      <div className="twin-film-frame" style={{ aspectRatio: media.aspectRatio }}>
        <img
          className="twin-film-poster"
          src={media.poster.src}
          width={media.poster.width}
          height={media.poster.height}
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
  const [showReference, setShowReference] = useState(false);

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

  const films: readonly TwinFilmId[] = ["twin", "opening"];

  return (
    <section aria-labelledby="nx-home-twin-title" dir={ar ? "rtl" : "ltr"} className="nx-home-twin">
      <div className="nx-home-twin-head">
        <div className="min-w-0">
          <h2 id="nx-home-twin-title" className="nx-home-twin-title">
            {ar ? "التوأم الرقمي السينمائي" : "The cinematic digital twin"}
          </h2>
          <p className="nx-home-twin-text">
            {ar
              ? "فيلمان أصليان. شغّل أحدهما بالصوت الأصلي."
              : "Two original films. Play one at a time with original audio."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="twin-film-btn nx-focus-ring"
            aria-expanded={showReference}
            aria-controls="nx-twin-reference"
            onClick={() => setShowReference((value) => !value)}
          >
            {ar ? "التوأم التفاعلي" : "Interactive twin"}
          </button>
          <Link to="/sec/twin" className="twin-film-btn nx-focus-ring">
            {ar ? "شجرة الأصول" : "Asset tree"}
          </Link>
          <Link to="/cinematic" className="twin-film-btn nx-focus-ring">
            {ar ? "فتح التجربة السينمائية" : "Open the cinematic experience"}
          </Link>
        </div>
      </div>
      {showReference && (
        <div id="nx-twin-reference" className="mb-5">
          <Suspense fallback={<TwinLoadState />}>
            <TwinReferencePanel initialRegionId={DEFAULT_REGION_ID} />
          </Suspense>
        </div>
      )}
      <div ref={stageRef} className="nx-home-twin-stage nx-home-twin-gallery">
        {films.map((film) => {
          const placeholder = <FilmPlaceholder lang={lang} film={film} state="pending" />;
          return (
            <div key={film} className="min-w-0" data-gallery-film={film}>
              <h3 className="mb-3 font-semibold">{TWIN_FILM_CATALOG[film].text[lang].title}</h3>
              {near ? (
                <Suspense fallback={placeholder}>
                  <TwinFilmPlayer film={film} manual />
                </Suspense>
              ) : (
                placeholder
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
