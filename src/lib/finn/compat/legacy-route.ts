/**
 * ARIA → FINN — legacy API-path compatibility.
 *
 * WHY THIS EXISTS
 * The endpoints below moved from `/api/…/aria-*` to `/api/…/finn-*`. A URL is
 * an external contract, not an internal identifier: a browser tab that loaded
 * the previous build keeps posting to the old path (the crash watchdog uses
 * `sendBeacon`, which cannot be re-pointed after the page is live), and so does
 * anything holding a stale link. Renaming the files alone would turn every one
 * of those calls into a silent 404 — silent because a beacon has no error
 * channel and a failed incident report is invisible by construction.
 *
 * WHY 308 AND NOT 302
 * 308 Permanent Redirect is the only redirect that is REQUIRED to preserve the
 * method and the body. 301/302 let a client downgrade POST to GET, which would
 * turn an incident report into an empty GET and drop the payload without
 * anything looking broken. `fetch` and `sendBeacon` both follow 308.
 *
 * LIFETIME
 * These routes are temporary. They come out once no deployed client references
 * an `aria-*` path — the same discipline as the database compatibility views:
 * add the alias, ship the callers, then remove the alias. Removing it first is
 * what causes an outage.
 */

/** Old → new path segment. Kept explicit so a typo cannot invent a route. */
export function finnPathFor(pathname: string): string | null {
  if (pathname.startsWith("/api/aria/")) return pathname.replace("/api/aria/", "/api/finn/");
  const idx = pathname.lastIndexOf("/aria-");
  if (idx === -1) return null;
  return `${pathname.slice(0, idx)}/finn-${pathname.slice(idx + "/aria-".length)}`;
}

/**
 * Build the 308 for a legacy request, preserving the query string so callers
 * that pass `?sid=` (presence) do not lose their session on the hop.
 */
export function redirectToFinn({ request }: { request: Request }): Response {
  const url = new URL(request.url);
  const target = finnPathFor(url.pathname);
  if (!target) return new Response("not_found", { status: 404 });
  return new Response(null, {
    status: 308,
    headers: { Location: `${target}${url.search}`, "Cache-Control": "no-store" },
  });
}

/** The handler set every legacy route mounts. Method-agnostic by design: the
 *  redirect is identical for each verb, and listing them explicitly means an
 *  unlisted verb 405s rather than silently falling through. */
export const LEGACY_HANDLERS = {
  GET: redirectToFinn,
  POST: redirectToFinn,
  PUT: redirectToFinn,
  PATCH: redirectToFinn,
  DELETE: redirectToFinn,
} as const;
