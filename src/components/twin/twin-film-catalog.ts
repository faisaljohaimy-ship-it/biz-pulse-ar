import { brandFilmSource } from "@/components/home/brand-film-assets";
import { FILM_EFFECTIVE_SECONDS, FILM_SOURCE_SECONDS } from "@/components/home/brand-film-playback";
import {
  TWIN_FILMS,
  TWIN_FILM_POSTER,
  TWIN_FILM_SECONDS,
  TWIN_FILM_TEXT,
  TWIN_UPSCALE_LIMIT,
} from "./twin-film-model";

const REFERENCE_FILM_SECONDS = 15;

/** Declared media profiles never fetch or create a media element by themselves. */
export const TWIN_FILM_CATALOG = {
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
        meta: `${FILM_EFFECTIVE_SECONDS} ثانية · 0.5× · الصوت الأصلي`,
        description: "افتتاحية سديد الأصلية بصوتها.",
      },
      en: {
        ...TWIN_FILM_TEXT.en,
        title: "SADEED identity film",
        meta: `${FILM_EFFECTIVE_SECONDS}s · 0.5× · original audio`,
        description: "Original SADEED opening and audio.",
      },
    },
  },
  reference: {
    films: [{ width: 1280, src: "/media/refinery/refinery-illustrative.mp4" }],
    poster: { src: "/media/refinery/refinery-poster.webp", width: 640, height: 360 },
    seconds: REFERENCE_FILM_SECONDS,
    aspectRatio: "16 / 9",
    webm: false,
    text: {
      ar: {
        ...TWIN_FILM_TEXT.ar,
        title: "فيلم المنشأة التوضيحي",
        kind: "تصور مرئي · حركة مصممة",
        meta: `${REFERENCE_FILM_SECONDS} ثانية · صوت مُصنّع`,
        description: "تصور لمنشأة صناعية مع صوت مُصنّع.",
        disclosure:
          "مشهد خيالي من صورة واقعية مولّدة مع حركة مصممة؛ ليس بثًا حيًا ولا تمثيلًا هندسيًا أو بيانات تشغيلية.",
      },
      en: {
        ...TWIN_FILM_TEXT.en,
        title: "Illustrative facility film",
        kind: "Visual concept · authored motion",
        meta: `${REFERENCE_FILM_SECONDS} seconds · synthesized audio`,
        description: "An industrial concept with synthesized audio.",
        disclosure:
          "A fictional photorealistic still with authored motion; not a live feed, engineering model or operational data.",
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
