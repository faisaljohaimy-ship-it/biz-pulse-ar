import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSecOverview, type SecCctvAlert } from "@/lib/sec.functions";
import { useAuth } from "@/lib/auth-context";
import { SecPageHeader, SecLoading, SecError } from "@/components/sec/sec-shell";
import { AlertTriangle, OctagonAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sec/cctv")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: CCTV,
});

// ٢٠٢٦/٠٨/٢٠ — إعادة بناء الصفحة بأمر المالك (الدفعة الخامسة، الملاحظات
// الحمراء): الترويسة تحمل عدد الكاميرات النشطة، وحُذفت شارة LIVE وبطاقات
// المؤشرات وكل المحتوى المتبقي — لم يبقَ سوى قسم «التنبيهات».

// ٢٠٢٦/٠٨/٢٠ — كلمات نوع التنبيه العربية نفسها المستخدمة في نوافذ اللوحة
// التنفيذية (sec-exec-kpis.functions.ts: ALERT_TYPE_AR) — لا تأليف أنواع؛
// النوع غير المعروف يُعرض بنصّه كما ورد من المصدر.
const ALERT_TYPE_AR: Record<string, string> = {
  motion: "رصد حركة",
  loitering: "تسكّع",
  intrusion: "تسلل",
  camera_offline: "انقطاع كاميرا",
  tamper: "عبث بالكاميرا",
};

// ٢٠٢٦/٠٨/٢٠ — شارة نوع التنبيه بعرف لوحات السلامة (كلمة + شكل معًا، لا لون
// وحده — WCAG 2.2 §1.4.1): تسلل = خطر (مثمّن أحمر)، وبقية الأنواع = تحذير
// (مثلث كهرماني) — نفس معيار اللوحة التنفيذية (intrusion → danger).
function AlertKindChip({ alertType }: { alertType: string }) {
  const danger = alertType === "intrusion";
  const Icon = danger ? OctagonAlert : AlertTriangle;
  return (
    <span
      className={
        danger
          ? "inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/15 px-2 py-0.5 text-[12px] font-semibold text-red-700 dark:text-red-300"
          : "inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[12px] font-semibold text-amber-700 dark:text-amber-300"
      }
    >
      {/* aria-hidden: الكلمة المجاورة تنطق المعنى؛ الأيقونة شكل مساند فقط. */}
      <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />
      {danger ? "خطر" : "تحذير"} · {ALERT_TYPE_AR[alertType] ?? alertType}
    </span>
  );
}

function CCTV() {
  const { user, loading: authLoading } = useAuth();
  const fetchOverview = useServerFn(getSecOverview);
  const overviewQ = useQuery({
    queryKey: ["sec-overview", user?.id ?? "anon"],
    queryFn: () => fetchOverview(),
    // البوابة الوحيدة !authLoading — لا enabled: !!user على قراءة عرض.
    enabled: !authLoading,
  });

  const rows: SecCctvAlert[] = overviewQ.data?.cctv ?? [];
  // ٢٠٢٦/٠٨/٢٠ — خريطة الموقع من نفس مصدر الصفحة (sec_sites)؛ الغائب يُعرض
  // «غير مسجّل» لا اسمًا مؤلّفًا (المادة ٢٧).
  const siteById = new Map((overviewQ.data?.sites ?? []).map((s) => [s.id, s.name_ar]));
  // ٢٠٢٦/٠٨/٢٠ — عدد الكاميرات النشطة بنفس اشتقاق البطاقة المحذوفة «كاميرات
  // نشطة»: عدد الكاميرات المميّزة في صفوف التنبيهات. لا صفوف = لا قياس ⇐
  // «لم يُقَس»، والصفر لا يُخترع (المادة ٢٧).
  const activeCameras = rows.length ? new Set(rows.map((r) => r.camera_code)).size : null;

  // ٢٠٢٦/٠٨/٢٠ — حالتا التحميل والخطأ محفوظتان بنمط صفحات sec المرجعي.
  if (overviewQ.isLoading) return <SecLoading rows={6} />;
  if (overviewQ.isError && !overviewQ.data)
    return <SecError onRetry={() => void overviewQ.refetch()} />;

  return (
    <div className="space-y-4">
      {/* ٢٠٢٦/٠٨/٢٠ — العنوان الفرعي صار عدد الكاميرات النشطة (بدل «تنبيهات
          الكاميرات الذكية»)، وشارة LIVE حُذفت. */}
      <SecPageHeader
        title="لوحة مراقبة CCTV"
        subtitle={`عدد الكاميرات النشطة: ${activeCameras ?? "لم يُقَس"}`}
      />

      {/* ٢٠٢٦/٠٨/٢٠ — قسم «التنبيهات»: بطاقة لكل كاميرا أرسلت تنبيهًا من
          صفوف الصفحة الحقيقية نفسها (sec_cctv_alerts عبر getSecOverview). */}
      <section aria-label="التنبيهات">
        <h2 className="mb-3 text-lg font-bold text-foreground">التنبيهات</h2>
        {rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            لا تنبيهات حالية
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-sm font-semibold text-foreground">
                    كاميرا {c.camera_code}
                  </div>
                  <AlertKindChip alertType={c.alert_type} />
                </div>
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <div>
                    الموقع:{" "}
                    <span className="font-medium text-foreground">
                      {/* الموقع الغائب «غير مسجّل» — لا يُخترع (المادة ٢٧). */}
                      {(c.site_id && siteById.get(c.site_id)) || "غير مسجّل"}
                    </span>
                  </div>
                  <div>
                    وقت التنبيه:{" "}
                    <span className="font-medium text-foreground">
                      {new Date(c.detected_at).toLocaleString("ar-SA")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
