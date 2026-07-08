import { createFileRoute } from "@tanstack/react-router";
import { SecPageHeader, StatCard } from "@/components/sec/sec-shell";
import { ShieldCheck, Wrench, Rocket } from "lucide-react";
import { useRegion } from "@/lib/region-context";
import { regionSim } from "@/lib/sec/region-sim-data";
import { RouteError, RouteNotFound } from "@/components/route-boundaries";

export const Route = createFileRoute("/_authenticated/sec/sections")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: Sections,
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  support: ShieldCheck,
  maintenance: Wrench,
  projects: Rocket,
};

function Sections() {
  const { region, regionId } = useRegion();
  const rows = regionSim(regionId).sections;
  return (
    <div className="space-y-4">
      <SecPageHeader title="الأقسام" subtitle={region.labelAr} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <StatCard label="إجمالي الأقسام" value={rows.length} sim />
        <StatCard label="إجمالي الموظفين" value={rows.reduce((s, x) => s + x.staff_count, 0)} sim />
        <StatCard label="مدير الإدارة" value={region.shortAr} sim />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {rows.map((s) => {
          const Icon = ICONS[s.code] ?? ShieldCheck;
          return (
            <div key={s.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{s.name_ar}</h3>
                  <p className="text-xs text-muted-foreground">{s.name_en}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">رئيس القسم</div>
                  <div className="font-semibold text-foreground">{s.head}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">عدد الموظفين</div>
                  <div className="font-semibold text-foreground">{s.staff_count}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
