type AgentDisplayInput = {
  id: string;
  name: string;
  goal: string;
  metadata?: unknown;
};

type RoleDefinition = {
  match: RegExp;
  nameAr: string;
  nameEn: string;
  departmentAr: string;
  departmentEn: string;
  descriptionAr: string;
  descriptionEn: string;
};

const ROLES: RoleDefinition[] = [
  {
    match: /executive|aria|finn|commander|قياد/i,
    nameAr: "FINN التنفيذي",
    nameEn: "FINN Executive",
    departmentAr: "القيادة التنفيذية",
    departmentEn: "Executive Command",
    descriptionAr: "تنسيق وكلاء الأمن الصناعي وتجهيز الملخصات للاعتماد البشري.",
    descriptionEn: "Coordinates industrial-security agents and prepares human-approved briefs.",
  },
  {
    match: /report|brief|تقرير|موجز/i,
    nameAr: "وكيل التقارير الأمنية",
    nameEn: "Security Reporting Agent",
    departmentAr: "التقارير",
    departmentEn: "Reporting",
    descriptionAr: "إعداد تقارير العمليات والملخصات التنفيذية الموثقة.",
    descriptionEn: "Produces documented operations reports and executive summaries.",
  },
  {
    match: /kpi|performance|مؤشر|أداء/i,
    nameAr: "وكيل مؤشرات الأداء",
    nameEn: "Performance KPI Agent",
    departmentAr: "الأداء والقياس",
    departmentEn: "Performance",
    descriptionAr: "مراقبة مؤشرات الأمن الصناعي وكشف الانحرافات.",
    descriptionEn: "Monitors industrial-security KPIs and detects deviations.",
  },
  {
    match: /risk|مخاطر/i,
    nameAr: "وكيل المخاطر الأمنية",
    nameEn: "Security Risk Agent",
    departmentAr: "المخاطر",
    departmentEn: "Risk",
    descriptionAr: "تقييم الخطورة والأثر واقتراح إجراءات التخفيف.",
    descriptionEn: "Assesses severity and impact and proposes mitigation.",
  },
  {
    match: /incident|response|investigat|حادث|بلاغ|استجاب/i,
    nameAr: "وكيل الحوادث والتصعيد",
    nameEn: "Incident & Escalation Agent",
    departmentAr: "غرفة العمليات",
    departmentEn: "Operations Room",
    descriptionAr: "تحليل البلاغات وتنسيق الاستجابة وتصعيد الحالات الحرجة.",
    descriptionEn: "Analyzes incidents, coordinates response, and escalates critical cases.",
  },
  {
    match: /monitor|watch|cctv|camera|ot_eye|رصد|مراقب|كامير/i,
    nameAr: "وكيل مراقبة العمليات",
    nameEn: "Operations Monitoring Agent",
    departmentAr: "المراقبة الميدانية",
    departmentEn: "Field Monitoring",
    descriptionAr: "مراقبة الكاميرات والحساسات والتنبيهات التشغيلية لحظياً.",
    descriptionEn: "Monitors cameras, sensors, and operational alerts in real time.",
  },
  {
    match: /maintenance|predict|work.?order|صيانة|تنبؤ/i,
    nameAr: "وكيل الصيانة التنبؤية",
    nameEn: "Predictive Maintenance Agent",
    departmentAr: "الصيانة",
    departmentEn: "Maintenance",
    descriptionAr: "التنبؤ بالأعطال وربطها بأوامر الصيانة الوقائية والتصحيحية.",
    descriptionEn: "Predicts faults and connects them to preventive and corrective work.",
  },
  {
    match: /compliance|audit|hcis|readiness|امتثال|تدقيق/i,
    nameAr: "وكيل امتثال HCIS",
    nameEn: "HCIS Compliance Agent",
    departmentAr: "الامتثال والتدقيق",
    departmentEn: "Compliance & Audit",
    descriptionAr: "مراجعة الضوابط والأدلة ومتابعة الإجراءات التصحيحية.",
    descriptionEn: "Reviews controls and evidence and tracks corrective actions.",
  },
  {
    match: /identity|access|guard|هوية|دخول|وصول/i,
    nameAr: "وكيل الهوية والدخول",
    nameEn: "Identity & Access Agent",
    departmentAr: "التحكم بالدخول",
    departmentEn: "Access Control",
    descriptionAr: "تحليل أحداث الدخول والتحقق من التصاريح والصلاحيات.",
    descriptionEn: "Analyzes access events and verifies permits and privileges.",
  },
  {
    match: /transport|patrol|حركة|دورية|نقل/i,
    nameAr: "وكيل الحركة والدوريات",
    nameEn: "Movement & Patrol Agent",
    departmentAr: "الدوريات والحركة",
    departmentEn: "Patrols & Movement",
    descriptionAr: "متابعة الدوريات وحركة المركبات ونقاط التفتيش.",
    descriptionEn: "Tracks patrols, vehicles, and checkpoints.",
  },
  {
    match: /workflow|orchestrat|تنسيق|مسار/i,
    nameAr: "وكيل سير العمليات",
    nameEn: "Operations Workflow Agent",
    departmentAr: "تنسيق العمليات",
    departmentEn: "Operations Coordination",
    descriptionAr: "تنسيق المهام بين فرق الأمن الصناعي ومسارات الاعتماد.",
    descriptionEn: "Coordinates tasks across industrial-security teams and approvals.",
  },
  {
    match: /notification|alert|تنبيه|إشعار/i,
    nameAr: "وكيل التنبيهات",
    nameEn: "Alerts Agent",
    departmentAr: "التنبيهات والتواصل",
    departmentEn: "Alerts & Communication",
    descriptionAr: "توجيه التنبيهات الموثقة إلى أصحاب الصلاحية.",
    descriptionEn: "Routes verified alerts to authorized owners.",
  },
  {
    match: /knowledge|rag|معرفة/i,
    nameAr: "وكيل المعرفة الأمنية",
    nameEn: "Security Knowledge Agent",
    departmentAr: "المعرفة والإجراءات",
    departmentEn: "Knowledge & Procedures",
    descriptionAr: "استرجاع السياسات والإجراءات والأدلة المعتمدة.",
    descriptionEn: "Retrieves approved policies, procedures, and evidence.",
  },
  {
    match: /twin|digital|توأم/i,
    nameAr: "وكيل التوأم الرقمي",
    nameEn: "Digital Twin Agent",
    departmentAr: "الأصول الرقمية",
    departmentEn: "Digital Assets",
    descriptionAr: "مطابقة حالة الأصول الميدانية مع نموذجها الرقمي.",
    descriptionEn: "Reconciles field asset status with the digital model.",
  },
];

export function industrialSecurityAgentDisplay(agent: AgentDisplayInput, ar: boolean) {
  const metadata =
    agent.metadata && typeof agent.metadata === "object"
      ? (agent.metadata as { category?: string; department?: string })
      : {};
  const haystack = `${agent.id} ${agent.name} ${agent.goal} ${metadata.category ?? ""}`;
  const role =
    ROLES.find((candidate) => candidate.match.test(haystack)) ??
    ({
      nameAr: "وكيل دعم الأمن الصناعي",
      nameEn: "Industrial Security Support Agent",
      departmentAr: "دعم العمليات",
      departmentEn: "Operations Support",
      descriptionAr: "دعم فرق الأمن الصناعي وتنفيذ المهام التشغيلية الموكلة.",
      descriptionEn: "Supports industrial-security teams and assigned operational tasks.",
    } satisfies Omit<RoleDefinition, "match">);

  return {
    name: ar ? role.nameAr : role.nameEn,
    department: ar ? role.departmentAr : role.departmentEn,
    description: ar ? role.descriptionAr : role.descriptionEn,
  };
}
