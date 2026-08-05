// FINN Report Engine — generates Markdown report bodies grounded in real data
// and persists them to finn_reports.

import type { SupabaseClient } from "@supabase/supabase-js";
import { pctOrUnmeasured, numOrUnmeasured, UNMEASURED_AR } from "@/lib/sec.functions";
import type { ExecKpis } from "@/lib/sec.functions";
import type { RiskItem, DecisionItem, ReportKind } from "./types";

const TITLES: Record<ReportKind, { ar: string; en: string }> = {
  executive: { ar: "تقرير تنفيذي", en: "Executive Report" },
  daily: { ar: "التقرير اليومي", en: "Daily Report" },
  weekly: { ar: "التقرير الأسبوعي", en: "Weekly Report" },
  monthly: { ar: "التقرير الشهري", en: "Monthly Report" },
  incident: { ar: "تقرير البلاغات", en: "Incident Report" },
  risk: { ar: "تقرير المخاطر", en: "Risk Report" },
  operations: { ar: "تقرير العمليات", en: "Operations Report" },
  board: { ar: "تقرير مجلس الإدارة", en: "Board Report" },
};

function kpiTable(k: ExecKpis, lang: "ar" | "en"): string {
  const head =
    lang === "ar"
      ? "| المؤشر | القيمة | الهدف | الحالة |\n|---|---|---|---|"
      : "| KPI | Value | Target | Status |\n|---|---|---|---|";
  // المادة ٢٧ — `ok === null` تعني «لم يُقَس»: لا تجتاز ولا ترسب، وتُكتب
  // الحالة نصًّا لا لونًا وحده (المادة ٣٤ / WCAG 2.2 §1.4.1).
  const unmeasuredEn = "Not measured";
  const notMeasured = lang === "ar" ? UNMEASURED_AR : unmeasuredEn;
  const row = (label: string, value: number | string, target: string, ok: boolean | null) =>
    `| ${label} | ${value} | ${target} | ${ok === null ? `⚪ ${notMeasured}` : ok ? "🟢" : "🟠"} |`;
  const pct = (v: number | null) => (v === null ? notMeasured : pctOrUnmeasured(v));
  const gte = (v: number | null, t: number) => (v === null ? null : v >= t);
  const lte = (v: number | null, t: number) => (v === null ? null : v <= t);
  const lines = [
    head,
    row(
      lang === "ar" ? "البلاغات المفتوحة" : "Open Incidents",
      k.incidents_open,
      "0",
      k.incidents_open === 0,
    ),
    row(
      lang === "ar" ? "البلاغات الحرجة" : "Critical Incidents",
      k.incidents_critical,
      "0",
      k.incidents_critical === 0,
    ),
    row(
      lang === "ar" ? "نسبة الحل" : "Resolution Rate",
      pct(k.incidents_resolution_rate),
      "≥ 85%",
      gte(k.incidents_resolution_rate, 85),
    ),
    row(
      "MTTR",
      k.mttr_minutes === null ? notMeasured : numOrUnmeasured(k.mttr_minutes, "m"),
      "≤ 15m",
      lte(k.mttr_minutes, 15),
    ),
    row(
      lang === "ar" ? "إنجاز الدوريات" : "Patrol Completion",
      pct(k.patrol_completion),
      "≥ 95%",
      gte(k.patrol_completion, 95),
    ),
    row(
      lang === "ar" ? "صحة CCTV" : "CCTV Health",
      pct(k.cctv_health),
      "≥ 80%",
      gte(k.cctv_health, 80),
    ),
    row(
      lang === "ar" ? "صحة التحكم بالدخول" : "Access Health",
      pct(k.access_health),
      "≥ 80%",
      gte(k.access_health, 80),
    ),
    row(
      lang === "ar" ? "امتثال المقاولين" : "Contractor Compliance",
      pct(k.contractors_compliance),
      "≥ 90%",
      gte(k.contractors_compliance, 90),
    ),
    row(
      lang === "ar" ? "مؤشر المخاطر" : "Risk Index",
      k.risk_index === null ? notMeasured : k.risk_index,
      "≤ 60",
      lte(k.risk_index, 60),
    ),
    row(
      lang === "ar" ? "الجاهزية التنفيذية" : "Executive Readiness",
      pct(k.executive_readiness),
      "≥ 70%",
      gte(k.executive_readiness, 70),
    ),
  ];
  return lines.join("\n");
}

function riskList(risks: RiskItem[], lang: "ar" | "en"): string {
  if (!risks.length) return lang === "ar" ? "لا توجد مخاطر مرصودة." : "No tracked risks.";
  return risks
    .slice(0, 10)
    .map(
      (r) =>
        `- **[${r.severity} · ${r.score}]** ${r.title}${r.ref ? ` (${r.ref})` : ""} — ${r.rationale}`,
    )
    .join("\n");
}

function decisionList(decisions: DecisionItem[], lang: "ar" | "en"): string {
  if (!decisions.length)
    return lang === "ar" ? "لا توجد توصيات حالياً." : "No recommendations at this time.";
  return decisions
    .map(
      (d, i) =>
        `${i + 1}. **${d.recommendation}** _(conf ${Math.round(d.confidence * 100)}%)_\n   ${d.rationale}${d.suggested_tool ? `\n   → tool: \`${d.suggested_tool}\`` : ""}`,
    )
    .join("\n");
}

export async function generateReport(args: {
  supabase: SupabaseClient;
  userId: string;
  kind: ReportKind;
  kpis: ExecKpis;
  risks: RiskItem[];
  decisions: DecisionItem[];
  narrative: string;
  language: "ar" | "en";
}): Promise<{ kind: ReportKind; id: string; title: string }> {
  const now = new Date();
  const titleBase = TITLES[args.kind][args.language];
  const stamp = now.toISOString().slice(0, 10);
  const title = `${titleBase} — ${stamp}`;

  const md = [
    `# ${title}`,
    `_${args.language === "ar" ? "سَدِيد — الأمن الصناعي" : "Enjaz Platform — Industrial Security"} · ${now.toISOString()}_`,
    "",
    `## ${args.language === "ar" ? "ملخص تنفيذي" : "Executive Summary"}`,
    args.narrative,
    "",
    `## ${args.language === "ar" ? "مؤشرات الأداء" : "Key Performance Indicators"}`,
    kpiTable(args.kpis, args.language),
    "",
    `## ${args.language === "ar" ? "أبرز المخاطر" : "Top Risks"}`,
    riskList(args.risks, args.language),
    "",
    `## ${args.language === "ar" ? "التوصيات التنفيذية" : "Executive Recommendations"}`,
    decisionList(args.decisions, args.language),
  ].join("\n\n");

  let periodStart: Date | null = null;
  const periodEnd = now;
  switch (args.kind) {
    case "daily":
      periodStart = new Date(now.getTime() - 24 * 36e5);
      break;
    case "weekly":
      periodStart = new Date(now.getTime() - 7 * 24 * 36e5);
      break;
    case "monthly":
      periodStart = new Date(now.getTime() - 30 * 24 * 36e5);
      break;
    default:
      periodStart = null;
  }

  const { data, error } = await args.supabase
    .from("finn_reports")
    .insert({
      user_id: args.userId,
      kind: args.kind,
      title,
      period_start: periodStart?.toISOString() ?? null,
      period_end: periodEnd.toISOString(),
      markdown: md,
      payload: { kpis: args.kpis, risks: args.risks, decisions: args.decisions },
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Report persist failed: ${error?.message ?? "no data"}`);
  return { kind: args.kind, id: data.id, title };
}
