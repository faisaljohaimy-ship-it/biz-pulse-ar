import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SecPageHeader, StatCard } from "@/components/sec/sec-shell";
import { SecLiveBadge } from "@/components/sec/SecLiveBadge";
import { Building, MapPin } from "lucide-react";
import { useRegion } from "@/lib/region-context";
import { getTwinTree } from "@/lib/sec.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/sec/circles")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: Circles,
});

function Circles() {
  const { region } = useRegion();
  const { user, loading: authLoading } = useAuth();
  const fetchTree = useServerFn(getTwinTree);
  const { data, isLoading, dataUpdatedAt, isFetching } = useQuery({
    queryKey: ["sec-circles-tree", user?.id ?? "anon"],
    queryFn: () => fetchTree(),
    enabled: !authLoading,
    refetchInterval: 60_000,
  });
  const rows = data?.circles ?? [];
  const totalSites = rows.reduce((sum, circle) => sum + circle.sites.length, 0);
  const operationalSites = rows.reduce(
    (sum, circle) =>
      sum +
      circle.sites.filter((site) => !["offline", "closed", "decommissioned"].includes(site.status))
        .length,
    0,
  );

  return (
    <div className="space-y-4">
      <SecPageHeader
        title="الدوائر التشغيلية"
        subtitle={`${rows.length} دوائر في السجل الحي · السياق المختار ${region.labelAr}`}
      >
        <SecLiveBadge
          dataUpdatedAt={dataUpdatedAt}
          isFetching={isFetching}
          source="sec_twin_tree"
        />
      </SecPageHeader>
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="إجمالي الدوائر" value={rows.length} />
            <StatCard label="إجمالي الموظفين" value={rows.reduce((s, c) => s + c.staff_count, 0)} />
            <StatCard label="إجمالي المواقع" value={totalSites} />
            <StatCard label="مواقع تشغيلية" value={operationalSites} tone="success" />
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
                    <span className="font-semibold">{c.sites.length}</span>
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
        </>
      )}
    </div>
  );
}
