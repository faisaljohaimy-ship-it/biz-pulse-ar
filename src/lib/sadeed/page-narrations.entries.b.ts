// Auto-split from page-narrations.ts — pure data (uses the n() composer).
import type { PageNarration } from "./page-narrations.base";
import { n } from "./page-narrations.base";

export const ENTRIES_B: ReadonlyArray<readonly [string, PageNarration]> = [
  [
    "/sec/twin",
    n(
      "التوأم الرقمي للمنطقة",
      "Regional Digital Twin",
      "نموذج هرمي تفاعلي: الإدارة ← الدوائر ← المواقع ← المباني ← الأصول، مع لوحة تفاصيل عند اختيار أي عنصر",
      "an interactive hierarchical model: Division → Circles → Sites → Buildings → Assets, with a detail panel on selection",
      "محاكاة قرارات قبل تنفيذها في الميدان",
      "simulate decisions before executing them in the field",
      "الشجرة تُبنى من sec_sites/sec_buildings/sec_sections لحظيًا، واختيار عقدة يعرض المؤشرات والأصول والحوادث المفتوحة الخاصة بها",
      "the tree is built live from sec_sites/sec_buildings/sec_sections; selecting a node surfaces its KPIs, assets, and open incidents",
    ),
  ],
  [
    "/sec",
    n(
      "الصفحة الرئيسية للقيادة الأمنية",
      "Security Command Home",
      "نظرة عامة موحّدة على كل وحدات الأمن",
      "a unified overview of every security unit",
      "نقطة انطلاق واحدة لأي قرار أمني تنفيذي",
      "one launch point for any executive security decision",
      "شبكة تبويبات (اللوحة التنفيذية · التوأم الرقمي · المشاريع · أوامر العمل) تنقلك دون إعادة تحميل",
      "a tab grid (Executive · Digital Twin · Projects · WOs) navigates without reload",
    ),
  ],
  // حُذف صفّ الغلاف «/_authenticated/sec»: الغلاف لا يملك مسارًا يقف عليه
  // المستخدم — ما يُعرض فعلًا عند /sec هو صفّ الفهرس أعلاه. صفّان لشاشة
  // واحدة يعنيان روايتين لمنظر واحد.

  // ── Executive / SADEED surfaces ───────────────────────────────────────
  [
    "/sadeed/demo",
    n(
      "عرض سَدِيد التنفيذي",
      "SADEED Executive Demo",
      "مشاهد حيّة تُظهر كفاءة سَدِيد في اتخاذ القرار",
      "live scenes that showcase SADEED's decision throughput",
      "تجربة مباشرة لقدرات النظام دون بيئة اختبار منفصلة",
      "hands-on capability experience with no separate sandbox",
    ),
  ],
  [
    "/sadeed/directive",
    n(
      "لوحة الميثاق التنفيذي لسَدِيد",
      "SADEED Executive Directive",
      "المواثيق، الحوكمة، ومسارات التطوّر",
      "the charter, governance, and evolution paths",
      "شفافية كاملة لسلطة سَدِيد وقيودها",
      "full transparency of SADEED's authority and boundaries",
    ),
  ],
  [
    "/sadeed-documents",
    n(
      "وثائق سَدِيد",
      "SADEED Documents",
      "المستندات المُغذّية لذاكرة سَدِيد",
      "documents that feed SADEED's memory",
      "قرارات مبنية على مصادر معرفة موثّقة",
      "decisions grounded in cited knowledge sources",
    ),
  ],
  [
    "/sadeed",
    n(
      "واجهة سَدِيد",
      "SADEED Console",
      "محادثة تنفيذية مباشرة مع المحرّك",
      "a direct executive conversation with the engine",
      "استشارة فورية بلغة القرار",
      "instant consultation in the language of decisions",
    ),
  ],
  [
    "/assistant",
    n(
      "مساعد سَدِيد التنفيذي",
      "SADEED Executive Assistant",
      "المحادثات، السياق، والإجراءات المُنجَزة",
      "conversations, context, and completed actions",
      "تنفيذ مهام بدلاً من مجرّد الإجابة عليها",
      "actions completed, not just answers delivered",
    ),
  ],
  // حُذف صفّ «/_authenticated/assistant» المكرّر: صفّ الفهرس أعلاه يغطّي
  // /assistant وخيوطها /assistant/$threadId معًا عبر مطابقة المقاطع.

  // ── Executive command / decision surfaces ───────────────────────────
  // حُذف «/mission-control» (مركز القيادة): مسار مخفي بأمر المالك ٢٠٢٦/٠٨/١٢
  // (hidden-routes.ts) يُعيد التوجيه للرئيسية — وضع العرض التنفيذي انتقل
  // زرًّا في ترويسة لوحة سَدِيد.
  [
    "/situation-room",
    n(
      "غرفة الموقف",
      "Situation Room",
      "مؤشرات الحالة، الأحداث الحرجة، وقرارات اللحظة",
      "situation indicators, critical events, and in-the-moment decisions",
      "قرار متزامن بين قادة الجهات",
      "synchronized decisions across leadership functions",
    ),
  ],
  [
    "/crisis",
    n(
      "غرفة الأزمات",
      "Crisis Room",
      "الأحداث الحرجة المفتوحة والإجراءات الجارية",
      "open critical events and in-flight actions",
      "احتواء أسرع وسيطرة كاملة على السرد",
      "faster containment and full narrative control",
    ),
  ],
  [
    "/urgent-ops",
    n(
      "العمليات العاجلة",
      "Urgent Operations",
      "المهام الحرجة، أصحاب المسؤولية، والمواعيد النهائية",
      "critical tasks, owners, and deadlines",
      "استجابة تنفيذية أسرع للحوادث الحرجة",
      "faster executive response to critical events",
    ),
  ],
  [
    "/decisions",
    n(
      "لوحة القرارات",
      "Decisions Ledger",
      "القرارات المسجّلة، سياقها، وأثرها",
      "recorded decisions, their context, and their impact",
      "ذاكرة قرار مؤسسية قابلة للتدقيق",
      "an auditable institutional decision memory",
    ),
  ],
  [
    "/executive-map",
    n(
      "الخريطة التنفيذية",
      "Executive Map",
      "التوزيع الجغرافي للعمليات والأصول",
      "geographic distribution of operations and assets",
      "قراءة مكانية سريعة للوضع",
      "instant spatial reading of the situation",
    ),
  ],
  // حُذف «/executive-reports»: مسار مخفي بأمر المالك (hidden-routes.ts) يُعيد
  // التوجيه للرئيسية — التقارير التنفيذية دُمجت في /sec/reports.
  [
    "/executive",
    n(
      "المساحة التنفيذية",
      "Executive Workspace",
      "الأدوات والمؤشرات الخاصة بالإدارة العليا",
      "the tools and indicators reserved for senior leadership",
      "تركيز على القرار، لا على البيانات الخام",
      "focus on decision, not raw data",
    ),
  ],
  // حُذف «/cockpit» (قمرة القيادة): مسار مخفي بأمر المالك ٢٠٢٦/٠٨/١٢ —
  // «حذف قمرة القيادة التنفيذية» يشمل السلف الحامل للاسم نفسه.
  // حُذف «/boardroom» (قاعة المجلس): مسار مخفي بأمر المالك ٢٠٢٦/٠٨/٢٠
  // (hidden-routes.ts) — «حذف الواجهة بالكامل لتكرار المعلومات».
  [
    "/briefing",
    n(
      "الإيجاز التنفيذي",
      "Executive Briefing",
      "الملخص اليومي، الأولويات، والمخاطر",
      "the daily brief, priorities, and risks",
      "بداية يوم تنفيذي مبني على بيّنة",
      "an evidence-based start to the executive day",
    ),
  ],
  [
    "/chief-of-staff",
    n(
      "رئيس الديوان",
      "Chief of Staff",
      "مسارات القرار، التفويض، والمتابعة",
      "decision routes, delegation, and follow-through",
      "تنفيذ منضبط للأجندة التنفيذية",
      "disciplined execution of the executive agenda",
    ),
  ],
  [
    "/execution",
    n(
      "لوحة التنفيذ",
      "Execution Board",
      "المبادرات، مالكيها، ومؤشرات التقدّم",
      "initiatives, owners, and progress indicators",
      "تحويل الاستراتيجية إلى نتائج قابلة للقياس",
      "translate strategy into measurable outcomes",
    ),
  ],
  [
    "/transformation",
    n(
      "لوحة التحوّل",
      "Transformation",
      "المبادرات التحوّلية والمعالم الرئيسية",
      "transformation initiatives and key milestones",
      "قيادة تغيير مؤسسي دون فوضى",
      "leading enterprise change without chaos",
    ),
  ],
  [
    "/portfolio",
    n(
      "محفظة المبادرات",
      "Portfolio",
      "المبادرات، مواردها، وترتيب أولوياتها",
      "initiatives, their resources, and prioritization",
      "توزيع أفضل للموارد التنفيذية",
      "better allocation of executive resources",
    ),
  ],
  [
    "/outcomes",
    n(
      "لوحة النتائج",
      "Outcomes",
      "النتائج التجارية والقيمة المُتحقّقة",
      "business outcomes and realized value",
      "ربط كل نشاط بأثر ملموس",
      "linking every activity to measurable impact",
    ),
  ],
  [
    "/dashboard",
    n(
      "اللوحة التنفيذية",
      "Dashboard",
      "المؤشرات الرئيسية للمؤسسة",
      "the enterprise's headline indicators",
      "نظرة شاملة بلا ضجيج",
      "a comprehensive view without noise",
    ),
  ],
  // حُذف «/analytics»: مسار مخفي بأمر المالك — الإحصائيات موزّعة على لوحات
  // أخرى، ورواية شاشة مُعاد توجيهها كذبٌ على السامع.
  [
    "/analyst",
    n(
      "مساحة المحلل",
      "Analyst Workspace",
      "أدوات الاستكشاف والاستعلام والرسم",
      "exploration, query, and charting tools",
      "تحقيقات بيانية أعمق دون خبرة تقنية طويلة",
      "deeper data investigations without heavy technical overhead",
    ),
  ],
  // حُذف «/risk» (إدارة المخاطر المؤسسية): مسار مخفي بأمر المالك ٢٠٢٦/٠٨/١٢
  // — «سجل المخاطر» /sec/risks شاشة أخرى ولها صفّها الخاص.
  [
    // «الحوكمة» انتقلت إلى شريط الأمن الصناعي بأمر المالك ٢٠٢٦/٠٨/١٢ —
    // المفتاح هو المسار الحيّ الجديد، والعنوان القديم يعيد التوجيه إليه.
    "/sec/governance",
    n(
      "الحوكمة",
      "Governance",
      "السياسات، الأدوار، وسجلات القرار",
      "policies, roles, and decision logs",
      "امتثال حقيقي لا صوري",
      "genuine, not superficial, compliance",
    ),
  ],
  [
    "/live-dashboard",
    n(
      "اللوحة الحيّة",
      "Live Dashboard",
      "دفق مؤشرات لحظي عبر المؤسسة",
      "a real-time indicator stream across the enterprise",
      "قراءة الوضع في الثانية التي يتغيّر فيها",
      "reading the situation the second it changes",
    ),
  ],

  // ── SADEED operations / runtime ───────────────────────────────────────
  [
    "/orchestration",
    n(
      "تنسيق الوكلاء",
      "Agent Orchestration",
      "الوكلاء النشطون، المهام الآلية، ومسار كل مهمة",
      "active agents, automated tasks, and per-task lineage",
      "تشغيل آلي موثوق بدون فقدان السيطرة",
      "reliable automation without losing control",
    ),
  ],
  [
    "/agents",
    n(
      "منصة عمليات الوكلاء",
      "AI Agents",
      "قائمة الوكلاء، صلاحياتهم، وأدائهم",
      "the agent roster, permissions, and performance",
      "قدرة تنفيذية موازية تضاعف إنتاجية الفريق",
      "parallel executive capacity that multiplies team output",
    ),
  ],
  [
    "/workflows",
    n(
      "مسارات العمل",
      "Workflows",
      "الأتمتة القابلة للتكوين وسجل التنفيذ",
      "configurable automations and their execution log",
      "توحيد الإجراءات الحرجة عبر المؤسسة",
      "standardization of critical procedures enterprise-wide",
    ),
  ],
  [
    "/ai-ops",
    n(
      "عمليات الذكاء الاصطناعي",
      "AI Operations",
      "صحة النماذج، الطلبات، والاستهلاك",
      "model health, requests, and consumption",
      "تشغيل ذكاء اصطناعي بجودة إنتاجية",
      "running AI at production quality",
    ),
  ],
  [
    "/self-evolution",
    n(
      "التطوّر الذاتي",
      "Self-Evolution",
      "الدروس التي تعلّمها النظام وحلقات التحسين",
      "what the system has learned and its improvement loops",
      "منصّة تتحسّن بنفسها بمرور الوقت",
      "a platform that improves itself over time",
    ),
  ],
  [
    "/memory",
    n(
      "ذاكرة سَدِيد",
      "SADEED Memory",
      "السياق طويل الأمد والحقائق المؤسسية",
      "long-term context and enterprise facts",
      "استمرارية معرفية عبر كل تفاعل",
      "knowledge continuity across every interaction",
    ),
  ],
  [
    "/forgotten",
    n(
      "المُنسَى",
      "Forgotten Items",
      "العناصر التي تجاوزت المهلة أو تُركت دون متابعة",
      "items past due or left unhandled",
      "استعادة كل ما يسقط بين الشقوق",
      "recovering everything that would slip through the cracks",
    ),
  ],
  [
    "/knowledge-hub",
    n(
      "مركز المعرفة",
      "Knowledge Hub",
      "المستندات، المصادر، والفهارس",
      "documents, sources, and indexes",
      "مرجع تنفيذي واحد بدل ملفات مبعثرة",
      "one executive reference in place of scattered files",
    ),
  ],
  [
    "/knowledge-upload",
    n(
      "رفع المعرفة",
      "Knowledge Upload",
      "استيراد مستندات جديدة لذاكرة سَدِيد",
      "ingest new documents into SADEED's memory",
      "توسيع نطاق ذكاء المؤسسة بسرعة",
      "expand enterprise intelligence quickly",
    ),
  ],
  [
    "/knowledge",
    n(
      "قاعدة المعرفة",
      "Knowledge Base",
      "الوثائق المفهرسة والمقاطع القابلة للاستشهاد",
      "indexed documents and citable chunks",
      "أجوبة موثّقة يمكن تدقيقها للحظتها",
      "cited answers you can audit in the moment",
    ),
  ],
  [
    "/prompts",
    n(
      "مكتبة الموجّهات",
      "Prompt Library",
      "الموجّهات القياسية المعتمدة للفرق",
      "team-approved standard prompts",
      "توحيد جودة التفاعل مع الذكاء الاصطناعي",
      "standardized AI interaction quality",
    ),
  ],
  [
    "/tools",
    n(
      "الأدوات التنفيذية",
      "Executive Tools",
      "الأدوات الجاهزة داخل النظام",
      "the tools bundled inside the system",
      "إنجاز أسرع دون الخروج من المنصّة",
      "faster delivery without leaving the platform",
    ),
  ],
  [
    "/tool-health",
    n(
      "صحّة الأدوات",
      "Tool Health",
      "حالة كل أداة داخلية وأثرها التشغيلي",
      "the status of every internal tool and its operational impact",
      "تشغيل موثوق للطبقة الأتمتيّة",
      "reliable operation of the automation layer",
    ),
  ],
  [
    "/fabric",
    n(
      "النسيج التشغيلي",
      "Operational Fabric",
      "الترابط بين الأنظمة، البيانات، والوكلاء",
      "the fabric linking systems, data, and agents",
      "شفافية كاملة لتدفّق العمل عبر الحدود",
      "full transparency of workflow across boundaries",
    ),
  ],
  [
    "/observability",
    n(
      "المراقبة الشاملة",
      "Observability",
      "السجلّات، القياسات، والتتبّع الموزّع",
      "logs, metrics, and distributed tracing",
      "اكتشاف المشاكل قبل أن يشعر بها المستخدم",
      "detecting issues before users feel them",
    ),
  ],
  [
    "/diagnostics",
    n(
      "التشخيصات",
      "Diagnostics",
      "أدوات فحص النظام والفحوصات الذاتية",
      "system inspection tools and self-checks",
      "استقرار تشغيلي عالي المستوى",
      "high-level operational stability",
    ),
  ],
  [
    "/integrations",
    n(
      "التكاملات",
      "Integrations",
      "الأنظمة المرتبطة، حالتها، ومزامنتها",
      "connected systems, status, and sync",
      "تشغيل موحّد بلا صوامع بيانات",
      "unified operation with no data silos",
    ),
  ],
  [
    "/settings/microsoft",
    n(
      "إعدادات مايكروسوفت",
      "Microsoft Settings",
      "ربط منظومة مايكروسوفت 365 وامتيازاتها",
      "Microsoft 365 wiring and permissions",
      "تجربة عمل موحّدة داخل المنظومة الشائعة",
      "a unified work experience inside the common suite",
    ),
  ],
];
