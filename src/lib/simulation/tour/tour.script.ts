// Nexios Guided Tour — narrated script (AR + EN).
// Executive first-person as ARIA. Each step: module + capability + one KPI.
import type { TourStep } from "./tour.types";

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    route: "/",
    titleAr: "أهلاً بك في نيكسوس",
    titleEn: "Welcome to Nexios",
    narrationAr:
      "أهلاً بك في نيكسوس، نظام التشغيل التنفيذي بالذكاء الاصطناعي. أنا أريا، سأصطحبك الآن في جولة موجزة عبر وحدات النظام العشر، من غرفة القيادة إلى الأمن والعمليات والتحليلات. كل ما ستراه حي، متصل، وقابل للتحكم فوراً.",
    narrationEn:
      "Welcome to Nexios, the executive AI operating system. I am ARIA, and I will guide you through the ten core modules — from the command deck to security, operations and analytics. Everything you see is live, connected, and instantly actionable.",
    dwellMs: 9000,
  },
  {
    id: "os",
    route: "/os",
    titleAr: "غرفة القيادة التنفيذية",
    titleEn: "Executive Command Deck",
    narrationAr:
      "هذه غرفة القيادة. من هنا تقود المؤسسة بأكملها: مؤشرات الأداء الحية، التنبيهات الحرجة، وقرارات الذكاء الاصطناعي في مكان واحد. الوقت الوسطي للاستجابة تحت ثلاث ثوانٍ.",
    narrationEn:
      "This is the command deck. From here you lead the entire enterprise — live KPIs, critical alerts, and AI decisions in one place. Median response time is under three seconds.",
    highlightSelector: "[data-tour='os-hero']",
    dwellMs: 9000,
    kpis: [{ label: { ar: "زمن الاستجابة", en: "Response" }, value: 2.8, suffix: "s" }],
  },
  {
    id: "sec",
    route: "/sec",
    titleAr: "منظومة الأمن السيبراني والمادي",
    titleEn: "Security Operations",
    narrationAr:
      "منظومة الأمن الموحدة تراقب المواقع والمركبات والفرق في الوقت الحقيقي، وتربط الحوادث بالإجراءات التصحيحية تلقائياً. جاهزية العمليات اليوم تسعة وتسعون بالمئة.",
    narrationEn:
      "The unified security fabric watches sites, vehicles and teams in real time, and links every incident to its corrective action automatically. Operational readiness today is ninety-nine percent.",
    dwellMs: 9000,
    kpis: [{ label: { ar: "الجاهزية", en: "Readiness" }, value: 99, suffix: "%" }],
  },
  {
    id: "incidents",
    route: "/sec/incidents",
    titleAr: "إدارة الحوادث الذكية",
    titleEn: "Intelligent Incident Management",
    narrationAr:
      "كل حادث يُصنَّف تلقائياً حسب الخطورة، ويُوجَّه للفريق المناسب مع خطة استجابة مقترحة. متوسط زمن الإغلاق انخفض بنسبة أربعين بالمئة منذ التفعيل.",
    narrationEn:
      "Every incident is auto-classified by severity and routed to the right team with a proposed response plan. Mean time to close has dropped by forty percent since activation.",
    dwellMs: 8500,
  },
  {
    id: "patrols",
    route: "/sec/patrols",
    titleAr: "الدوريات والفرق الميدانية",
    titleEn: "Patrols & Field Teams",
    narrationAr:
      "أتابع كل دورية على الخريطة، ومسارها، وامتثالها لنقاط التفتيش. أي انحراف يُنبَّه فوراً، وأي تأخير يُحوَّل إلى مهمة تصحيحية موثقة.",
    narrationEn:
      "I track every patrol on the map, its route and checkpoint compliance. Any deviation raises an instant alert, and any delay becomes a logged corrective task.",
    dwellMs: 8500,
  },
  {
    id: "analytics",
    route: "/analytics",
    titleAr: "التحليلات التنفيذية",
    titleEn: "Executive Analytics",
    narrationAr:
      "الاتجاهات، والتنبؤات، والمقارنات بين الوحدات — كلها بواجهة واحدة. النماذج التنبؤية تعمل على بياناتكم مباشرة، بدقة تتجاوز اثنين وتسعين بالمئة.",
    narrationEn:
      "Trends, forecasts, and cross-unit comparisons in a single canvas. The predictive models run on your own data, with accuracy above ninety-two percent.",
    dwellMs: 9000,
    kpis: [{ label: { ar: "دقة التنبؤ", en: "Forecast" }, value: 92.4, suffix: "%" }],
  },
  {
    id: "departments",
    route: "/departments",
    titleAr: "الإدارات والهيكل التنظيمي",
    titleEn: "Departments & Org Structure",
    narrationAr:
      "الإدارات، والميزانيات، ورؤساء الأقسام — منظمة بشكل حي ومتصلة بمؤشرات الأداء لكل وحدة. تحديث الهيكل ينعكس فوراً في التقارير التنفيذية.",
    narrationEn:
      "Departments, budgets, and heads — organized live and connected to each unit's KPIs. Structural updates flow instantly into every executive report.",
    dwellMs: 8500,
  },
  {
    id: "execution",
    route: "/execution",
    titleAr: "منصة التنفيذ والمهام",
    titleEn: "Execution & Tasking",
    narrationAr:
      "من القرار إلى التنفيذ في خطوة واحدة. المهام تُنشأ آلياً من القرارات التنفيذية، وتُتابَع حتى الإغلاق مع تدقيق كامل.",
    narrationEn:
      "From decision to execution in one step. Tasks are auto-generated from executive decisions and tracked to closure with a full audit trail.",
    dwellMs: 8500,
  },
  {
    id: "knowledge",
    route: "/knowledge",
    titleAr: "قاعدة المعرفة المؤسسية",
    titleEn: "Enterprise Knowledge",
    narrationAr:
      "كل وثيقة، وكل سياسة، وكل تقرير — قابلة للبحث الذكي والاستشهاد المباشر. أستخدم هذه القاعدة للإجابة على أسئلتك بدقة كاملة.",
    narrationEn:
      "Every document, policy and report — semantically searchable and directly citable. I use this base to answer your questions with full precision.",
    dwellMs: 8500,
  },
  {
    id: "closing",
    route: "/",
    titleAr: "أنت الآن في القيادة",
    titleEn: "You are in command",
    narrationAr:
      "انتهت الجولة. النظام كامل، متصل، وجاهز لأوامرك. اضغط زر المحادثة في أي وقت لتبدأ العمل معي مباشرة.",
    narrationEn:
      "Tour complete. The system is whole, connected, and ready for your command. Open the chat at any time to start working with me directly.",
    dwellMs: 8000,
  },
];
