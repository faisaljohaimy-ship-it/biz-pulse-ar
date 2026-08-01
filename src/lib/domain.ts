// Centralized public URL for canonical/OG/sitemap.
export const DOMAIN_URL =
  (typeof import.meta !== "undefined" && (import.meta as ImportMeta).env?.VITE_PUBLIC_URL) ||
  "https://neexios.com";

/**
 * هوية المنتج — المصدر المركزي الوحيد.
 *
 * OWNER DIRECTIVE 2026-08-01. The trade name is «منصة إنجاز الأعمال» and it is
 * THE SAME STRING IN EVERY LANGUAGE. It is a name, not a phrase to translate,
 * so there is deliberately no `nameEn` here — adding one is how a second brand
 * gets born.
 *
 * ── ROOT CAUSE THIS MODULE EXISTS TO CLOSE ──
 * The old brand survived every previous rename because the *shell* never read
 * this file. `app-shell.tsx` rendered the literal string "Nexus AI OS", and
 * ~20 route `head()` blocks hard-coded "— Nexus AI OS" into their titles.
 * A Latin literal outside every translation map is language-INVARIANT: it
 * renders identically under ar, en and ru, and browser auto-translate skips
 * Latin brand tokens. That is precisely why the owner saw "Nexus AI OS" while
 * the Russian page around it was translated — the string was never localisable
 * in the first place, so there was no locale to fix. The fix is structural:
 * one source, imported everywhere, never retyped.
 *
 * ── WHAT IS AND IS NOT RENAMED ──
 * FINN is untouched: it is the assistant, not the product (see BRAND_ASSISTANT).
 * `DOMAIN_URL` stays neexios.com — a live external contract (DNS, OAuth issuer,
 * canonical URLs). The domain is technical; it is not shown as the product name.
 */
export const PRODUCT_BRAND = {
  /** The trade name. Identical in ar / en / ru / any locale. Never translated. */
  name: "منصة إنجاز الأعمال",
  /** What the platform is. This one IS translatable prose. */
  descriptionAr: "منصة إدارة الأمن الصناعي",
  descriptionEn: "Industrial Security Management Platform",
  /** The assistant. A separate identity with its own lifecycle — do not merge. */
  assistantName: "FINN",
  /**
   * Internal slug for cache keys, storage prefixes and build artefacts.
   * NEVER rendered: it exists so machine-facing identifiers stop reaching for
   * the display name (which is Arabic, and unsuitable for a cache key).
   */
  slug: "injaz-al-aamal-platform",
} as const;

/**
 * Compatibility aliases.
 *
 * Retargeted rather than deleted: 33 modules import from here, and pointing the
 * existing names at the new brand renames every one of them in a single edit —
 * with `tsc` proving no call site was missed. They are intentionally all the
 * same string, because the brand does not vary by language or by surface.
 */
export const PRODUCT_NAME_AR = PRODUCT_BRAND.name;
/** Undiacritised form for search and prose. The name carries no diacritics. */
export const PRODUCT_NAME_AR_PLAIN = PRODUCT_BRAND.name;
export const PRODUCT_NAME_EN = PRODUCT_BRAND.name;

export const SITE_NAME = PRODUCT_BRAND.name;
export const COMPANY_NAME = PRODUCT_BRAND.descriptionAr;
export const PRODUCT_NAME = PRODUCT_BRAND.name;

/** «منصة إنجاز الأعمال — منصة إدارة الأمن الصناعي» for OG/description slots. */
export const SITE_TAGLINE = `${PRODUCT_BRAND.name} — ${PRODUCT_BRAND.descriptionAr}`;

/**
 * Single source of truth for the assistant's PUBLIC display persona.
 * FINN is the front-facing presentation identity (name + portrait). Change
 * it here in one line and every surface updates. The engine, knowledge base
 * (finn_knowledge), and server voice path stay on their internal names.
 */
export const BRAND_ASSISTANT = {
  /** Latin display name (headings, English UI). */
  nameEn: "FINN",
  /** Arabic display name — «فِن» per constitution Article 3. */
  nameAr: "فِن",
  /** One-line role shown under the name on the persona card. */
  roleAr: "مساعدك الذكي التنفيذي — الأمن الصناعي",
  roleEn: "Your Executive AI — Industrial Security",
  /** Compressed WebP portrait (persona card); PNG remains for OG/preview. */
  portrait: "/finn.webp",
} as const;
