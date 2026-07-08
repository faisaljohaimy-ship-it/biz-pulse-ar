import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSecOverview } from "@/lib/sec.functions";
import { SecPageHeader, StatCard } from "@/components/sec/sec-shell";
import { SecLiveBadge } from "@/components/sec/SecLiveBadge";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";

export const Route = createFileRoute("/_authenticated/sec/kpi")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: KPI,
});

function KPI() {
  const fetchOverview = useServerFn(getSecOverview);
  const { data, dataUpdatedAt, isFetching } = useQuery({
    queryKey: ["sec-overview"],
    queryFn: () => fetchOverview(),
  });
  if (!data) return <div className="text-sm text-muted-foreground">جاري التحميل…</div>;

  const total = data.incidents.length || 1;
  const resolved = data.incidents.filter(
    (i) => i.status === "resolved" || i.status === "closed",
  ).length;
  const mttr = data.incidents
    .filter((i) => i.response_minutes != null)
    .reduce((s, i, _, a) => s + (i.response_minutes ?? 0) / (a.length || 1), 0);
  const patrolCompletion = data.patrols.length
    ? Math.round(
        (data.patrols.reduce(
          (s, p) => s + (p.checkpoints_total ? p.checkpoints_done / p.checkpoints_total : 0),
          0,
        ) /
          data.patrols.length) *
          100,
      )
    : 0;
  const compliance = data.contractors.length
    ? Math.round(
        data.contractors.reduce((s, c) => s + c.compliance_score, 0) / data.contractors.length,
      )
    : 0;
  const assetHealth = data.assets.length
    ? Math.round(data.assets.reduce((s, a) => s + a.health, 0) / data.assets.length)
    : 0;

  const kpis = [
    {
      label: "نسبة حل البلاغات",
      value: `${Math.round((resolved / total) * 100)}%`,
      target: "≥ 85%",
      tone: resolved / total >= 0.85 ? "success" : ("warning" as const),
    },
    {
      label: "MTTR — متوسط زمن الاستجابة",
      value: `${Math.round(mttr)} د`,
      target: "≤ 15 د",
      tone: mttr <= 15 ? "success" : ("warning" as const),
    },
    {
      label: "إنجاز الدوريات",
      value: `${patrolCompletion}%`,
      target: "≥ 95%",
      tone: patrolCompletion >= 95 ? "success" : ("warning" as const),
    },
    {
      label: "امتثال المقاولين",
      value: `${compliance}%`,
      target: "≥ 90%",
      tone: compliance >= 90 ? "success" : ("warning" as const),
    },
    {
      label: "صحة الأصول الأمنية",
      value: `${assetHealth}%`,
      target: "≥ 92%",
      tone: assetHealth >= 92 ? "success" : ("warning" as const),
    },
    {
      label: "تنبيهات CCTV غير مُستجاب لها",
      value: data.counts.cctv_new,
      target: "= 0",
      tone: data.counts.cctv_new === 0 ? "success" : ("danger" as const),
    },
    {
      label: "بلاغات حرجة مفتوحة",
      value: data.counts.incidents_critical,
      target: "= 0",
      tone: data.counts.incidents_critical === 0 ? "success" : ("danger" as const),
    },
    {
      label: "مواقع تشغيلية",
      value: `${data.sites.filter((s) => s.status === "operational").length}/${data.sites.length}`,
    },
  ];

  return (
    <div className="space-y-4">
      <SecPageHeader title="محرك مؤشرات الأداء" subtitle="KPIs محسوبة فورياً من بيانات العمليات">
        <SecLiveBadge dataUpdatedAt={dataUpdatedAt} isFetching={isFetching} source="sec_kpis" />
      </SecPageHeader>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k, i) => (
          <StatCard
            key={i}
            label={k.label}
            value={k.value}
            hint={k.target ? `الهدف: ${k.target}` : undefined}
            tone={(k as { tone?: "default" | "danger" | "warning" | "success" }).tone ?? "default"}
          />
        ))}
      </div>
    </div>
  );
}
