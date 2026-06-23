import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getExecKpis } from "@/lib/sec.functions";
import { SecPageHeader, StatCard } from "@/components/sec/sec-shell";

export const Route = createFileRoute("/_authenticated/sec/exec")({
  component: ExecDashboard,
});

function ExecDashboard() {
  const fetch = useServerFn(getExecKpis);
  const { data: k } = useQuery({ queryKey: ["sec-exec-kpis"], queryFn: () => fetch(), refetchInterval: 30_000 });
  if (!k) return <div className="text-sm text-muted-foreground">جاري التحميل…</div>;

  const fmt = (n: number) => n.toLocaleString("ar-SA");
  const pct = (n: number) => `${n}%`;

  return (
    <div className="space-y-5">
      <SecPageHeader
        title="لوحة القيادة التنفيذية"
        subtitle="إدارة الأمن الصناعي بالمنطقة الغربية — مؤشرات الأداء التنفيذية الحيّة"
      />

      {/* Top Score */}
      <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">الجاهزية التشغيلية</div>
            <div className="mt-1 text-5xl font-bold text-foreground">{pct(k.executive_readiness)}</div>
            <p className="mt-1 text-xs text-muted-foreground">مركّب من صحة CCTV، التحكم بالدخول، امتثال المقاولين، الدوريات، ومؤشر السلامة</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2"><div className="text-[10px] text-emerald-600">مؤشر السلامة</div><div className="text-lg font-bold text-emerald-600">{pct(k.safety_index)}</div></div>
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2"><div className="text-[10px] text-red-600">مؤشر المخاطر</div><div className="text-lg font-bold text-red-600">{pct(k.risk_index)}</div></div>
          </div>
        </div>
      </div>

      <Section title="البلاغات">
        <StatCard label="إجمالي البلاغات" value={k.incidents_total} />
        <StatCard label="مفتوحة" value={k.incidents_open} tone={k.incidents_open > 0 ? "warning" : "success"} />
        <StatCard label="حرجة" value={k.incidents_critical} tone={k.incidents_critical > 0 ? "danger" : "success"} />
        <StatCard label="نسبة الحل" value={pct(k.incidents_resolution_rate)} tone={k.incidents_resolution_rate >= 80 ? "success" : "warning"} />
        <StatCard label="زمن الاستجابة" value={`${k.mttr_minutes} د`} hint="MTTR — هدف ≤ 15 د" tone={k.mttr_minutes <= 15 ? "success" : "warning"} />
      </Section>

      <Section title="الصيانة (أوامر العمل)">
        <StatCard label="مفتوحة" value={k.wo_open} tone={k.wo_open > 0 ? "warning" : "success"} />
        <StatCard label="مغلقة" value={k.wo_closed} tone="success" />
        <StatCard label="وقائية" value={k.preventive_wo} />
        <StatCard label="تصحيحية" value={k.corrective_wo} />
      </Section>

      <Section title="المشاريع">
        <StatCard label="جارية" value={k.projects_in_progress} tone="warning" />
        <StatCard label="مكتملة" value={k.projects_completed} tone="success" />
        <StatCard label="إجمالي الميزانية" value={`${fmt(k.projects_budget_total)} ر.س`} />
        <StatCard label="المصروف" value={`${fmt(k.projects_spent_total)} ر.س`} hint={`${k.projects_budget_total ? Math.round((k.projects_spent_total/k.projects_budget_total)*100) : 0}%`} />
      </Section>

      <Section title="جاهزية الأنظمة الأمنية">
        <StatCard label="جاهزية CCTV" value={pct(k.cctv_health)} hint={`${k.cameras_online}/${k.cameras_total} متصلة`} tone={k.cctv_health >= 90 ? "success" : "warning"} />
        <StatCard label="التحكم بالدخول" value={pct(k.access_health)} hint={`${k.gates_online}/${k.gates_total} بوابة`} tone={k.access_health >= 90 ? "success" : "warning"} />
        <StatCard label="حساسات في إنذار" value={k.sensors_alarming} hint={`من ${k.sensors_total}`} tone={k.sensors_alarming > 0 ? "danger" : "success"} />
        <StatCard label="مواقع تشغيلية" value={`${k.sites_operational}/${k.sites_total}`} tone={k.sites_operational === k.sites_total ? "success" : "warning"} />
      </Section>

      <Section title="العمليات الميدانية">
        <StatCard label="دوريات نشطة" value={k.patrols_active} tone="success" />
        <StatCard label="إنجاز الدوريات" value={pct(k.patrol_completion)} tone={k.patrol_completion >= 90 ? "success" : "warning"} />
        <StatCard label="زوّار بالداخل" value={k.visitors_inside} />
        <StatCard label="تصاريح فعّالة" value={k.permits_active} />
        <StatCard label="مقاولون نشطون" value={k.contractors_active} />
        <StatCard label="امتثال المقاولين" value={pct(k.contractors_compliance)} tone={k.contractors_compliance >= 90 ? "success" : "warning"} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">{children}</div>
    </div>
  );
}
