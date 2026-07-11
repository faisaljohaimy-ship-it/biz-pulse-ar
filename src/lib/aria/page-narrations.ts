/**
 * ARIA page narrations — public API. The large entry list is split across
 * page-narrations.entries.a/b/c.ts (pure data); this module keeps the matcher
 * and helpers so `narrationFor`/`isSilentRoute` stay the single import surface.
 */
export type { PageNarration } from "./page-narrations.base";
import type { PageNarration } from "./page-narrations.base";
import { ENTRIES_A } from "./page-narrations.entries.a";
import { ENTRIES_B } from "./page-narrations.entries.b";
import { ENTRIES_C } from "./page-narrations.entries.c";

// Prefixes where ARIA MUST stay silent (intros, cinematic promos, sinks).
const SILENT_PREFIXES = ["/promo", "/lovable", "/.well-known", "/.mcp", "/mcp", "/api"] as const;

export function isSilentRoute(pathname: string): boolean {
  return SILENT_PREFIXES.some((p) => pathname.startsWith(p));
}

// Longest prefixes FIRST — matcher picks the first startsWith() hit.
const ENTRIES: ReadonlyArray<readonly [string, PageNarration]> = [
  ...ENTRIES_A,
  ...ENTRIES_B,
  ...ENTRIES_C,
];

export function narrationFor(pathname: string, locale: "ar" | "en" = "ar"): PageNarration | null {
  if (isSilentRoute(pathname)) return null;
  const sorted = [...ENTRIES].sort((a, b) => b[0].length - a[0].length);
  for (const [prefix, entry] of sorted) {
    if (pathname === prefix || pathname.startsWith(prefix + "/") || pathname.startsWith(prefix)) {
      return entry;
    }
  }
  const last = pathname.split("/").filter(Boolean).pop() ?? "الرئيسية";
  const label = last.replace(/[-_.]/g, " ").trim() || "الرئيسية";
  return locale === "ar"
    ? {
        ar: `أنت الآن في صفحة ${label}. أعرض هنا محتوى الصفحة والقيمة التنفيذية المرتبطة بها.`,
        en: `You are on ${label}. I present the page content and its executive value here.`,
      }
    : {
        ar: `أنت الآن في صفحة ${label}. أعرض هنا محتوى الصفحة والقيمة التنفيذية المرتبطة بها.`,
        en: `You are on ${label}. I present the page content and its executive value here.`,
      };
}

export const NARRATE_STORAGE_KEY = "aria:narrate:enabled";
