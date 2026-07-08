import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSecOverview } from "@/lib/sec.functions";
import { useAuth } from "@/lib/auth-context";
import { SecPageHeader, severityClass } from "@/components/sec/sec-shell";
import { SecLiveBadge } from "@/components/sec/SecLiveBadge";
import { AlertTriangle, Radar, UserCheck, Camera, FileBadge } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sec/timeline")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: Timeline,
});

type Ev = {
  t: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub: string;
  sev?: string;
};

function Timeline() {
  const { user, loading: authLoading } = useAuth();
  const fetchOverview = useServerFn(getSecOverview);
  const { data, dataUpdatedAt, isFetching } = useQuery({
    queryKey: ["sec-overview", user?.id ?? "anon"],
    queryFn: () => fetchOverview(),
    enabled: !!user && !authLoading,
  });
  if (!data) return <div className="text-sm text-muted-foreground">جاري التحميل…</div>;


  const events: Ev[] = [
    ...data.incidents.map((i) => ({
      t: i.reported_at,
      icon: AlertTriangle,
      title: `بلاغ: ${i.title_ar}`,
      sub: `${i.ref} · ${i.category}`,
      sev: i.severity,
    })),
    ...data.patrols
      .filter((p) => p.started_at)
      .map((p) => ({
        t: p.started_at!,
        icon: Radar,
        title: `دورية ${p.team}`,
        sub: `${p.route} · ${p.status}`,
      })),
    ...data.visitors.map((v) => ({
      t: v.check_in_at,
      icon: UserCheck,
      title: `دخول زائر: ${v.full_name}`,
      sub: `مضيف: ${v.host}`,
    })),
    ...data.cctv.map((c) => ({
      t: c.detected_at,
      icon: Camera,
      title: `CCTV: ${c.alert_type}`,
      sub: `${c.camera_code} · ثقة ${Math.round(c.confidence * 100)}%`,
    })),
    ...data.permits.map((p) => ({
      t: p.starts_at,
      icon: FileBadge,
      title: `تصريح: ${p.work_type}`,
      sub: `${p.contractor} · ${p.status}`,
      sev: p.risk_level,
    })),
  ]
    .sort((a, b) => new Date(b.t).getTime() - new Date(a.t).getTime())
    .slice(0, 80);

  return (
    <div className="space-y-4">
      <SecPageHeader
        title="الخط الزمني للعمليات"
        subtitle={`${events.length} حدث — مرتّبة من الأحدث`}
      >
        <SecLiveBadge dataUpdatedAt={dataUpdatedAt} isFetching={isFetching} source="sec_overview" />
      </SecPageHeader>
      <div className="rounded-xl border border-border bg-card p-4">
        <ol className="relative space-y-3 ps-6">
          <span className="absolute inset-y-0 start-2 w-px bg-border" aria-hidden />
          {events.map((e, i) => (
            <li key={i} className="relative">
              <span className="absolute -start-[18px] mt-1 flex h-4 w-4 items-center justify-center rounded-full border border-border bg-card">
                <e.icon className="h-2.5 w-2.5 text-primary" />
              </span>
              <div className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{e.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {e.sub} · {new Date(e.t).toLocaleString("ar-SA")}
                  </div>
                </div>
                {e.sev && (
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${severityClass(e.sev)}`}
                  >
                    {e.sev}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
