/** Read-only briefing of the already-loaded dashboard response; no model or server call. */
import { unmeasuredLabel } from "@/lib/evidence/evidence";
import type { ReportDocument } from "@/lib/reports/pdf-rich";
import type { LiveDashboardPdfInput } from "./live-dashboard-pdf";

export interface DashboardReadEvidence {
  readonly kpisReadAt?: string | null;
  readonly seriesReadAt?: string | null;
  readonly from?: string | null;
  readonly to?: string | null;
  readonly dateFilter?: string;
}

export type DashboardBriefing = ReturnType<typeof buildLiveDashboardBriefing>;

function timestamp(value: string | null | undefined, absent: string): string {
  if (!value || !Number.isFinite(Date.parse(value))) return absent;
  return new Date(value).toISOString();
}

/** The same localized values and limitations feed both the screen and PDF. */
export function buildLiveDashboardBriefing(input: LiveDashboardPdfInput, locale: "ar" | "en") {
  if (!Number.isFinite(Date.parse(input.generatedAt)))
    throw new RangeError("Invalid briefing time");
  if (!["7", "30", "90"].includes(input.range)) throw new RangeError("Invalid briefing range");
  const ar = locale === "ar";
  const absent = unmeasuredLabel(ar);
  const t = (arabic: string, english: string) => (ar ? arabic : english);
  const number = (value: number | null | undefined, unit?: "percent" | "minutes") => {
    if (
      value == null ||
      !Number.isFinite(value) ||
      value < 0 ||
      (unit === "percent" && value > 100)
    )
      return absent;
    if (unit === "percent") return `${Math.round(value)}%`;
    if (unit === "minutes") return `${value} ${t("دقيقة", "min")}`;
    return String(value);
  };
  const metric = (id: string, label: string, value: string) => ({ id, label, value });
  const k = input.kpis;
  const totals = input.totals;
  const evidence = input.readEvidence;
  const filter = evidence?.dateFilter?.trim().slice(0, 32);
  const metrics = [
    metric("open", t("البلاغات المفتوحة", "Open incidents"), number(k?.incidents_open)),
    metric("critical", t("البلاغات الحرجة", "Critical incidents"), number(k?.incidents_critical)),
    metric("patrols", t("الدوريات النشطة", "Active patrols"), number(k?.patrols_active)),
    metric("orders", t("أوامر العمل المفتوحة", "Open work orders"), number(k?.wo_open)),
    metric(
      "readiness",
      t("الجاهزية التنفيذية", "Executive readiness"),
      number(k?.executive_readiness, "percent"),
    ),
    metric("risk", t("مؤشر المخاطر", "Risk index"), number(k?.risk_index, "percent")),
  ];
  const periodTotals = [
    metric("incidents", t("بلاغات الفترة", "Period incidents"), number(totals.incidents)),
    metric(
      "resolved",
      t("البلاغات المغلقة", "Resolved incidents"),
      number(totals.incidents_resolved),
    ),
    metric(
      "resolution",
      t("نسبة الإغلاق", "Resolution rate"),
      number(totals.resolution_rate, "percent"),
    ),
    metric(
      "opened",
      t("أوامر العمل المنشأة", "Work orders opened"),
      number(totals.work_orders_opened),
    ),
    metric(
      "closed",
      t("أوامر العمل المغلقة", "Work orders closed"),
      number(totals.work_orders_closed),
    ),
    metric(
      "completed",
      t("الدوريات المنجزة", "Completed patrols"),
      number(totals.patrols_completed),
    ),
    metric(
      "response",
      t("متوسط الاستجابة", "Average response"),
      number(totals.avg_response_minutes, "minutes"),
    ),
  ];
  const sources = [
    {
      id: "kpis",
      label: t("المؤشرات التنفيذية", "Executive indicators"),
      href: "/sec/exec" as const,
      readAt: timestamp(evidence?.kpisReadAt, absent),
    },
    {
      id: "series",
      label: t("السلسلة الزمنية للوحة القيادة", "Dashboard daily series"),
      href: "/live-dashboard" as const,
      readAt: timestamp(evidence?.seriesReadAt, absent),
    },
  ];
  const sourceNotice = t(
    "حالة المصدر الحي أو البديل ووقت تحديث السجل غير مرفقين بالاستجابة الحالية. وقت القراءة يخص جلب الشاشة فقط، ولا يثبت حداثة المصدر أو اكتمال نطاق المؤسسة.",
    "The current response does not provide live/fallback status or record-update time. Read time identifies the screen fetch, not source freshness or complete organization coverage.",
  );
  const coverage = t(
    `الإجماليات للفترة الكاملة (${input.range} يومًا). التفاصيل اليومية: آخر ${Math.min(input.points.length, 40)} من ${input.points.length} صفًا معروضًا${filter ? ` بعد مرشح التاريخ «${filter}»` : ""}. لا تُعاد حساب الإجماليات من هذه التفاصيل.`,
    `Totals cover the full ${input.range}-day period. Daily details include the last ${Math.min(input.points.length, 40)} of ${input.points.length} displayed rows${filter ? ` after date filter “${filter}”` : ""}. Totals are not recomputed from these details.`,
  );
  const columns = [
    { key: "day", header: t("التاريخ", "Date"), weight: 1.8 },
    { key: "incidents", header: t("بلاغات", "Incidents") },
    { key: "critical", header: t("حرجة", "Critical") },
    { key: "high", header: t("عالية", "High") },
    { key: "resolved", header: t("مغلقة", "Resolved") },
    { key: "opened", header: t("أوامر منشأة", "WO opened") },
    { key: "closed", header: t("أوامر مغلقة", "WO closed") },
    { key: "patrols", header: t("دوريات", "Patrols") },
    { key: "response", header: t("استجابة بالدقائق", "Response min"), weight: 1.5 },
  ];
  const rows = input.points.slice(-40).map((point) => ({
    day: /^\d{4}-\d{2}-\d{2}$/.test(point.day) ? point.day : absent,
    incidents: number(point.incidents_total),
    critical: number(point.incidents_critical),
    high: number(point.incidents_high),
    resolved: number(point.incidents_resolved),
    opened: number(point.work_orders_opened),
    closed: number(point.work_orders_closed),
    patrols: number(point.patrols_completed),
    response: number(point.avg_response_minutes),
  }));
  return {
    locale,
    title: t("إحاطة تنفيذية من لوحة القيادة", "Executive dashboard briefing"),
    generatedAt: new Date(input.generatedAt).toISOString(),
    generatedLabel: t("وقت إعداد الإحاطة", "Briefing prepared"),
    readLabel: t("وقت قراءة الشاشة", "Screen read time"),
    periodLabel: t("الفترة", "Period"),
    period: `${timestamp(evidence?.from, absent)} / ${timestamp(evidence?.to, absent)}`,
    metricsTitle: t("المؤشرات الحالية", "Current indicators"),
    totalsTitle: t("ملخص الفترة", "Period summary"),
    sourcesTitle: t("المصادر وحدود القراءة", "Sources and reading limits"),
    dailyTitle: t("التفاصيل اليومية", "Daily details"),
    disclaimer: t(
      "ملخص مشتق من القراءات المعروضة؛ ليس اعتمادًا تشغيليًا أو توصية مولدة بالذكاء الاصطناعي.",
      "A summary derived from displayed readings; not operational approval or an AI-generated recommendation.",
    ),
    metrics,
    totals: periodTotals,
    sources,
    sourceNotice,
    coverage,
    columns,
    rows,
  };
}

