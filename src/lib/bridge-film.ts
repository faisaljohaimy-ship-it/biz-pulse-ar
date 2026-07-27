/**
 * Bridge-film asset contract — the single place that declares where the
 * rendered FINN Command-Bridge film and its poster live.
 *
 * The film is produced by the offline pipeline (scripts/generate-finn-*.mjs
 * → HeyGen or the Remotion fallback) and dropped at BRIDGE_FILM_SRC. Until
 * it exists the UI shows a graceful empty state — never a broken element —
 * and the live seven-scene experience remains the primary path.
 *
 * ARIA appears ONLY in internal system names (e.g. the /api/public/aria-tts
 * endpoint); the user-facing identity is FINN exclusively.
 */

/** Rendered final film (HeyGen stitch or Remotion output). May not exist yet. */
export const BRIDGE_FILM_SRC = "/media/bridge/bridge-final.mp4";

/** Poster shown before playback / while the film is absent. FINN portrait. */
export const BRIDGE_FILM_POSTER = "/finn-portrait.png";

/** Optional per-language cut, if produced separately. */
export function bridgeFilmSrc(lang: "ar" | "en"): string {
  return lang === "en" ? "/media/bridge/bridge-final.en.mp4" : BRIDGE_FILM_SRC;
}
