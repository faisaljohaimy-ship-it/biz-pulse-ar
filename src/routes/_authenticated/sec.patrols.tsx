import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSecOverview } from "@/lib/sec.functions";
import { useAuth } from "@/lib/auth-context";
import { SecPageHeader, statusClass } from "@/components/sec/sec-shell";
import { SecLiveBadge } from "@/components/sec/SecLiveBadge";

export const Route = createFileRoute("/_authenticated/sec/patrols")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: Patrols,
});

function Patrols() {
  const { user, loading: authLoading } = useAuth();
  const fetchOverview = useServerFn(getSecOverview);
  const { data, dataUpdatedAt, isFetching } = useQuery({
    queryKey: ["sec-overview", user?.id ?? "anon"],
    queryFn: () => fetchOverview(),
    enabled: !!user && !authLoading,
  });
  const rows = data?.patrols ?? [];
  return (
    <div className="space-y-4">
      <SecPageHeader title="الدوريات الأمنية" subtitle={`${rows.length} دورية مسجّلة`}>
        <SecLiveBadge dataUpdatedAt={dataUpdatedAt} isFetching={isFetching} source="sec_patrols" />
      </SecPageHeader>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((p) => {
          const pct =
            p.checkpoints_total > 0
              ? Math.round((p.checkpoints_done / p.checkpoints_total) * 100)
              : 0;
          return (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-foreground">{p.team}</div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(p.status)}`}
                >
                  {p.status}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {p.route} · {p.ref}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                <span>
                  {p.checkpoints_done}/{p.checkpoints_total} نقاط
                </span>
                <span>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
