/** Original 26-second container, displayed at half speed; never re-encode its audio/video. */
export const FILM_PLAYBACK_RATE = 0.5;
export const FILM_SOURCE_SECONDS = 26;
export const FILM_EFFECTIVE_SECONDS = FILM_SOURCE_SECONDS / FILM_PLAYBACK_RATE;

/** Already slowed containers must not be slowed twice. */
export function filmRateFor(duration: number): number {
  return Number.isFinite(duration) && duration > FILM_SOURCE_SECONDS * 1.5 ? 1 : FILM_PLAYBACK_RATE;
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
