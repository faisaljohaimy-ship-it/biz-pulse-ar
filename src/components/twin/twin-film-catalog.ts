import { brandFilmSource } from "@/components/home/brand-film-assets";
import { FILM_EFFECTIVE_SECONDS, FILM_SOURCE_SECONDS } from "@/components/home/brand-film-playback";
import { IDENTITY_FILMS, IDENTITY_FILM_POSTER } from "@/components/home/identity-film-model";
import {
  TWIN_FILMS,
  TWIN_FILM_POSTER,
  TWIN_FILM_SECONDS,
  TWIN_FILM_TEXT,
  TWIN_UPSCALE_LIMIT,
} from "./twin-film-model";

function identityMedia(locale: "ar" | "en") {
  const film = IDENTITY_FILMS[locale];
  return {
    films: [{ width: 1344, src: film.src }],
    poster: IDENTITY_FILM_POSTER,
    seconds: film.duration,
    aspectRatio: "3 / 1",
    webm: false,
    text: {
      ar: {
        ...TWIN_FILM_TEXT.ar,
        title: "لماذا سديد؟",
        kind: "فيلم تعريفي ناطق",
        meta: `${film.duration.toFixed(1)} ثانية · 1× · ${locale === "ar" ? "العربية" : "الإنجليزية"}`,
        description: "تعريف مسجل برؤية سديد ودعم القرار والمسؤولية البشرية.",
        disclosure:
          "فيلم تعريفي مسجل بلقطات توضيحية. القدرات التشغيلية بحسب تهيئة التكاملات وصلاحيات المستخدم.",
      },
      en: {
        ...TWIN_FILM_TEXT.en,
        title: "Why Sadeed?",
        kind: "Narrated introduction",
        meta: `${film.duration.toFixed(1)}s · 1× · ${locale === "ar" ? "Arabic" : "English"}`,
        description:
          "A recorded introduction to Sadeed's design and human decision accountability.",
        disclosure:
          "Recorded introduction with illustrative scenes. Operational capabilities depend on configured integrations and user permissions.",
      },
    },
  } as const;
}

/** Declared media profiles never fetch or create a media element by themselves. */
export const TWIN_FILM_CATALOG = {
  identityAr: identityMedia("ar"),
  identityEn: identityMedia("en"),
  twin: {
    films: TWIN_FILMS,
    poster: TWIN_FILM_POSTER,
    seconds: TWIN_FILM_SECONDS,
    aspectRatio: "16 / 9",
    webm: true,
    text: TWIN_FILM_TEXT,
  },
  opening: {
    films: [
      { width: 804, src: "/media/brand/sadeed-film-804.mp4" },
      { width: 1608, src: "/media/brand/sadeed-film-1608.mp4" },
    ],
    poster: { src: "/home/brand/sadeed-banner-clean-1600.webp", width: 1600, height: 533 },
    seconds: FILM_SOURCE_SECONDS,
    aspectRatio: "3 / 1",
    webm: true,
    text: {
      ar: {
        ...TWIN_FILM_TEXT.ar,
        title: "فيلم هوية سديد",
        meta: `${FILM_EFFECTIVE_SECONDS} ثانية · 1× · الصوت الأصلي`,
        description: "افتتاحية سديد الأصلية بصوتها.",
      },
      en: {
        ...TWIN_FILM_TEXT.en,
        title: "SADEED identity film",
        meta: `${FILM_EFFECTIVE_SECONDS}s · 1× · original audio`,
        description: "Original SADEED opening and audio.",
      },
    },
  },
} as const;
export type TwinFilmId = keyof typeof TWIN_FILM_CATALOG;

/** One or more ordered tiers, upgrades only; play consent remains in the player. */
export function upgradeCatalogFilm(
  id: TwinFilmId,
  current: string | null,
  width: number,
  dpr: number,
): string {
  const films = TWIN_FILM_CATALOG[id].films;
  const need = Math.max(0, width) * Math.min(Math.max(dpr || 1, 1), 2);
  const wanted =
    films.find((film) => film.width * TWIN_UPSCALE_LIMIT >= need) ?? films[films.length - 1];
  const previous = films.find((film) => film.src === current);
  return previous && previous.width >= wanted.width ? previous.src : wanted.src;
}

export function catalogFilmSource(id: TwinFilmId, src: string): string {
  return id === "opening" ? brandFilmSource(src) : src;
}
