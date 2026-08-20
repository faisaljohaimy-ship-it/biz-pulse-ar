import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSecOverview, pctOrUnmeasured, numOrUnmeasured } from "@/lib/sec.functions";
import { useAuth } from "@/lib/auth-context";
import { SecPageHeader, StatCard, SecLoading, SecError } from "@/components/sec/sec-shell";
import { SecLiveBadge } from "@/components/sec/SecLiveBadge";

export const Route = createFileRoute("/_authenticated/sec/kpi")({
  // OWNER DIRECTIVE ٢٠٢٦/٠٨/٢٠ — «حذف الواجهة بالكامل». حُجبت
  // (hidden-routes.ts) والملفات محفوظة بسياسة الإخفاء؛ ترتدّ إلى /sec.
  beforeLoad: () => {
    throw redirect({ to: "/sec" });
  },
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: KPI,
});

function KPI() {
  const { user, loading: authLoading } = useAuth();
  const fetchOverview = useServerFn(getSecOverview);
  const { data, dataUpdatedAt, isFetching, isError, refetch } = useQuery({
    queryKey: ["sec-overview", user?.id ?? "anon"],
    queryFn: () => fetchOverview(),
    // Public showcase: guests fetch too (anon RLS / built-in simulation).
    enabled: !authLoading,
  });
  if (isError) return <SecError onRetry={() => refetch()} />;
  if (!data) return <SecLoading />;

  // المادة ٢٧ — الصدق العددي: المتوسط/النسبة بلا عيّنة لا وجود له، فيعود
  // `null` ويُعرض «لم يُقَس» بنغمة محايدة — لا «MTTR: 0 د» بشارة «سليم»
  // ولا «نسبة حل: 0%» بإنذار مختلَق من غياب البيانات. العدّ يبقى قياسًا
  // صحيحًا ولو كان صفرًا.
  const resolved = data.incidents.filter(
    (i) => i.status === "resolved" || i.status === "closed",
  ).length;
  const resolutionRate = data.incidents.length
    ? Math.round((resolved / data.incidents.length) * 100)
    : null;
  const mttrSamples = data.incidents.filter((i) => i.response_minutes != null);
  const mttr = mttrSamples.length
    ? Math.round(
        mttrSamples.reduce((s, i) => s + (i.response_minutes ?? 0), 0) / mttrSamples.length,
      )
    : null;
  const patrolCompletion = data.patrols.length
    ? Math.round(
        (data.patrols.reduce(
          (s, p) => s + (p.checkpoints_total ? p.checkpoints_done / p.checkpoints_total : 0),
          0,
        ) /
          data.patrols.length) *
          100,
      )
    : null;
  const compliance = data.contractors.length
    ? Math.round(
        data.contractors.reduce((s, c) => s + c.compliance_score, 0) / data.contractors.length,
      )
    : null;
  const assetHealth = data.assets.length
    ? Math.round(data.assets.reduce((s, a) => s + a.health, 0) / data.assets.length)
    : null;

  const kpis: Array<{
    label: string;
    value: string | number;
    target?: string;
    tone?: "default" | "danger" | "warning" | "success";
  }> = [
    {
      label: "نسبة حل البلاغات",
      value: pctOrUnmeasured(resolutionRate),
      target: "≥ 85%",
      tone: resolutionRate === null ? undefined : resolutionRate >= 85 ? "success" : "warning",
    },
    {
      label: "MTTR — متوسط زمن الاستجابة",
      value: numOrUnmeasured(mttr, " د"),
      target: "≤ 15 د",
      tone: mttr === null ? undefined : mttr <= 15 ? "success" : "warning",
    },
    {
      label: "إنجاز الدوريات",
      value: pctOrUnmeasured(patrolCompletion),
      target: "≥ 95%",
      tone: patrolCompletion === null ? undefined : patrolCompletion >= 95 ? "success" : "warning",
    },
    {
      label: "امتثال المقاولين",
      value: pctOrUnmeasured(compliance),
      target: "≥ 90%",
      tone: compliance === null ? undefined : compliance >= 90 ? "success" : "warning",
    },
    {
      label: "صحة الأصول الأمنية",
      value: pctOrUnmeasured(assetHealth),
      target: "≥ 92%",
      tone: assetHealth === null ? undefined : assetHealth >= 92 ? "success" : "warning",
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
