// Hajj Operations Command Center — مشاعر 1447
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Users,
  Activity,
  Radio,
  Sparkles,
  Droplet,
  Stethoscope,
  Truck,
  Shield,
  Loader2,
} from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader, Section } from "@/components/page-header";
import { LiveStatus } from "@/components/state/LiveStatus";
import { useI18n } from "@/lib/i18n";
import { useLiveRows, fmtRel } from "@/lib/runtime/useLiveRows";
import {
  getHajjOverview,
  updateHajjTaskStatus,
  generateHajjExecutiveSummary,
  type HajjSite,
  type HajjStation,
  type HajjTask,
  type HajjKpi,
} from "@/lib/hajj.functions";

export const Route = createFileRoute("/_authenticated/hajj")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: HajjCommandCenter,
});

const CATEGORY_ICON: Record<string, typeof Stethoscope> = {
  medical: Stethoscope,
  water: Droplet,
  transport: Truck,
  security: Shield,
};
const STATUS_TONE = {
  safe: {
    cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
    label_ar: "آمن",
    label_en: "Safe",
  },
  alert: {
    cls: "bg-amber-500/15 text-amber-300 border-amber-500/40",
    label_ar: "تنبيه",
    label_en: "Alert",
  },
  danger: {
    cls: "bg-rose-500/15 text-rose-300 border-rose-500/40",
    label_ar: "خطر",
    label_en: "Danger",
  },
} as const;

