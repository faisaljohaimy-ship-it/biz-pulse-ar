import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listSupportRequests, type SupportRequest } from "@/lib/sec-ops.functions";
import { SecPageHeader, StatCard, statusClass } from "@/components/sec/sec-shell";
import { LiveStatus } from "@/components/state/LiveStatus";

export const Route = createFileRoute("/_authenticated/sec/support")({
  component: SupportPage,
});

function SupportPage() {
  const fetchSupport = useServerFn(listSupportRequests);
  const { data, isLoading } = useQuery({
    queryKey: ["sec-support-requests"],
    queryFn: () => fetchSupport(),
    refetchInterval: 30_000,
  });
  const [filter, setFilter] = useState<"all" | "open" | "داخلي" | "ميداني" | "تنفيذي">("all");
  const list = (data ?? []) as SupportRequest[];

  const rows = list.filter((r) => {
    if (filter === "all") return true;
    if (filter === "open") return r.status !== "مغلق";
    return r.channel === filter;
  });

  const total = list.length;
  const open = list.filter((r) => r.status !== "مغلق").length;
  const field = list.filter((r) => r.channel === "ميداني").length;
  const exec = list.filter((r) => r.channel === "تنفيذي").length;

  return (
    <div className="space-y-4">
      <SecPageHeader
        title="المساندة"
        subtitle="طلبات الدعم اللوجستي والميداني والتنفيذي"
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="إجمالي الطلبات" value={total} />
        <StatCard label="مفتوحة" value={open} tone="warning" />
        <StatCard label="ميدانية" value={field} />
        <StatCard label="تنفيذية" value={exec} tone="success" />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "open", "داخلي", "ميداني", "تنفيذي"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {f === "all" ? "الكل" : f === "open" ? "مفتوحة" : f}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start">الموضوع</th>
              <th className="px-3 py-2 text-start">مقدم الطلب</th>
              <th className="px-3 py-2 text-start">القناة</th>
              <th className="px-3 py-2 text-start">الحالة</th>
              <th className="px-3 py-2 text-start">الموكَّل</th>
              <th className="px-3 py-2 text-start">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-3 py-2">{r.topic_ar}</td>
                <td className="px-3 py-2 text-xs">{r.requester}</td>
                <td className="px-3 py-2">
                  <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-600">
                    {r.channel}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(r.status)}`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">{r.assigned_to ?? "—"}</td>
                <td className="px-3 py-2 text-xs">
                  {new Date(r.created_at).toLocaleDateString("ar-SA")}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center">
                  <LiveStatus
                    variant="monitoring"
                    hint={isLoading ? "جارٍ تحميل طلبات المساندة…" : "لا توجد طلبات مساندة حالياً"}
                    size="sm"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
