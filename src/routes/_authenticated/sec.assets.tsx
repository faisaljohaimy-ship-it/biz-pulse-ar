import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSecOverview } from "@/lib/sec.functions";
import { useAuth } from "@/lib/auth-context";
import { SecPageHeader, statusClass } from "@/components/sec/sec-shell";
import { SecLiveBadge } from "@/components/sec/SecLiveBadge";

export const Route = createFileRoute("/_authenticated/sec/assets")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: Assets,
});

function Assets() {
  const { user, loading: authLoading } = useAuth();
  const fetchOverview = useServerFn(getSecOverview);
  const { data, dataUpdatedAt, isFetching } = useQuery({
    queryKey: ["sec-overview", user?.id ?? "anon"],
    queryFn: () => fetchOverview(),
    enabled: !!user && !authLoading,
  });
  const rows = data?.assets ?? [];
  return (
    <div className="space-y-4">
      <SecPageHeader title="حماية الأصول الأمنية" subtitle={`${rows.length} أصل تحت المراقبة`}>
        <SecLiveBadge dataUpdatedAt={dataUpdatedAt} isFetching={isFetching} source="sec_assets" />
      </SecPageHeader>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rows.map((a) => (
          <div key={a.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">{a.name_ar}</div>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(a.status)}`}
              >
                {a.status}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">
              {a.kind} · {a.code}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">الصحة</span>
              <span
                className={`font-semibold ${a.health >= 90 ? "text-emerald-500" : a.health >= 70 ? "text-amber-500" : "text-red-500"}`}
              >
                {a.health}%
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full ${a.health >= 90 ? "bg-emerald-500" : a.health >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${a.health}%` }}
              />
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              آخر اتصال: {new Date(a.last_seen_at).toLocaleString("ar-SA")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
