import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSecOverview } from "@/lib/sec.functions";
import { useAuth } from "@/lib/auth-context";
import { SecPageHeader, StatCard, severityClass, statusClass } from "@/components/sec/sec-shell";
import { AlertTriangle, Radar, Camera, Target, TrendingUp } from "lucide-react";
import { LiveStatus } from "@/components/state/LiveStatus";
import { useRegion } from "@/lib/region-context";
import {
  getExecutiveDecisions,
  type DecisionItem,
  type ExecutiveDecisions,
} from "@/lib/exec/decisions.functions";
import { getPredictedRisks } from "@/lib/exec/predictive.functions";

export const Route = createFileRoute("/_authenticated/sec/")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: OpsRoom,
});

const PRIORITY_LABEL_AR: Record<DecisionItem["priority"], string> = {
  critical: "حرج",
  high: "عالٍ",
  medium: "متوسط",
  low: "منخفض",
};

function OpsRoom() {
  const { user, loading: authLoading } = useAuth();
  const { region } = useRegion();
  const fetchOverview = useServerFn(getSecOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["sec-overview", user?.id ?? "anon"],
    queryFn: () => fetchOverview(),
    enabled: !authLoading,
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-4">
      {/* حُذفت شارة LIVE وزر «تحديث» من ترويسة الصفحة بقرار المالك ٢٠٢٦/٠٨/٢٠ — التحديث الدوري كل ٣٠ ثانية باقٍ داخليًا عبر refetchInterval */}
      {/* region.labelAr يتضمّن بادئة «الأمن الصناعي» أصلًا — فلا تُضاف مرة ثانية. */}
      <SecPageHeader title={region.labelAr} subtitle="بيانات تشغيلية مقيّدة بالمؤسسة" />

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {/* عدد الهياكل ٧ ليطابق البطاقات المتبقية بعد حذف ثلاث بطاقات ٢٠٢٦/٠٨/٢٠ */}
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
            <StatCard label="مواقع" value={data.counts.sites} hint="إجمالي المواقع المصرح بها" />
            <StatCard
              label="بلاغات مفتوحة"
              value={data.counts.incidents_open}
              tone={data.counts.incidents_open > 0 ? "warning" : "default"}
            />
            <StatCard
              label="بلاغات حرجة"
              value={data.counts.incidents_critical}
              tone={data.counts.incidents_critical > 0 ? "danger" : "success"}
            />
            <StatCard label="دوريات نشطة" value={data.counts.patrols_active} tone="success" />
            {/* حُذفت ثلاث بطاقات بقرار المالك ٢٠٢٦/٠٨/٢٠: «زوّار بالداخل» و«مقاولون نشطون» و«سجل البلاغات المحمّل» */}
            <StatCard label="تصاريح فعّالة" value={data.counts.permits_active} />
            <StatCard
              label="تنبيهات CCTV جديدة"
              value={data.counts.cctv_new}
              tone={data.counts.cctv_new > 0 ? "warning" : "default"}
            />
            <StatCard
              label="أصول متعطلة/متدنية"
              value={data.counts.assets_offline}
              tone={data.counts.assets_offline > 0 ? "warning" : "success"}
            />
          </div>

          {/* ٢٠٢٦/٠٨/٢٤ — العناصر الفريدة الثلاثة المنقولة من «غرفة العمليات»
              بعد دمجها في «النظرة العامة» بقرار المالك. المصادر والمفاتيح
              كما هي دون أي تغيير في المنطق. */}
          <OpsRiskRow />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel icon={AlertTriangle} title="آخر البلاغات">
              <ul className="divide-y divide-border">
                {data.incidents.slice(0, 6).map((i) => (
                  <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{i.title_ar}</div>
                      <div className="text-[12px] text-muted-foreground">
                        {i.ref} · {i.category}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[12px] font-medium ${severityClass(i.severity)}`}
                    >
                      {i.severity}
                    </span>
                  </li>
                ))}
                {data.incidents.length === 0 && (
                  <li className="py-4 text-center">
                    <LiveStatus variant="monitoring" hint="قنوات البلاغات متصلة" size="sm" />
                  </li>
                )}
              </ul>
            </Panel>

            <Panel icon={Radar} title="الدوريات النشطة">
              <ul className="divide-y divide-border">
                {data.patrols.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">
                        {p.team} — {p.route}
                      </div>
                      <div className="text-[12px] text-muted-foreground">
                        {p.ref} · نقاط: {p.checkpoints_done}/{p.checkpoints_total}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[12px] font-medium ${statusClass(p.status)}`}
                    >
                      {p.status}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel icon={Camera} title="تنبيهات CCTV الأخيرة">
              <ul className="divide-y divide-border">
                {data.cctv.slice(0, 6).map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{c.alert_type}</div>
                      <div className="text-[12px] text-muted-foreground">
                        {c.camera_code} · ثقة {Math.round(c.confidence * 100)}%
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[12px] font-medium ${statusClass(c.status)}`}
                    >
                      {c.status}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            {/* حُذف بوكس «الزوار حالياً» مؤقتًا بقرار المالك ٢٠٢٦/٠٨/٢٠ («حذف بوكس الزوار حاليًا») — البيانات ما زالت تصل ضمن getSecOverview ويمكن إعادة العرض لاحقًا */}
          </div>
        </>
      )}
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </div>
      {children}
    </div>
  );
}

/**
 * صف المخاطر الثلاثي — منقول من «غرفة العمليات» إلى «النظرة العامة»
 * بقرار المالك ٢٠٢٦/٠٨/٢٤. واجهة فقط: المصادر ومفاتيح react-query
 * ومُدد التحديث كما كانت حرفيًا.
 */
function OpsRiskRow() {
  const fetchDecisions = useServerFn(getExecutiveDecisions);
  const fetchRisks = useServerFn(getPredictedRisks);

  const decisions = useQuery<ExecutiveDecisions>({
    queryKey: ["situation-decisions"],
    queryFn: () => fetchDecisions(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
  });

  const risks = useQuery({
    queryKey: ["situation-risks"],
    queryFn: () => fetchRisks(),
    refetchInterval: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchIntervalInBackground: false,
  });

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Panel icon={AlertTriangle} title="أعلى 3 مخاطر">
        <DecisionList loading={decisions.isLoading} items={decisions.data?.risks ?? []} />
      </Panel>

      <Panel icon={Target} title="إجراءات موصى بها">
        <DecisionList loading={decisions.isLoading} items={decisions.data?.actions ?? []} />
      </Panel>

      <Panel icon={TrendingUp} title="مخاطر متوقعة">
        {risks.isLoading ? (
          <PanelSkeleton />
        ) : (risks.data ?? []).length === 0 ? (
          <EmptyNote />
        ) : (
          <ul className="space-y-2">
            {(risks.data ?? []).slice(0, 3).map((r) => (
              <li key={r.id} className="rounded-lg border border-border bg-muted/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 text-sm font-medium text-foreground">{r.title_ar}</div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[12px] font-medium ${severityClass(r.severity)}`}
                  >
                    {r.severity}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">
                  {r.recommendation_ar}
                </p>
                <div className="mt-1 text-[12px] tabular-nums text-muted-foreground">
                  ثقة {Math.round(r.confidence * 100)}% · {r.horizon_hours}h
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function DecisionList({ loading, items }: { loading: boolean; items: DecisionItem[] }) {
  if (loading) return <PanelSkeleton />;
  if (items.length === 0) return <EmptyNote />;
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it.id} className="rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 text-sm font-medium text-foreground">{it.title_ar}</div>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 text-[12px] font-medium ${severityClass(it.priority)}`}
            >
              {PRIORITY_LABEL_AR[it.priority]}
            </span>
          </div>
          {it.detail_ar && (
            <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">
              {it.detail_ar}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
            <span className="tabular-nums">ثقة {Math.round(it.confidence * 100)}%</span>
            {it.business_impact && <span className="truncate">· {it.business_impact}</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}

function PanelSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/40" />
      ))}
    </div>
  );
}

function EmptyNote() {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 text-[13px] text-muted-foreground">
      لا توجد بنود ذات أولوية حاليًا.
    </div>
  );
}
