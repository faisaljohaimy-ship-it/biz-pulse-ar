/**
 * HCIS built-in reference dataset — generated verbatim from the approved
 * framework seed (supabase/migrations/20260719200000). Used ONLY as a
 * resilience fallback when the database is unreachable or unseeded, so the
 * public compliance showcase is never a dead error card. Compliance rows
 * are bootstrapped not_assessed and flagged is_simulation=true — the UI
 * badges them as simulation/reference data. This mirrors public reference
 * information (hcis.gov.sa); it is not a substitute for official texts.
 */
import type { ComplianceRow, Directive, Stage } from "./framework";

export const HCIS_REFERENCE_DIRECTIVES: readonly Directive[] = [
  {
    code: "SEC-01",
    category: "SEC",
    name_ar: "المتطلبات العامة للتوجيهات الأمنية",
    name_en: "General Requirements for Security Directives",
    scope_ar:
      "تصنيف المنشآت ومستويات الحماية، تقييم الثغرات الأمنية (SVA) بمنهجية API، صلاحية الهيئة المطلقة في التصنيف والتعديل، اشتراط استشاري أمني معتمد، اعتماد الهيئة قبل أي تصميم أو تنفيذ.",
    issue_note_ar: null,
    sort_order: 1,
  },
  {
    code: "SEC-02",
    category: "SEC",
    name_ar: "الأسوار الأمنية",
    name_en: "Security Fencing",
    scope_ar:
      "مواصفات الأسوار المحيطية والارتفاعات والمناطق العازلة والحواجز المضادة للاقتحام حسب تصنيف المنشأة.",
    issue_note_ar: null,
    sort_order: 2,
  },
  {
    code: "SEC-03",
    category: "SEC",
    name_ar: "البوابات الأمنية",
    name_en: "Security Gates",
    scope_ar: "بوابات الأفراد والمركبات، حواجز الصدم، مسارات التفتيش، غرف التحكم بالدخول.",
    issue_note_ar: null,
    sort_order: 3,
  },
  {
    code: "SEC-04",
    category: "SEC",
    name_ar: "الإنارة الأمنية",
    name_en: "Security Lighting",
    scope_ar:
      "مستويات الإضاءة للمحيط والبوابات والمناطق الحرجة، التغذية الاحتياطية، التكامل مع كاميرات المراقبة.",
    issue_note_ar: null,
    sort_order: 4,
  },
  {
    code: "SEC-05",
    category: "SEC",
    name_ar: "الأنظمة الأمنية المتكاملة",
    name_en: "Integrated Security Systems",
    scope_ar:
      "كاميرات المراقبة CCTV، كشف التسلل المحيطي PIDS، التحكم بالدخول ACS، غرف التحكم الأمنية، التكامل بين الأنظمة.",
    issue_note_ar: null,
    sort_order: 5,
  },
  {
    code: "SEC-06",
    category: "SEC",
    name_ar: "الأجهزة الأمنية",
    name_en: "Security Devices",
    scope_ar:
      "أجهزة الكشف والتفتيش: بوابات كشف المعادن، الأشعة السينية، كواشف المتفجرات، فحص أسفل المركبات.",
    issue_note_ar: null,
    sort_order: 6,
  },
  {
    code: "SEC-07",
    category: "SEC",
    name_ar: "التغذية الكهربائية",
    name_en: "Power Supply",
    scope_ar:
      "استمرارية تغذية الأنظمة الأمنية: مصادر احتياطية وUPS ومولدات وأزمنة الصمود المطلوبة.",
    issue_note_ar: null,
    sort_order: 7,
  },
  {
    code: "SEC-08",
    category: "SEC",
    name_ar: "الاتصالات الأمنية وشبكات البيانات",
    name_en: "Security Communications & Data Networks",
    scope_ar:
      "شبكات الاتصال الأمنية، التكرار Redundancy، فصل الشبكات، تشفير قنوات الأنظمة الأمنية.",
    issue_note_ar: null,
    sort_order: 8,
  },
  {
    code: "SEC-09",
    category: "SEC",
    name_ar: "المباني الحاضنة للمعدات الأمنية",
    name_en: "Structures Housing Security Equipment",
    scope_ar:
      "مواصفات غرف التحكم والمباني الأمنية: التحصين، التكييف، الحماية من الحريق، الدخول المقيّد.",
    issue_note_ar: "إصدار أولي 2016 ثم أُدمج في إصدار 2017",
    sort_order: 9,
  },
  {
    code: "SEC-10",
    category: "SEC",
    name_ar: "عمليات السكك الحديدية داخل المنشآت الصناعية",
    name_en: "Railway Operations in Industrial Facilities",
    scope_ar:
      "تأمين مداخل ومسارات السكك الحديدية العابرة للمنشآت الخاضعة وضوابط الدخول الخاصة بها.",
    issue_note_ar: "إصدار أولي 2016 ثم أُدمج في إصدار 2017",
    sort_order: 10,
  },
  {
    code: "SEC-11",
    category: "SEC",
    name_ar: "التحقق من الهوية الشخصية",
    name_en: "Personal Verification",
    scope_ar:
      "إجراءات التحقق من الأفراد قبل منح الدخول: الفحص الأمني، التصاريح، ضوابط المقاولين والزوار.",
    issue_note_ar: null,
    sort_order: 11,
  },
  {
    code: "SEC-12",
    category: "SEC",
    name_ar: "بطاقات التعريف",
    name_en: "Identification Cards",
    scope_ar: "مواصفات بطاقات الهوية، مستويات الصلاحية، دورة الإصدار والإلغاء، الضوابط التقنية.",
    issue_note_ar: null,
    sort_order: 12,
  },
  {
    code: "SEC-13",
    category: "SEC",
    name_ar: "الأمن السيبراني",
    name_en: "Cyber Security",
    scope_ar:
      "حماية أنظمة التحكم الصناعي ICS/OT والأنظمة الأمنية من التهديدات السيبرانية، فصل الشبكات، إدارة الثغرات — بالتكامل مع متطلبات الهيئة الوطنية للأمن السيبراني.",
    issue_note_ar: "إصدار أولي 2016 ثم أُدمج في إصدار 2017",
    sort_order: 13,
  },
  {
    code: "SEC-14",
    category: "SEC",
    name_ar: "المنشآت ذات الواجهة البحرية",
    name_en: "Facilities with Marine Interface",
    scope_ar: "التأمين البحري: الحواجز المائية، مراقبة الواجهة البحرية، التنسيق مع حرس الحدود.",
    issue_note_ar: "إصدار أولي 2016 ثم أُدمج في إصدار 2017",
    sort_order: 14,
  },
  {
    code: "SEC-15",
    category: "SEC",
    name_ar: "إدارة المشاريع الأمنية",
    name_en: "Security Project Management",
    scope_ar:
      "حوكمة مشاريع الأنظمة الأمنية: التأهيل المسبق للمتكاملين، مراحل الاعتماد، اختبارات FAT/SAT.",
    issue_note_ar: "إصدار أولي 2016 ثم أُدمج في إصدار 2017",
    sort_order: 15,
  },
  {
    code: "SEC-16",
    category: "SEC",
    name_ar: "العمليات الأمنية في المنشآت الصناعية",
    name_en: "Security Operations at Industrial Facilities",
    scope_ar:
      "التشغيل اليومي: القوى الأمنية، الإجراءات التشغيلية القياسية، الاستجابة للحوادث، التدريب والجاهزية.",
    issue_note_ar: "إصدار أولي 2016 ثم أُدمج في إصدار 2017",
    sort_order: 16,
  },
  {
    code: "SEC-17",
    category: "SEC",
    name_ar: "خطوط الأنابيب وممراتها",
    name_en: "Pipelines & Pipeline Corridors",
    scope_ar:
      "تأمين خطوط الأنابيب والممرات: المراقبة، الدوريات، محطات الضخ والعزل، كشف الاعتداءات.",
    issue_note_ar: "إصدار أولي 2016 ثم أُدمج في إصدار 2017",
    sort_order: 17,
  },
  {
    code: "SEC-18",
    category: "SEC",
    name_ar: "محطات التحويل الكهربائية",
    name_en: "Electrical Power Substations",
    scope_ar:
      "الحماية الأمنية لمحطات التحويل حسب الجهد والأهمية التشغيلية — التوجيه الأكثر صلة بقطاع المرافق الكهربائية.",
    issue_note_ar: "إصدار أولي 2016 ثم أُدمج في إصدار 2017",
    sort_order: 18,
  },
  {
    code: "SEC-19",
    category: "SEC",
    name_ar: "أمن المدن الصناعية",
    name_en: "Security for Industrial Cities",
    scope_ar:
      "الإطار الأمني للمدن الصناعية متعددة المشغّلين والمسؤوليات المشتركة بين إدارة المدينة والمنشآت.",
    issue_note_ar: "إصدار أولي 2016 ثم أُدمج في إصدار 2017",
    sort_order: 19,
  },
  {
    code: "SEC-RC",
    category: "SEC",
    name_ar: "المجمعات السكنية التابعة للمنشآت الصناعية",
    name_en: "Residential Compounds for Industrial Facilities",
    scope_ar:
      "توجيه مكمّل ضمن حزمة 2016–2017 لتأمين المجمعات السكنية التابعة للمنشآت الخاضعة. يُتحقق من رقمه الرسمي في النسخة الصادرة عن الهيئة.",
    issue_note_ar: "رمز داخلي مؤقت حتى التحقق من الترقيم الرسمي",
    sort_order: 20,
  },
  {
    code: "SAF-GEN",
    category: "SAF",
    name_ar: "توجيهات السلامة والحماية من الحريق — نظرة عامة",
    name_en: "Safety & Fire Protection Directives — Overview",
    scope_ar:
      "سلسلة تكميلية تغطي: المتطلبات العامة وتصنيف المخاطر، أنظمة مياه الإطفاء (شبكات ومضخات وخزانات)، الكشف والإنذار وأنظمة الإطفاء الثابتة، مسافات الأمان والفصل، تخزين ومناولة المواد الخطرة، خطط الطوارئ وفرق الإطفاء الصناعية، ومتطلبات المباني ومخارج الطوارئ. القائمة الرقمية الكاملة تُستمد من النسخة الرسمية.",
    issue_note_ar: null,
    sort_order: 21,
  },
];

