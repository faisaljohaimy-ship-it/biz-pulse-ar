/**
 * External sister platforms — the SINGLE SOURCE OF TRUTH.
 *
 * Architectural decision (owner directive): the Nusuk Hajj platform is a
 * fully independent application (its own TanStack Start + Cloudflare +
 * Supabase). Its hosting blocks iframing (X-Frame-Options / CSP
 * frame-ancestors) — that is outside our control and we do NOT try to
 * defeat it (no proxying). NEXIOS therefore presents it with a cinematic
 * showcase card and opens it EXTERNALLY in a new tab.
 *
 * The URL is resolved exclusively from the VITE_HAJJ_EMBED_URL environment
 * variable — no raw platform URL is ever written in a component or shown
 * as visible text; UI surfaces always display the product name.
 */

function resolveHttpsUrl(raw: string | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Validated https URL of the Nusuk platform, or null when unconfigured. */
export function hajjPlatformUrl(): string | null {
  return resolveHttpsUrl(import.meta.env.VITE_HAJJ_EMBED_URL as string | undefined);
}

/** Internal showcase route (deep-link friendly card page). */
export const HAJJ_INTERNAL_ROUTE = "/hajj";

export const HAJJ_PLATFORM = {
  /** null → showcase surfaces fall back to the internal route. */
  get url(): string | null {
    return hajjPlatformUrl();
  },
  name_ar: "منصة نُسك الحج",
  name_en: "Nusuk Hajj Platform",
  tagline_ar: "منصة عمليات الحج — تنسيق الحملات، التتبع الحي، وإدارة الطوارئ.",
  tagline_en:
    "Hajj operations platform — campaign coordination, live tracking and emergency management.",
  status: "external",
} as const;
