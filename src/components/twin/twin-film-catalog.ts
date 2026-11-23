import { brandFilmSource } from "@/components/home/brand-film-assets";
import { FILM_EFFECTIVE_SECONDS, FILM_SOURCE_SECONDS } from "@/components/home/brand-film-playback";
import {
  TWIN_FILMS,
  TWIN_FILM_POSTER,
  TWIN_FILM_SECONDS,
  TWIN_FILM_TEXT,
  TWIN_UPSCALE_LIMIT,
} from "./twin-film-model";

/** Two distinct original films; these entries never fetch or create a media element. */
export const TWIN_FILM_CATALOG = {
  twin: {
    films: TWIN_FILMS,
    poster: TWIN_FILM_POSTER,
    seconds: TWIN_FILM_SECONDS,
    aspectRatio: "16 / 9",
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
} as const;
export type TwinFilmId = keyof typeof TWIN_FILM_CATALOG;

/** Both catalog profiles have two tiers. Upgrade only; play consent remains in the player. */
export function upgradeCatalogFilm(
  id: TwinFilmId,
  current: string | null,
  width: number,
  dpr: number,
): string {
  const [small, large] = TWIN_FILM_CATALOG[id].films;
  const need = Math.max(0, width) * Math.min(Math.max(dpr || 1, 1), 2);
  return current !== large.src && need <= small.width * TWIN_UPSCALE_LIMIT ? small.src : large.src;
}

export function catalogFilmSource(id: TwinFilmId, src: string): string {
  return id === "opening" ? brandFilmSource(src) : src;
}
