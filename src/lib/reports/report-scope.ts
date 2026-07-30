export const DAILY_REPORT_SCOPES = [
  "executive_summary",
  "full",
  "incidents",
  "maintenance",
  "permits",
  "activity",
] as const;

export type DailyReportScope = (typeof DAILY_REPORT_SCOPES)[number];

export const DAILY_REPORT_SCOPE_META: Record<
  DailyReportScope,
  { ar: string; en: string; slug: string }
> = {
  executive_summary: {
    ar: "الملخص التنفيذي",
    en: "Executive Summary",
    slug: "executive-summary",
  },
  full: {
    ar: "تقرير العمليات الكامل",
    en: "Full Operations Report",
    slug: "full-operations",
  },
  incidents: {
    ar: "ملخص الحوادث والبلاغات",
    en: "Incidents Summary",
    slug: "incidents",
  },
  maintenance: {
    ar: "ملخص الصيانة وأوامر العمل",
    en: "Maintenance Summary",
    slug: "maintenance",
  },
  permits: {
    ar: "ملخص التصاريح",
    en: "Permits Summary",
    slug: "permits",
  },
  activity: {
    ar: "ملخص أحداث التشغيل والامتثال",
    en: "Operations Activity Summary",
    slug: "activity",
  },
};
