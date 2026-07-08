import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProjects, getCircles } from "@/lib/sec.functions";
import { SecPageHeader, StatCard } from "@/components/sec/sec-shell";
import { Rocket } from "lucide-react";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";

export const Route = createFileRoute("/_authenticated/sec/projects")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: Projects,
});

const HEALTH_CLR: Record<string, string> = {
  green: "bg-emerald-500/15 text-emerald-600 border-emerald-500/40 dark:text-emerald-400",
  amber: "bg-amber-500/15 text-amber-600 border-amber-500/40 dark:text-amber-400",
  red: "bg-red-500/15 text-red-600 border-red-500/40 dark:text-red-400",
};

function Projects() {
  const fetchProjects = useServerFn(getProjects);
  const fetchCircles = useServerFn(getCircles);
  const { data: projects } = useQuery({
    queryKey: ["sec-projects"],
    queryFn: () => fetchProjects(),
  });
  const { data: circles } = useQuery({ queryKey: ["sec-circles"], queryFn: () => fetchCircles() });
  const rows = projects ?? [];
  const circleMap = new Map((circles ?? []).map((c) => [c.id, c.name_ar]));

  const totalBudget = rows.reduce((s, p) => s + Number(p.budget_sar), 0);
  const totalSpent = rows.reduce((s, p) => s + Number(p.spent_sar), 0);
  const fmt = (n: number) => n.toLocaleString("ar-SA");

  return (
    <div className="space-y-4">
      <SecPageHeader
        title="مشاريع الأنظمة الأمنية"
        subtitle="قسم مشاريع الأنظمة الأمنية — المنطقة الغربية"
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="إجمالي المشاريع" value={rows.length} />
        <StatCard
          label="جارية"
          value={rows.filter((p) => p.status === "in-progress").length}
          tone="warning"
        />
        <StatCard
          label="مكتملة"
          value={rows.filter((p) => p.status === "completed").length}
          tone="success"
        />
        <StatCard label="إجمالي الميزانية" value={`${fmt(totalBudget)} ر.س`} />
        <StatCard
          label="إجمالي المصروف"
          value={`${fmt(totalSpent)} ر.س`}
          hint={`${rows.length ? Math.round((totalSpent / totalBudget) * 100) : 0}%`}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Rocket className="h-4 w-4 text-primary" />
                  <h3 className="truncate font-semibold text-foreground">{p.name_ar}</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.ref} · {circleMap.get(p.circle_id ?? "") ?? "—"} · {p.kind}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${HEALTH_CLR[p.health]}`}
              >
                صحة {p.health}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">الإنجاز</span>
              <span className="font-semibold">{p.progress}%</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full ${p.health === "green" ? "bg-emerald-500" : p.health === "amber" ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${p.progress}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground">الميزانية</div>
                <div className="font-semibold">{fmt(Number(p.budget_sar))} ر.س</div>
              </div>
              <div>
                <div className="text-muted-foreground">المصروف</div>
                <div className="font-semibold">{fmt(Number(p.spent_sar))} ر.س</div>
              </div>
              <div>
                <div className="text-muted-foreground">المدير</div>
                <div className="font-medium text-foreground">{p.manager ?? "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">المقاول</div>
                <div className="font-medium text-foreground">{p.contractor ?? "—"}</div>
              </div>
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
              <span>من {p.starts_at ?? "—"}</span>
              <span>إلى {p.ends_at ?? "—"}</span>
            </div>
            <div className="mt-2">
              <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px]">
                {p.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
