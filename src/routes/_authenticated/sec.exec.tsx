import { RouteError, RouteNotFound } from "@/components/route-boundaries";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getExecKpis, pctOrUnmeasured, numOrUnmeasured } from "@/lib/sec.functions";
import { SecPageHeader, SecLoading, SecError } from "@/components/sec/sec-shell";
import { ExecDrilldownDialog } from "@/components/sec/ExecDrilldownDialog";
import { useRegion } from "@/lib/region-context";

export const Route = createFileRoute("/_authenticated/sec/exec")({
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
  component: ExecDashboard,
});

// إعادة بناء اللوحة التنفيذية من طرف إلى طرف — قرار المالك ٢٠٢٦/٠٨/٢٠
// (الملاحظات الحمراء): كل بطاقة رقمية تُفتح على صفوفها الحقيقية عبر
// ExecDrilldownDialog، وحُذف صندوق «الجاهزية التشغيلية» بمؤشرَي السلامة
// والمخاطر، وبطاقات وقائية/تصحيحية والميزانية/المصروف وامتثال المقاولين.
function ExecDashboard() {
  // ٢٠٢٦/٠٨/٢٠ — العنوان الفرعي يتبع سياق المنطقة النشطة (useRegion)،
  // بنفس عرف شارة المنطقة في الشريط الجانبي، بدل «جميع المناطق المصرح بها».
  const { region } = useRegion();
  const fetch = useServerFn(getExecKpis);
  const {
    data: k,
    isError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["sec-exec-kpis"],
    queryFn: () => fetch(),
    refetchInterval: 30_000,
  });
  if (isError) return <SecError onRetry={() => refetch()} />;
  if (isLoading || !k) return <SecLoading />;

  // المادة ٢٧ — ما لم يُقَس يُعرض «لم يُقَس» ولا تُلوَّن له نغمة حكم:
  // `undefined` يعيد النغمة الافتراضية المحايدة بدل نجاح أو تحذير مُختلق.
  const pct = (n: number | null) => pctOrUnmeasured(n);
  const toneGte = (n: number | null, t: number): "success" | "warning" | undefined =>
    n === null ? undefined : n >= t ? "success" : "warning";
  const toneLte = (n: number | null, t: number): "success" | "warning" | undefined =>
    n === null ? undefined : n <= t ? "success" : "warning";

  return (
    <div className="space-y-5">
      <SecPageHeader
        title="لوحة القيادة التنفيذية"
        subtitle={`إدارة الأمن الصناعي — مؤشرات الأداء التنفيذية للمنطقة ${region.shortAr}`}
      />

      {/* حُذف صندوق «الجاهزية التشغيلية» (مع مؤشرَي السلامة والمخاطر)
          بقرار المالك ٢٠٢٦/٠٨/٢٠ — الملاحظات الحمراء. */}

      <Section title="البلاغات">
        <ExecDrilldownDialog
          metric="incidents_total"
          label="إجمالي البلاغات"
          value={k.incidents_total}
        />
        <ExecDrilldownDialog
          metric="incidents_open"
          label="مفتوحة"
          value={k.incidents_open}
          tone={k.incidents_open > 0 ? "warning" : "success"}
        />
        <ExecDrilldownDialog
          metric="incidents_critical"
          label="حرجة"
          value={k.incidents_critical}
          tone={k.incidents_critical > 0 ? "danger" : "success"}
        />
        {/* ٢٠٢٦/٠٨/٢٠ — «نسبة الحل» أعيدت تسميتها «نسبة حل البلاغات» */}
        <ExecDrilldownDialog
          metric="incidents_resolution"
          label="نسبة حل البلاغات"
          value={pct(k.incidents_resolution_rate)}
          tone={toneGte(k.incidents_resolution_rate, 80)}
        />
        {/* ٢٠٢٦/٠٨/٢٠ — «زمن الاستجابة» أعيدت تسميتها «متوسط زمن الاستجابة» */}
        <ExecDrilldownDialog
          metric="mttr"
          label="متوسط زمن الاستجابة"
          value={numOrUnmeasured(k.mttr_minutes, " د")}
          hint="MTTR — هدف ≤ 15 د"
          tone={toneLte(k.mttr_minutes, 15)}
        />
      </Section>

      {/* حُذفت بطاقتا «وقائية» و«تصحيحية» بقرار المالك ٢٠٢٦/٠٨/٢٠ */}
      <Section title="الصيانة (أوامر العمل)">
        <ExecDrilldownDialog
          metric="wo_open"
          label="مفتوحة"
          value={k.wo_open}
          tone={k.wo_open > 0 ? "warning" : "success"}
        />
        <ExecDrilldownDialog metric="wo_closed" label="مغلقة" value={k.wo_closed} tone="success" />
      </Section>

      {/* حُذفت بطاقتا «إجمالي الميزانية» و«المصروف» بقرار المالك ٢٠٢٦/٠٨/٢٠ */}
      <Section title="المشاريع">
        <ExecDrilldownDialog
          metric="projects_in_progress"
          label="جارية"
          value={k.projects_in_progress}
          tone="warning"
        />
        <ExecDrilldownDialog
          metric="projects_completed"
          label="مكتملة"
          value={k.projects_completed}
          tone="success"
        />
      </Section>

      <Section title="جاهزية الأنظمة الأمنية">
        {/* ٢٠٢٦/٠٨/٢٠ — «جاهزية CCTV» أعيدت تسميتها «الكاميرات المتصلة» */}
        <ExecDrilldownDialog
          metric="cameras_connected"
          label="الكاميرات المتصلة"
          value={pct(k.cctv_health)}
          hint={`${k.cameras_online}/${k.cameras_total} متصلة`}
          tone={toneGte(k.cctv_health, 90)}
        />
        {/* ٢٠٢٦/٠٨/٢٠ — «التحكم بالدخول» أعيدت تسميتها «أنظمة التحكم بالدخول» */}
        <ExecDrilldownDialog
          metric="gates_online"
          label="أنظمة التحكم بالدخول"
          value={pct(k.access_health)}
          hint={`${k.gates_online}/${k.gates_total} بوابة`}
          tone={toneGte(k.access_health, 90)}
        />
        {/* ٢٠٢٦/٠٨/٢٠ — بدل «حساسات في إنذار»: بطاقة «عدد تنبيهات الكاميرات»
            موصولة بمصدرها الحقيقي k.cctv_alerts_new (جدول تنبيهات CCTV) —
            إعادة تسمية رقم الحساسات «تنبيهات كاميرات» كانت ستكون اختلاقًا
            يخالف المادة ٢٧. */}
        <ExecDrilldownDialog
          metric="cctv_alerts_new"
          label="عدد تنبيهات الكاميرات"
          value={k.cctv_alerts_new}
          tone={k.cctv_alerts_new > 0 ? "danger" : "success"}
        />
        {/* حُذفت بطاقة «مواقع تشغيلية» بقرار المالك ٢٠٢٦/٠٨/٢٠: معلومتها
            مكررة في «حالة المواقع» /sec/facilities وبطاقات المناطق في
            الصفحة الرئيسية. */}
      </Section>

      {/* حُذفت بطاقة «امتثال المقاولين» بقرار المالك ٢٠٢٦/٠٨/٢٠ —
          الامتثال يظهر قيمةً لكل مقاول داخل نافذة «مقاولون نشطون». */}
      <Section title="العمليات الميدانية">
        <ExecDrilldownDialog
          metric="patrols_active"
          label="دوريات نشطة"
          value={k.patrols_active}
          tone="success"
        />
        <ExecDrilldownDialog
          metric="patrol_completion"
          label="إنجاز الدوريات"
          value={pct(k.patrol_completion)}
          tone={toneGte(k.patrol_completion, 90)}
        />
        <ExecDrilldownDialog
          metric="visitors_inside"
          label="زوّار بالداخل"
          value={k.visitors_inside}
        />
        <ExecDrilldownDialog
          metric="permits_active"
          label="تصاريح فعّالة"
          value={k.permits_active}
        />
        <ExecDrilldownDialog
          metric="contractors_active"
          label="مقاولون نشطون"
          value={k.contractors_active}
        />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {children}
      </div>
    </div>
  );
}
