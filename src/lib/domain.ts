// Centralized public URL for canonical/OG/sitemap.
export const DOMAIN_URL =
  (typeof import.meta !== "undefined" && (import.meta as ImportMeta).env?.VITE_PUBLIC_URL) ||
  "https://neexios.com";

/**
 * هوية المنتج — المصدر المركزي الوحيد.
 *
 * OWNER DIRECTIVE 2026-08-01 (second): the brand is «سَدِيد» / «SADEED».
 *
 * ── THE RULE CHANGED, DELIBERATELY ──
 * The previous brand was one string for every language, and this file said so
 * in as many words: "there is deliberately no `nameEn` — adding one is how a
 * second brand gets born". That was right for a name that had no Latin form.
 * SADEED is different: the owner specified BOTH forms, because the Arabic
 * «سَدِيد» and the Latin «SADEED» are the same word, not two brands. So the
 * shape is now bilingual — and the guard that used to assert `!('nameEn' in …)`
 * asserts the bilingual contract instead. A doctrine reversal is recorded here
 * rather than quietly deleted, so the next reader knows it was decided, not
 * forgotten.
 *
 * ── ROOT CAUSE THIS MODULE STILL EXISTS TO CLOSE ──
 * Two brands ago the name survived every rename because the *shell* never read
 * this file: `app-shell.tsx` rendered a hard-coded literal, and ~37 route
 * `head()` blocks pasted the brand into their titles. A literal outside every
 * translation map is language-INVARIANT — it renders identically under ar, en
 * and ru, which is exactly how the owner came to see a Latin brand on a Russian
 * page. One source, imported everywhere, never retyped.
 *
 * ── WHAT IS AND IS NOT RENAMED ──
 * The assistant's DISPLAY name was merged into the brand by owner directive
 * 2026-08-09 (see BRAND_ASSISTANT); its identifiers were not (see below).
 * `DOMAIN_URL` stays neexios.com — a live external contract (DNS, the Supabase
 * OAuth issuer, every published canonical URL). The domain is technical; it is
 * never shown as the product name.
 */
export const PRODUCT_BRAND = {
  ar: {
    name: "سَدِيد",
    descriptor: "منظومة القرار والإنجاز الذكي",
    tagline: "قرار أدق. إنجاز أسرع.",
  },
  en: {
    name: "SADEED",
    descriptor: "Intelligent Decision & Execution System",
    tagline: "Smarter Decisions. Faster Execution.",
  },
  /**
   * Undiacritised Arabic. The display name carries تشكيل («سَدِيد») which is
   * right on screen but wrong in three places: PDF text shaping, where the
   * combining marks survive the presentation-form pass unpredictably; speech
   * synthesis input; and any search index. Those read this instead.
   */
  arPlain: "سديد",
  /**
   * The assistant.
   *
   * OWNER DIRECTIVE 2026-08-09 («توحيد اسم Finn إلى سَدِيد»): the assistant is
   * no longer a second name. It was FINN — a separate identity that survived
   * three product renames — and the owner has now merged it into the product
   * brand. So this field is no longer a DIFFERENT name; it is the same word,
   * kept as a named field because ~40 call sites ask for "the assistant's
   * name" and deleting the field would make each of them reach for a literal.
   *
   * The machine side did NOT merge: `finn-core`, `/finn`, `/api/finn/*`,
   * `finn_knowledge`, `FinnCopilot` and `public/finn-portrait.*` keep their
   * identifiers. Renaming those orphans live user state and breaks routing,
   * and no user reads them.
   */
  assistantName: "سَدِيد",
  /**
   * Internal slug for cache keys, storage prefixes and generated filenames.
   * NEVER rendered — machine-facing identifiers must not reach for a display
   * name that is Arabic and diacritised.
   */
  slug: "sadeed",
} as const;

/** Pick the brand for a locale. `ar` is the boolean the UI already threads. */
export function brandFor(ar: boolean) {
  return ar ? PRODUCT_BRAND.ar : PRODUCT_BRAND.en;
}
/** The brand NAME for a locale — the most common single lookup. */
export function brandName(ar: boolean): string {
  return brandFor(ar).name;
}

/**
 * Compatibility aliases.
 *
 * Retargeted rather than deleted: 33 modules import from here, so pointing the
 * existing names at the new brand renames every one of them in a single edit,
 * with `tsc` proving no call site was missed.
 */
export const PRODUCT_NAME_AR = PRODUCT_BRAND.ar.name;
export const PRODUCT_NAME_AR_PLAIN = PRODUCT_BRAND.arPlain;
export const PRODUCT_NAME_EN = PRODUCT_BRAND.en.name;

/** Arabic-first, because the document is `lang="ar" dir="rtl"` by default. */
export const SITE_NAME = `${PRODUCT_BRAND.ar.name} — ${PRODUCT_BRAND.en.name}`;
export const COMPANY_NAME = PRODUCT_BRAND.ar.descriptor;
export const PRODUCT_NAME = PRODUCT_BRAND.ar.name;

/** «سَدِيد — منظومة القرار والإنجاز الذكي» for OG/description slots. */
export const SITE_TAGLINE = `${PRODUCT_BRAND.ar.name} — ${PRODUCT_BRAND.ar.descriptor}`;

/**
 * Single source of truth for the assistant's PUBLIC display persona.
 * Change it here in one line and every surface updates. The engine, knowledge
 * base (finn_knowledge), route (`/finn`) and server voice path keep their
 * internal names — those are identifiers, and no user reads them.
 *
 * OWNER DIRECTIVE 2026-08-09: the displayed name is «سَدِيد» / «SADEED», the
 * same word as the product. Derived from PRODUCT_BRAND rather than retyped, so
 * the two can never drift apart again.
 */
export const BRAND_ASSISTANT = {
  /** Latin display name (headings, English UI). */
  nameEn: PRODUCT_BRAND.en.name,
  /** Arabic display name. */
  nameAr: PRODUCT_BRAND.ar.name,
  /** One-line role shown under the name on the persona card. */
  roleAr: "مساعدك الذكي التنفيذي — الأمن الصناعي",
  roleEn: "Your Executive AI — Industrial Security",
  /** Compressed WebP portrait (persona card); PNG remains for OG/preview. */
  portrait: "/finn.webp",
} as const;
