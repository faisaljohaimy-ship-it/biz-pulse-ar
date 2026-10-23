/**
 * SADEED page narrations — public API. The large entry list is split across
 * page-narrations.entries.a/b/c.ts (pure data); this module keeps the matcher
 * and helpers so `narrationFor`/`isSilentRoute` stay the single import surface.
 */
export type { PageNarration } from "./page-narrations.base";
import type { PageNarration } from "./page-narrations.base";
import { ENTRIES_A } from "./page-narrations.entries.a";
import { ENTRIES_B } from "./page-narrations.entries.b";
import { ENTRIES_C } from "./page-narrations.entries.c";

// Prefixes where SADEED MUST stay silent (intros, cinematic promos, sinks).
// «/finn» (٢٠٢٦/١٠/٢٣): وكيل المالك للبرمجة والأتمتة — **مساعدٌ منفصل عن سَدِيد**
// بلا صوت ولا اشتراك معه؛ سَدِيد لا يرويه ولا يصف شاشته (وهي لا تُعرض لغير المالك).
const SILENT_PREFIXES = [
  "/promo",
  "/lovable",
  "/.well-known",
  "/.mcp",
  "/mcp",
  "/api",
  "/finn",
] as const;

export function isSilentRoute(pathname: string): boolean {
  return SILENT_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * المفاتيح مسارات موجِّه حقيقية (`/sec/incidents`) لا مُعرّفات ملفات
 * (`/_authenticated/sec.incidents`) — المُعرّف لا يطابق ما يقف عليه الزائر أبدًا.
 *
 * الترتيب: الأطول أولًا، ويُحسب مرّة واحدة عند التحميل لا في كل نداء.
 */
const ENTRIES: ReadonlyArray<readonly [string, PageNarration]> = [
  ...ENTRIES_A,
  ...ENTRIES_B,
  ...ENTRIES_C,
].sort((a, b) => b[0].length - a[0].length);

/** يُسقط الشرطة الأخيرة: `/sec/` و`/sec` شاشة واحدة، والجذر يبقى `/`. */
function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function narrationFor(pathname: string, locale: "ar" | "en" = "ar"): PageNarration | null {
  if (isSilentRoute(pathname)) return null;
  const path = normalizePath(pathname);
  for (const [prefix, entry] of ENTRIES) {
    // مطابقة مقاطع لا حروف: المطابقة الحرفية كانت تجعل `/` تبتلع كل مسار
    // فيسمع الزائر رواية الصفحة الرئيسية وهو على شاشة أخرى، ويجعل `/sec`
    // تلتقط `/security-center`. الفاصل `/` هو ما يمنع الالتقاط الكاذب.
    if (path === prefix || path.startsWith(prefix === "/" ? "//" : prefix + "/")) {
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
