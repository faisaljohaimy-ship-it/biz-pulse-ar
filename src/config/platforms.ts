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
 * The URL lives ONLY in this file: the owner-approved canonical deployment
 * below is the FOUNDATION (أساس) — every icon, the sidebar entry and the
 * showcase card open it externally by default — and the
 * VITE_HAJJ_EMBED_URL environment variable can override it per deployment
 * (e.g. when Nusuk moves to hajj.neexios.com). No raw platform URL is ever
 * written in a component or shown as visible text; UI surfaces always
 * display the product name.
 */

/** Owner-approved canonical Nusuk deployment (2026-07-19). */
const HAJJ_CANONICAL_URL = "https://id-preview--cce9f994-0d49-4dfc-b825-6e9374183af6.lovable.app/";

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

/** Validated https URL of the Nusuk platform — env override wins, the
 *  canonical deployment is the always-on default (never null in practice). */
export function hajjPlatformUrl(): string | null {
  return (
    resolveHttpsUrl(import.meta.env.VITE_HAJJ_EMBED_URL as string | undefined) ??
    resolveHttpsUrl(HAJJ_CANONICAL_URL)
  );
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
