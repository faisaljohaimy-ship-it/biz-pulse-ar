/** Git blob fingerprints for the R6 containers; update when a rendered file changes. */
export const BRAND_FILM_REVISIONS: Readonly<Record<string, string>> = {
  "/media/brand/sadeed-film-804.mp4": "2d4cee6b31fc60d14cc74452b52e95340abf6ebe",
  "/media/brand/sadeed-film-804.webm": "1c2d0196f32d06899cb38291272b4fc8c8d3ccf0",
  "/media/brand/sadeed-film-1608.mp4": "e97ffc776fab2df298c6165dd8a4158f3f930fac",
  "/media/brand/sadeed-film-1608.webm": "2c92f72d0bc1ce458b0692bea2f6f39e9bcf4cd1",
};

/** Change the browser cache key without shipping a duplicate copy of each film. */
export function brandFilmSource(src: string): string {
  if (!Object.hasOwn(BRAND_FILM_REVISIONS, src)) return src;
  return `${src}?v=${BRAND_FILM_REVISIONS[src]}`;
}
