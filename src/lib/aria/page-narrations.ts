/**
 * ARIA Page Narrations — deterministic bilingual (AR default) blurbs that
 * ARIA speaks the moment the user lands on any page in the system. Keyed
 * by pathname prefix. First matching prefix wins; longest first.
 *
 * Rule (Constitution Article 22): every route the app ships MUST have an
 * entry here. Missing routes fall back to a neutral "you are now in
 * <label>" line derived from the last path segment.
 */

export interface PageNarration {
  readonly ar: string;
  readonly en: string;
}

// Longest prefixes first — matcher picks the first startsWith() hit.
const ENTRIES: ReadonlyArray<readonly [string, PageNarration]> = [
  [
    "/_authenticated/sec.incidents",
    {
      ar: "أنت الآن في لوحة الحوادث الأمنية. أعرض هنا الحوادث المفتوحة، أولوياتها، والفرق المُكلَّفة، مع تحديث مباشر من قاعدة البيانات.",
      en: "You are in Security Incidents. I show open incidents, priority, and assigned teams — live from the database.",
    },
  ],
  [
    "/_authenticated/sec.cctv",
    {
      ar: "لوحة كاميرات المراقبة. تُعرض الكاميرات النشطة وحالتها وأي تنبيهات مرئية جارية.",
      en: "CCTV panel. Active cameras, status, and live visual alerts.",
    },
  ],
  [
    "/_authenticated/sec.patrols",
    {
      ar: "لوحة الدوريات. مسارات الدوريات الحيّة، نقاط التفتيش، والانحرافات إن وُجدت.",
      en: "Patrols panel. Live patrol tracks, checkpoints, and deviations.",
    },
  ],
  [
    "/_authenticated/sec.permits",
    {
      ar: "لوحة التصاريح. التصاريح السارية والمنتهية والمعلقة، مع تنبيه للمخاطر.",
      en: "Permits. Active, expired, and pending permits with risk flags.",
    },
  ],
  [
    "/_authenticated/sec.assets",
    {
      ar: "لوحة الأصول الأمنية. الحالة التشغيلية والصيانة الواجبة.",
      en: "Security assets. Operational status and maintenance due.",
    },
  ],
  [
    "/_authenticated/sec.kpi",
    {
      ar: "مؤشرات الأداء الأمنية. تُقرأ الأرقام مباشرة من جداول القياس.",
      en: "Security KPIs, read directly from measurement tables.",
    },
  ],
  [
    "/_authenticated/sec.exec",
    {
      ar: "غرفة القيادة التنفيذية للأمن. الملخص التنفيذي، المخاطر العليا، والقرارات المطلوبة.",
      en: "Security executive room. Exec summary, top risks, decisions required.",
    },
  ],
  [
    "/_authenticated/sec",
    {
      ar: "قسم القيادة الأمنية. أعرض النظرة العامة الحيّة للحوادث والدوريات والكاميرات.",
      en: "Security command. Live overview of incidents, patrols, and cameras.",
    },
  ],
  [
    "/_authenticated/analytics",
    {
      ar: "لوحة التحليلات. الاتجاهات، المقارنات الزمنية، والانحرافات المهمّة.",
      en: "Analytics. Trends, time comparisons, notable deviations.",
    },
  ],
  [
    "/_authenticated/cockpit",
    {
      ar: "قمرة القيادة التنفيذية. مؤشرات النظام والقرارات الحيّة.",
      en: "Executive cockpit. System indicators and live decisions.",
    },
  ],
  [
    "/_authenticated/crisis",
    {
      ar: "غرفة الأزمات. الأحداث الحرجة المفتوحة والإجراءات الجارية.",
      en: "Crisis room. Open critical events and in-flight actions.",
    },
  ],
  [
    "/_authenticated/departments",
    { ar: "لوحة الأقسام والفرق التشغيلية.", en: "Departments and operational teams." },
  ],
  [
    "/_authenticated/events",
    { ar: "الجدول الزمني للأحداث المؤسسية.", en: "Enterprise events timeline." },
  ],
  [
    "/_authenticated/knowledge",
    { ar: "قاعدة المعرفة. الوثائق والمقاطع المفهرسة.", en: "Knowledge base. Indexed docs and chunks." },
  ],
  [
    "/_authenticated/leads",
    { ar: "لوحة العملاء المحتملين ومرحلة كل صفقة.", en: "Leads pipeline and stages." },
  ],
  [
    "/_authenticated/learn",
    { ar: "أكاديمية التعلم. الدروس والتقدّم.", en: "Learning academy. Lessons and progress." },
  ],
  [
    "/_authenticated/marketplace",
    { ar: "سوق الحلول والتكاملات المتاحة.", en: "Solutions and integrations marketplace." },
  ],
  [
    "/_authenticated/orchestration",
    { ar: "لوحة تنسيق الوكلاء والمهام الآلية.", en: "Agent orchestration and automated tasks." },
  ],
  [
    "/_authenticated/outcomes",
    { ar: "لوحة النتائج التجارية والقيمة المُتحققة.", en: "Business outcomes and realized value." },
  ],
  [
    "/_authenticated/prompts",
    { ar: "مكتبة الموجّهات القياسية.", en: "Standard prompt library." },
  ],
  [
    "/_authenticated/readiness",
    { ar: "مؤشر الجاهزية التشغيلية للمنصة.", en: "Platform operational readiness index." },
  ],
  [
    "/_authenticated/tasks",
    { ar: "لوحة المهام العاجلة والموكولة.", en: "Urgent and assigned tasks." },
  ],
  [
    "/_authenticated/team",
    { ar: "أعضاء الفريق والأدوار.", en: "Team members and roles." },
  ],
  [
    "/_authenticated/voice",
    { ar: "إعدادات الصوت لأريا.", en: "ARIA voice settings." },
  ],
  [
    "/_authenticated/health",
    { ar: "صحّة المنصة والخدمات.", en: "Platform and services health." },
  ],
  [
    "/_authenticated/files",
    { ar: "مركز الملفات والوثائق.", en: "Files and documents center." },
  ],
  [
    "/_authenticated/assistant",
    { ar: "مساعد أريا التنفيذي.", en: "ARIA executive assistant." },
  ],
  [
    "/_authenticated",
    { ar: "دخلت إلى منطقة العمل المصادقة.", en: "You are in the authenticated workspace." },
  ],
  ["/pricing", { ar: "صفحة الباقات والأسعار.", en: "Pricing and plans." }],
  ["/contact", { ar: "صفحة التواصل معنا.", en: "Contact us." }],
  ["/book", { ar: "حجز عرض توضيحي مع الفريق.", en: "Book a demo with the team." }],
  ["/auth", { ar: "شاشة تسجيل الدخول.", en: "Sign-in screen." }],
  ["/login", { ar: "شاشة تسجيل الدخول.", en: "Sign-in screen." }],
  ["/os", { ar: "واجهة نظام تشغيل نيكسيوس.", en: "NEXIOS OS surface." }],
  ["/status", { ar: "حالة النظام في الوقت الحقيقي.", en: "Real-time system status." }],
  [
    "/",
    {
      ar: "الصفحة الرئيسية لنيكسيوس AI. أعرّفك بالمنصة والقدرات التنفيذية.",
      en: "NEXIOS AI landing. Introducing the platform and its executive capabilities.",
    },
  ],
];

