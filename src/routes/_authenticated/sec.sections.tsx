import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SecPageHeader, StatCard } from "@/components/sec/sec-shell";
import { SecLiveBadge } from "@/components/sec/SecLiveBadge";
import { ShieldCheck, Wrench, Rocket } from "lucide-react";
import { useRegion } from "@/lib/region-context";
import { getSections } from "@/lib/sec.functions";
import { useAuth } from "@/lib/auth-context";

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
  const { region } = useRegion();
  const { user, loading: authLoading } = useAuth();
  const fetchSections = useServerFn(getSections);
  const {
    data: rows = [],
    isLoading,
    dataUpdatedAt,
    isFetching,
  } = useQuery({
    queryKey: ["sec-sections", user?.id ?? "anon"],
    queryFn: () => fetchSections(),
    enabled: !!user && !authLoading,
    refetchInterval: 60_000,
  });
  return (
    <div className="space-y-4">
      <SecPageHeader title="الأقسام" subtitle={`${region.labelAr} · سجل حي مقيّد بالمؤسسة`}>
        <SecLiveBadge dataUpdatedAt={dataUpdatedAt} isFetching={isFetching} source="sec_sections" />
      </SecPageHeader>
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatCard label="إجمالي الأقسام" value={rows.length} />
            <StatCard label="إجمالي الموظفين" value={rows.reduce((s, x) => s + x.staff_count, 0)} />
            <StatCard
              label="السياق النشط"
              value={region.shortAr}
              hint="اختيار واجهة؛ السجل مقيّد بالمؤسسة"
            />
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
        </>
      )}
    </div>
  );
}
