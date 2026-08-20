import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { SecPageHeader, StatCard } from "@/components/sec/sec-shell";
// ٢٠٢٦/٠٨/٢٠ — توجيه المالك (الدفعة الخامسة): حُذف بوكس «تنشيط سيناريو» وجزئية
// «بث الطوارئ» بالكامل، فسقطت وارداتهما (useState/toast/Siren/Flame/Wind/Droplets
// وEmergencyBroadcast). بقيت أيقونات الهاتف وشكلا الحالة (دائرة/مثلث) للمتبقّي.
import { Phone, CircleCheck, TriangleAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sec/emergency")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: Emergency,
});

// ٢٠٢٦/٠٨/٢٠ — زمن وصول الفرقة المنشغلة غير مسجّل فعليًا؛ يبقى null ويُعرض
// «غير مسجّل» (المادة ٢٧: الغائب لا يُخترع ولا يُموّه بشرطة).
const TEAMS: { name: string; status: "جاهز" | "في مهمة"; eta: string | null; contact: string }[] = [
  { name: "فرقة الإطفاء — مركز جدة", status: "جاهز", eta: "4 دقائق", contact: "9111-2345" },
  { name: "فرقة الإخلاء — محطة ينبع", status: "جاهز", eta: "6 دقائق", contact: "9111-2346" },
  { name: "فرقة المواد الخطرة HAZMAT", status: "جاهز", eta: "12 دقيقة", contact: "9111-2347" },
  { name: "فرقة الإسعاف الطبي", status: "في مهمة", eta: null, contact: "9111-2348" },
];

function Emergency() {
  return (
    <div className="space-y-4">
      {/* ٢٠٢٦/٠٨/٢٠ — توجيه المالك: وصف الواجهة أصبح «فرق الاستجابة» */}
      <SecPageHeader title="عمليات الطوارئ" subtitle="فرق الاستجابة" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="فرق جاهزة" value={3} tone="success" />
        <StatCard label="فرق في مهمة" value={1} tone="warning" />
        <StatCard label="متوسط زمن وصول" value="6 د" />
        <StatCard label="تدريبات هذا الشهر" value={4} />
      </div>
      {/* ٢٠٢٦/٠٨/٢٠ — بعد حذف بوكس السيناريوهات صارت بطاقة الفرق بعرض كامل،
          وشارة الحالة تحمل كلمة وشكلًا معًا (دائرة زمردية = جاهز، مثلث كهرماني
          = في مهمة) لا اللون وحده — WCAG 2.2 §1.4.1. */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">فرق الاستجابة</h2>
        <ul className="space-y-2">
          {TEAMS.map((t, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3 text-sm"
            >
              <div>
                <div className="font-medium text-foreground">{t.name}</div>
                <div className="text-[12px] text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {t.contact}
                </div>
              </div>
              <div className="text-end">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] ${t.status === "جاهز" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" : "border-amber-500/40 bg-amber-500/10 text-amber-600"}`}
                >
                  {t.status === "جاهز" ? (
                    <CircleCheck className="h-3 w-3" aria-hidden />
                  ) : (
                    <TriangleAlert className="h-3 w-3" aria-hidden />
                  )}
                  {t.status}
                </span>
                <div className="mt-1 text-[12px] text-muted-foreground">
                  وصول: {t.eta ?? "غير مسجّل"}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
