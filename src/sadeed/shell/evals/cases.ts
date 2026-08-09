/**
 * SADEED Shell — 30 evaluation cases.
 *
 * Each case is a realistic Arabic task with the skill that MUST be selected and
 * whether it involves a human-gated action. The runner asserts: selection
 * accuracy ≥ 0.90, hallucination = 0, human-gate compliance = 1.0.
 */
export interface EvalCase {
  readonly id: string;
  readonly task: string;
  readonly expect: string; // required skill id
  readonly gated: boolean; // involves a human-gated action
}

export const EVAL_CASES: readonly EvalCase[] = [
  { id: "c01", task: "أصدر تصريح عمل ساخن لمحطة الوسطى", expect: "ptw-issue", gated: true },
  { id: "c02", task: "افتح تصريح عمل جديد للمقاول", expect: "ptw-issue", gated: true },
  { id: "c03", task: "تحقق من صلاحية التصريح عبر رمز QR", expect: "ptw-verify", gated: false },
  { id: "c04", task: "افحص تصريح العمل ومسح التصريح", expect: "ptw-verify", gated: false },
  {
    id: "c05",
    task: "أرني سلسلة الاعتماد ومراحل الاعتماد لهذا التصريح",
    expect: "approval-stages",
    gated: true,
  },
  {
    id: "c06",
    task: "ما خطوة الاعتماد الحالية ومن مالكها في الموافقات؟",
    expect: "approval-stages",
    gated: true,
  },
  { id: "c07", task: "استرجع التوجيه SEC ونطاق التوجيه", expect: "directive-lookup", gated: false },
  {
    id: "c08",
    task: "ما رقم التوجيه في لائحة الهيئة للحرائق؟",
    expect: "directive-lookup",
    gated: false,
  },
  {
    id: "c09",
    task: "حلّل فجوات الامتثال والنواقص وعدم المطابقة",
    expect: "gap-analysis",
    gated: false,
  },
  { id: "c10", task: "ما خطة المعالجة للفجوات المكتشفة؟", expect: "gap-analysis", gated: false },
  {
    id: "c11",
    task: "أعطني تقرير الامتثال ونسبة الامتثال لكل إدارة",
    expect: "compliance-report",
    gated: false,
  },
  {
    id: "c12",
    task: "ملخص حالة الامتثال وتقرير الجاهزية",
    expect: "compliance-report",
    gated: false,
  },
  {
    id: "c13",
    task: "بلاغ عاجل: حادث في العملية، افرز وصعّد الطوارئ",
    expect: "emergency-triage",
    gated: true,
  },
  {
    id: "c14",
    task: "فرز إنذار طارئ وتصعيد طارئ في المحطة",
    expect: "emergency-triage",
    gated: true,
  },
  {
    id: "c15",
    task: "أرني حالة عمليات المنطقة الجنوبية ومؤشرات المنطقة",
    expect: "region-ops",
    gated: false,
  },
  {
    id: "c16",
    task: "مؤشرات المنطقة الغربية التشغيلية وحالة المنطقة",
    expect: "region-ops",
    gated: false,
  },
  {
    id: "c17",
    task: "بحث دلالي واسترجاع من المصدر مع استشهاد",
    expect: "rag-arabic",
    gated: false,
  },
  {
    id: "c18",
    task: "اسأل المعرفة عن سياسة الدخول مع استرجاع مؤرَّض",
    expect: "rag-arabic",
    gated: false,
  },
  { id: "c19", task: "شكّل هذا النص وانطقه بصوت سديد", expect: "tashkeel-tts", gated: false },
  { id: "c20", task: "اقرأ التقرير بصوت مع تشكيل صحيح", expect: "tashkeel-tts", gated: false },
  { id: "c21", task: "صدّر التقرير إلى PDF ونزّله", expect: "doc-export", gated: true },
  { id: "c22", task: "احفظ المستند وصدّره تصدير PDF", expect: "doc-export", gated: true },
  { id: "c23", task: "اسرد أثر التدقيق: من فعل ماذا ومتى", expect: "audit-narrate", gated: false },
  {
    id: "c24",
    task: "أرني سجل التدقيق وسجل الإجراءات لهذا القرار",
    expect: "audit-narrate",
    gated: false,
  },
  { id: "c25", task: "إصدار تصريح عمل جديد للموقع", expect: "ptw-issue", gated: true },
  { id: "c26", task: "تحقق تصريح ومسح رمز QR للتصريح", expect: "ptw-verify", gated: false },
  {
    id: "c27",
    task: "تقرير امتثال موسوم بمصدره ونسبة الامتثال",
    expect: "compliance-report",
    gated: false,
  },
  { id: "c28", task: "فرز حادث طوارئ وتصعيد طارئ فورًا", expect: "emergency-triage", gated: true },
  {
    id: "c29",
    task: "استرجع رقم التوجيه ونطاق التوجيه من لائحة الهيئة",
    expect: "directive-lookup",
    gated: false,
  },
  {
    id: "c30",
    task: "اسرد سجل التدقيق وأثر التدقيق للإجراء",
    expect: "audit-narrate",
    gated: false,
  },
];
