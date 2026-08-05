// Auto-split from page-narrations.ts — pure data (uses the n() composer).
import type { PageNarration } from "./page-narrations.base";
import { n } from "./page-narrations.base";

export const ENTRIES_C: ReadonlyArray<readonly [string, PageNarration]> = [
  [
    "/settings",
    n(
      "الإعدادات",
      "Settings",
      "تكوين المؤسسة، المستخدمين، والصلاحيات",
      "organization, users, and permissions configuration",
      "ضبط دقيق يعكس هيكل مؤسستك",
      "fine-grained control that mirrors your organization",
    ),
  ],
  [
    "/admin",
    n(
      "لوحة المشرف",
      "Admin",
      "أدوات الإدارة العليا للمنصّة",
      "top-level platform administration tools",
      "سيطرة كاملة على تكوين النظام",
      "complete control over system configuration",
    ),
  ],
  [
    "/security-center",
    n(
      "مركز الأمن المعلوماتي",
      "Security Center",
      "التهديدات، الأدلة، وسجلات المراجعة",
      "threats, evidence, and audit trails",
      "حماية سيبرانية موثّقة للجهات الرقابية",
      "regulator-grade cybersecurity assurance",
    ),
  ],
  [
    "/health",
    n(
      "صحّة المنصة",
      "Platform Health",
      "حالة الخدمات، الأداء، والاستقرار",
      "service status, performance, and stability",
      "توفّر خدمي عالٍ وثقة تنفيذية",
      "high service availability and executive trust",
    ),
  ],
  [
    "/tts",
    n(
      "تركيب الكلام",
      "Text-to-Speech",
      "أصوات FINN وإعدادات النطق",
      "FINN's voices and pronunciation settings",
      "صوت طبيعي راقٍ يليق بحضور تنفيذي",
      "a natural, refined voice worthy of executive presence",
    ),
  ],
  [
    "/voice-setup",
    n(
      "إعداد الصوت",
      "Voice Setup",
      "خطوات معايرة الصوت والاختبار",
      "voice calibration and test steps",
      "تجربة صوتية موثوقة من أوّل تشغيل",
      "a reliable voice experience from the very first run",
    ),
  ],
  [
    "/voice",
    n(
      "الصوت التنفيذي لFINN",
      "FINN Voice",
      "إعدادات الصوت، المعاينة، وسجل التشغيل",
      "voice settings, preview, and playback log",
      "حضور صوتي احترافي لFINN",
      "professional voice presence for FINN",
    ),
  ],
  [
    "/elevenlabs-status",
    n(
      "حالة موفّر الصوت",
      "Voice Provider Status",
      "توفّر خدمة الصوت الخارجية",
      "external voice service availability",
      "شفافية تشغيلية لمزوّد الصوت",
      "operational transparency for the voice provider",
    ),
  ],

  // ── Work & delivery ─────────────────────────────────────────────────
  [
    "/tasks",
    n(
      "لوحة المهام",
      "Tasks",
      "المهام العاجلة، المُوكَلة، والمُنجَزة",
      "urgent, assigned, and completed tasks",
      "تنفيذ يومي منضبط بلا تسرّبات",
      "disciplined daily execution with no leaks",
    ),
  ],
  [
    "/team",
    n(
      "الفريق",
      "Team",
      "أعضاء الفريق، الأدوار، والحضور",
      "team members, roles, and presence",
      "توزيع مسؤوليات واضح ومساءلة صريحة",
      "clear responsibility split and explicit accountability",
    ),
  ],
  [
    "/departments",
    n(
      "الأقسام",
      "Departments",
      "الأقسام والفرق التشغيلية",
      "departments and their operational teams",
      "قراءة أفقية لعمق التشغيل",
      "a horizontal reading of operational depth",
    ),
  ],
  [
    "/events",
    n(
      "الأحداث المؤسسية",
      "Enterprise Events",
      "الجدول الزمني للأحداث المهمّة",
      "the timeline of significant events",
      "تسلسل زمني موحّد لكل ما جرى",
      "a unified chronological record of everything that happened",
    ),
  ],
  [
    "/files",
    n(
      "مركز الملفات",
      "Files Center",
      "الملفات، إصداراتها، وصلاحيات الوصول",
      "files, versions, and access permissions",
      "مصدر ملفات موحّد بلا نسخ متناثرة",
      "a single file source with no scattered copies",
    ),
  ],
  [
    "/leads",
    n(
      "العملاء المحتملون",
      "Leads",
      "لوحة الصفقات ومراحل كل عميل محتمل",
      "the pipeline and stage for every prospect",
      "تحويل أعلى وعائد مبيعات أوضح",
      "higher conversion and clearer sales return",
    ),
  ],
  [
    "/marketplace",
    n(
      "سوق الحلول",
      "Marketplace",
      "الحلول والتكاملات المتاحة للتثبيت",
      "solutions and integrations ready to install",
      "توسيع قدرات النظام دون تطوير مخصّص",
      "expanding system capability without custom builds",
    ),
  ],
  [
    "/investor",
    n(
      "لوحة المستثمر",
      "Investor",
      "مؤشرات النمو والقيمة المطلوبة للمستثمرين",
      "growth and value indicators needed by investors",
      "شفافية استثمارية جاهزة على مدار الساعة",
      "24/7-ready investor transparency",
    ),
  ],
  [
    "/customers",
    n(
      "العملاء",
      "Customers",
      "قاعدة العملاء، حالتهم، وقيمة كل حساب",
      "the customer base, status, and per-account value",
      "علاقات عملاء موثوقة وأداء تنافسي",
      "trusted customer relationships and competitive performance",
    ),
  ],

  // ── Learning & readiness ────────────────────────────────────────────
  // حُذف «/learn» و«/learn/» (أكاديمية التعلّم): مسار مخفي بأمر المالك يُعيد
  // التوجيه للرئيسية.
  [
    "/readiness",
    n(
      "مؤشر الجاهزية",
      "Readiness",
      "جاهزية المنصّة، الأشخاص، والإجراءات",
      "platform, people, and process readiness",
      "قراءة موحّدة للاستعداد التشغيلي",
      "a unified reading of operational readiness",
    ),
  ],
  // حُذف «/theater» (قاعة العرض): ضمن عائلة العروض السينمائية المخفية.
  // حُذف «/hajj» و«/hajj-prime»: لا مسار لهما في src/routes إطلاقًا — رواية
  // شاشة غير موجودة أسوأ من الصمت.
  [
    "/digital-twin",
    n(
      "التوأم الرقمي",
      "Digital Twin",
      "نموذج حيّ للمؤسسة وأصولها",
      "a live model of the enterprise and its assets",
      "محاكاة القرار قبل تنفيذه",
      "simulate the decision before executing it",
    ),
  ],
  [
    "/exec",
    n(
      "المشغّل التنفيذي",
      "Executive Runner",
      "تنفيذ مباشر لأوامر الطبقة العليا",
      "direct execution of top-tier commands",
      "سرعة تحويل القرار إلى فعل",
      "speed from decision to action",
    ),
  ],
  [
    "/operations",
    n(
      "العمليات",
      "Operations",
      "قلب النشاط التشغيلي الحيّ",
      "the beating heart of live operations",
      "تحكّم تشغيلي كامل من مكان واحد",
      "complete operational control from one place",
    ),
  ],
  // حُذف صفّ «/_authenticated» الجامع: مُعرّف تخطيط لا مسار يقف عليه أحد،
  // وبقاؤه كان يبتلع كل شاشة بلا صفّ خاص بها فيسمعها الزائر بوصف عام.

  // ── Public marketing / trust surfaces ───────────────────────────────
  [
    "/executive-briefing",
    n(
      "صفحة الإيجاز التنفيذي",
      "Executive Briefing Page",
      "الإيجاز التنفيذي القابل للمشاركة مع القيادة",
      "the executive briefing you can share with leadership",
      "قناة تعريف تنفيذية موحّدة بلغتك",
      "a unified executive introduction channel in your language",
    ),
  ],
  [
    "/executive-booking",
    n(
      "حجز جلسة تنفيذية",
      "Executive Booking",
      "خيارات مواعيد مباشرة مع الفريق التنفيذي",
      "direct calendar options with the executive team",
      "توفير وقت في الوصول إلى قرار الشراء",
      "shortening time-to-decision",
    ),
  ],
  // حُذف «/executive-showcase»: ضمن عائلة العروض السينمائية المخفية بأمر
  // المالك (hidden-routes.ts) مع /cinematic-demo و/films و/theater.
  // حُذف صفّ «/executive» العام: لا توجد صفحة تنفيذية عامة بهذا المسار — المسار
  // الوحيد هو _authenticated/executive («المساحة التنفيذية»)، وصفّه في
  // page-narrations.entries.b.ts. كان الصفّان يتنازعان مسارًا واحدًا.
  [
    "/government-brief",
    n(
      "الإيجاز الحكومي",
      "Government Brief",
      "ملخص المنصّة للجهات الحكومية",
      "the platform summary tailored for government",
      "شفافية سيادية تليق بالجهات الرقابية",
      "sovereign-grade transparency for regulators",
    ),
  ],
  [
    "/data-room",
    n(
      "غرفة البيانات",
      "Data Room",
      "الوثائق الحسّاسة للاطلاع المُقيَّد",
      "sensitive documents for restricted access",
      "بيئة عناية واجبة سريعة وآمنة",
      "a fast, secure due-diligence environment",
    ),
  ],
  [
    "/demo-videos",
    n(
      "مقاطع العرض",
      "Demo Videos",
      "مقاطع تُوضح القدرات التنفيذية",
      "clips that showcase executive capabilities",
      "فهم بصري سريع للنظام",
      "quick visual understanding of the system",
    ),
  ],
  [
    "/demo",
    n(
      "العرض التوضيحي",
      "Demo",
      "تجربة موجّهة للقدرات الرئيسية",
      "a guided tour of the main capabilities",
      "قرار تبنٍّ مبني على تجربة، لا وعود",
      "adoption grounded in experience, not promises",
    ),
  ],
  // حُذف «/films»: مخفي بأمر المالك — ولا يُعلن في sitemap.xml بعد اليوم.
  [
    "/roi",
    n(
      "حاسبة العائد",
      "ROI",
      "قراءة العائد المتوقّع من التبنّي",
      "expected return from adoption",
      "قرار استثماري مبني على أرقام",
      "an investment decision built on numbers",
    ),
  ],
  [
    "/security",
    n(
      "صفحة الأمن",
      "Security",
      "منظومة الأمن السيبراني وضوابطها",
      "the cybersecurity posture and controls",
      "ثقة تنفيذية موثّقة",
      "documented executive trust",
    ),
  ],
  [
    "/trust",
    n(
      "مركز الثقة",
      "Trust Center",
      "الشفافية، الشهادات، والامتثال",
      "transparency, certifications, and compliance",
      "علاقة موردٍ موثوقة من اليوم الأوّل",
      "a trusted-vendor relationship from day one",
    ),
  ],
  [
    "/subprocessors",
    n(
      "المعالجات الفرعية",
      "Sub-processors",
      "قائمة الأطراف الفرعية المعتمدة",
      "the approved sub-processor list",
      "امتثال حماية بيانات كامل",
      "full data-protection compliance",
    ),
  ],
  [
    "/dpa",
    n(
      "اتفاقية معالجة البيانات",
      "Data Processing Agreement",
      "بنود المعالجة والالتزامات المتبادلة",
      "processing terms and mutual obligations",
      "غطاء قانوني كامل لمعالجة البيانات",
      "complete legal cover for data processing",
    ),
  ],
  [
    "/sla",
    n(
      "اتفاقية مستوى الخدمة",
      "SLA",
      "التزامات التوفّر والاستجابة والدعم",
      "availability, response, and support commitments",
      "توقّعات مُتفَق عليها ومقاسة",
      "agreed and measured expectations",
    ),
  ],
  [
    "/aup",
    n(
      "سياسة الاستخدام المقبول",
      "Acceptable Use Policy",
      "حدود الاستخدام السليم للنظام",
      "the boundaries of proper system use",
      "بيئة تشغيل آمنة للجميع",
      "a safe operating environment for everyone",
    ),
  ],
  [
    "/responsible-ai",
    n(
      "الذكاء الاصطناعي المسؤول",
      "Responsible AI",
      "مبادئ التصميم الأخلاقي والحوكمة",
      "ethical design and governance principles",
      "ذكاء اصطناعي جدير بالثقة تنفيذياً",
      "AI worthy of executive trust",
    ),
  ],
  [
    "/privacy",
    n(
      "سياسة الخصوصية",
      "Privacy",
      "كيف نجمع ونعالج ونحمي البيانات",
      "how we collect, process, and protect data",
      "احترام كامل لخصوصية المستخدم",
      "full respect for user privacy",
    ),
  ],
  [
    "/cookie-policy",
    n(
      "سياسة الكوكيز",
      "Cookie Policy",
      "استخدام الكوكيز وخيارات التحكّم",
      "cookie usage and control options",
      "شفافية تشغيلية للمتصفّح",
      "operational browser transparency",
    ),
  ],
  [
    "/terms",
    n(
      "شروط الاستخدام",
      "Terms",
      "الشروط القانونية للاستخدام",
      "the legal terms of use",
      "علاقة تعاقدية واضحة",
      "a clear contractual relationship",
    ),
  ],
  [
    "/pricing",
    n(
      "الباقات والأسعار",
      "Pricing",
      "الخيارات والقيمة لكل باقة",
      "options and value per plan",
      "قرار اشتراك مبني على وضوح",
      "a subscription decision built on clarity",
    ),
  ],
  [
    "/contact",
    n(
      "التواصل معنا",
      "Contact",
      "قنوات التواصل مع الفريق",
      "channels to reach the team",
      "استجابة سريعة لطلبك",
      "a fast response to your request",
    ),
  ],
  [
    "/request-demo",
    n(
      "طلب عرض توضيحي",
      "Request a Demo",
      "استمارة حجز عرض مباشر",
      "the form to book a live demonstration",
      "بدء رحلة التبنّي بأقل احتكاك",
      "starting the adoption journey with minimum friction",
    ),
  ],
  [
    "/book",
    n(
      "حجز موعد",
      "Book a Session",
      "جدولة جلسة مع الفريق",
      "scheduling a session with the team",
      "استثمار وقتك مع خبير",
      "investing your time with an expert",
    ),
  ],
  [
    "/auth",
    n(
      "شاشة تسجيل الدخول",
      "Sign-in",
      "خيارات الدخول الآمن للنظام",
      "secure sign-in options",
      "دخول محمي بالمصادقة الحديثة",
      "entry protected by modern authentication",
    ),
  ],
  [
    "/login",
    n(
      "شاشة الدخول",
      "Login",
      "خيارات الدخول الآمن للنظام",
      "secure sign-in options",
      "دخول محمي بالمصادقة الحديثة",
      "entry protected by modern authentication",
    ),
  ],
  [
    "/unsubscribe",
    n(
      "إلغاء الاشتراك",
      "Unsubscribe",
      "خيارات إيقاف الرسائل",
      "options to stop messages",
      "احترام كامل لتفضيلات التواصل",
      "full respect for communication preferences",
    ),
  ],
  [
    "/",
    n(
      "الصفحة الرئيسية لمنصة إدارة الأمن الصناعي",
      "Industrial Security Platform Home",
      "التعريف الأوّل بالمنصّة وقدراتها التنفيذية",
      "the first introduction to the platform and its executive capability",
      "قراءة سريعة لقيمة النظام",
      "a fast reading of the system's value",
    ),
  ],

  // ── شاشات حيّة كانت بلا صفّ (المادة ٢٢) ─────────────────────────────
  // كل مسار هنا موجود فعلًا في src/routes وغير مخفي، وكان يسقط قبل اليوم على
  // نصّ عام. الوصف مكتوب من عنوان الصفحة ومحتواها لا من قالب، وبلا رقم واحد
  // غير مقيس (المادة ٢٧).
  [
    "/guide",
    n(
      "خريطة النظام",
      "System Map",
      "كل وحدة مصنّفة بدورها مع سطر غرضها ومخطّط علاقتها بالعناقيد الأخرى",
      "every module classified by role with its one-line purpose and a cluster relationship diagram",
      "معرفة أين تذهب قبل أن تضغط",
      "knowing where to go before you click",
      "الخريطة مبنيّة من سجلّ الوحدات الواحد، فلا تختلف عن الشريط الجانبي أبدًا",
      "the map is built from the single module registry, so it can never drift from the sidebar",
    ),
  ],
  [
    "/hcis",
    n(
      "الامتثال HCIS",
      "HCIS Compliance",
      "مصفوفة توجيهات الهيئة العليا للأمن الصناعي وحالة كل توجيه",
      "the High Commission for Industrial Security directive matrix and per-directive status",
      "دليل امتثال جاهز للعرض على الجهة الرقابية",
      "a compliance record ready to show the regulator",
      "البلاطات تقرأ من جداول الإطار الأربعة، وكل توجيه يفتح صفحة إرشاده بالرمز",
      "the tiles read from the four framework tables, and each directive opens its guidance page by code",
    ),
  ],
  [
    "/finn-analytics",
    n(
      "تحليلات FINN",
      "FINN Analytics",
      "استخدام FINN وأنماط الأسئلة وأداء الردّ",
      "FINN usage, question patterns, and response performance",
      "قراءة صادقة لما تستفيده المؤسسة من المحرّك",
      "an honest reading of what the enterprise gets from the engine",
      "ما لم يُقَس يظهر «لم يُقَس» ولا يُستبدل بصفر",
      "what is not measured shows as «not measured» and is never replaced by a zero",
    ),
  ],
  [
    "/reports-agent",
    n(
      "وكيل التقارير",
      "Reports Agent",
      "تشغيل الوكيل وعرض التقارير المولّدة وسجل كل تشغيلة",
      "running the agent, viewing generated reports, and each run's log",
      "تقارير دورية بلا عمل يدوي متكرّر",
      "recurring reports without repeated manual work",
    ),
  ],
  [
    "/rag-search",
    n(
      "البحث المعرفي بالاستشهاد",
      "Cited Knowledge Search",
      "بحثًا في المتن الموثّق يعيد المقاطع مع استشهادها",
      "a search over the verified corpus that returns passages with their citations",
      "إجابة يمكن تتبّع مصدرها سطرًا بسطر",
      "an answer whose source you can trace line by line",
      "الشاشة تشحن مطفأة خلف راية الاسترجاع، ولا تُرفع الراية إلا بقياس فعلي",
      "the screen ships dark behind the retrieval flag, and the flag is not raised without an actual measurement",
    ),
  ],
  [
    "/rag-monitor",
    n(
      "رصد طبقة المعرفة",
      "Knowledge Layer Monitor",
      "حالة المتن والفجوات المرصودة وبوابة الراية",
      "corpus state, observed gaps, and the flag gate",
      "شفافية كاملة لما تعرفه المنظومة وما لا تعرفه بعد",
      "full transparency about what the system knows and what it does not yet know",
      "كل مؤشّر غير مقيس يُعرض «لم يُقَس» — الصفر ليس بديلًا عن الغياب",
      "every unmeasured indicator renders «not measured» — zero is not a stand-in for absence",
    ),
  ],
  [
    "/blueprint",
    n(
      "المُخطَّط التنفيذي",
      "Executive Blueprint",
      "بنية المنظومة وطبقاتها ومسار تنفيذ كل مرحلة",
      "the system architecture, its layers, and the delivery path of each phase",
      "فهم ما بُني وما تبقّى قبل أي التزام",
      "understanding what is built and what remains before any commitment",
    ),
  ],
  [
    "/connect",
    n(
      "ربط مساعد ذكاء اصطناعي",
      "Connect an AI Assistant",
      "خطوات ربط مساعدك الخارجي بالمنصّة عبر بروتوكول السياق",
      "the steps to connect your external assistant through the context protocol",
      "استعمال أدوات المنصّة من داخل المساعد الذي تستخدمه أصلًا",
      "using the platform's tools from inside the assistant you already use",
    ),
  ],
  [
    "/nx-cockpit",
    n(
      "قمرة القيادة التنفيذية",
      "NX Cockpit",
      "مشهد القمرة الموحّد: المؤشرات والقرارات والوكلاء في إطار واحد",
      "the unified cockpit view: indicators, decisions, and agents in one frame",
      "قراءة الوضع كاملًا دون تنقّل بين الشاشات",
      "reading the whole situation without hopping between screens",
    ),
  ],
  [
    "/nx-ops",
    n(
      "مسرح العمليات الحيّ",
      "Ops Theater",
      "مشهدًا حيًّا للعمليات الجارية وتسلسل أحداثها",
      "a live stage of running operations and their event sequence",
      "متابعة الميدان كما يجري لا كما يُروى لاحقًا",
      "watching the field as it happens, not as it is retold later",
    ),
  ],
  [
    "/nx-flow",
    n(
      "رحلة الوكلاء مع فِن",
      "Agents Flow",
      "مسار المهمة من طلبها حتى إغلاقها عبر الوكلاء تحت قيادة FINN",
      "a task's path from request to closure across the agents under FINN's command",
      "رؤية من فعل ماذا ومتى بلا صندوق أسود",
      "seeing who did what and when, with no black box",
    ),
  ],
  [
    "/nx-agents",
    n(
      "منظومة الوكلاء",
      "NX Agents",
      "الوكلاء المتخصّصين وأدوارهم وحدود صلاحية كلٍّ منهم",
      "the specialist agents, their roles, and the boundary of each one's authority",
      "قدرة تنفيذية موازية تبقى تحت سيطرة معلنة",
      "parallel executive capacity that stays under declared control",
    ),
  ],
  [
    "/nx-atlas",
    n(
      "مركز المهام",
      "NX Atlas",
      "المهام مرتّبة باتجاهها وأولويتها ومالكها",
      "tasks arranged by direction, priority, and owner",
      "أولويات واضحة بدل قائمة طويلة بلا ترتيب",
      "clear priorities instead of one long unordered list",
    ),
  ],
  [
    "/nx-sovereign",
    n(
      "المشهد السيادي",
      "NX Sovereign",
      "الطبقة السيادية: النطاق الوطني والجهات والامتثال",
      "the sovereign layer: national scope, entities, and compliance",
      "قراءة تليق بجهة رقابية لا بلوحة تشغيل فقط",
      "a reading fit for a regulator, not only an operations board",
    ),
  ],
  [
    "/nx-twin",
    n(
      "التوأم الحيّ",
      "NX Twin",
      "نموذجًا حيًّا للأصول والمواقع يتحرّك مع الميدان",
      "a live model of assets and sites that moves with the field",
      "اختبار القرار على النموذج قبل الميدان",
      "testing the decision on the model before the field",
    ),
  ],
  [
    "/verify/permit",
    n(
      "التحقّق من تصريح عمل",
      "Permit Verification",
      "نتيجة التحقّق من التصريح المقروء برمز QR: سارٍ أو موقوف أو منتهٍ",
      "the verification verdict for a QR-scanned permit: valid, suspended, or expired",
      "تحقّق ميداني فوري بلا حساب ولا وسيط",
      "instant field verification with no account and no intermediary",
    ),
  ],
];
