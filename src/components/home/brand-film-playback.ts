/** Owner update 2026-11-23: original footage and narrated edits play naturally at 1×. */
export const FILM_PLAYBACK_RATE = 1;
export const FILM_SOURCE_SECONDS = 26;
export const FILM_EFFECTIVE_SECONDS = FILM_SOURCE_SECONDS / FILM_PLAYBACK_RATE;

/** Preserve the historical helper contract without applying a global slow-down. */
export function filmRateFor(_duration: number): number {
  return FILM_PLAYBACK_RATE;
}

/** Reapply the rate after source loads and browser rate resets, without an event loop. */
export function holdFilmRate(video: HTMLVideoElement): () => void {
  const apply = () => {
    const rate = filmRateFor(video.duration);
    if (video.defaultPlaybackRate !== rate) video.defaultPlaybackRate = rate;
    if (video.playbackRate !== rate) video.playbackRate = rate;
  };
  const events = ["loadstart", "loadedmetadata", "playing", "ratechange"] as const;
  apply();
  for (const type of events) video.addEventListener(type, apply);
  return () => {
    for (const type of events) video.removeEventListener(type, apply);
  };
}
