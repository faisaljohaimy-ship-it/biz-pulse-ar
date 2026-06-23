import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getCircles, getSecOverview } from "@/lib/sec.functions";
import { SecPageHeader, StatCard } from "@/components/sec/sec-shell";
import { Building, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sec/circles")({
  component: Circles,
});

function Circles() {
  const fetchCircles = useServerFn(getCircles);
  const fetchOverview = useServerFn(getSecOverview);
  const { data: circles } = useQuery({ queryKey: ["sec-circles"], queryFn: () => fetchCircles() });
  const { data: ov } = useQuery({ queryKey: ["sec-overview"], queryFn: () => fetchOverview() });
  const rows = circles ?? [];

  return (
    <div className="space-y-4">
      <SecPageHeader title="الدوائر التشغيلية" subtitle="5 دوائر تغطّي المنطقة الغربية" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="إجمالي الدوائر" value={rows.length} />
        <StatCard label="إجمالي الموظفين" value={rows.reduce((s, c) => s + c.staff_count, 0)} />
        <StatCard label="إجمالي المواقع" value={ov?.sites.length ?? 0} />
        <StatCard label="مواقع تشغيلية" value={ov?.sites.filter(s => s.status === "operational").length ?? 0} tone="success" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((c) => {
          const sitesInCircle = ov?.sites.filter(s => s.circle_id === c.id) ?? [];
          return (
            <div key={c.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15">
                  <Building className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-foreground">{c.name_ar}</h3>
                  <p className="text-xs text-muted-foreground">{c.name_en}</p>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">المدير</span><span className="font-medium">{c.manager ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">الموظفون</span><span className="font-semibold">{c.staff_count}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">المواقع</span><span className="font-semibold">{sitesInCircle.length}</span></div>
                {c.lat && c.lng && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {c.lat.toFixed(3)}, {c.lng.toFixed(3)}</div>
                )}
              </div>
              {sitesInCircle.length > 0 && (
                <div className="mt-3 border-t border-border pt-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">المواقع</div>
                  <ul className="mt-1 space-y-0.5 text-xs">
                    {sitesInCircle.slice(0, 5).map(s => (
                      <li key={s.id} className="flex justify-between">
                        <span className="truncate">{s.name_ar}</span>
                        <span className={`text-[10px] ${s.status === "operational" ? "text-emerald-500" : s.status === "degraded" ? "text-amber-500" : "text-red-500"}`}>● {s.status}</span>
                      </li>
                    ))}
                    {sitesInCircle.length > 5 && <li className="text-[10px] text-muted-foreground">+ {sitesInCircle.length - 5} موقع آخر</li>}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
