import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAccessOverview } from "@/lib/access.functions";
import { SecPageHeader } from "@/components/sec/sec-shell";
import { ArrowRight } from "lucide-react";
import { LiveStatus } from "@/components/state/LiveStatus";

export const Route = createFileRoute("/_authenticated/sec/visitors")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: VisitorsPage,
});

/**
 * توجيه المالك ٢٠٢٦/٠٨/٢٠ (الملاحظات الحمراء على «إدارة الزوار»):
 * سهم رجوع إلى «صلاحيات دخول اليوم» (/sec/access)، حذف كل بطاقات المؤشرات،
 * حذف زر «زائر جديد» وحواره، وحذف أعمدة المركبة والحالة والدخول والإجراء —
 * فصارت الصفحة قراءةً فقط، ومسار القراءة المرن (بيانات لا تفرغ) كما هو.
 */
function VisitorsPage() {
  const fetchOverview = useServerFn(getAccessOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["access-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 30_000,
  });
  const visitors = data?.visitors ?? [];

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

      <SecPageHeader title="إدارة الزوار" subtitle={`${visitors.length} زائر مسجّل`} />

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              {/* إعادة تسمية بأمر المالك ٢٠٢٦/٠٨/٢٠: «المرجع» ← «رقم التذكرة»
                  و«البطاقة» ← «رقم الهوية/الإقامة». الحقلان كما هما (ref،
                  badge_no) — لوحة نظرة الدخول المشتركة لا تُمسّ من هنا. */}
              <th className="px-3 py-2 text-start">رقم التذكرة</th>
              <th className="px-3 py-2 text-start">الاسم</th>
              <th className="px-3 py-2 text-start">الجهة</th>
              <th className="px-3 py-2 text-start">المضيف</th>
              <th className="px-3 py-2 text-start">الغرض</th>
              <th className="px-3 py-2 text-start">رقم الهوية/الإقامة</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  جارٍ التحميل…
                </td>
              </tr>
            )}
            {!isLoading && visitors.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center">
                  <LiveStatus
                    variant="monitoring"
                    hint="استقبال الزوار جاهز — لا زيارات نشطة"
                    size="sm"
                  />
                </td>
              </tr>
            )}
            {visitors.map((v) => (
              <tr key={v.id} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-xs">{v.ref}</td>
                <td className="px-3 py-2 font-medium">{v.full_name}</td>
                <td className="px-3 py-2 text-muted-foreground">{v.organization ?? "—"}</td>
                <td className="px-3 py-2">{v.host}</td>
                <td className="px-3 py-2 text-muted-foreground">{v.purpose ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-xs">{v.badge_no ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
