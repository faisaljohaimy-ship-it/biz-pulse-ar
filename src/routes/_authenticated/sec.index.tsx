import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSecOverview } from "@/lib/sec.functions";
import { SecPageHeader, StatCard, severityClass, statusClass } from "@/components/sec/sec-shell";
import { AlertTriangle, Radar, UserCheck, Camera } from "lucide-react";
import { RefreshCw } from "lucide-react";
import { LiveStatus } from "@/components/state/LiveStatus";
import { useRegion } from "@/lib/region-context";
import { regionSim } from "@/lib/sec/region-sim-data";

export const Route = createFileRoute("/_authenticated/sec/")({
  component: OpsRoom,
});

function OpsRoom() {
  const router = useRouter();
  const { region, regionId } = useRegion();
  const sim = regionSim(regionId).counts;
  const fetchOverview = useServerFn(getSecOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["sec-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-4">
      <SecPageHeader
        title={`غرفة العمليات — ${region.labelAr}`}
        subtitle="نظرة فورية على البلاغات والدوريات والزوار والتصاريح والكاميرات والأصول"
      >
        <button
          onClick={() => router.invalidate()}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" /> تحديث
        </button>
      </SecPageHeader>

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
            <StatCard label="مواقع" value={sim.sites} hint="إجمالي مواقع المنطقة" sim />
            <StatCard
              label="بلاغات مفتوحة"
              value={sim.incidents_open}
              tone={sim.incidents_open > 0 ? "warning" : "default"}
              sim
            />
            <StatCard
              label="بلاغات حرجة"
              value={sim.incidents_critical}
              tone={sim.incidents_critical > 0 ? "danger" : "success"}
              sim
            />
            <StatCard label="دوريات نشطة" value={sim.patrols_active} tone="success" sim />
            <StatCard label="زوّار بالداخل" value={sim.visitors_inside} sim />
            <StatCard label="تصاريح فعّالة" value={sim.permits_active} sim />
            <StatCard
              label="تنبيهات CCTV جديدة"
              value={sim.cctv_new}
              tone={sim.cctv_new > 0 ? "warning" : "default"}
              sim
            />
            <StatCard
              label="أصول متعطلة/متدنية"
              value={sim.assets_offline}
              tone={sim.assets_offline > 0 ? "warning" : "success"}
              sim
            />
            <StatCard label="مقاولون نشطون" value={sim.contractors_active} sim />
            <StatCard label="إجمالي البلاغات اليوم" value={data.incidents.length} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel icon={AlertTriangle} title="آخر البلاغات">
              <ul className="divide-y divide-border">
                {data.incidents.slice(0, 6).map((i) => (
                  <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{i.title_ar}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {i.ref} · {i.category}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${severityClass(i.severity)}`}
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
                      <div className="text-[11px] text-muted-foreground">
                        {p.ref} · نقاط: {p.checkpoints_done}/{p.checkpoints_total}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusClass(p.status)}`}
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
                      <div className="text-[11px] text-muted-foreground">
                        {c.camera_code} · ثقة {Math.round(c.confidence * 100)}%
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusClass(c.status)}`}
                    >
                      {c.status}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel icon={UserCheck} title="الزوار حالياً">
              <ul className="divide-y divide-border">
                {data.visitors.slice(0, 6).map((v) => (
                  <li key={v.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{v.full_name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {v.organization ?? "—"} · مضيف: {v.host}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusClass(v.status)}`}
                    >
                      {v.status}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
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
