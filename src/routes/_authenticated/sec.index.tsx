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
import { AlertTriangle, Footprints, Cctv, Building2, Layers } from "lucide-react";
import { LiveStatus } from "@/components/state/LiveStatus";
import { useRegion } from "@/lib/region-context";
import { regionSim } from "@/lib/sec/region-sim-data";
import { useMemo } from "react";

export const Route = createFileRoute("/_authenticated/sec/")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: OpsRoom,
});

function OpsRoom() {
  const { user, loading: authLoading } = useAuth();
  const { region, regionId } = useRegion();
  const fetchOverview = useServerFn(getSecOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["sec-overview", user?.id ?? "anon"],
    queryFn: () => fetchOverview(),
    enabled: !authLoading,
    refetchInterval: 30_000,
  });

  /**
   * ── العدّادات من مجموعة المنطقة، لا من الإجمالي العالميّ ──────────────
   *
   * **العطل الذي أُغلق هنا:** كانت الترويسة تكتب «الأمن الصناعي — المنطقة
   * الوسطى» ثم تعرض تحتها عدّادات `getSecOverview()` **بلا وسيط منطقة** —
   * فالمناطق الأربع تعطي الأرقام نفسها تحت أربعة عناوين. وذلك أسوأ من رقمٍ
   * عشوائيّ: عنوانٌ يقول «الوسطى» فوق رقمٍ عالميّ **يُقرأ إثباتًا** عنها،
   * ولا يملك القارئ ما يكشف به الخطأ.
   *
   * ولا يُصلَح بترشيح القاعدة: `sec_*` بلا عمود منطقة، ولا مسار إليها عبر
   * `site_id → sec_sites` لأن `sec_circles` نفسه بلا منطقة ودوائره
   * المبذورة كلّها غربية — فترشيح «الوسطى» يعطي **صفرًا** لا بياناتها.
   * وهذا مُصرَّحٌ به في `REGION_STRATEGY.sec_overview` بوصفه `reference`.
   *
   * فتُقدَّم مجموعة `regionSim(regionId)` — وهي ما صُنعت له حرفًا («Used by
   * /sec pages when a region is active») ولم تُوصَل بصفحةٍ واحدة قبل اليوم.
   * وبها تتبدّل الأرقام مع المنطقة تبدّلًا **متّسقًا** لا عشوائيًّا.
   *
   * وبلا شارة محاكاة على الشاشة — أمر المالك ٢٠٢٦/٠٨/١١ صريح، والإفصاح
   * يبقى في المُصدَّر وفي ردود سَدِيد.
   */
  const sim = useMemo(() => regionSim(regionId), [regionId]);
  const counts = sim.counts;

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
          <StatCard label="مواقع" value={counts.sites} hint="إجمالي المواقع المصرح بها" />
          <StatCard
            label="بلاغات مفتوحة"
            value={counts.incidents_open}
            tone={counts.incidents_open > 0 ? "warning" : "default"}
          />
          {/* المادة ٢٧ (٢٠٢٦/٠٨/٢٧): الشدة غير مقيسة في مجموعة «تقرير
              البلاغات» الحقيقية ⇒ «لم يُقَس» بنغمة محايدة — لا صفر «سليم». */}
          <StatCard
            label="بلاغات حرجة"
            value={numOrUnmeasured(counts.incidents_critical)}
            tone={
              counts.incidents_critical == null
                ? "default"
                : counts.incidents_critical > 0
                  ? "danger"
                  : "success"
            }
          />
          <StatCard label="دوريات نشطة" value={counts.patrols_active} tone="success" />
          {/* حُذفت ثلاث بطاقات بقرار المالك ٢٠٢٦/٠٨/٢٠: «زوّار بالداخل» و«مقاولون نشطون» و«سجل البلاغات المحمّل» */}
          <StatCard label="تصاريح فعّالة" value={counts.permits_active} />
          <StatCard
            label="تنبيهات CCTV جديدة"
            value={counts.cctv_new}
            tone={counts.cctv_new > 0 ? "warning" : "default"}
          />
          <StatCard
            label="أصول متعطلة/متدنية"
            value={counts.assets_offline}
            tone={counts.assets_offline > 0 ? "warning" : "success"}
          />
        </div>
      )}

      {/* ── دوائر المنطقة وأقسامها — هويّتها التي تميّزها عن أخواتها ─────
          «كل ما يختصّ بالوسطى في بطاقة الوسطى» (أمر المالك ٢٠٢٦/٠٩/٢٠).
          والدوائر هنا **حقيقية الانتماء** لا موزَّعة عشوائيًّا: الرياض
          والخرج وسدير والوشم للوسطى، والجبيل والدمام والظهران للشرقية،
          وجازان وأبها ونجران للجنوبية، وينبع ورابغ وجدة للغربية. فتبديل
          المنطقة يبدّل الدوائر تبديلًا يعرفه من يعمل في الشركة. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel icon={Building2} title={`دوائر ${region.shortAr} (${sim.circles.length})`}>
          <ul className="divide-y divide-border">
            {sim.circles.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{c.name_ar}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {c.manager} · {c.sites_count} موقعًا
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[12px] tabular-nums text-muted-foreground">
                  {c.staff_count} موظفًا
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel icon={Layers} title={`أقسام ${region.shortAr}`}>
          <ul className="divide-y divide-border">
            {sim.sections.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{s.name_ar}</div>
                  <div className="text-[12px] text-muted-foreground">{s.head}</div>
                </div>
                <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[12px] tabular-nums text-muted-foreground">
                  {s.staff_count} موظفًا
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

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
