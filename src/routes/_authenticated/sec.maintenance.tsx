import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getWorkOrders } from "@/lib/sec.functions";
import { SecPageHeader, StatCard, severityClass, statusClass } from "@/components/sec/sec-shell";

export const Route = createFileRoute("/_authenticated/sec/maintenance")({
  component: Maintenance,
});

function Maintenance() {
  const fetchWO = useServerFn(getWorkOrders);
  const { data } = useQuery({ queryKey: ["sec-work-orders"], queryFn: () => fetchWO(), refetchInterval: 30_000 });
  const [filter, setFilter] = useState<"all" | "preventive" | "corrective" | "open">("all");
  const rows = (data ?? []).filter((r) => {
    if (filter === "all") return true;
    if (filter === "open") return r.status !== "closed" && r.status !== "cancelled";
    return r.kind === filter;
  });
  const all = data ?? [];

  return (
    <div className="space-y-4">
      <SecPageHeader title="أوامر العمل — الصيانة" subtitle="قسم صيانة الأنظمة الأمنية" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="إجمالي" value={all.length} />
        <StatCard label="مفتوحة" value={all.filter(r => r.status !== "closed" && r.status !== "cancelled").length} tone="warning" />
        <StatCard label="وقائية" value={all.filter(r => r.kind === "preventive").length} />
        <StatCard label="تصحيحية" value={all.filter(r => r.kind === "corrective").length} tone="danger" />
      </div>
      <div className="flex flex-wrap gap-2">
        {(["all", "open", "preventive", "corrective"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
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
              <th className="px-3 py-2 text-start">الأصل</th>
              <th className="px-3 py-2 text-start">النوع</th>
              <th className="px-3 py-2 text-start">الأولوية</th>
              <th className="px-3 py-2 text-start">الحالة</th>
              <th className="px-3 py-2 text-start">الموكَّل</th>
              <th className="px-3 py-2 text-start">المقاول</th>
              <th className="px-3 py-2 text-start">استحقاق</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{w.ref}</td>
                <td className="px-3 py-2">{w.title_ar}</td>
                <td className="px-3 py-2 text-muted-foreground text-xs">{w.asset_kind} · {w.asset_code ?? "—"}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${w.kind === "preventive" ? "border-blue-500/40 bg-blue-500/10 text-blue-600" : "border-orange-500/40 bg-orange-500/10 text-orange-600"}`}>{w.kind === "preventive" ? "وقائية" : "تصحيحية"}</span>
                </td>
                <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] ${severityClass(w.priority)}`}>{w.priority}</span></td>
                <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(w.status)}`}>{w.status}</span></td>
                <td className="px-3 py-2 text-xs">{w.assigned_to ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{w.contractor ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{w.due_at ? new Date(w.due_at).toLocaleDateString("ar-SA") : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="py-6 text-center text-sm text-muted-foreground">لا توجد أوامر عمل</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
