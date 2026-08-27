import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSecOverview, numOrUnmeasured } from "@/lib/sec.functions";
import { useAuth } from "@/lib/auth-context";
import { SecPageHeader, StatCard, severityClass, statusClass } from "@/components/sec/sec-shell";
import { SecOpsInsights } from "@/components/sec/sec-ops-insights";
// تدقيق تعبيرية الأيقونات ٢٠٢٦/٠٨/٢٧ — القاعدة الموثقة في sec-shell:
// الدوريات جولة راجلة (`Footprints` كأيقونة الشريط نفسها) لا كشفًا عن بُعد
// (`Radar`)، والمراقبة `Cctv` لا كاميرا التصوير `Camera`.
import { AlertTriangle, Footprints, Cctv } from "lucide-react";
import { LiveStatus } from "@/components/state/LiveStatus";
import { useRegion } from "@/lib/region-context";

export const Route = createFileRoute("/_authenticated/sec/")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: OpsRoom,
});

function OpsRoom() {
  const { user, loading: authLoading } = useAuth();
  const { region } = useRegion();
  const fetchOverview = useServerFn(getSecOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["sec-overview", user?.id ?? "anon"],
    queryFn: () => fetchOverview(),
    enabled: !authLoading,
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-4">
      {/* حُذفت شارة LIVE وزر «تحديث» من ترويسة الصفحة بقرار المالك ٢٠٢٦/٠٨/٢٠ — التحديث الدوري كل ٣٠ ثانية باقٍ داخليًا عبر refetchInterval */}
      {/* region.labelAr يتضمّن بادئة «الأمن الصناعي» أصلًا — فلا تُضاف مرة
          ثانية (قرار الكاتب الآخر المنسوب للمالك ٢٠٢٦/٠٨/٢٤، صين في الدمج). */}
      <SecPageHeader title={region.labelAr} subtitle="بيانات تشغيلية مقيّدة بالمؤسسة" />

      {isLoading || !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {/* عدد الهياكل ٧ ليطابق البطاقات المتبقية بعد حذف ثلاث بطاقات ٢٠٢٦/٠٨/٢٠ */}
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          <StatCard label="مواقع" value={data.counts.sites} hint="إجمالي المواقع المصرح بها" />
          <StatCard
            label="بلاغات مفتوحة"
            value={data.counts.incidents_open}
            tone={data.counts.incidents_open > 0 ? "warning" : "default"}
          />
          {/* المادة ٢٧ (٢٠٢٦/٠٨/٢٧): الشدة غير مقيسة في مجموعة «تقرير
              البلاغات» الحقيقية ⇒ «لم يُقَس» بنغمة محايدة — لا صفر «سليم». */}
          <StatCard
            label="بلاغات حرجة"
            value={numOrUnmeasured(data.counts.incidents_critical)}
            tone={
              data.counts.incidents_critical == null
                ? "default"
                : data.counts.incidents_critical > 0
                  ? "danger"
                  : "success"
            }
          />
          <StatCard label="دوريات نشطة" value={data.counts.patrols_active} tone="success" />
          {/* حُذفت ثلاث بطاقات بقرار المالك ٢٠٢٦/٠٨/٢٠: «زوّار بالداخل» و«مقاولون نشطون» و«سجل البلاغات المحمّل» */}
          <StatCard label="تصاريح فعّالة" value={data.counts.permits_active} />
          <StatCard
            label="تنبيهات CCTV جديدة"
            value={data.counts.cctv_new}
            tone={data.counts.cctv_new > 0 ? "warning" : "default"}
          />
          <StatCard
            label="أصول متعطلة/متدنية"
            value={data.counts.assets_offline}
            tone={data.counts.assets_offline > 0 ? "warning" : "success"}
          />
        </div>
      )}

      {/* «تعديلات إضافية V4» (١١٩١) ٢٠٢٦/٠٨/٢٤ — أعلى 3 مخاطر · إجراءات
          موصى بها · مخاطر متوقعة + زر «ابدأ الموجز التنفيذي»، منقولة من
          غرفة العمليات /situation-room المحجوبة. المكوّن يجلب بياناته
          بنفسه ويعرض حالاته الثلاث (تحميل/فارغ/خطأ بإعادة محاولة). */}
      <SecOpsInsights />

      {data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel icon={AlertTriangle} title="آخر البلاغات">
            <ul className="divide-y divide-border">
              {data.incidents.slice(0, 6).map((i) => (
                <li key={i.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{i.title_ar}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {i.ref} · {i.category}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[12px] font-medium ${severityClass(i.severity)}`}
                  >
                    {i.severity ?? "غير مصنف"}
                  </span>
                </li>
              ))}
              {data.incidents.length === 0 && (
                <li className="py-4 text-center">
                  <LiveStatus variant="monitoring" hint="قنوات البلاغات متصلة" size="sm" />
                </li>
              )}
            </ul>
          </Panel>

          <Panel icon={Footprints} title="الدوريات النشطة">
            <ul className="divide-y divide-border">
              {data.patrols.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">
                      {p.team} — {p.route}
                    </div>
                    <div className="text-[12px] text-muted-foreground">
                      {p.ref} · نقاط: {p.checkpoints_done}/{p.checkpoints_total}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[12px] font-medium ${statusClass(p.status)}`}
                  >
                    {p.status}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel icon={Cctv} title="تنبيهات CCTV الأخيرة">
            <ul className="divide-y divide-border">
              {data.cctv.slice(0, 6).map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-foreground">{c.alert_type}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {c.camera_code} · ثقة {Math.round(c.confidence * 100)}%
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[12px] font-medium ${statusClass(c.status)}`}
                  >
                    {c.status}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          {/* حُذف بوكس «الزوار حالياً» مؤقتًا بقرار المالك ٢٠٢٦/٠٨/٢٠ («حذف بوكس الزوار حاليًا») — البيانات ما زالت تصل ضمن getSecOverview ويمكن إعادة العرض لاحقًا */}
        </div>
      )}
    </div>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </div>
      {children}
    </div>
  );
}
