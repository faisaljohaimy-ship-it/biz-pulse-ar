import { lazy, Suspense, useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import { useI18n, type Locale } from "@/lib/i18n";
import type { TwinFilmHandle } from "@/components/twin/TwinFilmPlayer";
import { TwinLoadState } from "@/components/twin/TwinLoadState";
import {
  IDENTITY_FILMS,
  IDENTITY_FILM_POSTER,
  IDENTITY_SCENES,
  identitySceneAt,
  mapIdentityPosition,
} from "./identity-film-model";
import "@/styles/home/identity-film-hero.css";

function PlayerPlaceholder({ failed = false }: { readonly failed?: boolean }) {
  return (
    <div className="identity-film-placeholder" aria-busy={!failed}>
      <img
        src={IDENTITY_FILM_POSTER.src}
        width={IDENTITY_FILM_POSTER.width}
        height={IDENTITY_FILM_POSTER.height}
        alt=""
        fetchPriority="high"
        decoding="async"
      />
      <TwinLoadState failed={failed} />
    </div>
  );
}

function PlayerUnavailable() {
  return <PlayerPlaceholder failed />;
}

// A failed chunk stays local to the hero; the rest of the homepage remains usable.
const IdentityPlayer = lazy(() =>
  import("@/components/twin/TwinFilmPlayer")
    .then((module) => ({ default: module.TwinFilmPlayer }))
    .catch(() => ({ default: PlayerUnavailable })),
);

type Track = { locale: Locale; scene: number; initialTime: number; epoch: number };

export function IdentityFilmHero() {
  const { locale, setLocale } = useI18n();
  const titleId = useId();
  const [track, setTrack] = useState<Track>(() => ({ locale, scene: 0, initialTime: 0, epoch: 0 }));
  const trackRef = useRef(track);
  const position = useRef(0);
  const player = useRef<{ epoch: number; handle: TwinFilmHandle } | null>(null);

  const selectTrack = useCallback((nextLocale: Locale) => {
    const previous = trackRef.current;
    if (nextLocale === previous.locale) return;
    const slot = player.current;
    const previousPlayer = slot?.epoch === previous.epoch ? slot.handle : null;
    const seconds = previousPlayer?.getCurrentTime() ?? position.current;
    const initialTime = mapIdentityPosition(previous.locale, nextLocale, seconds);
    const next = {
      locale: nextLocale,
      scene: identitySceneAt(previous.locale, seconds),
      initialTime,
      epoch: previous.epoch + 1,
    };
    // Invalidate old callbacks before pause/unmount can deliver their final events.
    trackRef.current = next;
    position.current = initialTime;
    previousPlayer?.pause();
    setTrack(next);
  }, []);

  // Covers changes from the site's other language controls, before the next paint.
  useLayoutEffect(() => selectTrack(locale), [locale, selectTrack]);

  const bindPlayer = useCallback(
    (handle: TwinFilmHandle | null) => {
      if (handle && trackRef.current.epoch === track.epoch)
        player.current = { epoch: track.epoch, handle };
      else if (!handle && player.current?.epoch === track.epoch) player.current = null;
    },
    [track.epoch],
  );

  const onPosition = useCallback(
    (seconds: number) => {
      const current = trackRef.current;
      if (current.epoch !== track.epoch || !Number.isFinite(seconds)) return;
      position.current = seconds;
      const scene = identitySceneAt(current.locale, seconds);
      if (scene !== current.scene) {
        const next = { ...current, scene };
        trackRef.current = next;
        setTrack(next);
      }
    },
    [track.epoch],
  );

  const ar = locale === "ar";
  const media = IDENTITY_FILMS[track.locale];
  return (
    <section className="identity-film-hero" dir={ar ? "rtl" : "ltr"} aria-labelledby={titleId}>
      <header className="identity-film-hero__head">
        <h2 id={titleId}>{ar ? "لماذا سديد؟" : "Why Sadeed?"}</h2>
        <div
          className="identity-film-hero__languages"
          role="group"
          aria-label={ar ? "لغة الفيلم والموقع" : "Film and site language"}
        >
          {(["ar", "en"] as const).map((language) => (
            <button
              key={language}
              type="button"
              className="nx-focus-ring"
              lang={language}
              aria-pressed={locale === language}
              onClick={() => {
                selectTrack(language);
                setLocale(language);
              }}
            >
              {language === "ar" ? "العربية" : "English"}
            </button>
          ))}
        </div>
      </header>
      <Suspense fallback={<PlayerPlaceholder />}>
        <IdentityPlayer
          key={track.epoch}
          ref={bindPlayer}
          film={media.film}
          manual
          priority
          startWithAudio
          initialTime={track.initialTime}
          captions={media.captions}
          onPositionChange={onPosition}
        />
      </Suspense>
      <div className="identity-film-hero__copy">
        <p className="identity-film-hero__scene" aria-live="polite">
          {ar ? "المشهد: " : "Scene: "}
          <strong>{IDENTITY_SCENES[track.scene].title[track.locale]}</strong>
        </p>
        <p className="identity-film-hero__disclosure">
          {ar
            ? "عرض لتصميم سديد بمشاهد توضيحية؛ لا يعرض بيانات تشغيلية حية."
            : "A view of SADEED's design through illustrative scenes; no live operational data."}
        </p>
        <details className="identity-film-hero__transcript">
          <summary className="nx-focus-ring">
            {ar ? "قراءة نص الفيلم" : "Read the film transcript"}
          </summary>
          <ol lang={track.locale} dir={track.locale === "ar" ? "rtl" : "ltr"}>
            {IDENTITY_SCENES.map((scene) => (
              <li key={scene.id}>
                <h3>{scene.title[track.locale]}</h3>
                <p>{scene.text[track.locale]}</p>
              </li>
            ))}
          </ol>
        </details>
      </div>
    </section>
  );
}
