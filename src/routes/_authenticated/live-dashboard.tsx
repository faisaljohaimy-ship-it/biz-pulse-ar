import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
// مكتبتا التصدير ثقيلتان ولا تُستدعيان إلا من زر التصدير،
// فتُحمَّلان بالاستيراد الديناميكي داخل المعالِج — لا في حزمة الصفحة.
import {
  Activity,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  FileText,
  Gauge,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { getExecKpis } from "@/lib/sec.functions";
import { getExecTimeseries } from "@/lib/sec.functions";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import { queryEvidence } from "@/lib/evidence/gate";
import { unmeasuredLabel } from "@/lib/evidence/evidence";
import { getSystemPulse, getBusinessKpis } from "@/lib/executive-presentation.functions";
import { EnterpriseActivityFeed } from "@/components/events/EventTimeline";
import { SystemPulseStrip } from "@/components/executive/SystemPulseStrip";
import { BusinessKpiPanel } from "@/components/executive/BusinessKpiPanel";
import { DecisionCenter } from "@/components/executive/DecisionCenter";
import { ExecutiveTimeline } from "@/components/executive/ExecutiveTimeline";
import { LivePipelinesPanel } from "@/components/executive/LivePipelinesPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { userFacingError } from "@/lib/errors/user-facing-error";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { buildLiveDashboardBriefing } from "@/lib/executive/live-dashboard-briefing";
import type { LiveDashboardPdfInput } from "@/lib/executive/live-dashboard-pdf";

export const Route = createFileRoute("/_authenticated/live-dashboard")({
  head: () => ({
    meta: [
      { title: "Live Executive Dashboard — SADEED" },
      {
        name: "description",
        content:
          "Live executive KPIs, incident trends, work orders, patrols, and real-time activity — with Excel and PDF export.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  errorComponent: ({ error, reset }) => (
    <div className="p-8 text-rose-300" dir="rtl">
      <div className="text-lg font-semibold">تعذّر تحميل لوحة القيادة</div>
      <div className="text-xs opacity-70 mt-1">{userFacingError(error)}</div>
      <button onClick={reset} className="mt-4 text-primary underline text-sm">
        إعادة المحاولة
      </button>
    </div>
  ),
  notFoundComponent: () => <div className="p-8 text-foreground/60">Not found</div>,
  component: LiveExecutiveDashboard,
});

type RangeKey = "7" | "30" | "90";
const RANGE_LABEL: Record<RangeKey, { ar: string; en: string }> = {
  "7": { ar: "٧ أيام", en: "7d" },
  "30": { ar: "٣٠ يومًا", en: "30d" },
  "90": { ar: "٩٠ يومًا", en: "90d" },
};

/**
 * الغيابُ على هذه الصفحة — **يُقال ولا يُختلق ولا يُرسم شرطةً.**
 *
 * قِيس هنا حرفيًّا «`Resolution null%`»: الشرط كان على `ts` وهو موجود،
 * والحقل `resolution_rate` هو `null` — ففُحص الغلاف دون المحتوى.
 * وأخواتها `?? 0` تُظهر الغياب **«0%»**، والصفر قياسٌ لا غياب.
 * والشرطة `—` تسمّيها المادة ٢٧ بعينها.
 *
 * **ولغةُ الصفحة إنجليزية** رغم `dir="rtl"`: كلُّ لافتاتها
 * (`Resolution Rate` · `Active Patrols` · `Avg Response`) إنجليزية.
 * فكُتب الغيابُ أوّلًا `UNMEASURED_TEXT_AR` فظهر «لم يُقَس» عربيًّا تحت
 * لافتةٍ إنجليزية، وبجواره «critical not measured» إنجليزيًّا — مفردتا
 * غيابٍ بلغتين في شريطٍ واحد. والمصدر الآن واحدٌ ولغةٌ واحدة.
 */
const PAGE_AR = false;
const ABSENT = unmeasuredLabel(PAGE_AR);

function pctText(v: number | null | undefined, suffix = "%", loading = false): string {
  if (loading) return MEASURING;
  return v == null || !Number.isFinite(v) ? ABSENT : `${Math.round(v)}${suffix}`;
}

/**
 * **والتحميل ليس غيابًا.** أوّلُ إطارٍ يراه كلُّ زائر لا بيانات فيه
 * بعد، وعرضُ «لم يُقَس» حينها ادّعاءُ قياسٍ لم يُحاوَل. فله نصُّه.
 */
const MEASURING = "…";

/** عدٌّ للعرض — **والغياب يُقال لا يُرسم شرطةً** (المادة ٢٧). */
function countText(v: number | null | undefined, loading = false): string {
  if (loading) return MEASURING;
  return v == null || !Number.isFinite(v) ? ABSENT : String(v);
}
const absentTone = (v: number | null | undefined) =>
  v == null || !Number.isFinite(v) ? ("unmeasured" as const) : null;

function KpiCard({
  label,
  value,
  sub,
  tone = "primary",
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "primary" | "secondary" | "rose" | "amber" | "emerald" | "unmeasured";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const toneMap = {
    primary: "text-primary border-primary/30",
    secondary: "text-secondary border-secondary/30",
    rose: "text-rose-400 border-rose-400/30",
    amber: "text-amber-400 border-amber-400/30",
    emerald: "text-emerald-400 border-emerald-400/30",
    // **الغياب نبرةٌ مستقلّة** — لا يرث لونَ قياسٍ سليم.
    unmeasured: "text-foreground/40 border-white/10",
  } as const;
  return (
    <div className={`rounded-xl border bg-background/40 backdrop-blur-xl p-4 ${toneMap[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-mono uppercase tracking-widest text-foreground/60">
          {label}
        </span>
        <Icon className="w-4 h-4 opacity-70" />
      </div>
      <div
        className={`mt-2 text-2xl md:text-3xl font-bold tabular-nums ${toneMap[tone].split(" ")[0]}`}
      >
        {value}
      </div>
      {sub && <div className="text-[12px] text-foreground/50 mt-1 font-mono">{sub}</div>}
    </div>
  );
}

function ChartCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-background/40 backdrop-blur-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          {hint && <div className="text-[12px] text-foreground/40 font-mono">{hint}</div>}
        </div>
      </div>
      <div className="h-56">{children}</div>
    </div>
  );
}

function LiveExecutiveDashboard() {
  const { locale } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const accountKey = user?.id ?? "guest";
  const exportAccount = useRef<object | null>({});
  const ar = locale === "ar";
  const [range, setRange] = useState<RangeKey>("30");
  const [search, setSearch] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  const [briefingWaitExpired, setBriefingWaitExpired] = useState(false);

  useLayoutEffect(() => {
    // A fresh identity also invalidates A→B→A account switches and remounts.
    exportAccount.current = {};
    setPdfBusy(false);
    setPdfError(false);
    return () => {
      exportAccount.current = null;
    };
  }, [accountKey]);

  const kpisQ = useQuery({
    queryKey: ["exec-kpis", accountKey],
    queryFn: () => getExecKpis(),
    enabled: !authLoading,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const tsQ = useQuery({
    queryKey: ["exec-timeseries", accountKey, range],
    queryFn: () => getExecTimeseries({ data: { days: Number(range) } }),
    enabled: !authLoading,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const pulseQ = useQuery({
    queryKey: ["exec-pulse", accountKey],
    queryFn: () => getSystemPulse(),
    enabled: !authLoading,
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  const bizQ = useQuery({
    queryKey: ["exec-business-kpis", accountKey],
    queryFn: () => getBusinessKpis(),
    enabled: !authLoading,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const k = kpisQ.data;
  // التحميلُ حالةٌ ثالثة بين القياس والغياب.
  const busy = kpisQ.isPending;
  const tsBusy = tsQ.isPending;
  const ts = tsQ.data;

  useEffect(() => {
    setBriefingWaitExpired(false);
    if (!tsQ.isPending) return;
    const timer = window.setTimeout(() => setBriefingWaitExpired(true), 4_000);
    return () => window.clearTimeout(timer);
  }, [tsQ.isPending, range]);

  const filteredPoints = useMemo(() => {
    if (!ts) return [];
    if (!search.trim()) return ts.points;
    const s = search.trim();
    return ts.points.filter((p) => p.day.includes(s));
  }, [ts, search]);

  // One read-only snapshot feeds both the preview and its PDF. Fetch timestamps
  // are deliberately distinguished from source-update/live-provenance metadata,
  // which these existing responses do not supply. Never export stale error data.
  const briefingInput = useMemo<LiveDashboardPdfInput | null>(() => {
    if (authLoading || !ts || tsQ.isError) return null;
    const readAt = (value: number) => (value > 0 ? new Date(value).toISOString() : null);
    return {
      locale,
      range,
      generatedAt: new Date().toISOString(),
      kpis: kpisQ.isError ? undefined : k,
      totals: ts.totals,
      points: filteredPoints,
      readEvidence: {
        kpisReadAt: kpisQ.isError ? null : readAt(kpisQ.dataUpdatedAt),
        seriesReadAt: readAt(tsQ.dataUpdatedAt),
        from: ts.from,
        to: ts.to,
        dateFilter: search,
      },
    };
  }, [
    ts,
    authLoading,
    tsQ.isError,
    tsQ.dataUpdatedAt,
    k,
    kpisQ.isError,
    kpisQ.dataUpdatedAt,
    filteredPoints,
    locale,
    range,
    search,
  ]);
  const briefing = useMemo(
    () => briefingInput && buildLiveDashboardBriefing(briefingInput, locale),
    [briefingInput, locale],
  );

  async function exportExcel() {
    if (!ts) return;
    // تُجلب xlsx عند الضغط فقط؛ السلوك والملف الناتج كما هما.
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const rows = filteredPoints.map((p) => ({
      Date: p.day,
      Incidents: p.incidents_total,
      Critical: p.incidents_critical,
      High: p.incidents_high,
      Resolved: p.incidents_resolved,
      "WO Opened": p.work_orders_opened,
      "WO Closed": p.work_orders_closed,
      "Patrols Completed": p.patrols_completed,
      "Avg Response (min)": p.avg_response_minutes ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Timeseries");
    if (k) {
      const kpiRows = Object.entries(k).map(([Metric, Value]) => ({
        Metric,
        Value: typeof Value === "number" ? Value : String(Value),
      }));
      const ws2 = XLSX.utils.json_to_sheet(kpiRows);
      XLSX.utils.book_append_sheet(wb, ws2, "KPIs");
    }
    XLSX.writeFile(wb, `sadeed-executive-${range}d-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function exportPdf() {
    if (!briefingInput || pdfBusy) return;
    const snapshot = briefingInput;
    const snapshotAccount = exportAccount.current;
    setPdfBusy(true);
    setPdfError(false);
    try {
      const { buildLiveDashboardPdf, liveDashboardPdfFilename } =
        await import("@/lib/executive/live-dashboard-pdf");
      const bytes = await buildLiveDashboardPdf(snapshot);
      if (exportAccount.current !== snapshotAccount) return;
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: "application/pdf" }),
      );
      try {
        const link = document.createElement("a");
        link.href = url;
        link.download = liveDashboardPdfFilename(
          snapshot.range,
          snapshot.generatedAt,
          snapshot.locale,
        );
        link.rel = "noopener";
        document.body.appendChild(link);
        try {
          link.click();
        } finally {
          link.remove();
        }
      } finally {
        // Safari begins the download after the click handler returns.
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
      }
    } catch {
      if (exportAccount.current === snapshotAccount) setPdfError(true);
    } finally {
      if (exportAccount.current === snapshotAccount) setPdfBusy(false);
    }
  }

  // لافتات المحاور تُقرأ كنصّ — أرضية ١٢px تسري عليها كما تسري على المتن.
  const chartAxis = { stroke: "hsl(var(--muted-foreground))", fontSize: 12 };

  return (
    <div className="min-h-screen bg-[#04060d] text-slate-100 p-4 md:p-6" dir={ar ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-mono uppercase tracking-widest text-primary/80">
            <EvidenceBadge
              evidence={queryEvidence(
                "sec_exec_kpis+timeseries",
                Math.max(kpisQ.dataUpdatedAt, tsQ.dataUpdatedAt),
                tsQ.isFetching || kpisQ.isFetching ? "SYNCING" : "LIVE",
              )}
              label={tsQ.isFetching || kpisQ.isFetching ? "SYNCING" : "LIVE"}
              tone="cyan"
            />
            <span>· SADEED · EXECUTIVE</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-l from-primary to-secondary mt-1">
            {ar ? "لوحة القيادة التنفيذية الحية" : "Live Executive Dashboard"}
          </h1>
          <div className="text-xs text-foreground/50 mt-1">
            {ar
              ? "المؤشرات والاتجاهات والنشاط من القراءات المتاحة"
              : "KPIs, trends and activity from available readings"}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-white/10 overflow-hidden">
            {(Object.keys(RANGE_LABEL) as RangeKey[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs font-mono ${
                  range === r
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/70 hover:bg-white/5"
                }`}
              >
                {RANGE_LABEL[r][locale]}
              </button>
            ))}
          </div>
          <Input
            placeholder={ar ? "بحث بالتاريخ YYYY-MM-DD" : "Filter date YYYY-MM-DD"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-44 text-xs bg-background/40"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              kpisQ.refetch();
              tsQ.refetch();
            }}
          >
            <RefreshCw className="w-3.5 h-3.5 me-1.5" /> {ar ? "تحديث" : "Refresh"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void exportExcel();
            }}
            disabled={!ts}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 me-1.5" /> Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void exportPdf();
            }}
            disabled={!briefingInput || pdfBusy}
            aria-busy={pdfBusy}
            style={{ minHeight: 44 }}
          >
            <FileText className="w-3.5 h-3.5 me-1.5" />{" "}
            {pdfBusy ? (ar ? "إعداد الملف…" : "Preparing…") : `PDF · ${ar ? "العربية" : "English"}`}
          </Button>
        </div>
      </header>

      <section
        className="mb-6 rounded-xl border border-border bg-card p-4 text-card-foreground"
        dir={ar ? "rtl" : "ltr"}
        lang={locale}
        aria-labelledby="exec-briefing-title"
      >
        <h2 id="exec-briefing-title" className="font-semibold">
          {ar ? "إحاطة تنفيذية قابلة للتصدير" : "Exportable executive briefing"}
        </h2>
        {briefing ? (
          <>
            <p className="mt-2 text-sm">{briefing.disclaimer}</p>
            <p className="mt-2 text-xs text-muted-foreground">{briefing.sourceNotice}</p>
            <details className="mt-3">
              <summary className="min-h-11 cursor-pointer py-3 font-medium">
                {ar ? "معاينة محتوى الإحاطة ومصادرها" : "Preview the briefing and its sources"}
              </summary>
              <p className="break-words text-xs">
                {briefing.generatedLabel}: <span dir="ltr">{briefing.generatedAt}</span>
              </p>
              <p className="mt-2 break-words text-xs">
                {briefing.periodLabel}: <span dir="ltr">{briefing.period}</span>
              </p>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {[
                  { title: briefing.metricsTitle, items: briefing.metrics },
                  { title: briefing.totalsTitle, items: briefing.totals },
                ].map((group) => (
                  <div key={group.title}>
                    <h3 className="mb-2 text-sm font-medium">{group.title}</h3>
                    <dl className="grid grid-cols-2 gap-2 text-sm">
                      {group.items.map((metric) => (
                        <div key={metric.id} className="min-w-0">
                          <dt className="text-xs text-muted-foreground">{metric.label}</dt>
                          <dd className="break-words font-semibold">{metric.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
              <h3 className="mt-4 text-sm font-medium">{briefing.sourcesTitle}</h3>
              <ul className="mt-2 space-y-2 text-xs">
                {briefing.sources.map((source) => (
                  <li key={source.id} className="break-words">
                    <Link to={source.href} className="inline-flex min-h-11 items-center underline">
                      {source.label}
                    </Link>
                    <p>
                      {briefing.readLabel}: <span dir="ltr">{source.readAt}</span>
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">{briefing.coverage}</p>
            </details>
          </>
        ) : (
          <p className="mt-2 text-sm" role={tsQ.isError ? "alert" : "status"}>
            {tsQ.isError
              ? ar
                ? "تعذر إعداد الإحاطة من القراءات الحالية. حدّث البيانات وأعد المحاولة."
                : "The current readings could not prepare a briefing. Refresh and try again."
              : briefingWaitExpired
                ? ar
                  ? "لم تصل قراءات الفترة بعد. استخدم تحديث لإعادة المحاولة."
                  : "Period readings have not arrived. Use Refresh to try again."
                : ar
                  ? "بانتظار قراءات الفترة لإعداد الإحاطة."
                  : "Waiting for period readings to prepare the briefing."}
          </p>
        )}
        {pdfError && (
          <p className="mt-3 text-sm" role="alert">
            {ar
              ? "تعذر إنشاء ملف الإحاطة. أعد المحاولة من زر PDF."
              : "The briefing PDF could not be created. Try the PDF button again."}
          </p>
        )}
      </section>

      {/* Executive System Pulse */}
      {pulseQ.data && (
        <div className="mb-6">
          <SystemPulseStrip
            chips={pulseQ.data.chips}
            confidence={pulseQ.data.confidence}
            ar={PAGE_AR}
          />
        </div>
      )}

      {/* Business KPIs */}
      {bizQ.data && (
        <div className="mb-6">
          <BusinessKpiPanel data={bizQ.data} />
        </div>
      )}

      {/* Live Pipelines — Runtime / Voice / Avatar */}
      <div className="mb-6">
        <LivePipelinesPanel />
      </div>

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard
          label="Open Incidents"
          value={countText(k?.incidents_open, busy)}
          /*
           * **بطاقةٌ واحدة لا تُجيب جوابين.** كان الشرط
           * `k == null || k.incidents_critical != null` يقصر الغياب على
           * فرع الحقل وحده، فغيابُ الصفّ كلِّه يسقط في `?? 0`: القيمة
           * «Not measured» والسطرُ تحتها **«0 critical»** — و«صفرُ حوادثَ
           * حرجة» مختلَقًا على لوحة أمنٍ تنفيذية هو أسوأ اتجاهٍ للخطأ.
           */
          sub={`critical ${countText(k?.incidents_critical, busy)}`}
          tone="rose"
          icon={AlertTriangle}
        />
        <KpiCard
          label="Resolution Rate"
          value={pctText(ts?.totals.resolution_rate, "%", tsBusy)}
          sub={`last ${range}d`}
          tone={absentTone(ts?.totals.resolution_rate) ?? "emerald"}
          icon={ShieldCheck}
        />
        <KpiCard
          label="Active Patrols"
          value={countText(k?.patrols_active, busy)}
          sub={`${pctText(k?.patrol_completion, "%", busy)} completion`}
          tone="secondary"
          icon={Activity}
        />
        <KpiCard
          label="Work Orders"
          value={countText(k?.wo_open, busy)}
          sub={ts ? `${ts.totals.work_orders_closed} closed / ${range}d` : "open"}
          tone="amber"
          icon={Wrench}
        />
        <KpiCard
          label="Avg Response"
          value={pctText(ts?.totals.avg_response_minutes, "m", tsBusy)}
          sub="critical + high"
          tone={absentTone(ts?.totals.avg_response_minutes) ?? "primary"}
          icon={Gauge}
        />
        <KpiCard
          label="Readiness"
          value={pctText(k?.executive_readiness, "%", busy)}
          sub={`risk ${pctText(k?.risk_index, "%", busy)}`}
          tone={absentTone(k?.executive_readiness) ?? "primary"}
          icon={Download}
        />
      </section>

      {/* Charts + activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <ChartCard
            title="اتجاه البلاغات حسب الخطورة"
            hint={`Incidents by severity · last ${range} days`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="day" {...chartAxis} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis {...chartAxis} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="incidents_critical"
                  stackId="1"
                  stroke="#f43f5e"
                  fill="#f43f5e"
                  fillOpacity={0.6}
                  name="Critical"
                />
                <Area
                  type="monotone"
                  dataKey="incidents_high"
                  stackId="1"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.5}
                  name="High"
                />
                <Area
                  type="monotone"
                  dataKey="incidents_total"
                  stroke="#00D4FF"
                  fill="transparent"
                  name="Total"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ChartCard title="أوامر العمل" hint="Work orders opened vs closed">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredPoints}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="day" {...chartAxis} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis {...chartAxis} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="work_orders_opened" fill="#f59e0b" name="Opened" />
                  <Bar dataKey="work_orders_closed" fill="#10b981" name="Closed" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="زمن الاستجابة" hint="Average response (minutes)">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredPoints}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="day" {...chartAxis} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis {...chartAxis} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_response_minutes"
                    stroke="#00D4FF"
                    strokeWidth={2}
                    dot={false}
                    name="Avg minutes"
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <ChartCard title="الدوريات المنجزة" hint="Completed patrols per day">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredPoints}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="day" {...chartAxis} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis {...chartAxis} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="patrols_completed" fill="#3AE8FF" name="Patrols" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-white/5 bg-background/40 backdrop-blur-xl p-4">
            <div className="text-sm font-semibold mb-3">ملخص الفترة</div>
            <dl className="grid grid-cols-2 gap-y-2 text-xs font-mono">
              <dt className="text-foreground/50">Incidents</dt>
              <dd className="text-primary text-end">{countText(ts?.totals.incidents)}</dd>
              <dt className="text-foreground/50">Resolved</dt>
              <dd className="text-emerald-400 text-end">
                {countText(ts?.totals.incidents_resolved)}
              </dd>
              <dt className="text-foreground/50">Resolution</dt>
              <dd className="text-emerald-400 text-end">{pctText(ts?.totals.resolution_rate)}</dd>
              <dt className="text-foreground/50">WO opened</dt>
              <dd className="text-amber-400 text-end">
                {countText(ts?.totals.work_orders_opened)}
              </dd>
              <dt className="text-foreground/50">WO closed</dt>
              <dd className="text-emerald-400 text-end">
                {countText(ts?.totals.work_orders_closed)}
              </dd>
              <dt className="text-foreground/50">Patrols</dt>
              <dd className="text-secondary text-end">{countText(ts?.totals.patrols_completed)}</dd>
              <dt className="text-foreground/50">Avg response</dt>
              <dd className="text-primary text-end">
                {pctText(ts?.totals.avg_response_minutes, "m")}
              </dd>
            </dl>
          </div>

          <EnterpriseActivityFeed height="h-[520px]" compact filter={{ limit: 60 }} />
        </aside>
      </div>

      {/* Decision Center + Executive Timeline */}
      <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
        <DecisionCenter />
        <ExecutiveTimeline />
      </div>

      {tsQ.isError && (
        <div className="mt-4 text-xs text-rose-400 font-mono">{userFacingError(tsQ.error)}</div>
      )}
    </div>
  );
}
