/** Shared deterministic planner. No network, model, database or side effects. */
export interface FnnPeer {
  id: string;
  name: string;
}

export interface FnnPlan {
  workflow: string;
  title: string;
  steps: string[];
  peers: FnnPeer[];
  tools: string[];
  status: "prepared" | "out_of_scope" | "cancelled";
}

const WORKFLOWS = [
  {
    pattern: /ingest|import|csv|json|excel|xlsx|pdf|استيراد|حقن|رفع.*ملف|إدخال.*بيانات/i,
    id: "validated_data_ingestion",
    title: "فحص واستيراد بيانات معتمدة",
    steps: [
      "فحص نوع الملف وحجمه واستخراج معاينة دون رفع",
      "مراجعة الحقول والتكرار وبصمة المصدر في مركز رفع المعرفة",
      "اعتماد الرفع صراحةً ثم متابعة المعالجة بصلاحيات المؤسسة",
    ],
  },
  {
    pattern: /github|pull request|برمج|كود|اختبار|تصحيح|deploy|نشر|api|تكامل/i,
    id: "engineering_review",
    title: "تجهيز مهمة هندسية قابلة للمراجعة",
    steps: [
      "تحديد المستودع والفرع والعطل ومعيار قبول النتيجة",
      "مراجعة التكامل المصرّح به؛ تنفيذ الكود الآلي غير متاح من هذه الخطة",
      "عزل التغيير وفحصه ثم مراجعة طلب الدمج؛ النشر يحتاج اعتمادًا منفصلًا",
    ],
  },
  {
    pattern: /incident|بلاغ|حادث|طوارئ|emergency/i,
    id: "incident_triage",
    title: "فرز بلاغ الأمن الصناعي",
    steps: [
      "مراجعة البلاغ ومصدره ووقت تحديثه",
      "اقتراح الوكيل المختص ودرجة التصعيد",
      "عرض الإجراء على صاحب الصلاحية قبل التنفيذ",
    ],
  },
  {
    pattern: /maintenance|صيانة|work\s*order|أمر عمل/i,
    id: "maintenance_follow_up",
    title: "متابعة الصيانة",
    steps: [
      "مراجعة أمر العمل وحالته من صفحة الصيانة",
      "تجهيز قائمة متابعة للمسؤول المختص",
      "اعتماد أي تغيير للحالة أو التكليف قبل تنفيذه",
    ],
  },
  {
    pattern: /permit|تصريح|تصاريح|ptw/i,
    id: "permit_review",
    title: "مراجعة تصريح العمل",
    steps: [
      "مراجعة التصريح والمرفقات المتاحة لصاحب الجلسة",
      "تحديد المتطلبات الناقصة للمراجعة البشرية",
      "إحالة القرار لصاحب صلاحية الاعتماد",
    ],
  },
  {
    pattern: /report|تقرير|ملخص|summary/i,
    id: "security_report",
    title: "تجهيز التقرير التشغيلي",
    steps: [
      "مراجعة سجل الوكلاء وحالات التشغيل",
      "فصل البيانات الحية عن المحاكاة وذكر مصدر كل نتيجة",
      "تجهيز مسودة التقرير للمراجعة قبل المشاركة",
    ],
  },
  {
    pattern: /assign|كلّف|اسند|مهمة|task|أتمتة|اتمته|أتمته|automation/i,
    id: "approved_task_assignment",
    title: "تنسيق مهمة الأمن الصناعي",
    steps: [
      "تحديد نطاق المهمة والوكيل المستهدف",
      "مراجعة الأدوات والصلاحيات المتاحة",
      "تقديم مقترح التكليف دون تنفيذه تلقائياً",
    ],
  },
] as const;

export function prepareFnnPlan(
  question: string,
  peers: readonly FnnPeer[] = [],
  signal?: AbortSignal,
): FnnPlan {
  const base = {
    peers: peers.filter((p) => p.id !== "fnn").map(({ id, name }) => ({ id, name })),
    tools: [
      "تصنيف سير العمل",
      "قراءة سجل الوكلاء المعروض",
      "تجهيز خطوات الاعتماد",
      "تصدير خطة محلية",
    ],
  };
  if (signal?.aborted)
    return {
      ...base,
      workflow: "cancelled",
      title: "أُلغيت المهمة",
      steps: [],
      status: "cancelled",
    };
  const workflow = WORKFLOWS.find((entry) => entry.pattern.test(question));
  if (!workflow || question.length > 2000)
    return {
      ...base,
      workflow: "out_of_scope",
      title: "اختر مهمة تشغيلية أو هندسية: بلاغ، صيانة، تصريح، تقرير، استيراد بيانات أو برمجة.",
      steps: [],
      status: "out_of_scope",
    };
  return {
    ...base,
    workflow: workflow.id,
    title: workflow.title,
    steps: [...workflow.steps],
    status: "prepared",
  };
}
