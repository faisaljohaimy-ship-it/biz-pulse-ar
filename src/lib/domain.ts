// Centralized public URL for canonical/OG/sitemap.
export const DOMAIN_URL =
  (typeof import.meta !== "undefined" && (import.meta as ImportMeta).env?.VITE_PUBLIC_URL) ||
  "https://neexios.com";

export const SITE_NAME =
  "NEXIOS AI OS — منصة إنجاز الأعمال التنفيذية · Executive Delivery Platform";
export const COMPANY_NAME = "NEXIOS Technologies";
export const PRODUCT_NAME = "NEXUS AI OS";

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