// Prefixes where ARIA MUST stay silent (intros, cinematic promos, sinks).
const SILENT_PREFIXES = ["/promo", "/lovable", "/.well-known", "/.mcp", "/mcp", "/api"] as const;

export function isSilentRoute(pathname: string): boolean {
  return SILENT_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Return the narration for a route. Falls back to a neutral "you are now in
 * <label>" derived from the last segment when no entry matches, so ARIA
 * always has something honest to say instead of guessing.
 */
export function narrationFor(
  pathname: string,
  locale: "ar" | "en" = "ar",
): PageNarration | null {
  if (isSilentRoute(pathname)) return null;
  const routeKey = pathname.startsWith("/_authenticated")
    ? pathname
    : pathname === "/"
      ? "/"
      : pathname;
  // Sort by length desc once — cheap for < 100 entries.
  const sorted = [...ENTRIES].sort((a, b) => b[0].length - a[0].length);
  for (const [prefix, n] of sorted) {
    if (routeKey === prefix || routeKey.startsWith(prefix + "/") || routeKey.startsWith(prefix)) {
      return n;
    }
  }
  const last = pathname.split("/").filter(Boolean).pop() ?? "";
  const label = last.replace(/[-_.]/g, " ").trim() || "الرئيسية";
  return locale === "ar"
    ? { ar: `أنت الآن في صفحة ${label}.`, en: `You are on ${label}.` }
    : { ar: `أنت الآن في صفحة ${label}.`, en: `You are on ${label}.` };
}

export const NARRATE_STORAGE_KEY = "aria:narrate:enabled";
