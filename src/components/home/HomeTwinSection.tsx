/**
 * Dedicated digital-twin film gallery — owner update 2026-11-24.
 * Hosted only by /sec/twin. The existing route owns its single interactive
 * reference panel and asset tree; this component owns the lazy video gallery.
 */
import { lazy, Suspense, useEffect, useRef, useState, type ComponentType } from "react";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { IdentityFilmHero } from "@/components/home/IdentityFilmHero";
import { IDENTITY_FILMS } from "@/components/home/identity-film-model";
import { TWIN_FILM_CATALOG, type TwinFilmId } from "@/components/twin/twin-film-catalog";
import { TWIN_NARRATION, TWIN_NARRATED_FILMS } from "@/components/twin/twin-narration";
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

  const candidate = TWIN_NARRATED_FILMS[lang];
  const narrated =
    TWIN_NARRATION.available && TWIN_FILM_CATALOG[candidate.film]?.films.length ? candidate : null;
  const films: readonly TwinFilmId[] = [
    ...new Set<TwinFilmId>([
      ...(narrated ? [narrated.film] : []),
      "twin",
      "opening",
      IDENTITY_FILMS[lang].film,
    ]),
  ];
  const introduction = narrated
    ? {
        ar: "فيلم التوأم بصوت سديد، والأفلام الأصلية، ثم لماذا سديد؟ باللغة المختارة. شغّل فيلمًا واحدًا في كل مرة.",
        en: "The twin film in Sadeed’s voice, the original films, then Why Sadeed? in your selected language. Play one film at a time.",
      }
    : {
        ar: "الأفلام الأصلية للتوأم وهوية سديد، ثم لماذا سديد؟ باللغة المختارة. شغّل فيلمًا واحدًا في كل مرة.",
        en: "The original twin and Sadeed identity films, then Why Sadeed? in your selected language. Play one film at a time.",
      };

  return (
    <section aria-labelledby="nx-home-twin-title" dir={ar ? "rtl" : "ltr"} className="nx-home-twin">
      <div className="nx-home-twin-head">
        <div className="min-w-0">
          <h2 id="nx-home-twin-title" className="nx-home-twin-title">
            {ar ? "التوأم الرقمي السينمائي" : "The cinematic digital twin"}
          </h2>
          <p className="nx-home-twin-text">{introduction[lang]}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/cinematic" className="twin-film-btn nx-focus-ring">
            {ar ? "فتح التجربة السينمائية" : "Open the cinematic experience"}
          </Link>
        </div>
      </div>
      <div className="mb-5 space-y-3">
        {!narrated && (
          <p className="text-sm text-muted-foreground" role="status">
            {ar
              ? "نص التعليق جاهز بالعربية والإنجليزية؛ لم يجهز التسجيل الصوتي بصوت سديد بعد. يبقى صوت الأفلام الأصلي كما هو. السرعة المطلوبة للتعليق: "
              : "The Arabic and English scripts are ready; the Sadeed voice recording is not ready yet. The films retain their original audio. Requested narration speed: "}
            <span dir="ltr">{TWIN_NARRATION.voiceRate}×</span>
          </p>
        )}
        <details className="rounded-xl border border-border p-4" lang={lang}>
          <summary className="nx-focus-ring min-h-11 cursor-pointer font-semibold">
            {ar ? "قراءة نص التعليق المقترح" : "Read the proposed narration"}
          </summary>
          <ol className="mt-3 space-y-3">
            {TWIN_NARRATION.scripts[lang].map((scene) => (
              <li key={scene.id}>{scene.text}</li>
            ))}
          </ol>
        </details>
      </div>
      <div ref={stageRef} className="nx-home-twin-stage nx-home-twin-gallery">
        {films.map((film) => {
          const placeholder = <FilmPlaceholder lang={lang} film={film} state="pending" />;
          return (
            <div
              key={film === IDENTITY_FILMS[lang].film ? "identity" : film}
              className="min-w-0"
              data-gallery-film={film}
            >
              {(!near || film !== IDENTITY_FILMS[lang].film) && (
                <h3 className="mb-3 font-semibold">{TWIN_FILM_CATALOG[film].text[lang].title}</h3>
              )}
              {near ? (
                <Suspense fallback={placeholder}>
                  {film === IDENTITY_FILMS[lang].film ? (
                    <IdentityFilmHero />
                  ) : (
                    <TwinFilmPlayer
                      film={film}
                      manual
                      controlsMode="native"
                      captions={narrated && film === narrated.film ? narrated.captions : undefined}
                      startWithAudio={Boolean(narrated && film === narrated.film)}
                    />
                  )}
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
