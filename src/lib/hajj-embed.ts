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

export function hajjEmbedUrl(): string | null {
  const raw = (import.meta.env.VITE_HAJJ_EMBED_URL as string | undefined)?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}
