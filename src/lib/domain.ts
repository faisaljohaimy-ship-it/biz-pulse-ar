// Centralized public URL for canonical/OG/sitemap.
export const DOMAIN_URL =
  (typeof import.meta !== "undefined" && (import.meta as ImportMeta).env?.VITE_PUBLIC_URL) ||
  "https://neexios.com";

/**
 * PRODUCT NAME — «مِرْقَب» (MIRQAB). Constitution Article 1, amended
 * 2026-07-30 by the product owner, who delegated the choice of an Arabic name.
 *
 * Why مِرْقَب: the root ر-ق-ب is to watch, observe and oversee — which is
 * literally what this platform does (command centre, patrols, CCTV, incidents,
 * compliance oversight). «المِرْقَب» is the watchtower: the elevated vantage
 * point from which everything is seen. Arabic-first per Article 3, short,
 * unambiguous, no existing occurrence anywhere in the repo, and it transliterates
 * cleanly as MIRQAB.
 *
 * SCOPE, deliberately narrow: this changes the PRODUCT name. COMPANY_NAME is
 * a legal entity and is NOT renamed on a UI-review item — that is a corporate
 * decision, not a display string.
 *
 * Also fixed here: SITE_NAME said "NEXIOS" while PRODUCT_NAME said "NEXUS" —
 * the product contradicted itself in its own single source of truth, and the
 * NEXUS spelling had leaked into emails and agent prompts.
 */
export const PRODUCT_NAME_AR = "مِرْقَب";
/** Undiacritised form for search, slugs and prose. */
export const PRODUCT_NAME_AR_PLAIN = "مرقب";
export const PRODUCT_NAME_EN = "MIRQAB";

export const SITE_NAME = "مِرْقَب — منصة إنجاز الأعمال التنفيذية · MIRQAB Executive Platform";
export const COMPANY_NAME = "NEXIOS Technologies";
export const PRODUCT_NAME = "مِرْقَب — MIRQAB";

/**
 * Single source of truth for the assistant's PUBLIC display persona.
 * FINN is the front-facing presentation identity (name + portrait). Change
 * it here in one line and every surface updates. The engine, knowledge base
 * (aria_knowledge), and server voice path stay on their internal names.
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
