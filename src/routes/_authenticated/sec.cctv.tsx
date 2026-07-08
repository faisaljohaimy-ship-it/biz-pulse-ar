import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSecOverview } from "@/lib/sec.functions";
import { SecPageHeader, StatCard, statusClass } from "@/components/sec/sec-shell";
import { SecLiveBadge } from "@/components/sec/SecLiveBadge";

export const Route = createFileRoute("/_authenticated/sec/cctv")({
  component: CCTV,
});

function CCTV() {
  const fetchOverview = useServerFn(getSecOverview);
  const { data, dataUpdatedAt, isFetching } = useQuery({
    queryKey: ["sec-overview"],
    queryFn: () => fetchOverview(),
  });
  const rows = data?.cctv ?? [];
  return (
    <div className="space-y-4">
      <SecPageHeader title="لوحة مراقبة CCTV" subtitle="تنبيهات الكاميرات الذكية">
        <SecLiveBadge dataUpdatedAt={dataUpdatedAt} isFetching={isFetching} source="sec_cameras" />
      </SecPageHeader>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label="تنبيهات جديدة"
          value={rows.filter((r) => r.status === "new").length}
          tone="warning"
        />
        <StatCard
          label="مُستجاب لها"
          value={rows.filter((r) => r.status === "acknowledged" || r.status === "resolved").length}
          tone="success"
        />
        <StatCard
          label="ثقة متوسطة"
          value={
            rows.length
              ? `${Math.round((rows.reduce((s, r) => s + r.confidence, 0) / rows.length) * 100)}%`
              : "—"
          }
        />
        <StatCard label="كاميرات نشطة" value={new Set(rows.map((r) => r.camera_code)).size} />
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">{c.alert_type}</div>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(c.status)}`}
              >
                {c.status}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {c.camera_code} · {c.ref}
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">ثقة الكشف</span>
              <span className="font-semibold">{Math.round(c.confidence * 100)}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${c.confidence * 100}%` }} />
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              {new Date(c.detected_at).toLocaleString("ar-SA")}
            </div>
            {c.acknowledged_by && (
              <div className="mt-1 text-[11px] text-muted-foreground">
                استجاب: {c.acknowledged_by}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
