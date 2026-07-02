// Static registry: route → page-aware ARIA context.
// Additive only — no backend changes. Consumed by <AriaGlobalDock />.

export type PageEntry = {
  title_ar: string;
  title_en: string;
  purpose_ar: string;
  purpose_en: string;
  questions_ar: [string, string, string];
  questions_en: [string, string, string];
};

const R: Record<string, PageEntry> = {
  "/": {
    title_ar: "الصفحة الرئيسية — NEXIOS AI OS",
    title_en: "NEXIOS AI OS — Home",
    purpose_ar: "منصة تشغيل ذكية للحكومة والمؤسسات وعمليات الحج.",
    purpose_en: "AI operating system for government, enterprise and Hajj operations.",
    questions_ar: ["ما هو NEXIOS؟", "كيف تعمل آريا؟", "اعرض عليّ العرض التنفيذي."],
    questions_en: ["What is NEXIOS?", "How does ARIA work?", "Show me the executive demo."],
  },
  "/exec": {
    title_ar: "غرفة القيادة التنفيذية",
    title_en: "Executive Command Room",
    purpose_ar: "لوحة تنفيذية حية للمؤشرات، المخاطر، والقرارات.",
    purpose_en: "Live executive dashboard for KPIs, risks, and decisions.",
    questions_ar: ["اعرض ملخص المؤشرات الآن.", "ما أعلى المخاطر المفتوحة؟", "ما هي الحوادث الحرجة اليوم؟"],
    questions_en: ["Show current KPI summary.", "What are the top open risks?", "Which incidents are critical today?"],
  },
  "/os": {
    title_ar: "غرفة عمليات NEXIOS",
    title_en: "NEXIOS Operations Room",
    purpose_ar: "المراقبة الحية للأنظمة، الوكلاء، وسير العمل التشغيلي.",
    purpose_en: "Live monitoring of systems, agents and operational workflows.",
    questions_ar: ["ما حالة الوكلاء النشطين؟", "أظهر آخر التنبيهات.", "ما مستوى صحة النظام؟"],
    questions_en: ["What is the status of active agents?", "Show latest alerts.", "What is system health?"],
  },
  "/hajj-prime": {
    title_ar: "الحج برايم — العمليات المقدسة",
    title_en: "Hajj Prime — Sacred Operations",
    purpose_ar: "منظومة إدارة عمليات الحج والحشود والأمن الميداني.",
    purpose_en: "Hajj operations, crowd flow and field security management.",
    questions_ar: ["ما كثافة الحشود الآن؟", "أظهر خطة الطوارئ.", "ما آخر تقرير أمني ميداني؟"],
    questions_en: ["What is the current crowd density?", "Show the emergency plan.", "Latest field security report?"],
  },
  "/runtime-hub": {
    title_ar: "مركز التشغيل الحي",
    title_en: "Runtime Hub",
    purpose_ar: "نبض النظام والوكلاء والخدمات في الوقت الحقيقي.",
    purpose_en: "Real-time pulse of system, agents and services.",
    questions_ar: ["ما نبض النظام الآن؟", "أي الخدمات متأخرة؟", "أظهر الوكلاء الأكثر نشاطاً."],
    questions_en: ["What is the current pulse?", "Which services are lagging?", "Show the busiest agents."],
  },
  "/pricing": {
    title_ar: "الباقات والتسعير",
    title_en: "Plans & Pricing",
    purpose_ar: "خطط الاشتراك للمؤسسات والحكومة.",
    purpose_en: "Enterprise and government subscription tiers.",
    questions_ar: ["أي باقة تناسب مؤسستي؟", "ما الفرق بين الباقات؟", "هل يوجد تجربة تنفيذية؟"],
    questions_en: ["Which plan fits my organization?", "Compare the tiers.", "Is there an executive trial?"],
  },
  "/contact": {
    title_ar: "التواصل مع NEXIOS",
    title_en: "Contact NEXIOS",
    purpose_ar: "طلب عرض تنفيذي أو التواصل مع فريق المبيعات.",
    purpose_en: "Request an executive briefing or reach sales.",
    questions_ar: ["كيف أطلب عرضاً تنفيذياً؟", "ما وقت الرد المتوقع؟", "هل تدعمون التكامل مع أنظمتنا؟"],
    questions_en: ["How do I request a briefing?", "Expected response time?", "Do you support our systems?"],
  },
  "/demo": {
    title_ar: "عرض NEXIOS التفاعلي",
    title_en: "NEXIOS Interactive Demo",
    purpose_ar: "جولة موجهة داخل النظام وقدرات آريا.",
    purpose_en: "Guided walkthrough of the platform and ARIA capabilities.",
    questions_ar: ["ابدأ العرض التفاعلي.", "اعرض قدرات آريا.", "ما أبرز السيناريوهات؟"],
    questions_en: ["Start the walkthrough.", "Show ARIA capabilities.", "Which scenarios are highlighted?"],
  },
  "/request-demo": {
    title_ar: "طلب عرض تنفيذي",
    title_en: "Request Executive Demo",
    purpose_ar: "احجز جلسة تنفيذية خاصة مع فريق NEXIOS.",
    purpose_en: "Book a private executive session with the NEXIOS team.",
    questions_ar: ["ما مدة الجلسة؟", "من يحضر عادةً؟", "هل الجلسة سرية؟"],
    questions_en: ["How long is the session?", "Who typically attends?", "Is the session confidential?"],
  },
  "/security": {
    title_ar: "الأمن والامتثال",
    title_en: "Security & Compliance",
    purpose_ar: "معايير الأمن، الخصوصية، وإدارة المخاطر.",
    purpose_en: "Security posture, privacy and risk management.",
    questions_ar: ["ما شهاداتكم الأمنية؟", "كيف تحمون البيانات؟", "ما إطار الامتثال؟"],
    questions_en: ["What certifications do you hold?", "How is data protected?", "What compliance framework applies?"],
  },
  "/trust": {
    title_ar: "مركز الثقة",
    title_en: "Trust Center",
    purpose_ar: "الشفافية حول التشغيل والامتثال.",
    purpose_en: "Transparency on operations and compliance.",
    questions_ar: ["أين تُستضاف البيانات؟", "ما سياسة الحوادث؟", "من يصل إلى بياناتي؟"],
    questions_en: ["Where is data hosted?", "What is your incident policy?", "Who accesses my data?"],
  },
  "/executive-briefing": {
    title_ar: "الملخص التنفيذي",
    title_en: "Executive Briefing",
    purpose_ar: "ملخص القيادة المكثف عن الأداء والمخاطر.",
    purpose_en: "Condensed leadership brief on performance and risks.",
    questions_ar: ["اعرض ملخص اليوم.", "ما القرارات المطلوبة؟", "ما الاتجاهات هذا الأسبوع؟"],
    questions_en: ["Show today's brief.", "Which decisions are needed?", "This week's trends?"],
  },
};

const FALLBACK: PageEntry = {
  title_ar: "NEXIOS AI OS",
  title_en: "NEXIOS AI OS",
  purpose_ar: "منصة التشغيل الذكية.",
  purpose_en: "The AI operating system.",
  questions_ar: ["ما هذه الصفحة؟", "كيف تساعدني آريا هنا؟", "اعرض ملخصاً سريعاً."],
  questions_en: ["What is this page?", "How can ARIA help here?", "Show a quick summary."],
};

export function getPageEntry(pathname: string): PageEntry {
  if (R[pathname]) return R[pathname];
  // longest-prefix match
  const keys = Object.keys(R).sort((a, b) => b.length - a.length);
  for (const k of keys) if (k !== "/" && pathname.startsWith(k)) return R[k];
  return FALLBACK;
}

export function listPages(): Array<{ path: string; title_en: string; purpose_en: string }> {
  return Object.entries(R).map(([path, e]) => ({
    path,
    title_en: e.title_en,
    purpose_en: e.purpose_en,
  }));
}

