/**
 * SadeedExecutivePresentation — غلاف مكتفٍ بذاته لوضع العرض التنفيذي.
 *
 * نُقل من شاشة مركز القيادة المحجوبة (قرار المالك ٢٠٢٦/٠٨/١٢: «حذف واجهة
 * مركز القيادة بالكامل … والاكتفاء بنقل وضع العرض التنفيذي الى محادثة
 * سديد») إلى لوحة سَدِيد. الغلاف يجلب النظرة التشغيلية بنفس طريقة مركز
 * القيادة السابقة حرفيًا ويحوّلها إلى `PresentationOverview` ثم يسلّمها
 * إلى `PresentationMode` كما هو — دون أي تعديل عليه.
 *
 * ثوابت محروسة:
 * - الصدق العددي (المادة ٢٧): لا أرقام مُختلَقة — غياب البيانات يعني
 *   `overview = null` فيعرض `PresentationMode` حالته الصادقة
 *   («لا توجد بيانات تشغيلية حية للعرض») ويعطّل زر البدء.
 * - الصوت عبر الخادم حصرًا: العرض ينطق بمحرّك الوكلاء الرقميين
 *   (`/api/sadeed/tts`) — لا `speechSynthesis` ولا مزوّد جديد هنا.
 * - قراءة عرض متاحة للزائر: `getSecOverview` خلف `optionalSupabaseAuth`،
 *   والبوابة الوحيدة `!authLoading` — لا `enabled: !!user` على قراءة عرض.
 *
 * هذا الملف يُحمَّل كسولًا (React.lazy) من SadeedCopilot كي لا يدخل محرّك
 * الوكلاء الرقميين في الحزمة الفورية التي تُركَّب على كل صفحة.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getSecOverview } from "@/lib/sec.functions";
import { useAuth } from "@/lib/auth-context";
import {
  PresentationMode,
  type PresentationOverview,
} from "@/components/digital-humans/PresentationMode";

interface Props {
  ar: boolean;
}

export function SadeedExecutivePresentation({ ar }: Props) {
  const { user, loading: authLoading } = useAuth();
  const fetchOverview = useServerFn(getSecOverview);

  // نفس استعلام مركز القيادة السابق (دالة خادم تقبل الزائر). staleTime
  // قصير يكفي لجلسة عرض؛ لا حاجة لتحديث دوري داخل لوحة المحادثة.
  const q = useQuery({
    queryKey: ["sadeed-executive-presentation-overview", user?.id ?? "anon"],
    queryFn: () => fetchOverview(),
    enabled: !authLoading,
    staleTime: 15_000,
  });

  const ov = q.data;
  const hasData = !!ov && ov.counts.sites > 0;
  const displayName = ar ? "قائد الأمن الصناعي" : "Industrial Security Commander";

  // نفس تحويل مركز القيادة حرفيًا — null عند غياب البيانات (لا اختلاق).
  const overview: PresentationOverview | null = useMemo(() => {
    if (!ov || !hasData) return null;
    const top = ov.incidents.find((i) => i.severity === "critical") ?? ov.incidents[0];
    return {
      sites: ov.counts.sites,
      incidents: ov.incidents.length,
      incidents_critical: ov.counts.incidents_critical,
      incidents_open: ov.counts.incidents_open,
      patrols_active: ov.counts.patrols_active,
      permits_active: ov.counts.permits_active,
      cctv_new: ov.counts.cctv_new,
      assets_offline: ov.counts.assets_offline,
      visitors_inside: ov.counts.visitors_inside,
      topIncidentTitle: ar
        ? (top?.title_ar ?? top?.title_en ?? undefined)
        : (top?.title_en ?? top?.title_ar ?? undefined),
    };
  }, [ov, hasData, ar]);

  // تلميح تجهيز قصير بدل هيكل تحميل أبدي — الاستعلام محكوم بمهلة
  // resilient() في الخادم فلن يطول.
  if (authLoading || q.isPending) {
    return (
      <div dir="rtl" className="p-4 text-sm text-white/70">
        يجهّز وضع العرض…
      </div>
    );
  }

  // خطأ الجلب: سطر عربي محايد + زر إعادة (min-h-11 لهدف لمس كافٍ).
  // لا عبارات مصادقة للمستخدم أبدًا — الرسالة عامة والزر يعيد المحاولة.
  if (q.isError) {
    return (
      <div dir="rtl" className="flex flex-col items-start gap-3 p-4">
        <p className="text-sm text-white/80">تعذّر تجهيز بيانات العرض التنفيذي.</p>
        <button
          type="button"
          onClick={() => void q.refetch()}
          className="min-h-11 rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 text-sm text-cyan-100 transition-[background-color] hover:bg-cyan-400/20"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return <PresentationMode ar={ar} overview={overview} displayName={displayName} />;
}

// تصدير افتراضي أيضًا كي يعمل React.lazy مباشرة على الملف.
export default SadeedExecutivePresentation;
