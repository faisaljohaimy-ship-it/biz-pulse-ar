export type FinnReferenceEntry = {
  title: string;
  source: string;
  tags: string[];
  content: string;
};

const NOTICE_AR =
  "مرجع عام داخل المنصة؛ لا يمثل لائحة رسمية أو سياسة خاصة بالمؤسسة، ولا يثبت حالة تشغيلية. يجب الرجوع إلى الوثيقة المعتمدة قبل أي قرار امتثال أو إجراء عالي العواقب.";
const NOTICE_EN =
  "General platform reference; not an official regulation, organisation policy, or live operational fact. Consult an approved source before compliance or high-consequence action.";

/**
 * A small, region-neutral starter taxonomy. It contains no invented SLAs,
 * facility counts or regulatory clauses. Tenant-approved documents are the
 * authoritative corpus and are ingested separately through the knowledge UI.
 */
export const FINN_SAFE_REFERENCE_CORPUS: readonly FinnReferenceEntry[] = [
  {
    title: "خريطة مجالات الأمن الصناعي — مرجع عام",
    source: "platform-reference/domain-map-ar",
    tags: ["general-reference", "industrial-security", "ar"],
    content: `${NOTICE_AR}\n\nتشمل خريطة العمل: الحوكمة وإدارة المخاطر، الأمن المادي والمحيطي، التحكم بالدخول والزوار والمقاولين، المراقبة المرئية والدوريات وغرف العمليات، الطوارئ والحريق والإخلاء واستمرارية الأعمال، تصاريح العمل والعزل، المواد الخطرة، صيانة الأنظمة، التحقيق والإجراءات التصحيحية، الأمن السيبراني-الفيزيائي، مؤشرات الأداء والتقارير التنفيذية. النطاق الافتراضي جميع المناطق والمواقع المصرح بها.`,
  },
  {
    title: "Industrial Security Domain Map — General Reference",
    source: "platform-reference/domain-map-en",
    tags: ["general-reference", "industrial-security", "en"],
    content: `${NOTICE_EN}\n\nCoverage includes governance and risk, physical/perimeter security, access and contractor control, CCTV, patrols and control rooms, fire and emergency readiness, evacuation and continuity, permits and isolation, hazardous materials, system maintenance, investigation and corrective action, cyber-physical risk, KPIs and executive reporting. Default scope is every authorised region and site.`,
  },
  {
    title: "منهج تحليل الحوادث — مرجع عام",
    source: "platform-reference/incident-analysis-ar",
    tags: ["general-reference", "incidents", "investigation", "ar"],
    content: `${NOTICE_AR}\n\nيبدأ التحليل بتثبيت السلامة ومنع تفاقم الخطر وفق الخطة المعتمدة، ثم توثيق الوقائع والزمن والمصدر، حفظ الأدلة، تحديد الأثر، فصل السبب المباشر عن العوامل النظامية، تعيين إجراء تصحيحي بمالك وموعد وطريقة تحقق، ومراجعة الإغلاق من صاحب صلاحية. لا يختلق FINN درجة خطورة أو زمن استجابة غير موجودين في سياسة المؤسسة.`,
  },
  {
    title: "إطار تصاريح العمل والعزل — مرجع عام",
    source: "platform-reference/permit-isolation-ar",
    tags: ["general-reference", "permits", "isolation", "ar"],
    content: `${NOTICE_AR}\n\nيتحقق الإطار العام من نطاق العمل، المخاطر، كفاءة المنفذين، العزل ومصادر الطاقة، معدات الوقاية، القياسات المطلوبة، مسؤوليات الإصدار والاستلام، التداخل مع الأعمال المتزامنة، شروط الإيقاف، مدة الصلاحية والإغلاق. القيم والحدود الرقمية تؤخذ حصريًا من إجراء المؤسسة أو معيار رسمي مسترجع.`,
  },
  {
    title: "إطار الاستعداد للطوارئ — مرجع عام",
    source: "platform-reference/emergency-readiness-ar",
    tags: ["general-reference", "emergency", "continuity", "ar"],
    content: `${NOTICE_AR}\n\nيقاس الاستعداد بوجود سيناريوهات مخاطر معتمدة، أدوار واتصالات ومسارات تصعيد واضحة، خرائط إخلاء ونقاط تجمع، جاهزية موارد الاستجابة، تنسيق خارجي موثق، تمارين دورية، سجل ملاحظات وإجراءات تصحيحية، وخطة استمرارية وتعافٍ. لا يدّعي سَدِيد إرسال بلاغ أو استدعاء جهة خارجية دون إيصال أداة موثوق.`,
  },
  {
    title: "عقد الإجابة والاستشهاد لدى سَدِيد",
    source: "platform-reference/finn-grounding-contract-ar",
    tags: ["general-reference", "grounding", "citations", "ar"],
    content: `${NOTICE_AR}\n\nمعرفة Gemini المسبقة تشرح المفاهيم العامة فقط. أرقام المؤسسة وحالتها الحالية تأتي من بيانات حية مصرح بها، واللوائح المحددة من وثيقة موثقة مع استشهاد. بيانات المحاكاة تبقى مفصولة ومعلّمة. عند غياب الدليل تكون الإجابة: غير متوفر في المصادر الموثوقة المتاحة.`,
  },
];
