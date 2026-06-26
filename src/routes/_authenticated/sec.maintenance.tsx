import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listWorkOrders, getOmsKpis } from "@/lib/oms.functions";
import { SecPageHeader, StatCard, severityClass, statusClass } from "@/components/sec/sec-shell";
import { NewWorkOrderDialog, WorkOrderActions } from "@/components/sec/oms-dialogs";
import { LiveStatus } from "@/components/state/LiveStatus";

export const Route = createFileRoute("/_authenticated/sec/maintenance")({
  component: Maintenance,
});

type WO = {
  id: string; ref: string; title_ar: string; kind: string; priority: string;
  status: string; asset_kind: string; asset_code: string | null;
  assigned_to: string | null; contractor: string | null;
  due_at: string | null; source_incident_id: string | null;
};

function Maintenance() {
  const fetchWO = useServerFn(listWorkOrders);
  const fetchKpis = useServerFn(getOmsKpis);
  const { data } = useQuery({ queryKey: ["oms-work-orders"], queryFn: () => fetchWO(), refetchInterval: 30_000 });
  const { data: kpis } = useQuery({ queryKey: ["oms-kpis"], queryFn: () => fetchKpis(), refetchInterval: 30_000 });
  const [filter, setFilter] = useState<"all" | "preventive" | "corrective" | "open">("all");
  const list = (data ?? []) as WO[];
  const rows = list.filter((r) => {
    if (filter === "all") return true;
    if (filter === "open") return r.status !== "closed" && r.status !== "cancelled";
    return r.kind === filter;
  });

  return (
    <div className="space-y-4">
      <SecPageHeader title="أوامر العمل — الصيانة" subtitle="وقائية وتصحيحية · معتمدة من قسم الصيانة">
        <NewWorkOrderDialog />
      </SecPageHeader>

      {kpis && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="إجمالي" value={kpis.work_orders.total} />
          <StatCard label="مفتوحة" value={kpis.work_orders.open} tone="warning" />
          <StatCard label="متأخرة" value={kpis.work_orders.overdue} tone="danger" />
          <StatCard label="نسبة الإكمال" value={`${kpis.work_orders.completion_pct}%`} tone="success" />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(["all", "open", "preventive", "corrective"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}>
            {f === "all" ? "الكل" : f === "open" ? "مفتوحة" : f === "preventive" ? "وقائية" : "تصحيحية"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start">المرجع</th>
              <th className="px-3 py-2 text-start">العنوان</th>
              <th className="px-3 py-2 text-start">النوع</th>
              <th className="px-3 py-2 text-start">الأولوية</th>
              <th className="px-3 py-2 text-start">الحالة</th>
              <th className="px-3 py-2 text-start">الموكَّل</th>
              <th className="px-3 py-2 text-start">الاستحقاق</th>
              <th className="px-3 py-2 text-start">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{w.ref}</td>
                <td className="px-3 py-2">
                  <div>{w.title_ar}</div>
                  {w.source_incident_id && <div className="text-[10px] text-violet-600">↩ من بلاغ</div>}
                </td>
                <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] ${w.kind === "preventive" ? "border-blue-500/40 bg-blue-500/10 text-blue-600" : "border-orange-500/40 bg-orange-500/10 text-orange-600"}`}>{w.kind === "preventive" ? "وقائية" : "تصحيحية"}</span></td>
                <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] ${severityClass(w.priority)}`}>{w.priority}</span></td>
                <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(w.status)}`}>{w.status}</span></td>
                <td className="px-3 py-2 text-xs">{w.assigned_to ?? w.contractor ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{w.due_at ? new Date(w.due_at).toLocaleDateString("ar-SA") : "—"}</td>
                <td className="px-3 py-2"><WorkOrderActions id={w.id} status={w.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="py-8 text-center"><LiveStatus variant="monitoring" hint="قائمة الصيانة محدثة — لا أوامر معلقة" size="sm" /></td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
