/**
 * تبويب «من البلاغات» في صفحة الصيانة — أوامر `sec_work_orders` المحوّلة من
 * البلاغات (ومعها تصدير SAP المرجعي حين لا تصل القاعدة). نُقل كما هو من
 * `sec.maintenance.tsx` حين أُعيد بناء الصفحة على سجل الصيانة التصحيحية
 * (٢٠٢٦/١٠/٠٦)، ويُحمَّل عند فتح التبويب فلا يُثقل الصفحة.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listWorkOrders, getOmsKpis } from "@/lib/oms.functions";
import { StatCard, severityClass, statusClass } from "@/components/sec/sec-shell";
import {
  NewWorkOrderDialog,
  WorkOrderActions,
  WO_PRIORITY_AR,
  WO_STATUS_AR,
  WO_ASSET_KIND_AR,
  useLocalSimWorkOrders,
} from "@/components/sec/oms-dialogs";
import { LiveStatus } from "@/components/state/LiveStatus";

type WO = {
  id: string;
  ref: string;
  title_ar: string;
  kind: string;
  /** `null` أولوية غير مقيسة في المصدر (تصدير SAP) — تُعرض «لم تُحدَّد». */
  priority: string | null;
  status: string;
  asset_kind: string;
  asset_code: string | null;
  assigned_to: string | null;
  contractor: string | null;
  due_at: string | null;
  source_incident_id: string | null;
  /** صفوف المحاكاة المرجعية (من resilient أو من الإنشاء المحلي) موسومة بها. */
  is_simulation?: boolean;
};

export default function IncidentWorkOrdersTab() {
  const fetchWO = useServerFn(listWorkOrders);
  const fetchKpis = useServerFn(getOmsKpis);
  const { data } = useQuery({
    queryKey: ["oms-work-orders"],
    queryFn: () => fetchWO(),
    refetchInterval: 30_000,
  });
  const { data: kpis } = useQuery({
    queryKey: ["oms-kpis"],
    queryFn: () => fetchKpis(),
    refetchInterval: 30_000,
  });
  const [filter, setFilter] = useState<"all" | "preventive" | "corrective" | "open">("all");

  // ٢٠٢٦/٠٨/٢٠ — قرار المالك: بسط نسبة الإكمال ومقامها يظهران تحتها رقمًا صغيرًا،
  // من الحِمل نفسه الذي حُسبت منه النسبة في deriveOmsKpis (المكتمل = الإجمالي − المفتوح؛
  // completion_pct = المكتمل ÷ الإجمالي). وبلا قياس يُعرض «لم يُقَس» — المادة ٢٧:
  // الصفر ليس بديلًا عن الغياب.
  const woCompletionDetail =
    kpis && kpis.work_orders.total > 0
      ? `${kpis.work_orders.total - kpis.work_orders.open} من ${kpis.work_orders.total}`
      : "لم يُقَس";

  // ٢٠٢٦/٠٨/٢٤ — أوامر العمل المنشأة محليًّا كمحاكاة مرجعية (زائر أو جلسة
  // منتهية) تتصدّر القائمة فورًا، ولا تمحوها إعادة الجلب الدورية كل ٣٠ ثانية
  // لأن مصدرها مخزن محلي لا استجابة الخادم.
  const localSim = useLocalSimWorkOrders();
  const list = [...localSim, ...((data ?? []) as WO[])];
  const rows = list.filter((r) => {
    if (filter === "all") return true;
    if (filter === "open") return r.status !== "closed" && r.status !== "cancelled";
    return r.kind === filter;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] text-[color:var(--ink-2)]">
          أوامر العمل الوقائية والتصحيحية المحوّلة من البلاغات والمرتبطة بالأصول المسجّلة.
        </p>
        <NewWorkOrderDialog />
      </div>

      {kpis && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="إجمالي" value={kpis.work_orders.total} />
          <StatCard label="مفتوحة" value={kpis.work_orders.open} tone="warning" />
          <StatCard label="متأخرة" value={kpis.work_orders.overdue} tone="danger" />
          <StatCard
            label="نسبة الإكمال"
            value={`${kpis.work_orders.completion_pct}%`}
            tone="success"
            hint={woCompletionDetail}
          />
        </div>
      )}

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
            {f === "all"
              ? "الكل"
              : f === "open"
                ? "مفتوحة"
                : f === "preventive"
                  ? "وقائية"
                  : "تصحيحية"}
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
              <th className="px-3 py-2 text-start">الاستحقاق</th>
              <th className="px-3 py-2 text-start">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{w.ref}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>{w.title_ar}</span>
                    {/* وسم الصف المرجعي — شارة كهرمانية بنمط nexios-ui-patterns، ولفظها
                        «مرجعي» لا «محاكاة» (أمر المالك ٢٠٢٦/١٠/١٨) والعنوان يقول إنه ليس حيًّا. */}
                    {w.is_simulation && (
                      <span
                        title="بيانات مرجعية — ليست حيّة"
                        className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[12px] text-amber-600"
                      >
                        مرجعي
                      </span>
                    )}
                  </div>
                  {w.source_incident_id && (
                    <div className="text-[12px] text-violet-600">↩ من بلاغ</div>
                  )}
                </td>
                <td className="px-3 py-2">
                  {/* ٢٠٢٦/٠٨/٢٠ — نوع الأصل يُعرض بالعربية؛ الكود معرّف تقني يبقى */}
                  <div className="text-xs">
                    {w.asset_kind ? (WO_ASSET_KIND_AR[w.asset_kind] ?? w.asset_kind) : "—"}
                  </div>
                  <div className="font-mono text-[12px] text-muted-foreground">
                    {w.asset_code ?? "—"}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[12px] ${w.kind === "preventive" ? "border-blue-500/40 bg-blue-500/10 text-blue-600" : "border-orange-500/40 bg-orange-500/10 text-orange-600"}`}
                  >
                    {w.kind === "preventive" ? "وقائية" : "تصحيحية"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {/* ٢٠٢٦/٠٨/٢٠ — توحيد العرض بالعربية: اللون من القيمة المخزّنة والنص معرَّب */}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[12px] ${severityClass(w.priority)}`}
                  >
                    {/* المادة ٢٧: الفراغ في المصدر «لم تُحدَّد» — لا أولوية مختلَقة */}
                    {w.priority ? (WO_PRIORITY_AR[w.priority] ?? w.priority) : "لم تُحدَّد"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[12px] ${statusClass(w.status)}`}
                  >
                    {WO_STATUS_AR[w.status] ?? w.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">{w.assigned_to ?? w.contractor ?? "—"}</td>
                <td className="px-3 py-2 text-xs">
                  {w.due_at ? new Date(w.due_at).toLocaleDateString("ar-SA") : "—"}
                </td>
                <td className="px-3 py-2">
                  <WorkOrderActions id={w.id} status={w.status} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center">
                  <LiveStatus
                    variant="monitoring"
                    hint="قائمة الصيانة محدثة — لا أوامر معلقة"
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