function HajjCommandCenter() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const qc = useQueryClient();
  const fetchOverview = useServerFn(getHajjOverview);
  const mutateStatus = useServerFn(updateHajjTaskStatus);
  const genSummary = useServerFn(generateHajjExecutiveSummary);

  const { data, isLoading } = useQuery({
    queryKey: ["hajj-overview"],
    queryFn: () => fetchOverview({}),
    refetchInterval: 30_000,
  });

  // Realtime: refetch on changes
  useLiveRows<unknown>("hajj_tasks", (q) => q.select("id").limit(1), [qc]);
  useLiveRows<unknown>("hajj_stations", (q) => q.select("id").limit(1), [qc]);
  useLiveRows<unknown>("hajj_sites", (q) => q.select("id").limit(1), [qc]);

  const sites: HajjSite[] = data?.sites ?? [];
  const stations: HajjStation[] = data?.stations ?? [];
  const tasks: HajjTask[] = data?.tasks ?? [];
  const kpi: HajjKpi | null = data?.kpi ?? null;

  const taskMut = useMutation({
    mutationFn: (vars: { id: string; status: "in_progress" | "done" }) =>
      mutateStatus({ data: vars }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["hajj-overview"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [summary, setSummary] = useState<string | null>(null);
  const summaryMut = useMutation({
    mutationFn: () => genSummary({}),
    onSuccess: (r) => {
      setSummary(r.summary);
      toast.success(ar ? "تم توليد الملخص" : "Summary generated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const counts = useMemo(
    () => ({
      pending: tasks.filter((t) => t.status === "pending").length,
      inProgress: tasks.filter((t) => t.status === "in_progress").length,
      done: tasks.filter((t) => t.status === "done").length,
      alerts: sites.filter((s) => s.status !== "safe").length,
    }),
    [tasks, sites],
  );

  return (
    <Section>
      <PageHeader
        icon={MapPin}
        title={
          ar
            ? "مركز قيادة عمليات الحج — مشاعر 1447"
            : "Hajj Operations Command Center — Mashaer 1447"
        }
        subtitle={
          ar
            ? "خريطة المشاعر · المحطات · الحوادث · المهام التشغيلية · ARIA"
            : "Holy sites · Stations · Incidents · Tasks · ARIA"
        }
        badge={ar ? "حي" : "Live"}
      />

      {/* KPI WALL */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <KpiCell
          label={ar ? "الحوادث المفتوحة" : "Open incidents"}
          value={kpi?.open_incidents ?? 0}
          icon={AlertTriangle}
          tone="rose"
        />
        <KpiCell
          label={ar ? "التنبيهات النشطة" : "Active alerts"}
          value={counts.alerts}
          icon={Radio}
          tone="amber"
        />
        <KpiCell
          label={ar ? "المهام المنجزة" : "Tasks done"}
          value={kpi?.tasks_done ?? counts.done}
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiCell
          label={ar ? "موظفون ميدانيون" : "Field staff"}
          value={kpi?.field_staff ?? 0}
          icon={Users}
          tone="cyan"
        />
        <KpiCell
          label={ar ? "المحطات المتصلة" : "Stations online"}
          value={`${kpi?.stations_online ?? 0}/${kpi?.stations_total ?? stations.length}`}
          icon={Activity}
          tone="cyan"
        />
        <KpiCell
          label={ar ? "معدل الامتثال" : "Compliance"}
          value={`${kpi?.compliance_pct ?? 0}%`}
          icon={Sparkles}
          tone="emerald"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Sites Map */}
        <Card className="p-4 glass-card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">{ar ? "خريطة المشاعر المقدسة" : "Holy Sites Map"}</h3>
            <Badge variant="outline">
              {sites.length} {ar ? "مواقع" : "sites"}
            </Badge>
          </div>
          {isLoading ? (
            <LiveStatus variant="initializing" />
          ) : sites.length === 0 ? (
            <LiveStatus
              variant="monitoring"
              label={ar ? "بانتظار بيانات المواقع..." : "Waiting for site data..."}
            />
          ) : (
            <SitesMap sites={sites} ar={ar} />
          )}
        </Card>

        {/* Live Alerts */}
        <Card className="p-4 glass-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">{ar ? "التنبيهات الحية" : "Live Alerts"}</h3>
            <Badge variant="destructive">{counts.pending}</Badge>
          </div>
          <ScrollArea className="h-[340px] pr-2">
            <div className="space-y-2">
              {tasks
                .filter((t) => t.status !== "done" && t.status !== "cancelled")
                .slice(0, 10)
                .map((t) => {
                  const Icon = CATEGORY_ICON[t.category] ?? AlertTriangle;
                  const station = stations.find((s) => s.id === t.station_id);
                  return (
                    <div
                      key={t.id}
                      className="rounded-lg border border-border/40 bg-background/40 p-2.5 text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <Icon className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {ar ? t.title_ar : (t.title_en ?? t.title_ar)}
                            </div>
                            <div className="truncate text-[11px] text-muted-foreground">
                              {station ? (ar ? station.name_ar : station.name_en) : "—"} ·{" "}
                              {fmtRel(t.reported_at)}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant={
                            t.priority === "P5"
                              ? "destructive"
                              : t.priority === "P4"
                                ? "default"
                                : "secondary"
                          }
                          className="shrink-0"
                        >
                          {t.priority}
                        </Badge>
                      </div>
                      <div className="mt-2 flex gap-1">
                        {t.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => taskMut.mutate({ id: t.id, status: "in_progress" })}
                          >
                            {ar ? "بدء" : "Start"}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs"
                          onClick={() => taskMut.mutate({ id: t.id, status: "done" })}
                        >
                          {ar ? "تم" : "Done"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              {tasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length ===
                0 && (
                <LiveStatus
                  variant="monitoring"
                  label={ar ? "لا توجد تنبيهات نشطة" : "No active alerts"}
                />
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Stations grid */}
      <Card className="p-4 glass-card">
        <h3 className="mb-3 font-semibold">{ar ? "المحطات التشغيلية" : "Operational Stations"}</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stations.map((st) => {
            const site = sites.find((s) => s.id === st.site_id);
            const dotCls =
              st.network === "online"
                ? "bg-emerald-400"
                : st.network === "degraded"
                  ? "bg-amber-400"
                  : "bg-rose-400";
            return (
              <div key={st.id} className="rounded-lg border border-border/40 bg-background/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {ar ? st.name_ar : st.name_en}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {site ? (ar ? site.name_ar : site.name_en) : st.code}
                    </div>
                  </div>
                  <span className={`size-2 rounded-full ${dotCls} animate-pulse`} />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <Mini label={ar ? "موظفون" : "Staff"} value={st.staff_count} />
                  <Mini label={ar ? "بلاغات" : "Reports"} value={st.reports_count} />
                  <Mini label={ar ? "حوادث" : "Incidents"} value={st.incidents_count} />
                </div>
              </div>
            );
          })}
          {stations.length === 0 && !isLoading && (
            <LiveStatus
              variant="monitoring"
              label={ar ? "بانتظار اتصال المحطات..." : "Waiting for stations..."}
            />
          )}
        </div>
      </Card>

      {/* Executive summary */}
      <Card className="p-4 glass-card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-cyan-400" />{" "}
            {ar ? "الملخص التنفيذي بواسطة ARIA" : "Executive Summary by ARIA"}
          </h3>
          <Button onClick={() => summaryMut.mutate()} disabled={summaryMut.isPending} size="sm">
            {summaryMut.isPending && <Loader2 className="h-3 w-3 animate-spin me-1" />}
            {ar ? "توليد ملخص تنفيذي" : "Generate executive summary"}
          </Button>
        </div>
        {summary ? (
          <pre className="whitespace-pre-wrap rounded-md border border-border/40 bg-background/40 p-3 text-sm leading-7">
            {summary}
          </pre>
        ) : (
          <LiveStatus variant="idle" label={ar ? "اضغط لتوليد ملخص" : "Click to generate"} />
        )}
        {kpi && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>{ar ? "الامتثال" : "Compliance"}</span>
              <span>{kpi.compliance_pct}%</span>
            </div>
            <Progress value={Number(kpi.compliance_pct)} />
          </div>
        )}
      </Card>
    </Section>
  );
}

function KpiCell({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: typeof Activity;
  tone: "rose" | "amber" | "emerald" | "cyan";
}) {
  const toneCls = {
    rose: "text-rose-300 border-rose-500/30",
    amber: "text-amber-300 border-amber-500/30",
    emerald: "text-emerald-300 border-emerald-500/30",
    cyan: "text-cyan-300 border-cyan-500/30",
  }[tone];
  return (
    <Card className={`p-3 glass-card border ${toneCls}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className="h-3.5 w-3.5 opacity-70" />
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted/20 p-1.5">
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function SitesMap({ sites, ar }: { sites: HajjSite[]; ar: boolean }) {
  // Bounding box around Makkah area
  const minLat = 21.32,
    maxLat = 21.44,
    minLng = 39.85,
    maxLng = 40.0;
  const pos = (lat: number, lng: number) => ({
    left: `${((lng - minLng) / (maxLng - minLng)) * 100}%`,
    top: `${(1 - (lat - minLat) / (maxLat - minLat)) * 100}%`,
  });
  return (
    <div
      className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-cyan-500/20"
      style={{
        background:
          "radial-gradient(circle at 30% 40%, rgba(0,212,255,0.12), transparent 60%), " +
          "radial-gradient(circle at 70% 60%, rgba(58,232,255,0.08), transparent 55%), " +
          "linear-gradient(135deg, #061A2E, #0a2540)",
      }}
    >
      {/* grid */}
      <svg className="absolute inset-0 size-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hajj-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hajj-grid)" className="text-cyan-400" />
      </svg>

      {sites.map((s) => {
        const tone = STATUS_TONE[s.status];
        return (
          <div
            key={s.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={pos(s.lat, s.lng)}
          >
            <div className="relative flex flex-col items-center">
              <span className={`relative size-4 rounded-full border ${tone.cls}`}>
                <span
                  className={`absolute inset-0 rounded-full ${tone.cls} animate-ping opacity-60`}
                />
              </span>
              <div
                className={`mt-1 rounded border px-2 py-0.5 text-[10px] font-medium backdrop-blur-md ${tone.cls}`}
              >
                {ar ? s.name_ar : s.name_en} · {s.staff_count}
              </div>
            </div>
          </div>
        );
      })}

      <div className="absolute bottom-2 end-2 flex gap-2 text-[10px]">
        {(["safe", "alert", "danger"] as const).map((k) => (
          <span key={k} className={`rounded border px-2 py-0.5 ${STATUS_TONE[k].cls}`}>
            {ar ? STATUS_TONE[k].label_ar : STATUS_TONE[k].label_en}
          </span>
        ))}
      </div>
    </div>
  );
}
