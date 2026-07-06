import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
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
import { getSystemPulse, getBusinessKpis } from "@/lib/executive-presentation.functions";
import { EnterpriseActivityFeed } from "@/components/events/EventTimeline";
import { SystemPulseStrip } from "@/components/executive/SystemPulseStrip";
import { BusinessKpiPanel } from "@/components/executive/BusinessKpiPanel";
import { DecisionCenter } from "@/components/executive/DecisionCenter";
import { ExecutiveTimeline } from "@/components/executive/ExecutiveTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";


export const Route = createFileRoute("/_authenticated/live-dashboard")({
  head: () => ({
    meta: [
      { title: "Live Executive Dashboard — NEXIOS AI OS" },
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
      <div className="text-xs opacity-70 mt-1">{String(error?.message || error)}</div>
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
  tone?: "primary" | "secondary" | "rose" | "amber" | "emerald";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const toneMap = {
    primary: "text-primary border-primary/30",
    secondary: "text-secondary border-secondary/30",
    rose: "text-rose-400 border-rose-400/30",
    amber: "text-amber-400 border-amber-400/30",
    emerald: "text-emerald-400 border-emerald-400/30",
  } as const;
  return (
    <div className={`rounded-xl border bg-background/40 backdrop-blur-xl p-4 ${toneMap[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest text-foreground/60">
          {label}
        </span>
        <Icon className="w-4 h-4 opacity-70" />
      </div>
      <div className={`mt-2 text-2xl md:text-3xl font-bold tabular-nums ${toneMap[tone].split(" ")[0]}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-foreground/50 mt-1 font-mono">{sub}</div>}
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
          {hint && <div className="text-[10px] text-foreground/40 font-mono">{hint}</div>}
        </div>
      </div>
      <div className="h-56">{children}</div>
    </div>
  );
}

function LiveExecutiveDashboard() {
  const [range, setRange] = useState<RangeKey>("30");
  const [search, setSearch] = useState("");

  const kpisQ = useQuery({
    queryKey: ["exec-kpis"],
    queryFn: () => getExecKpis(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const tsQ = useQuery({
    queryKey: ["exec-timeseries", range],
    queryFn: () => getExecTimeseries({ data: { days: Number(range) } }),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const pulseQ = useQuery({
    queryKey: ["exec-pulse"],
    queryFn: () => getSystemPulse(),
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  const bizQ = useQuery({
    queryKey: ["exec-business-kpis"],
    queryFn: () => getBusinessKpis(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const k = kpisQ.data;
  const ts = tsQ.data;


  const filteredPoints = useMemo(() => {
    if (!ts) return [];
    if (!search.trim()) return ts.points;
    const s = search.trim();
    return ts.points.filter((p) => p.day.includes(s));
  }, [ts, search]);

  function exportExcel() {
    if (!ts) return;
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
    XLSX.writeFile(wb, `nexios-executive-${range}d-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportPdf() {
    if (!ts) return;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("NEXIOS AI OS — Executive Dashboard", 14, 16);
    doc.setFontSize(10);
    doc.text(
      `Range: last ${range} days   Generated: ${new Date().toISOString()}`,
      14,
      23,
    );
    if (k) {
      doc.text(
        `Open Incidents: ${k.incidents_open}   Critical: ${k.incidents_critical}   ` +
          `Active Patrols: ${k.patrols_active}   Work Orders (open): ${k.wo_open}   ` +
          `Readiness: ${Math.round(k.executive_readiness ?? 0)}%   Risk: ${Math.round(k.risk_index ?? 0)}%`,
        14,
        30,
      );
    }
    doc.setFontSize(11);
    doc.text("Totals", 14, 42);
    doc.setFontSize(9);
    doc.text(
      `Incidents: ${ts.totals.incidents}   Resolved: ${ts.totals.incidents_resolved}   ` +
        `Resolution: ${ts.totals.resolution_rate}%   WO opened: ${ts.totals.work_orders_opened}   ` +
        `WO closed: ${ts.totals.work_orders_closed}   Patrols: ${ts.totals.patrols_completed}   ` +
        `Avg response: ${ts.totals.avg_response_minutes ?? "—"} min`,
      14,
      48,
    );
    doc.setFontSize(11);
    doc.text("Daily Series", 14, 60);
    doc.setFontSize(8);
    let y = 66;
    doc.text("Date        Inc  Crit High Res  WO+  WO-  Patrol  AvgResp", 14, y);
    y += 5;
    for (const p of filteredPoints.slice(-40)) {
      doc.text(
        `${p.day}  ${String(p.incidents_total).padStart(3)}  ${String(p.incidents_critical).padStart(3)}  ` +
          `${String(p.incidents_high).padStart(3)}  ${String(p.incidents_resolved).padStart(3)}  ` +
          `${String(p.work_orders_opened).padStart(3)}  ${String(p.work_orders_closed).padStart(3)}  ` +
          `${String(p.patrols_completed).padStart(5)}   ${p.avg_response_minutes ?? "—"}`,
        14,
        y,
      );
      y += 4;
      if (y > 195) {
        doc.addPage();
        y = 20;
      }
    }
    doc.save(`nexios-executive-${range}d-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  const chartAxis = { stroke: "hsl(var(--muted-foreground))", fontSize: 10 };

  return (
    <div className="min-h-screen bg-[#04060d] text-slate-100 p-4 md:p-6" dir="rtl">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-primary/80">
            <span
              className={`w-1.5 h-1.5 rounded-full bg-primary ${tsQ.isFetching || kpisQ.isFetching ? "animate-pulse" : ""}`}
            />
            {tsQ.isFetching || kpisQ.isFetching ? "SYNCING" : "LIVE"} · NEXIOS · EXECUTIVE
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-l from-primary to-secondary mt-1">
            لوحة القيادة التنفيذية الحية
          </h1>
          <div className="text-xs text-foreground/50 mt-1">
            Live Executive Dashboard · Real-time KPIs, trends & activity
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-white/10 overflow-hidden">
            {(Object.keys(RANGE_LABEL) as RangeKey[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 text-xs font-mono ${
                  range === r ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-white/5"
                }`}
              >
                {RANGE_LABEL[r].ar}
              </button>
            ))}
          </div>
          <Input
            placeholder="بحث بالتاريخ YYYY-MM-DD"
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
            <RefreshCw className="w-3.5 h-3.5 me-1.5" /> تحديث
          </Button>
          <Button size="sm" variant="outline" onClick={exportExcel} disabled={!ts}>
            <FileSpreadsheet className="w-3.5 h-3.5 me-1.5" /> Excel
          </Button>
          <Button size="sm" variant="outline" onClick={exportPdf} disabled={!ts}>
            <FileText className="w-3.5 h-3.5 me-1.5" /> PDF
          </Button>
        </div>
      </header>

      {/* Executive System Pulse */}
      {pulseQ.data && (
        <div className="mb-6">
          <SystemPulseStrip chips={pulseQ.data.chips} confidence={pulseQ.data.confidence} />
        </div>
      )}

      {/* Business KPIs */}
      {bizQ.data && (
        <div className="mb-6">
          <BusinessKpiPanel data={bizQ.data} />
        </div>
      )}

      {/* KPI strip */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">

        <KpiCard
          label="Open Incidents"
          value={String(k?.incidents_open ?? "—")}
          sub={`${k?.incidents_critical ?? 0} critical`}
          tone="rose"
          icon={AlertTriangle}
        />
        <KpiCard
          label="Resolution Rate"
          value={ts ? `${ts.totals.resolution_rate}%` : "—"}
          sub={`last ${range}d`}
          tone="emerald"
          icon={ShieldCheck}
        />
        <KpiCard
          label="Active Patrols"
          value={String(k?.patrols_active ?? "—")}
          sub={`${Math.round(k?.patrol_completion ?? 0)}% completion`}
          tone="secondary"
          icon={Activity}
        />
        <KpiCard
          label="Work Orders"
          value={String(k?.wo_open ?? "—")}
          sub={ts ? `${ts.totals.work_orders_closed} closed / ${range}d` : "open"}
          tone="amber"
          icon={Wrench}
        />
        <KpiCard
          label="Avg Response"
          value={ts?.totals.avg_response_minutes != null ? `${ts.totals.avg_response_minutes}m` : "—"}
          sub="critical + high"
          tone="primary"
          icon={Gauge}
        />
        <KpiCard
          label="Readiness"
          value={`${Math.round(k?.executive_readiness ?? 0)}%`}
          sub={`risk ${Math.round(k?.risk_index ?? 0)}%`}
          tone="primary"
          icon={Download}
        />
      </section>

      {/* Charts + activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <ChartCard title="اتجاه البلاغات حسب الخطورة" hint={`Incidents by severity · last ${range} days`}>
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
                <Legend wrapperStyle={{ fontSize: 11 }} />
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
                  <Legend wrapperStyle={{ fontSize: 11 }} />
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
              <dd className="text-primary text-end">{ts?.totals.incidents ?? "—"}</dd>
              <dt className="text-foreground/50">Resolved</dt>
              <dd className="text-emerald-400 text-end">{ts?.totals.incidents_resolved ?? "—"}</dd>
              <dt className="text-foreground/50">Resolution</dt>
              <dd className="text-emerald-400 text-end">{ts ? `${ts.totals.resolution_rate}%` : "—"}</dd>
              <dt className="text-foreground/50">WO opened</dt>
              <dd className="text-amber-400 text-end">{ts?.totals.work_orders_opened ?? "—"}</dd>
              <dt className="text-foreground/50">WO closed</dt>
              <dd className="text-emerald-400 text-end">{ts?.totals.work_orders_closed ?? "—"}</dd>
              <dt className="text-foreground/50">Patrols</dt>
              <dd className="text-secondary text-end">{ts?.totals.patrols_completed ?? "—"}</dd>
              <dt className="text-foreground/50">Avg response</dt>
              <dd className="text-primary text-end">
                {ts?.totals.avg_response_minutes != null ? `${ts.totals.avg_response_minutes}m` : "—"}
              </dd>
            </dl>
          </div>

          <EnterpriseActivityFeed height="h-[520px]" compact filter={{ limit: 60 }} />
        </aside>
      </div>

      {tsQ.isError && (
        <div className="mt-4 text-xs text-rose-400 font-mono">
          {String((tsQ.error as Error).message)}
        </div>
      )}
    </div>
  );
}
