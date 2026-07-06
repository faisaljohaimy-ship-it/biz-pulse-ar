import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listUrgentTasks, type UrgentTask } from "@/lib/sec-ops.functions";
import { SecPageHeader, StatCard, severityClass, statusClass } from "@/components/sec/sec-shell";
import { LiveStatus } from "@/components/state/LiveStatus";

export const Route = createFileRoute("/_authenticated/sec/urgent")({
  component: UrgentPage,
});

function UrgentPage() {
  const fetchUrgent = useServerFn(listUrgentTasks);
  const { data, isLoading } = useQuery({
    queryKey: ["sec-urgent-tasks"],
    queryFn: () => fetchUrgent(),
    refetchInterval: 20_000,
  });
  const [filter, setFilter] = useState<"all" | "open" | "عاجل جدًا" | "عاجل" | "متابعة">("all");
  const list = (data ?? []) as UrgentTask[];

  const rows = list.filter((r) => {
    if (filter === "all") return true;
    if (filter === "open") return r.status !== "مغلق";
    return r.priority === filter;
  });

  const total = list.length;
  const critical = list.filter((r) => r.priority === "عاجل جدًا").length;
  const open = list.filter((r) => r.status !== "مغلق").length;
  const overdue = list.filter(
    (r) => r.due_at && new Date(r.due_at) < new Date() && r.status !== "مغلق",
  ).length;

  return (
    <div className="space-y-4">
      <SecPageHeader
        title="المهام العاجلة"
        subtitle="التصعيدات الحرجة والمتابعة الفورية"
        badge={critical > 0 ? `${critical} عاجل جدًا` : undefined}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="إجمالي" value={total} />
        <StatCard label="مفتوحة" value={open} tone="warning" />
        <StatCard label="عاجل جدًا" value={critical} tone="danger" />
        <StatCard label="متأخرة" value={overdue} tone="danger" />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "open", "عاجل جدًا", "عاجل", "متابعة"] as const).map((f) => (
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
              <th className="px-3 py-2 text-start">المهمة</th>
              <th className="px-3 py-2 text-start">القسم</th>
              <th className="px-3 py-2 text-start">الأولوية</th>
              <th className="px-3 py-2 text-start">الحالة</th>
              <th className="px-3 py-2 text-start">المسؤول</th>
              <th className="px-3 py-2 text-start">الاستحقاق</th>
              <th className="px-3 py-2 text-start">SLA</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const isOverdue =
                t.due_at && new Date(t.due_at) < new Date() && t.status !== "مغلق";
              return (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-3 py-2">{t.title_ar}</td>
                  <td className="px-3 py-2 text-xs">{t.department}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${severityClass(t.priority)}`}>
                      {t.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(t.status)}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{t.owner_name ?? "—"}</td>
                  <td className={`px-3 py-2 text-xs ${isOverdue ? "font-semibold text-red-600" : ""}`}>
                    {t.due_at ? new Date(t.due_at).toLocaleString("ar-SA") : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">{t.sla_hours ? `${t.sla_hours} س` : "—"}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center">
                  <LiveStatus
                    variant="monitoring"
                    hint={isLoading ? "جارٍ تحميل المهام العاجلة…" : "لا مهام عاجلة — الوضع مستقر"}
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
