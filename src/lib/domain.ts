// Centralized public URL for canonical/OG/sitemap. Override via VITE_PUBLIC_URL when migrating to nexus.sa.
export const DOMAIN_URL =
  (typeof import.meta !== "undefined" && (import.meta as ImportMeta).env?.VITE_PUBLIC_URL) ||
  "https://biz-pulse-ar.lovable.app";

export const SITE_NAME = "Nexus AI OS";
