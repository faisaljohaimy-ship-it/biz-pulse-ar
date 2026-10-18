/**
 * «مزايا سَدِيد» — سطور الشريط المتحرك فوق البانر. الأمر (المالك ٢٠٢٦/١٠/١٨، R3) بنصّه:
 * «وكون الشريط الإعلاني المتحرك باستمرار يعلو علامة سديد الموجودة فالمرفق». والسطور
 * نفسها كتابةٌ جديدة لم يُملِها المالك؛ تُعرض عليه للإقرار (قائمتها في تقرير التسليم).
 *
 * ## قاعدة التحرير: صادقٌ اليوم مهما كانت حال الخادم، ومسنودٌ بموضعه
 *
 * السطر وعدٌ يقرؤه المالك وضيوفه، فلا يقول إلا ما يصدق **الآن** ولو كانت القاعدة
 * موقوفة (CLAUDE.md، قياس ٢٠٢٦/١٠/١٧): هوية المنتج، والأقسام القائمة فعلًا في النظام،
 * والمناطق الأربع منظومةً واحدة، والاعتماد البشري قبل الإجراء الحسّاس، والعربية أولًا،
 * وسياسة الرقم الصادق. ولكل سطرٍ `sources`: ملفٌّ ونصٌّ حرفيّ فيه (`anchor`) يقرؤه العقد
 * (`home-ticker.contract.test.ts`) **من القرص** ويحمرّ إن زال — فإن تغيّرت الحقيقة في
 * موضعها لم يبقَ السطر يكرّر القديم صامتًا. وما يُقرأ من مصدرٍ حيّ يُركَّب منه لا
 * يُنسخ: اسم المنتج وشعاره (`PRODUCT_BRAND`) وعدد المناطق (`REGIONS.length`).
 *
 * ## بلا رقمٍ ولا ادّعاء (المادة ٢٧ · M5)
 *
 * لا رقم في أيّ سطر بأيّ لغة. والعدد الوحيد «الأربع» / «four» **كلمةٌ تُشتقّ من
 * `REGIONS.length`** (`regionsCountWord`): لا تعرف إلا الأربعة، فإن تغيّر العدد صار
 * السطر «في جميع المناطق» — صادقًا على أيّ عدد. ولا عميل ولا شريك ولا شهادة ولا
 * مورّد ولا رقم أداء. وأسماء المناطق لا تُكتب هنا (مصدرها `regions.ts` وحده).
 *
 * ## ما تُرك عمدًا
 *
 * • الصوت والذكاء الحيّ — «اسأل سَدِيد … صوتًا»: نقاط الصوت والنقاط العامة مغلقةٌ ما
 *   دام مخزن المعدّل متعذّرًا، والقاعدة موقوفة (CLAUDE.md، الطبقة ٢)؛ فوعدُ الصوت اليوم
 *   مضلِّل. ومثله «HCIS»: مرجع الهيئة في الردود يُقرأ من جدول معرفةٍ في القاعدة
 *   (`/api/chat` ⇐ `finn_knowledge`)، و`/ptw` محجوب.
 * • «الجاهزية التنفيذية» — صندوقٌ حذفه المالك ٢٠٢٦/٠٨/٢٠؛ والجاهزية التشغيلية هنا
 *   تُقال بأقسامها القائمة (الأعمال العاجلة · الصيانة).
 * • الروابط — السطور نصٌّ لا روابط: هدفٌ متحرّكٌ صعبٌ باللمس، والتركيز على رابطٍ داخل
 *   مسارٍ مقصوص يُزيحه أو يحجبه (WCAG 2.4.11)، وكل قسمٍ على بُعد نقرة في الشريط الجانبي.
 */
import { PRODUCT_BRAND } from "@/lib/domain";
import { REGIONS } from "@/lib/regions";

/**
 * سرعة الشريط — بكسلًا في الثانية، **ثابتةٌ مهما طال المحتوى**: المدّة تُحسب من عرض
 * النسخة المقيس (`tickerLoop` في `HomeTicker.tsx`). 40: كلمةٌ عربية بخطّ 14px نحو
 * 35px، فهي قرابة كلمةٍ في الثانية — دون سرعة القراءة بكثير، وحركةٌ «مستمرّة» تُرى.
 * و`--nx-loop-ticker` (24px/ث) لسجلّ الأحداث: على عمودٍ 1408px يستغرق عبوره ~59 ث،
 * فيُقرأ شبه ساكن في شريطٍ إعلاني.
 */
export const TICKER_PX_PER_S = 40;

/** حدّا السرعة المقروءة اللذان يحرسهما العقد (بكسل/ث). */
export const TICKER_SPEED_RANGE = { min: 40, max: 60 } as const;

export type TickerSource = {
  /** ملفٌّ في المستودع يحمل الحقيقة (من جذره). */
  readonly file: string;
  /** نصٌّ حرفيّ موجودٌ في ذلك الملف. */
  readonly anchor: string;
};

