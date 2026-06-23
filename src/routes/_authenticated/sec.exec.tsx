import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSecOverview } from "@/lib/sec.functions";
import { SecPageHeader, StatCard } from "@/components/sec/sec-shell";

export const Route = createFileRoute("/_authenticated/sec/exec")({
  component: ExecDashboard,
});

function ExecDashboard() {
  const fetchOverview = useServerFn(getSecOverview);
  const { data } = useQuery({ queryKey: ["sec-overview"], queryFn: () => fetchOverview() });
  if (!data) return <div className="text-sm text-muted-foreground">جاري التحميل…</div>;

  const totalIncidents = data.incidents.length || 1;
  const resolved = data.incidents.filter((i) => i.status === "resolved" || i.status === "closed").length;
  const resolutionRate = Math.round((resolved / totalIncidents) * 100);
  const avgResp = data.incidents
    .filter((i) => i.response_minutes != null)
    .reduce((s, i, _, arr) => s + (i.response_minutes ?? 0) / (arr.length || 1), 0);
  const complianceAvg =
    data.contractors.length > 0
      ? Math.round(data.contractors.reduce((s, c) => s + c.compliance_score, 0) / data.contractors.length)
      : 0;
  const assetHealthAvg =
    data.assets.length > 0
      ? Math.round(data.assets.reduce((s, a) => s + a.health, 0) / data.assets.length)
      : 0;

  return (
    <div className="space-y-4">
      <SecPageHeader
        title="اللوحة التنفيذية للأمن الصناعي"
        subtitle="مؤشرات الأداء الرئيسية للقيادة — منطقة غرب"
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="نسبة حل البلاغات" value={`${resolutionRate}%`} tone={resolutionRate >= 80 ? "success" : "warning"} />
        <StatCard label="متوسط زمن الاستجابة" value={`${Math.round(avgResp)} د`} hint="دقائق" />
        <StatCard label="معدّل امتثال المقاولين" value={`${complianceAvg}%`} tone={complianceAvg >= 90 ? "success" : "warning"} />
        <StatCard label="صحة الأصول الأمنية" value={`${assetHealthAvg}%`} tone={assetHealthAvg >= 90 ? "success" : "warning"} />
        <StatCard label="بلاغات حرجة مفتوحة" value={data.counts.incidents_critical} tone={data.counts.incidents_critical ? "danger" : "success"} />
        <StatCard label="أصول متأثرة" value={data.counts.assets_offline} tone={data.counts.assets_offline ? "warning" : "success"} />
        <StatCard label="مواقع نشطة" value={data.counts.sites} />
        <StatCard label="دوريات نشطة" value={data.counts.patrols_active} />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold">أعلى المخاطر التشغيلية اليوم</h2>
        <ul className="space-y-2">
          {data.incidents
            .filter((i) => i.severity === "critical" || i.severity === "high")
            .slice(0, 5)
            .map((i) => (
              <li key={i.id} className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3">
                <div>
                  <div className="font-medium text-foreground">{i.title_ar}</div>
                  <div className="text-xs text-muted-foreground">{i.category} · {i.ref}</div>
                </div>
                <span className="text-xs font-medium text-red-500">{i.severity}</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