export const HCIS_REFERENCE_STAGES: readonly Stage[] = [
  {
    stage_no: 1,
    name_ar: "تصنيف المنشأة وتقييم الثغرات الأمنية",
    name_en: "Facility Classification & SVA",
    description_ar:
      "يُعِدّ استشاري أمني معتمد من الهيئة تقييم الثغرات الأمنية بمنهجية API، ويُرفع التصنيف والتقييم للهيئة للاعتماد قبل أي تصميم أو تنفيذ.",
  },
  {
    stage_no: 2,
    name_ar: "التصميم المفاهيمي 10%",
    name_en: "Concept of Design (10%)",
    description_ar: "اعتماد الهيئة على المفهوم العام للحماية.",
  },
  {
    stage_no: 3,
    name_ar: "التصميم الهندسي الأولي 30%",
    name_en: "FEED (30%)",
    description_ar: "اعتماد الهيئة على الحلول الهندسية الأساسية.",
  },
  {
    stage_no: 4,
    name_ar: "التصميم التفصيلي 60%",
    name_en: "Detail Design (60%)",
    description_ar: "اعتماد أول على التفاصيل التنفيذية.",
  },
  {
    stage_no: 5,
    name_ar: "التصميم التفصيلي 90%",
    name_en: "Detail Design (90%)",
    description_ar: "اعتماد ثانٍ قبيل الإصدار النهائي.",
  },
  {
    stage_no: 6,
    name_ar: "الإصدار للتنفيذ 100%",
    name_en: "Issued for Construction (IFC)",
    description_ar: "الوثائق النهائية المعتمدة للتنفيذ.",
  },
  {
    stage_no: 7,
    name_ar: "اختبارات القبول",
    name_en: "FAT / SAT",
    description_ar:
      "اختبار القبول المصنعي ثم الموقعي، مع التأهيل المسبق لمتكامل الأنظمة الأمنية عبر عملية اعتماد الهيئة.",
  },
];

const CRITICAL = new Set(["SEC-01", "SEC-05", "SEC-13", "SEC-16", "SEC-18"]);
const REGION_CODES = ["central", "western", "eastern", "southern"] as const;

export const HCIS_REFERENCE_COMPLIANCE: readonly ComplianceRow[] = HCIS_REFERENCE_DIRECTIVES.filter(
  (d) => d.category === "SEC" && d.code !== "SEC-RC",
).flatMap((d) =>
  REGION_CODES.map((region) => ({
    directive_code: d.code,
    region_code: region,
    status: "not_assessed",
    priority: CRITICAL.has(d.code) ? "critical" : "medium",
    is_simulation: true,
  })),
);
