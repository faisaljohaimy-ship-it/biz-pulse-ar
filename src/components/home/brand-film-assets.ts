/** Git blob fingerprints for the R5 containers; update when a rendered file changes. */
export const BRAND_FILM_REVISIONS: Readonly<Record<string, string>> = {
  "/media/brand/sadeed-film-804.mp4": "2e2b9c625db75dd68b58520d7efd84e35a3098ce",
  "/media/brand/sadeed-film-804.webm": "d712d561cc1deb5255168f867d806bf41f97811b",
  "/media/brand/sadeed-film-1608.mp4": "a8f12142345f5e6d41b50b4fcd960e25b57d9f3e",
  "/media/brand/sadeed-film-1608.webm": "f482ffb276fa4de0a557e512ab191af1299baa33",
};

/** Change the browser cache key without shipping a duplicate copy of each film. */
export function brandFilmSource(src: string): string {
  if (!Object.hasOwn(BRAND_FILM_REVISIONS, src)) return src;
  return `${src}?v=${BRAND_FILM_REVISIONS[src]}`;
}
