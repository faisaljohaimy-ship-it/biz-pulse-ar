import { createFileRoute } from "@tanstack/react-router";
import { SecPageHeader, StatCard } from "@/components/sec/sec-shell";
import { Building, MapPin } from "lucide-react";
import { useRegion } from "@/lib/region-context";
import { regionSim } from "@/lib/sec/region-sim-data";

export const Route = createFileRoute("/_authenticated/sec/circles")({
  component: Circles,
});

function Circles() {
  const { region, regionId } = useRegion();
  const sim = regionSim(regionId);
  const rows = sim.circles;
  const totalSites = rows.reduce((s, c) => s + c.sites_count, 0);
  const operationalSites = Math.max(1, totalSites - Math.round(totalSites * 0.06));

  return (
    <div className="space-y-4">
      <SecPageHeader
        title="الدوائر التشغيلية"
        subtitle={`${rows.length} دوائر تغطّي ${region.labelAr}`}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="إجمالي الدوائر" value={rows.length} sim />
        <StatCard label="إجمالي الموظفين" value={rows.reduce((s, c) => s + c.staff_count, 0)} sim />
        <StatCard label="إجمالي المواقع" value={totalSites} sim />
        <StatCard label="مواقع تشغيلية" value={operationalSites} tone="success" sim />
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((c) => (
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">المدير</span>
                <span className="font-medium">{c.manager}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">الموظفون</span>
                <span className="font-semibold">{c.staff_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">المواقع</span>
                <span className="font-semibold">{c.sites_count}</span>
              </div>
              {c.lat && c.lng && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {c.lat.toFixed(3)}, {c.lng.toFixed(3)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