export type TickerLine = {
  readonly id: string;
  readonly ar: string;
  readonly en: string;
  readonly sources: readonly [TickerSource, ...TickerSource[]];
};

/** كلمة العدد لسطر المناطق — لا تعرف إلا الأربعة؛ وغيرها `null` فيُقال «جميع». */
export function regionsCountWord(
  count: number,
): { readonly ar: string; readonly en: string } | null {
  return count === 4 ? { ar: "الأربع", en: "four" } : null;
}

const MODULES_FILE = "src/lib/nav/modules.ts";
const NAV_FILE = "src/lib/nav/system-nav.ts";
const CONSTITUTION = "SADEED_CONSTITUTION.md";

/** السطور بترتيب عرضها — `regionCount` معاملٌ ليُختبر السطر على غير الأربعة. */
export function buildTickerLines(regionCount: number): readonly TickerLine[] {
  const count = regionsCountWord(regionCount);
  return [
    {
      id: "brand",
      ar: `${PRODUCT_BRAND.ar.name} — ${PRODUCT_BRAND.ar.tagline}`,
      en: `${PRODUCT_BRAND.en.name} — ${PRODUCT_BRAND.en.tagline}`,
      sources: [{ file: "src/lib/domain.ts", anchor: 'tagline: "قرار أدق. إنجاز أسرع."' }],
    },
    {
      id: "regions",
      ar: count
        ? `منظومة واحدة للأمن الصناعي في المناطق ${count.ar}`
        : "منظومة واحدة للأمن الصناعي في جميع المناطق",
      en: count
        ? `One industrial-security system across the ${count.en} regions`
        : "One industrial-security system across all regions",
      sources: [
        { file: "src/lib/regions.ts", anchor: "Every region hosts the SAME full SADEED system" },
        { file: "src/lib/regions.ts", anchor: "export const REGIONS: readonly Region[]" },
      ],
    },
    {
      id: "arabic-first",
      ar: "عربي أولًا، والإنجليزية مرافقة",
      en: "Arabic first, with English alongside",
      sources: [
        {
          file: CONSTITUTION,
          anchor: "العربية لغة الواجهة الأولى بتخطيط RTL كامل؛ الإنجليزية مرافقة",
        },
        { file: "src/lib/i18n.tsx", anchor: 'useState<Locale>("ar")' },
      ],
    },
    {
      id: "human-gate",
      ar: "الأتمتة تقترح، والإنسان يعتمد",
      en: "Automation proposes, people approve",
      sources: [
        { file: CONSTITUTION, anchor: "الأتمتة تقترح والإنسان يعتمد" },
        {
          file: "src/lib/sadeed-core/core/decision-engine.ts",
          anchor: "Forces human approval for any",
        },
      ],
    },
    {
      id: "map",
      ar: "الأصول والمناطق على الخريطة التنفيذية",
      en: "Assets and regions on the executive map",
      sources: [{ file: MODULES_FILE, anchor: "الخريطة الجغرافية التنفيذية للأصول والمناطق" }],
    },
    {
      id: "field",
      ar: "كاميرات المراقبة والدوريات والتحكم في الدخول",
      en: "CCTV, patrols and access control",
      sources: [
        { file: NAV_FILE, anchor: 'ar: "كاميرات المراقبة"' },
        { file: NAV_FILE, anchor: 'ar: "الدوريات"' },
        { file: NAV_FILE, anchor: 'ar: "التحكم في الدخول"' },
      ],
    },
    {
      id: "urgent",
      ar: "متابعة الأعمال العاجلة واتفاقيات الخدمة",
      en: "Urgent operations and service-level agreements, followed up",
      sources: [
        { file: MODULES_FILE, anchor: 'ar: "متابعة الأعمال العاجلة"' },
        { file: MODULES_FILE, anchor: "الأعمال العاجلة واتفاقيات الخدمة" },
      ],
    },
    {
      id: "maintenance",
      ar: "أوامر الصيانة الوقائية والتصحيحية",
      en: "Preventive and corrective maintenance orders",
      sources: [{ file: MODULES_FILE, anchor: "أوامر الصيانة الوقائية والتصحيحية" }],
    },
    {
      id: "permits",
      ar: "إدارة تصاريح العمل السارية والمنتهية",
      en: "Manage active and expired work permits",
      sources: [{ file: MODULES_FILE, anchor: "إدارة تصاريح العمل السارية والمنتهية" }],
    },
    {
      id: "honesty",
      ar: "ما لم يُقَس لا يُعرض رقمًا",
      en: "What is not measured is never shown as a number",
      sources: [{ file: CONSTITUTION, anchor: "ما لم يُقَس لا يُعرض رقمًا" }],
    },
  ];
}

/** سطور الشريط الحيّة — على عدد المناطق الفعليّ. */
export const TICKER_LINES: readonly TickerLine[] = buildTickerLines(REGIONS.length);
