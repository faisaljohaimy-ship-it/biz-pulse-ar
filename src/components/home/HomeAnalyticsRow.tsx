/**
 * صفّ التحليلات — أربع بطاقات يسارًا ← يمينًا كما في الصورة (مواصفة §4.7):
 * الأداء الأمني للمناطق · أوامر الصيانة شهريًّا · توزيع أنواع الحوادث ·
 * حالة الأنظمة.
 *
 * **فتحة تركيب من المرحلة الأولى (الأساس):** الشبكة (`.nx-home-quad`) ووجهات
 * البطاقات الأربع قائمة، والمحتوى تملؤه مرحلة التحليلات. عنوان السلسلة
 * الشهرية يقول ما يُعدّ فعلًا — أوامر الصيانة — لا «الحوادث والمخاطر» التي
 * لا سلسلة صادقة لها (مواصفة §9).
 */
import { useI18n } from "@/lib/i18n";
import { Empty, Panel } from "@/components/home/home-primitives";

const CARDS = [
  {
    id: "nx-home-region-performance",
    ar: "الأداء الأمني للمناطق",
    en: "Regional security performance",
    to: "/sec/governance",
    moreAr: "الحوكمة والامتثال",
    moreEn: "Governance",
  },
  {
    id: "nx-home-maint-monthly",
    ar: "أوامر الصيانة شهريًّا",
    en: "Maintenance orders by month",
    to: "/sec/maintenance",
    moreAr: "الصيانة",
    moreEn: "Maintenance",
  },
  {
    id: "nx-home-incident-types",
    ar: "توزيع أنواع الحوادث",
    en: "Incident types",
    to: "/sec/incidents",
    moreAr: "كل البلاغات",
    moreEn: "All incidents",
  },
  {
    id: "nx-home-systems-health",
    ar: "حالة الأنظمة",
    en: "Systems status",
    to: "/integrations",
    moreAr: "مركز التكاملات",
    moreEn: "Integrations",
  },
] as const;

export function HomeAnalyticsRow() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  return (
    <div dir="ltr" className="nx-home-quad">
      {CARDS.map((c) => (
        <Panel
          key={c.id}
          id={c.id}
          title={ar ? c.ar : c.en}
          to={c.to}
          moreAr={c.moreAr}
          moreEn={c.moreEn}
          ar={ar}
        >
          <Empty>
            {ar ? "تُستكمل هذه البطاقة في المرحلة التالية." : "This card is completed next."}
          </Empty>
        </Panel>
      ))}
    </div>
  );
}
