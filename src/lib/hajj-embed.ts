/**
 * Hajj platform embed — the ONLY place the external Hajj dashboard URL is
 * resolved. It comes exclusively from the VITE_HAJJ_EMBED_URL environment
 * variable; nothing in the source or the UI ever shows a raw URL string.
 * UI surfaces always display the product name instead.
 */
export const HAJJ_PLATFORM_LABEL_AR = "منصة نُسك الحج";
export const HAJJ_PLATFORM_LABEL_EN = "Hajj Nusuk Platform";

/** Internal fallback route when the embed URL is not configured. */
export const HAJJ_INTERNAL_ROUTE = "/hajj";

/**
 * Hosts we know refuse iframing (X-Frame-Options: deny). Rendering an
 * iframe against them produces a browser-generated "refused to connect"
 * error page that surfaces the raw hostname as visible text — a direct
 * violation of the project rule that no raw platform URL may ever appear
 * in the UI. For these hosts we return `null` so consumers fall back to
 * the connect card / internal route and never mount the frame.
 */
const IFRAME_BLOCKED_HOSTS = new Set<string>(["hajj.neexios.com", "hajj-nexus-prime.lovable.app"]);

/** Validated https URL from the env var (any host), or null. */
function resolvedUrl(): URL | null {
  const raw = (import.meta.env.VITE_HAJJ_EMBED_URL as string | undefined)?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}

/**
 * URL to use as an <iframe> src. Returns null for hosts that refuse framing
 * (IFRAME_BLOCKED_HOSTS) so the embed surface shows its connect card instead
 * of a browser "refused to connect" page that would leak the raw hostname.
 */
export function hajjEmbedUrl(): string | null {
  const u = resolvedUrl();
  if (!u) return null;
  return IFRAME_BLOCKED_HOSTS.has(u.hostname) ? null : u.toString();
}

/**
 * URL for external "open in a new tab" links. Unlike hajjEmbedUrl this works
 * for ANY valid https host (including framing-blocked ones) — opening the
 * platform in its own tab has no X-Frame-Options constraint, so the "open
 * platform" links keep reaching the real site instead of the internal route.
 */
export function hajjOpenUrl(): string | null {
  return resolvedUrl()?.toString() ?? null;
}
