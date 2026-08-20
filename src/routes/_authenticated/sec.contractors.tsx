import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAccessOverview } from "@/lib/access.functions";
import { SecPageHeader, StatCard, statusClass } from "@/components/sec/sec-shell";
import { ArrowRight } from "lucide-react";
import { LiveStatus } from "@/components/state/LiveStatus";

export const Route = createFileRoute("/_authenticated/sec/contractors")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: ContractorsPage,
});

/**
 * توجيه المالك ٢٠٢٦/٠٨/٢٠ (الملاحظات الحمراء على «إدارة المقاولين»):
 * سهم رجوع إلى «صلاحيات دخول اليوم» (/sec/access)، حذف زر «مقاول جديد»
 * وحواره، وحذف أزرار «تعليق» و«حظر» من البطاقات جميعها — فتقاعدت إجراءات
 * الكتابة ذات البوابة البشرية من هذا السطح وصارت البطاقات قراءةً فقط
 * (ومعها «تفعيل»، إذ لا كتابة تبقى هنا). مسار القراءة المرن كما هو.
 */
function ContractorsPage() {
  const fetchOverview = useServerFn(getAccessOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["access-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 30_000,
  });
  const contractors = data?.contractors ?? [];
  const k = data?.kpis;

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

      <SecPageHeader title="إدارة المقاولين" subtitle={`${contractors.length} مقاول مسجّل`} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="مقاولون نشطون" value={k?.contractors_active ?? 0} tone="success" />
        <StatCard
          label="عقود تنتهي خلال 30 يوم"
          value={k?.contractors_expiring_30d ?? 0}
          tone={k?.contractors_expiring_30d ? "warning" : "default"}
        />
        <StatCard
          label="تأمين ينتهي خلال 30 يوم"
          value={k?.insurance_expiring_30d ?? 0}
          tone={k?.insurance_expiring_30d ? "warning" : "default"}
        />
        <StatCard
          label="موقوفون / مدرجون"
          value={
            contractors.filter((c) => c.status === "suspended" || c.status === "blacklisted").length
          }
          tone="danger"
        />
      </div>

      {isLoading && (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
          جارٍ التحميل…
        </div>
      )}
      {!isLoading && contractors.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <LiveStatus
            variant="monitoring"
            hint="سجل المقاولين متصل — بانتظار أول إدخال"
            size="sm"
          />
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {contractors.map((c) => (
          <div key={c.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-foreground">{c.name}</div>
                <div className="mt-0.5 font-mono text-[12px] text-muted-foreground">{c.ref}</div>
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-[12px] ${statusClass(c.status)}`}
              >
                {c.status}
              </span>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              عقد: <span className="font-mono">{c.contract_no}</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-muted-foreground">العمالة</div>
                <div className="font-semibold text-foreground">{c.workers_count}</div>
              </div>
              <div>
                <div className="text-muted-foreground">امتثال</div>
                <div
                  className={`font-semibold ${c.compliance_score >= 90 ? "text-emerald-500" : c.compliance_score >= 70 ? "text-amber-500" : "text-red-500"}`}
                >
                  {c.compliance_score}%
                </div>
              </div>
            </div>
            {c.permit_types && c.permit_types.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {c.permit_types.map((p) => (
                  <span
                    key={p}
                    className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[12px] text-muted-foreground"
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}
            {(c.phone || c.email) && (
              <div className="mt-2 space-y-0.5 text-[12px] text-muted-foreground">
                {c.phone && <div>📞 {c.phone}</div>}
                {c.email && <div dir="ltr">✉️ {c.email}</div>}
              </div>
            )}
            {c.expires_at && (
              <div className="mt-2 text-[12px] text-muted-foreground">
                ينتهي العقد: {new Date(c.expires_at).toLocaleDateString("ar-SA")}
              </div>
            )}
            {c.insurance_expiry && (
              <div className="text-[12px] text-muted-foreground">
                انتهاء التأمين: {new Date(c.insurance_expiry).toLocaleDateString("ar-SA")}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
