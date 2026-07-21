/**
 * /bi — «لوحات التحليل التنفيذية» (Power BI-style, built in-house).
 *
 * One resilient data source (getBiDashboard) feeds every panel; the
 * period/department/severity filters genuinely recompute the charts from
 * the same `days` rows — a header can never contradict its board. Export
 * buttons reuse the report engine (dark holographic PDF) and xlsx.
 * Honest embed gate: PowerBIEmbed shows the internal board until the
 * facility's license provides a real embed URL (no fake integration).
 */
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { PageBriefing } from "@/components/clarity/PageBriefing";
import { PowerBIEmbed } from "@/components/analytics/PowerBIEmbed";
import { getBiDashboard, type BiDashboardData } from "@/lib/exec/bi-dashboard.functions";

export const Route = createFileRoute("/_authenticated/bi")({
  component: BiPage,
  errorComponent: RouteErrorBoundary,
});

const PERIODS = [
  { key: 7, label: "٧ أيام" },
  { key: 30, label: "٣٠ يومًا" },
  { key: 90, label: "٩٠ يومًا" },
] as const;
const SEVERITIES = [
  { key: "all", label: "كل الحِدد" },
  { key: "critical", label: "حرجة" },
  { key: "high", label: "عالية" },
  { key: "medium", label: "متوسطة" },
  { key: "low", label: "منخفضة" },
] as const;
const SEV_COLOR: Record<string, string> = {
  critical: "#f87171",
  high: "#fbbf24",
  medium: "#22d3ee",
  low: "#648CBE",
};
const WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function downloadBlob(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // iOS Safari needs the URL alive briefly after click.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function BiPage() {
  const fetchBi = useServerFn(getBiDashboard);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["bi-dashboard"],
    queryFn: () =>
      Promise.race([
        fetchBi(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("bi timeout")), 9000)),
      ]),
    retry: 1,
    refetchInterval: 120_000,
  });

  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [department, setDepartment] = useState<string>("all");
  const [severity, setSeverity] = useState<string>("all");
  const [exporting, setExporting] = useState<"" | "pdf" | "xlsx">("");

  // ── All aggregates derive from the SAME filtered rows ──
  const filtered = useMemo(() => {
    if (!data) return [];
    const cutoff = new Date(Date.now() - period * 86400000).toISOString().slice(0, 10);
    return data.days.filter(
      (r) => r.date >= cutoff && (department === "all" || r.department === department),
    );
  }, [data, period, department]);

  const trend = useMemo(() => {
    const byDate = new Map<
      string,
      { date: string; incidents: number; work_orders: number; permits: number }
    >();
    for (const r of filtered) {
      const cur = byDate.get(r.date) ?? { date: r.date, incidents: 0, work_orders: 0, permits: 0 };
      cur.incidents += r.incidents;
      cur.work_orders += r.work_orders;
      cur.permits += r.permits;
      byDate.set(r.date, cur);
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  const byDept = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of filtered) m.set(r.department, (m.get(r.department) ?? 0) + r.incidents);
    return [...m.entries()].map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const sla = useMemo(() => {
    const total = filtered.reduce((s, r) => s + r.sla_total, 0);
    const met = filtered.reduce((s, r) => s + r.sla_met, 0);
    return { total, met, pct: total ? Math.round((met / total) * 100) : 100 };
  }, [filtered]);

  const sevMix = useMemo(
    () => (data?.severity_mix ?? []).filter((s) => severity === "all" || s.severity === severity),
    [data, severity],
  );

  const totals = useMemo(
    () => ({
      incidents: filtered.reduce((s, r) => s + r.incidents, 0),
      work_orders: filtered.reduce((s, r) => s + r.work_orders, 0),
      permits: filtered.reduce((s, r) => s + r.permits, 0),
    }),
    [filtered],
  );

  const exportPdf = async () => {
    if (!data) return;
    setExporting("pdf");
    try {
      const [{ buildBiPdf }, reg, bold] = await Promise.all([
        import("@/lib/reports/bi-pdf"),
        fetch("/fonts/nexios-arabic.ttf").then((r) => r.arrayBuffer()),
        fetch("/fonts/nexios-arabic-bold.ttf").then((r) => r.arrayBuffer()),
      ]);
      const bytes = await buildBiPdf(
        { period, department, trend, byDept, sla, sevMix, compliance: data.compliance, totals },
        { regular: reg, bold },
      );
      const ab = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(ab).set(bytes);
      downloadBlob(`bi-dashboard-${period}d.pdf`, new Blob([ab], { type: "application/pdf" }));
      toast.success("تم تصدير اللوحة PDF");
    } catch {
      toast.error("تعذّر التصدير مؤقتًا — يرجى إعادة المحاولة");
    } finally {
      setExporting("");
    }
  };

  const exportXlsx = async () => {
    if (!data) return;
    setExporting("xlsx");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          trend.map((t) => ({
            التاريخ: t.date,
            البلاغات: t.incidents,
            "أوامر العمل": t.work_orders,
            التصاريح: t.permits,
          })),
        ),
        "الاتجاه",
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(byDept.map((d) => ({ الإدارة: d.name, البلاغات: d.value }))),
        "الإدارات",
      );
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(
          data.compliance.map((c) => ({ المنطقة: c.label_ar, "الامتثال %": c.pct })),
        ),
        "الامتثال",
      );
      const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
      downloadBlob(
        `bi-dashboard-${period}d.xlsx`,
        new Blob([out], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      toast.success("تم تصدير اللوحة Excel");
    } catch {
      toast.error("تعذّر التصدير مؤقتًا — يرجى إعادة المحاولة");
    } finally {
      setExporting("");
    }
  };

  const chip = (active: boolean) =>
    `min-h-[44px] rounded-full border px-4 py-2 text-xs font-semibold transition ${
      active
        ? "border-cyan-400/70 bg-cyan-400/15 text-cyan-100"
        : "border-white/15 bg-white/5 text-white/60 hover:bg-white/10"
    }`;

  return (
    <div dir="rtl" className="relative isolate min-h-screen space-y-4 px-4 py-5 text-white sm:px-6">
      <PageBriefing
        routeKey="bi"
        what="لوحات التحليل التنفيذية — اتجاهات التشغيل والامتثال وأداء اتفاقيات الخدمة بنمط Power BI."
        dataSource="sec_incidents · hcis_compliance_status — ومحاكاة مرجعية عند صمت القاعدة"
        simulation={data?.simulation ?? true}
        actions={[
          "رشّح بالفترة والإدارة والحدّة — كل الرسوم تُعاد من نفس الصفوف",
          "صدّر اللوحة الحالية إلى PDF أو Excel",
          "افتح التضمين الحقيقي متى توفر ترخيص المنشأة",
        ]}
      />

      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-tight sm:text-xl">لوحات التحليل التنفيذية</h1>
          {data?.simulation && (
            <p className="mt-1 text-[10px] text-amber-300/90">
              محاكاة مرجعية — is_simulation = true
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void exportPdf()}
            disabled={!data || exporting !== ""}
            className={chip(false)}
          >
            {exporting === "pdf" ? (
              <Loader2 className="inline h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="inline h-3.5 w-3.5" />
            )}{" "}
            PDF
          </button>
          <button
            type="button"
            onClick={() => void exportXlsx()}
            disabled={!data || exporting !== ""}
            className={chip(false)}
          >
            {exporting === "xlsx" ? (
              <Loader2 className="inline h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="inline h-3.5 w-3.5" />
            )}{" "}
            Excel
          </button>
        </div>
      </header>

      {isLoading && !data ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-white/60">
          <Loader2 className="h-4 w-4 animate-spin" /> جارٍ تجهيز اللوحات…
        </div>
      ) : data ? (
        <PowerBIEmbed>
          {/* Filters — live over the same rows */}
          <div className="flex flex-wrap items-center gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={chip(period === p.key)}
              >
                {p.label}
              </button>
            ))}
            <span className="mx-1 h-5 w-px bg-white/15" />
            <button
              type="button"
              onClick={() => setDepartment("all")}
              className={chip(department === "all")}
            >
              كل الإدارات
            </button>
            {data.departments.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDepartment(d)}
                className={chip(department === d)}
              >
                {d}
              </button>
            ))}
            <span className="mx-1 h-5 w-px bg-white/15" />
            {SEVERITIES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSeverity(s.key)}
                className={chip(severity === s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["البلاغات", totals.incidents, "#f87171"],
              ["أوامر العمل", totals.work_orders, "#22d3ee"],
              ["التصاريح", totals.permits, "#10b981"],
              ["أداء SLA", `${sla.pct}%`, sla.pct >= 90 ? "#10b981" : "#fbbf24"],
            ].map(([label, value, color]) => (
              <div key={String(label)} className="holo-card rounded-2xl p-3">
                <div className="text-[10px] text-white/55">{label}</div>
                <div className="mt-1 text-2xl font-bold" style={{ color: String(color) }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {/* 30-day trend */}
            <section aria-label="الاتجاه الزمني" className="holo-card rounded-2xl p-4">
              <h2 className="mb-3 text-sm font-bold">الاتجاه الزمني — بلاغات وأوامر عمل وتصاريح</h2>
              <div className="h-56" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "#93a6bd", fontSize: 9 }}
                      tickFormatter={(d: string) => d.slice(5)}
                    />
                    <YAxis tick={{ fill: "#93a6bd", fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#071628",
                        border: "1px solid rgba(58,232,255,0.3)",
                        borderRadius: 12,
                        fontSize: 11,
                      }}
                      labelStyle={{ color: "#dff6ff" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="incidents"
                      name="البلاغات"
                      stroke="#f87171"
                      fill="rgba(248,113,113,0.18)"
                      strokeWidth={1.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="work_orders"
                      name="أوامر العمل"
                      stroke="#22d3ee"
                      fill="rgba(34,211,238,0.15)"
                      strokeWidth={1.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="permits"
                      name="التصاريح"
                      stroke="#10b981"
                      fill="rgba(16,185,129,0.14)"
                      strokeWidth={1.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Distribution by department */}
            <section aria-label="التوزيع حسب الإدارة" className="holo-card rounded-2xl p-4">
              <h2 className="mb-3 text-sm font-bold">توزيع البلاغات حسب الإدارة</h2>
              <div className="h-56" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byDept} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#93a6bd", fontSize: 9 }} />
                    <YAxis tick={{ fill: "#93a6bd", fontSize: 9 }} />
                    <Tooltip
                      contentStyle={{
                        background: "#071628",
                        border: "1px solid rgba(58,232,255,0.3)",
                        borderRadius: 12,
                        fontSize: 11,
                      }}
                    />
                    <Bar dataKey="value" name="البلاغات" radius={[4, 4, 0, 0]}>
                      {byDept.map((_, i) => (
                        <Cell
                          key={i}
                          fill={["#22d3ee", "#10b981", "#fbbf24", "#f87171", "#648CBE"][i % 5]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* HCIS compliance by region */}
            <section aria-label="امتثال HCIS" className="holo-card rounded-2xl p-4">
              <h2 className="mb-3 text-sm font-bold">امتثال HCIS حسب المنطقة</h2>
              <ul className="space-y-3">
                {data.compliance.map((c) => (
                  <li key={c.region_id}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-white/75">{c.label_ar}</span>
                      <span
                        className="font-bold"
                        style={{
                          color: c.pct >= 95 ? "#10b981" : c.pct >= 90 ? "#22d3ee" : "#fbbf24",
                        }}
                      >
                        {c.pct}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${c.pct}%`,
                          background: c.pct >= 95 ? "#10b981" : c.pct >= 90 ? "#22d3ee" : "#fbbf24",
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              {/* Severity mix (severity filter applies here) */}
              <h3 className="mb-2 mt-5 text-xs font-bold text-white/70">مزيج الحِدّة للبلاغات</h3>
              <div className="flex flex-wrap gap-2">
                {sevMix.map((s) => (
                  <span
                    key={s.severity}
                    className="rounded-full border px-3 py-1 text-[11px]"
                    style={{
                      borderColor: `${SEV_COLOR[s.severity]}66`,
                      color: SEV_COLOR[s.severity],
                    }}
                  >
                    {SEVERITIES.find((x) => x.key === s.severity)?.label} · {s.count}
                  </span>
                ))}
              </div>
            </section>

            {/* Weekly heatmap */}
            <section aria-label="الخريطة الحرارية الأسبوعية" className="holo-card rounded-2xl p-4">
              <h2 className="mb-3 text-sm font-bold">
                الخريطة الحرارية — كثافة الأحداث (يوم × ساعة)
              </h2>
              <div className="overflow-x-auto">
                <div className="min-w-[520px]">
                  {data.heatmap.map((row, wd) => (
                    <div key={wd} className="mb-1 flex items-center gap-1">
                      <span className="w-14 shrink-0 text-[9px] text-white/50">{WEEKDAYS[wd]}</span>
                      {row.map((v, h) => (
                        <span
                          key={h}
                          title={`${WEEKDAYS[wd]} ${h}:00 — كثافة ${Math.round(v * 100)}%`}
                          className="h-4 flex-1 rounded-[3px]"
                          style={{ background: `rgba(34,211,238,${0.06 + v * 0.7})` }}
                        />
                      ))}
                    </div>
                  ))}
                  <div className="mt-1 flex gap-1 ps-14 text-[8px] text-white/40" dir="ltr">
                    {Array.from({ length: 24 }, (_, h) => (
                      <span key={h} className="flex-1 text-center">
                        {h % 4 === 0 ? h : ""}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </PowerBIEmbed>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-sm text-white/70">
            {isError
              ? "تعذّر تحميل اللوحات مؤقتًا — يرجى إعادة المحاولة."
              : "لا توجد بيانات لعرضها حاليًا."}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-cyan-400/50 bg-cyan-400/10 px-5 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/20"
          >
            إعادة المحاولة
          </button>
        </div>
      )}
    </div>
  );
}
