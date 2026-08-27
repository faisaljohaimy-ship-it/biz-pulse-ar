import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listIncidents, getOmsKpis } from "@/lib/oms.functions";
import { numOrUnmeasured } from "@/lib/sec.functions";
import { REGIONS } from "@/lib/regions";
import { SecPageHeader, StatCard, severityClass, statusClass } from "@/components/sec/sec-shell";
// ٢٠٢٦/٠٨/٢٠ — بتوجيه المالك: حُذف زر «بلاغ جديد» من رأس الصفحة، فأُزيل استيراد NewIncidentDialog.
import { IncidentDrawer } from "@/components/sec/oms-dialogs";
import { LiveStatus } from "@/components/state/LiveStatus";

export const Route = createFileRoute("/_authenticated/sec/incidents")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: Incidents,
});

type IncRow = {
  id: string;
  ref: string;
  category: string;
  title_ar: string;
  // ٢٠٢٦/٠٨/٢٧ — صفوف «تقرير البلاغات» الحقيقية بلا شدة: null ⇒ رقاقة
  // محايدة «غير مصنف» (المادة ٢٧ — لا اختلاق درجة لم تُقَس).
  severity: string | null;
  status: string;
  priority: string | null;
  owner: string | null;
  assigned_to: string | null;
  reported_at: string;
  ai_summary: string | null;
  ai_risk_score: number | null;
  root_cause: string | null;
  response_minutes: number | null;
  corrective_actions: unknown;
  escalated: boolean;
  // الملف الحقيقي يحمل المدينة والمنطقة؛ صفوف القاعدة القديمة بدونهما.
  city?: string | null;
  region_id?: string | null;
};

/** اسم المنطقة القصير من المرجع الجغرافي الوحيد `regions.ts`. */
const REGION_SHORT_AR = new Map(REGIONS.map((r) => [r.id as string, r.shortAr]));

function Incidents() {
  const fetchList = useServerFn(listIncidents);
  const fetchKpis = useServerFn(getOmsKpis);
  const { data: rows } = useQuery({
    queryKey: ["oms-incidents"],
    queryFn: () => fetchList(),
    refetchInterval: 30_000,
  });
  const { data: kpis } = useQuery({
    queryKey: ["oms-kpis"],
    queryFn: () => fetchKpis(),
    refetchInterval: 30_000,
  });
  const [selected, setSelected] = useState<IncRow | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "critical" | "escalated">("all");
  const list = (rows ?? []) as IncRow[];
  const filtered = list.filter((i) => {
    if (filter === "open") return i.status !== "closed";
    if (filter === "critical") return i.severity === "critical";
    if (filter === "escalated") return i.escalated;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* ٢٠٢٦/٠٨/٢٠ — بتوجيه المالك: حُذفت عبارة «متصل بسير العمل التنفيذي» من الوصف، وحُذف زر إنشاء البلاغ. */}
      <SecPageHeader title="إدارة البلاغات" subtitle={`${list.length} بلاغ`} />

      {/* ٢٠٢٦/٠٨/٢٠ — بتوجيه المالك: حُذفت بطاقة «معدل المخاطر»، والشبكة ثلاث بطاقات. */}
      {kpis && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatCard label="مفتوحة" value={kpis.incidents.open} tone="warning" />
          {/* المادة ٢٧: الشدة غير مقيسة في المصدر الحقيقي ⇒ «لم يُقَس»
              بنغمة محايدة — لا صفر ولا إنذار مختلَق. */}
          <StatCard
            label="حرجة"
            value={numOrUnmeasured(kpis.incidents.critical)}
            tone={kpis.incidents.critical == null ? "default" : "danger"}
          />
          <StatCard
            label="متوسط الاستجابة"
            value={numOrUnmeasured(kpis.incidents.avg_response_minutes, " د")}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(["all", "open", "critical", "escalated"] as const).map((f) => (
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
                : f === "critical"
                  ? "حرجة"
                  : "مُصعَّدة"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-start">المرجع</th>
              <th className="px-3 py-2 text-start">العنوان</th>
              <th className="px-3 py-2 text-start">الفئة</th>
              <th className="px-3 py-2 text-start">الخطورة</th>
              <th className="px-3 py-2 text-start">الحالة</th>
              {/* ٢٠٢٦/٠٨/٢٠ — بتوجيه المالك: حُذف عمود «المخاطر» من الجدول. */}
              {/* ٢٠٢٦/٠٨/٢٧ — «المدينة» و«المنطقة» من ملف «تقرير البلاغات»
                  الحقيقي («كما في الملف المرفق»)؛ وعمود «الموكَّل» صار
                  «المنشئ» — الملف الحقيقي يسمّيه كذلك و`owner` يحمل منشئ
                  البلاغ. */}
              <th className="px-3 py-2 text-start">المدينة</th>
              <th className="px-3 py-2 text-start">المنطقة</th>
              <th className="px-3 py-2 text-start">المنشئ</th>
              <th className="px-3 py-2 text-start">بُلِّغ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr
                key={i.id}
                onClick={() => setSelected(i)}
                className="cursor-pointer border-t border-border hover:bg-muted/40"
              >
                <td className="px-3 py-2 font-mono text-xs">{i.ref}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    {i.escalated && (
                      <span className="rounded-full border border-red-500/40 bg-red-500/15 px-1.5 py-0.5 text-[12px] text-red-600">
                        مُصعَّد
                      </span>
                    )}
                    <span>{i.title_ar}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{i.category}</td>
                <td className="px-3 py-2">
                  {/* شدة غير مقيسة ⇒ «غير مصنف» كلمةً وشكلًا (حدّ متقطع)
                      لا لونًا وحده — ولا اختلاق درجة (المادة ٢٧). */}
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[12px] ${severityClass(i.severity)}`}
                  >
                    {i.severity ?? "غير مصنف"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[12px] ${statusClass(i.status)}`}
                  >
                    {i.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{i.city ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {i.region_id ? (REGION_SHORT_AR.get(i.region_id) ?? i.region_id) : "—"}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {i.owner ?? i.assigned_to ?? "—"}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {new Date(i.reported_at).toLocaleString("ar-SA")}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                {/* ٢٠٢٦/٠٨/٢٧ — colSpan صار 9 بعد إضافة «المدينة» و«المنطقة». */}
                <td colSpan={9} className="py-8 text-center">
                  <LiveStatus
                    variant="monitoring"
                    hint="قنوات البلاغات نشطة — لا حوادث مفتوحة"
                    size="sm"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <IncidentDrawer incident={selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