/** Uses the existing shared Arabic-capable report engine, with no chart capture. */
export function liveDashboardBriefingReport(briefing: DashboardBriefing): ReportDocument {
  return {
    title: briefing.title,
    subtitle: `${briefing.generatedLabel}: ${briefing.generatedAt}`,
    dateKey: briefing.generatedAt.slice(0, 10),
    // No simulation/live assertion can be derived from the current response.
    // The explicit warning below carries that unavailable provenance instead.
    isSimulation: false,
    sections: [
      {
        title: briefing.metricsTitle,
        blocks: [
          {
            kind: "kpi-grid",
            items: briefing.metrics.map(({ label, value }) => ({ label, value })),
          },
        ],
      },
      {
        title: briefing.totalsTitle,
        blocks: [
          {
            kind: "kpi-grid",
            items: briefing.totals.map(({ label, value }) => ({ label, value })),
          },
        ],
      },
      {
        title: briefing.sourcesTitle,
        blocks: [
          {
            kind: "prose",
            text: [
              `${briefing.periodLabel}: ${briefing.period}`,
              ...briefing.sources.flatMap((source) => [
                source.label,
                // Keep the URI in an explicit Latin run: mixing a leading
                // slash into Arabic punctuation can reorder it in PDF bidi.
                `Source: ${source.href}`,
                `${briefing.readLabel}: ${source.readAt}`,
              ]),
            ],
          },
          { kind: "callout", tone: "warning", text: briefing.sourceNotice },
          { kind: "prose", text: [briefing.coverage, briefing.disclaimer] },
        ],
      },
      {
        title: briefing.dailyTitle,
        blocks: [
          {
            kind: "table",
            columns: briefing.columns,
            rows: briefing.rows,
            note: briefing.coverage,
          },
        ],
      },
    ],
  };
}
