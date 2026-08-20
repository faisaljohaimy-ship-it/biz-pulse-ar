import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAccessOverview } from "@/lib/access.functions";
import { SecPageHeader } from "@/components/sec/sec-shell";
import { ArrowRight } from "lucide-react";
import { LiveStatus } from "@/components/state/LiveStatus";

export const Route = createFileRoute("/_authenticated/sec/vehicles")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: VehiclesPage,
});

const TYPE_LABEL: Record<string, string> = {
  car: "مركبة",
  truck: "شاحنة",
  tanker: "صهريج",
  service: "خدمة",
  emergency: "طوارئ",
  bus: "حافلة",
  other: "أخرى",
};

/**
 * توجيه المالك ٢٠٢٦/٠٨/٢٠ (الملاحظات الحمراء على «إدارة المركبات» — الدفعة الخامسة):
 * سهم رجوع إلى «صلاحيات دخول اليوم» (/sec/access)، حذف كل بطاقات المؤشرات،
 * حذف زرّي «تسجيل رفض دخول» و«مركبة جديدة» مع حوارهما وطفراتهما المحلية،
 * وحذف أعمدة «الحالة» و«دخول» و«إجراء» — وحلّ «رقم التصريح» (كان العمود
 * السادس) محلّ «المرجع» عمودًا مرجعيًّا أول. فصارت الصفحة قراءةً فقط،
 * ومسار القراءة المرن (بيانات لا تفرغ) كما هو.
 */
function VehiclesPage() {
  const fetchOverview = useServerFn(getAccessOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["access-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 30_000,
  });
  const vehicles = data?.vehicles ?? [];

  return (
    <div className="space-y-4">
      {/* سهم الرجوع في RTL يشير إلى اليمين — جهة الرجوع، بهدف لمس ≥44px. */}
      <Link
        to="/sec/access"
        className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowRight aria-hidden className="h-4 w-4" />
        صلاحيات دخول اليوم
      </Link>

      <SecPageHeader title="إدارة المركبات" subtitle={`${vehicles.length} مركبة مسجّلة`} />

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              {/* بأمر المالك ٢٠٢٦/٠٨/٢٠: «رقم التصريح» يتصدّر الجدول محلّ
                  «المرجع» المحذوف — الحقل permit_no كما هو بلا تغيير. */}
              <th className="px-3 py-2 text-start">رقم التصريح</th>
              <th className="px-3 py-2 text-start">اللوحة</th>
              <th className="px-3 py-2 text-start">النوع</th>
              <th className="px-3 py-2 text-start">السائق</th>
              <th className="px-3 py-2 text-start">الشركة</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  جارٍ التحميل…
                </td>
              </tr>
            )}
            {!isLoading && vehicles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center">
                  <LiveStatus
                    variant="monitoring"
                    hint="بوابات المركبات تراقب — لا حركة حالية"
                    size="sm"
                  />
                </td>
              </tr>
            )}
            {vehicles.map((v) => (
              <tr key={v.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{v.permit_no ?? "—"}</td>
                <td className="px-3 py-2 font-mono font-medium">{v.plate}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {TYPE_LABEL[v.vehicle_type] ?? v.vehicle_type}
                </td>
                <td className="px-3 py-2">{v.driver_name}</td>
                <td className="px-3 py-2 text-muted-foreground">{v.company ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
