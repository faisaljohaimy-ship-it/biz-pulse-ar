/**
 * ARIA Page Narrations — deterministic bilingual (AR default) executive
 * blurbs that ARIA MUST speak the moment a user lands on any page in the
 * system. Every entry follows the same executive template:
 *
 *   "You are in <PAGE>. It contains <WHAT>. Value: <WHY>."
 *
 * Article 22 · Enforcement: every shipping route MUST have an entry. If
 * a route is added without one, the matcher falls back to a neutral line
 * derived from the path segment so ARIA is never silent by accident.
 */

export interface PageNarration {
  readonly ar: string;
  readonly en: string;
}

// Prefixes where ARIA MUST stay silent (intros, cinematic promos, sinks).
const SILENT_PREFIXES = ["/promo", "/lovable", "/.well-known", "/.mcp", "/mcp", "/api"] as const;

export function isSilentRoute(pathname: string): boolean {
  return SILENT_PREFIXES.some((p) => pathname.startsWith(p));
}

// Compose helper — keeps every entry in the same executive shape.
// Optional howAr/howEn enrich the narration with "how the page works"
// so ARIA describes both the contents AND the mechanics on landing.
function n(
  pageAr: string,
  pageEn: string,
  containsAr: string,
  containsEn: string,
  valueAr: string,
  valueEn: string,
  howAr?: string,
  howEn?: string,
): PageNarration {
  const arHow = howAr ? ` آلية العمل: ${howAr}.` : "";
  const enHow = howEn ? ` How it works: ${howEn}.` : "";
  return {
    ar: `أنت الآن في ${pageAr}. تشمل ${containsAr}.${arHow} القيمة: ${valueAr}.`,
    en: `You are in ${pageEn}. It contains ${containsEn}.${enHow} Value: ${valueEn}.`,
  };
}

// Longest prefixes FIRST — matcher picks the first startsWith() hit.
const ENTRIES: ReadonlyArray<readonly [string, PageNarration]> = [
  // ── SEC command surface ─────────────────────────────────────────────
  [
    "/_authenticated/sec.incidents",
    n(
      "لوحة الحوادث الأمنية",
      "Security Incidents",
      "الحوادث المفتوحة، الأولويات، الفرق المُكلَّفة، والخط الزمني الحيّ",
      "open incidents, priorities, assigned teams, and a live timeline",
      "قرار تنفيذي فوري لتقصير زمن الاستجابة والاحتواء",
      "immediate executive decisions that cut response and containment time",
      "بطاقات KPI (إجمالي/مفتوحة/حرجة/زمن الاستجابة) مرتبطة بجدول sec_incidents، تحديث لحظي كل ١٥ث، وفلاتر بحسب الشدّة والحالة والموقع تُغيّر الشارات والقائمة معاً",
      "KPI cards (total, open, critical, response time) bound to sec_incidents, refresh every 15s, and severity/status/site filters drive both badges and the list together",
    ),
  ],
  [
    "/_authenticated/sec.cctv",
    n(
      "لوحة كاميرات المراقبة",
      "CCTV Operations",
      "الكاميرات النشطة، حالتها، وأي تنبيهات مرئية جارية",
      "active cameras, their status, and live visual alerts",
      "رؤية بصرية موحّدة تكشف الحوادث قبل تصاعدها",
      "unified visual awareness that catches incidents before they escalate",
      "مؤشر توفّر CCTV محسوب من sec_cameras.status='online' مقابل الإجمالي، والتنبيهات تأتي من sec_cctv_alerts؛ اضغط أي كاميرا لفتح تدفّقها والقفز إلى الحادثة المرتبطة",
      "the CCTV availability tile is computed from sec_cameras.status='online' over total, alerts stream from sec_cctv_alerts; tapping a camera opens its stream and jumps to the linked incident",
    ),
  ],
  [
    "/_authenticated/sec.patrols",
    n(
      "لوحة الدوريات",
      "Patrols",
      "مسارات الدوريات الحيّة، نقاط التفتيش، والانحرافات",
      "live patrol tracks, checkpoints, and route deviations",
      "ضمان التغطية الميدانية ورصد الفجوات فور حدوثها",
      "guaranteed field coverage and instant gap detection",
      "التزام الدوريات = المكتملة/المجدولة من sec_patrols بهدف ≥٩٥٪، وكل انحراف عن نقطة تفتيش يفتح تنبيهًا وربطاً بالفرقة المسؤولة",
      "Patrol Compliance = completed/scheduled from sec_patrols targeting ≥95%, and every checkpoint deviation opens an alert linked to the responsible team",
    ),
  ],
  [
    "/_authenticated/sec.permits",
    n(
      "لوحة تصاريح العمل",
      "Work Permits",
      "التصاريح السارية والمعلّقة والمنتهية، مع علامات المخاطر",
      "active, pending, and expired permits with risk flags",
      "امتثال تشغيلي كامل وحماية من مخاطر الأعمال الحارة والمقيّدة",
      "full operational compliance and protection against hot- and restricted-work risk",
      "مسار الحالة draft→pending→approved→expired من sec_permits، مع فحص تلقائي للمقاول والتأمين والتدريب قبل السماح بالاعتماد",
      "status flow draft→pending→approved→expired from sec_permits, with automatic checks on contractor, insurance, and training before approval is allowed",
    ),
  ],
  [
    "/_authenticated/sec.assets",
    n(
      "لوحة الأصول الأمنية",
      "Security Assets",
      "الحالة التشغيلية لكل أصل، الصيانة المستحقّة، والأصول المتعطلة",
      "the operational status of every asset, due maintenance, and offline units",
      "توفر تشغيلي أعلى وتقليل مباشر لأثر الأعطال",
      "higher operational availability and a direct cut in outage impact",
      "sec_assets يُحدَّث من الفحوصات الميدانية وتاريخ آخر معاينة last_inspected_at، وأي أصل متعطّل يولّد أمر عمل تلقائيًا في sec_work_orders",
      "sec_assets is updated from field inspections and last_inspected_at, and any offline asset auto-generates a work order in sec_work_orders",
    ),
  ],
  [
    "/_authenticated/sec.kpi",
    n(
      "مؤشرات الأداء الأمنية",
      "Security KPIs",
      "الأرقام مباشرة من جداول القياس دون تدخّل يدوي",
      "the numbers straight from measurement tables with no manual staging",
      "قياس تنفيذي موثوق يقود قرارات الميزانية والتحسين",
      "trustworthy executive measurement that steers budget and improvement decisions",
      "كل مؤشر يعرض المصدر والاستعلام والفترة، ويُحتَسب لحظيًا من sec_* بلا تخزين وسيط، مع سقوف حمراء/صفراء/خضراء مقارنة بالمستهدف",
      "each KPI shows source, query, and window, is computed live from sec_* with no intermediate store, and colored red/yellow/green against target",
    ),
  ],
  [
    "/_authenticated/sec.exec",
    n(
      "غرفة القيادة التنفيذية للأمن",
      "Security Executive Room",
      "الجاهزية التشغيلية، مؤشر المخاطر، مؤشر السلامة، البلاغات، ونسبة الحل، وزمن الاستجابة MTTR، وأوامر الصيانة",
      "operational readiness, risk index, safety index, incidents, resolution rate, MTTR, and maintenance work orders",
      "قرار يومي قصير المدى مبني على بيّنة حيّة",
      "a short-cycle daily decision loop grounded in live evidence",
      "الجاهزية = تركيبة موزونة من صحّة CCTV والدخول وامتثال المقاولين والدوريات ومؤشر السلامة؛ كل بطاقة تفتح مصدرها مباشرة، والتحديث كل ١٥ث من sec_overview",
      "readiness is a weighted composite of CCTV health, access, contractor compliance, patrols, and safety; each tile drills to its source and refreshes every 15s from sec_overview",
    ),
  ],
  [
    "/_authenticated/sec.risks",
    n(
      "سجل المخاطر",
      "Risk Register",
      "المخاطر المصنّفة، احتمالها، وأثرها، وخطط تخفيفها",
      "classified risks, likelihood, impact, and mitigation plans",
      "توقّع الأزمات قبل وقوعها وإدارتها بحوكمة صريحة",
      "anticipate crises before they arrive and manage them with explicit governance",
      "مصفوفة ٥×٥ (احتمال×أثر) مشتقّة من sec_incidents وsec_cctv_alerts وsec_sensors، مع مالك وخطة تخفيف ومهلة لكل خطر",
      "a 5×5 likelihood×impact matrix derived from sec_incidents, sec_cctv_alerts, and sec_sensors, with owner, mitigation plan, and due date per risk",
    ),
  ],
  [
    "/_authenticated/sec.emergency",
    n(
      "لوحة الطوارئ",
      "Emergency Response",
      "بروتوكولات الاستجابة، الفرق الجاهزة، ومسارات الإخلاء",
      "response protocols, on-call teams, and evacuation routes",
      "استجابة منسّقة تحمي الأرواح والأصول خلال ثوانٍ",
      "coordinated response that protects lives and assets within seconds",
      "أي حادثة severity='critical' تُطلق حدث enterprise_events.topic='sec.emergency.*'، تُنبّه الفرق، وتفتح تسلسل IS-٠٠٧ من الإخلاء وحتى إخطار الجهات",
      "any severity='critical' incident fires enterprise_events.topic='sec.emergency.*', alerts on-call teams, and opens the IS-007 flow from evacuation through authority notification",
    ),
  ],
  [
    "/_authenticated/sec.safety",
    n(
      "لوحة السلامة",
      "Safety",
      "مؤشرات السلامة، الحوادث المُبلَّغ عنها، والمراقبة الاستباقية",
      "safety indicators, reported incidents, and proactive monitoring",
      "بيئة عمل خالية من الإصابات والانقطاعات",
      "an operating environment free of injuries and disruption",
      "مؤشر السلامة = ١٠٠ − وزن الحوادث المفتوحة المصنّفة سلامة، مع تدرّج زمني ٧/٣٠/٩٠ يومًا لرصد الاتجاه",
      "safety index = 100 − weighted open safety incidents, with 7/30/90-day trend windows",
    ),
  ],
  [
    "/_authenticated/sec.maintenance",
    n(
      "لوحة الصيانة — أوامر العمل",
      "Maintenance — Work Orders",
      "بطاقات الإجمالي والمفتوحة والمتأخرة ونسبة الإكمال، مع جدول WO يحمل المرجع والنوع (وقائية/تصحيحية) والأولوية والحالة",
      "total/open/overdue and completion-rate tiles, plus a WO table with reference, type (preventive/corrective), priority, and status",
      "توفر أعلى للأصول وتكلفة صيانة أدنى",
      "higher asset availability and lower maintenance cost",
      "الأرقام محسوبة من sec_work_orders لحظيًا، والأزرار (الكل/مفتوحة/وقائية/تصحيحية) تُطبّق الفلتر على الجدول والبطاقات معًا؛ 'أمر عمل جديد' يفتح نموذج ربط مباشر بالأصل والفرقة",
      "figures compute live from sec_work_orders, the (All/Open/Preventive/Corrective) chips filter table and tiles together, and 'New WO' opens a form linked to asset and crew",
    ),
  ],
  [
    "/_authenticated/sec.facilities",
    n(
      "لوحة المنشآت",
      "Facilities",
      "المباني، المناطق، ومستوى الجاهزية لكل مرفق",
      "buildings, zones, and readiness level for each facility",
      "تشغيل موحّد للمنشآت متعدّدة المواقع",
      "unified operation across multi-site facilities",
      "sec_sites + sec_buildings + sec_sections تُرسم شجرة تفاعلية، وحالة الجاهزية لكل مبنى مركّبة من CCTV والدخول والدوريات وأوامر الصيانة المفتوحة",
      "sec_sites + sec_buildings + sec_sections form an interactive tree, with per-building readiness composed from CCTV, access, patrols, and open WOs",
    ),
  ],
  [
    "/_authenticated/sec.projects",
    n(
      "لوحة المشاريع الأمنية",
      "Security Projects",
      "المبادرات الجارية، مراحلها، والميزانية المرصودة",
      "in-flight initiatives, their phases, and allocated budget",
      "حوكمة تنفيذ تحمي عائد الاستثمار وتوقيت التسليم",
      "delivery governance that protects ROI and go-live dates",
      "كل مشروع مرتبط بمعالم ومهام وأوامر عمل، ومؤشر التقدّم محسوب من نسبة المهام المكتملة مقابل المجدولة، مع تنبيه انحراف عند تجاوز خط الأساس ١٥٪",
      "each project ties to milestones, tasks, and WOs; progress is completed/scheduled ratio with a variance alert at 15% over baseline",
    ),
  ],
  [
    "/_authenticated/sec.reports",
    n(
      "لوحة التقارير التنفيذية للأمن",
      "Security Executive Reports",
      "تقارير يومية وأسبوعية وشهرية قابلة للتصدير مبنية على بيانات حيّة",
      "daily, weekly, and monthly exportable reports built on live data",
      "شفافية للجهات الرقابية وقرارات مدعومة بالأدلة",
      "transparency for regulators and evidence-backed decisions",
      "التقارير تُولَّد من aria_reports + executive_briefings عبر pg_cron، وتُصدَّر PDF/Excel، وتُسلَّم عبر Outlook تلقائيًا حسب الجدولة",
      "reports are generated from aria_reports + executive_briefings via pg_cron, exported as PDF/Excel, and delivered via Outlook on schedule",
    ),
  ],
  [
    "/_authenticated/sec.timeline",
    n(
      "الخط الزمني الأمني",
      "Security Timeline",
      "تسلسل الأحداث لحظة بلحظة عبر جميع الأنظمة",
      "moment-by-moment event sequence across every subsystem",
      "قراءة سبب-وأثر واضحة لأي حادث",
      "clear cause-and-effect reading of any incident",
      "دمج enterprise_events + sec_activity_events + sec_cctv_alerts في محور زمني موحّد، مع فلاتر بالمصدر والشدّة والموقع، وتصدير مقطع للأدلة",
      "enterprise_events + sec_activity_events + sec_cctv_alerts merged on one axis with source/severity/site filters and evidence clip export",
    ),
  ],
  [
    "/_authenticated/sec.shifts",
    n(
      "لوحة المناوبات",
      "Shifts",
      "جدولة الفرق، التغطية، والتناوب اللحظي",
      "team scheduling, coverage, and live rotation",
      "استمرارية تشغيل بدون فجوات بشرية",
      "operational continuity without human coverage gaps",
      "التقويم يُطابق الحضور المسجّل مع الجدول المعتمد، وأي فجوة تغطية تفتح تنبيهًا وتقترح مناوبًا بديلاً حسب المؤهلات",
      "the calendar reconciles recorded attendance with the approved plan, and any coverage gap raises an alert and suggests a qualified substitute",
    ),
  ],
  [
    "/_authenticated/sec.sections",
    n(
      "لوحة الأقسام الأمنية",
      "Security Sections",
      "إجمالي الأقسام، إجمالي الموظفين، مدير الإدارة، وبطاقات كل قسم (الإسناد الأمني، الصيانة، المشاريع…) مع رئيس القسم وعدد الموظفين",
      "total sections, total staff, division director, and per-section cards (Security Support, Maintenance, Projects…) with section head and headcount",
      "توزيع مسؤوليات دقيق يُلغي التداخل والتناقض",
      "precise responsibility distribution that eliminates overlap",
      "البطاقات مبنية من hr_sections/hr_employees، اضغط أي قسم لفتح هيكله وأدواره وأوامر عمله المفتوحة؛ شارة 'محاكاة' تظهر عند غياب بيانات حيّة",
      "cards come from hr_sections/hr_employees; tap a section to open its structure, roles, and open WOs; a 'simulation' badge appears when live data is missing",
    ),
  ],
  [
    "/_authenticated/sec.circles",
    n(
      "الدوائر التشغيلية",
      "Operational Circles",
      "إجمالي الدوائر، إجمالي الموظفين، إجمالي المواقع، ومواقع تشغيلية، مع بطاقات لكل دائرة تشمل المدير والموظفين والمواقع والإحداثيات",
      "total circles, total staff, total sites, and operational sites, with per-circle cards showing manager, headcount, sites, and coordinates",
      "قيادة جغرافية موحّدة للأمن الصناعي",
      "unified geographic command over industrial security",
      "sec_circles + sec_sites تُغذّي البطاقات، والإحداثيات تُفتح مباشرة على الخريطة التنفيذية؛ الأرقام تُحدَّث لحظيًا وتحمل شارة LIVE من sec_overview",
      "sec_circles + sec_sites feed the cards, coordinates open on the executive map, and figures refresh live with a LIVE badge from sec_overview",
    ),
  ],
  [
    "/_authenticated/sec.ai",
    n(
      "طبقة الذكاء الأمني",
      "Security AI Layer",
      "نماذج الاكتشاف، تصنيف الأحداث، والتوصيات الاستباقية",
      "detection models, event classification, and proactive recommendations",
      "استباق التهديدات بدلاً من الرد المتأخر",
      "anticipate threats instead of reacting late",
      "النماذج تعمل عبر Lovable AI Gateway، تُنتج توصيات ذات درجة ثقة، ولا تُنفَّذ تلقائيًا بل تُعرض للاعتماد التنفيذي (needsApproval)",
      "models run over Lovable AI Gateway, produce confidence-scored recommendations, and never auto-execute — every action needs executive approval (needsApproval)",
    ),
  ],
  [
    "/_authenticated/sec.integrations",
    n(
      "لوحة تكاملات الأمن",
      "Security Integrations",
      "الأنظمة المرتبطة، حالة كل تكامل، وسجل المزامنة",
      "connected systems, per-integration status, and sync history",
      "تشغيل موحّد يمنع تشظّي البيانات",
      "unified operation that prevents data fragmentation",
      "كل تكامل يعرض آخر مزامنة، معدّل الأخطاء، ومصدر البيانات؛ فشل المزامنة يفتح أمر عمل ويُظهر شارة انقطاع فورًا",
      "each integration shows last sync, error rate, and data source; a failed sync opens a WO and flips its badge to outage instantly",
    ),
  ],
  [
    "/_authenticated/sec.access",
    n(
      "لوحة صلاحيات الوصول",
      "Access Control",
      "الأدوار، مستويات الدخول، وسجلات المصادقة",
      "roles, access levels, and authentication logs",
      "مبدأ أقل صلاحية مطبَّق على مستوى المؤسسة",
      "least-privilege enforced across the enterprise",
      "sec_activity_events (action=access_*) يُغذّي المحاولات المرفوضة، والصلاحيات تُدار عبر has_role() بدون تخزين الأدوار على جدول الملف الشخصي",
      "sec_activity_events (action=access_*) feeds denied attempts, and roles are checked via has_role() — never stored on the profile table",
    ),
  ],
  [
    "/_authenticated/sec.contractors",
    n(
      "لوحة المقاولين",
      "Contractors",
      "المقاولين النشطين، شهاداتهم، وحضورهم",
      "active contractors, credentials, and attendance",
      "ضبط الأطراف الخارجية داخل الموقع بموثوقية كاملة",
      "reliable control of external parties on-site",
      "sec_contractors + sec_permits تُقيَّم عبر مصفوفة vetting؛ انتهاء التأمين أو التدريب يوقف إصدار التصاريح تلقائيًا",
      "sec_contractors + sec_permits scored via a vetting matrix; expired insurance or training automatically blocks new permits",
    ),
  ],
  [
    "/_authenticated/sec.visitors",
    n(
      "لوحة الزوار",
      "Visitors",
      "الزوار داخل الموقع، مواعيدهم، وحالتهم (pending/checked_in/checked_out)",
      "on-site visitors, appointments, and status (pending/checked_in/checked_out)",
      "أمان دخول ومغادرة موثّق لكل زائر",
      "documented entry-and-exit security for every visitor",
      "الدخول يُنشئ سجلًا في sec_visitors مع بطاقة ومضيف؛ عدم الخروج قبل انتهاء الوردية يفتح تنبيهًا للمضيف",
      "check-in creates a sec_visitors record with badge and host; a missed check-out before shift end alerts the host",
    ),
  ],
  [
    "/_authenticated/sec.vehicles",
    n(
      "لوحة المركبات",
      "Vehicles",
      "الأسطول، حركته، ونقاط الفحص",
      "the fleet, its movement, and inspection points",
      "ضبط الحركة داخل المنشآت الحسّاسة",
      "controlled movement across sensitive facilities",
      "sec_vehicles + sec_gates تُطابق كل مرور مع تصريح ساري؛ عدم المطابقة يُصنَّف انتهاكاً في sec_activity_events",
      "sec_vehicles + sec_gates match every pass against a valid permit; a mismatch is classified as a violation in sec_activity_events",
    ),
  ],
  [
    "/_authenticated/sec.knowledge",
    n(
      "قاعدة معرفة الأمن",
      "Security Knowledge",
      "الإجراءات، السياسات، والدروس المستفادة",
      "procedures, policies, and lessons learned",
      "تعلّم مؤسسي متراكم يمنع تكرار الأخطاء",
      "compounding institutional learning that prevents repeat errors",
      "المستندات مفهرسة بتضمينات RAG لتُستشهَد داخل ردود آريا مع رابط للمصدر والصفحة",
      "documents are RAG-indexed so ARIA cites them inline with a link to source and page",
    ),
  ],
  [
    "/_authenticated/sec.twin",
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
    "/_authenticated/sec.index",
    n(
      "الصفحة الرئيسية للقيادة الأمنية",
      "Security Command Home",
      "نظرة عامة موحّدة على كل وحدات الأمن",
      "a unified overview of every security unit",
      "نقطة انطلاق واحدة لأي قرار أمني تنفيذي",
      "one launch point for any executive security decision",
      "شبكة تبويبات (اللوحة التنفيذية · غرفة العمليات · التوأم الرقمي · الدوائر · الأقسام · المشاريع · أوامر العمل) تنقلك دون إعادة تحميل، وشارة LIVE موحّدة",
      "a tab grid (Executive · Ops Room · Digital Twin · Circles · Sections · Projects · WOs) navigates without reload under one LIVE badge",
    ),
  ],
  [
    "/_authenticated/sec",
    n(
      "قسم القيادة الأمنية",
      "Security Command",
      "نظرة عامة حيّة على الحوادث والدوريات والكاميرات",
      "a live overview of incidents, patrols, and cameras",
      "قيادة أمنية موحّدة مبنية على بيّنة",
      "unified evidence-based security command",
      "غلاف موحّد يجمع كل صفحات /sec.* تحت شريط تبويبات ثابت وشارة LIVE مربوطة بـ dataUpdatedAt من sec_overview",
      "one shell wrapping every /sec.* page under a persistent tab bar with a LIVE badge bound to dataUpdatedAt from sec_overview",
    ),
  ],

  // ── Executive / ARIA surfaces ───────────────────────────────────────
  [
    "/_authenticated/aria.demo",
    n(
      "عرض آريا التنفيذي",
      "ARIA Executive Demo",
      "مشاهد حيّة تُظهر كفاءة آريا في اتخاذ القرار",
      "live scenes that showcase ARIA's decision throughput",
      "تجربة مباشرة لقدرات النظام دون بيئة اختبار منفصلة",
      "hands-on capability experience with no separate sandbox",
    ),
  ],
  [
    "/_authenticated/aria.directive",
    n(
      "لوحة الميثاق التنفيذي لآريا",
      "ARIA Executive Directive",
      "المواثيق، الحوكمة، ومسارات التطوّر",
      "the charter, governance, and evolution paths",
      "شفافية كاملة لسلطة آريا وقيودها",
      "full transparency of ARIA's authority and boundaries",
    ),
  ],
  [
    "/_authenticated/aria-documents",
    n(
      "وثائق آريا",
      "ARIA Documents",
      "المستندات المُغذّية لذاكرة آريا",
      "documents that feed ARIA's memory",
      "قرارات مبنية على مصادر معرفة موثّقة",
      "decisions grounded in cited knowledge sources",
    ),
  ],
  [
    "/_authenticated/aria",
    n(
      "واجهة آريا",
      "ARIA Console",
      "محادثة تنفيذية مباشرة مع المحرّك",
      "a direct executive conversation with the engine",
      "استشارة فورية بلغة القرار",
      "instant consultation in the language of decisions",
    ),
  ],
  [
    "/_authenticated/assistant.index",
    n(
      "مساعد آريا التنفيذي",
      "ARIA Executive Assistant",
      "المحادثات، السياق، والإجراءات المُنجَزة",
      "conversations, context, and completed actions",
      "تنفيذ مهام بدلاً من مجرّد الإجابة عليها",
      "actions completed, not just answers delivered",
    ),
  ],
  [
    "/_authenticated/assistant",
    n(
      "مساعد آريا",
      "ARIA Assistant",
      "خيط محادثة مركّز مع سياق كامل",
      "a focused thread with the full context loaded",
      "استمرارية معرفية بين الجلسات",
      "knowledge continuity across sessions",
    ),
  ],

  // ── Executive command / decision surfaces ───────────────────────────
  [
    "/_authenticated/command-center",
    n(
      "مركز القيادة",
      "Command Center",
      "الوحدات التشغيلية، الحالة، والقرارات الحيّة",
      "operational modules, status, and live decisions",
      "قيادة تنفيذية موحّدة عبر قناة واحدة",
      "unified executive command through a single channel",
    ),
  ],
  [
    "/_authenticated/mission-control",
    n(
      "مراقبة المهمة",
      "Mission Control",
      "الأهداف، التقدّم، والانحرافات",
      "objectives, progress, and deviations",
      "انضباط تنفيذ الأهداف الاستراتيجية",
      "disciplined execution of strategic objectives",
    ),
  ],
  [
    "/_authenticated/situation-room",
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
    "/_authenticated/crisis",
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
    "/_authenticated/urgent-ops",
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
    "/_authenticated/decisions",
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
    "/_authenticated/executive-map",
    n(
      "الخريطة التنفيذية",
      "Executive Map",
      "التوزيع الجغرافي للعمليات والأصول",
      "geographic distribution of operations and assets",
      "قراءة مكانية سريعة للوضع",
      "instant spatial reading of the situation",
    ),
  ],
  [
    "/_authenticated/executive-reports",
    n(
      "التقارير التنفيذية",
      "Executive Reports",
      "تقارير معتمدة للقيادة العليا والمساهمين",
      "reports certified for senior leadership and stakeholders",
      "لغة قرار موحّدة بين المستويات",
      "one decision language shared across levels",
    ),
  ],
  [
    "/_authenticated/executive",
    n(
      "المساحة التنفيذية",
      "Executive Workspace",
      "الأدوات والمؤشرات الخاصة بالإدارة العليا",
      "the tools and indicators reserved for senior leadership",
      "تركيز على القرار، لا على البيانات الخام",
      "focus on decision, not raw data",
    ),
  ],
  [
    "/_authenticated/cockpit",
    n(
      "قمرة القيادة",
      "Executive Cockpit",
      "مؤشرات النظام والقرارات الحيّة",
      "system indicators and live decisions",
      "رؤية طيّار للمؤسسة كاملة",
      "a pilot's view of the whole enterprise",
    ),
  ],
  [
    "/_authenticated/boardroom",
    n(
      "قاعة مجلس الإدارة",
      "Boardroom",
      "لوحات جاهزة للعرض على مجلس الإدارة",
      "board-ready dashboards",
      "اجتماعات مجلس أقصر وأكثر إنتاجية",
      "shorter and more productive board meetings",
    ),
  ],
  [
    "/_authenticated/briefing",
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
    "/_authenticated/chief-of-staff",
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
    "/_authenticated/execution",
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
    "/_authenticated/transformation",
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
    "/_authenticated/portfolio",
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
    "/_authenticated/outcomes",
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
    "/_authenticated/dashboard",
    n(
      "اللوحة التنفيذية",
      "Dashboard",
      "المؤشرات الرئيسية للمؤسسة",
      "the enterprise's headline indicators",
      "نظرة شاملة بلا ضجيج",
      "a comprehensive view without noise",
    ),
  ],
  [
    "/_authenticated/analytics",
    n(
      "لوحة التحليلات",
      "Analytics",
      "الاتجاهات، المقارنات الزمنية، والانحرافات المهمّة",
      "trends, time comparisons, and notable deviations",
      "قرارات مبنية على بيانات لا حدس",
      "decisions built on data, not hunches",
    ),
  ],
  [
    "/_authenticated/analyst",
    n(
      "مساحة المحلل",
      "Analyst Workspace",
      "أدوات الاستكشاف والاستعلام والرسم",
      "exploration, query, and charting tools",
      "تحقيقات بيانية أعمق دون خبرة تقنية طويلة",
      "deeper data investigations without heavy technical overhead",
    ),
  ],
  [
    "/_authenticated/intelligence",
    n(
      "غرفة الاستخبارات",
      "Intelligence Room",
      "التقارير الاستخبارية والإشارات المبكّرة",
      "intelligence reports and early signals",
      "استباق المتغيّرات قبل ظهورها في الأرقام",
      "anticipating shifts before they surface in the numbers",
    ),
  ],
  [
    "/_authenticated/risk",
    n(
      "لوحة المخاطر التنفيذية",
      "Executive Risk",
      "خريطة المخاطر ومسارات التخفيف",
      "the risk map and mitigation paths",
      "حوكمة استباقية لمخاطر المؤسسة",
      "proactive governance of enterprise risk",
    ),
  ],
  [
    "/_authenticated/governance",
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
    "/_authenticated/live-dashboard",
    n(
      "اللوحة الحيّة",
      "Live Dashboard",
      "دفق مؤشرات لحظي عبر المؤسسة",
      "a real-time indicator stream across the enterprise",
      "قراءة الوضع في الثانية التي يتغيّر فيها",
      "reading the situation the second it changes",
    ),
  ],

  // ── ARIA operations / runtime ───────────────────────────────────────
  [
    "/_authenticated/orchestration",
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
    "/_authenticated/agents",
    n(
      "الوكلاء الأذكياء",
      "AI Agents",
      "قائمة الوكلاء، صلاحياتهم، وأدائهم",
      "the agent roster, permissions, and performance",
      "قدرة تنفيذية موازية تضاعف إنتاجية الفريق",
      "parallel executive capacity that multiplies team output",
    ),
  ],
  [
    "/_authenticated/workflows",
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
    "/_authenticated/ai-ops",
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
    "/_authenticated/self-evolution",
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
    "/_authenticated/memory",
    n(
      "ذاكرة آريا",
      "ARIA Memory",
      "السياق طويل الأمد والحقائق المؤسسية",
      "long-term context and enterprise facts",
      "استمرارية معرفية عبر كل تفاعل",
      "knowledge continuity across every interaction",
    ),
  ],
  [
    "/_authenticated/forgotten",
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
    "/_authenticated/knowledge-hub",
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
    "/_authenticated/knowledge-upload",
    n(
      "رفع المعرفة",
      "Knowledge Upload",
      "استيراد مستندات جديدة لذاكرة آريا",
      "ingest new documents into ARIA's memory",
      "توسيع نطاق ذكاء المؤسسة بسرعة",
      "expand enterprise intelligence quickly",
    ),
  ],
  [
    "/_authenticated/knowledge",
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
    "/_authenticated/prompts",
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
    "/_authenticated/tools",
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
    "/_authenticated/tool-health",
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
    "/_authenticated/fabric",
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
    "/_authenticated/observability",
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
    "/_authenticated/diagnostics",
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
    "/_authenticated/integrations",
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
    "/_authenticated/settings.microsoft",
    n(
      "إعدادات مايكروسوفت",
      "Microsoft Settings",
      "ربط منظومة مايكروسوفت 365 وامتيازاتها",
      "Microsoft 365 wiring and permissions",
      "تجربة عمل موحّدة داخل المنظومة الشائعة",
      "a unified work experience inside the common suite",
    ),
  ],
  [
    "/_authenticated/settings",
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
    "/_authenticated/admin",
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
    "/_authenticated/security-center",
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
    "/_authenticated/health",
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
    "/_authenticated/tts",
    n(
      "تركيب الكلام",
      "Text-to-Speech",
      "أصوات آريا وإعدادات النطق",
      "ARIA's voices and pronunciation settings",
      "صوت طبيعي راقٍ يليق بحضور تنفيذي",
      "a natural, refined voice worthy of executive presence",
    ),
  ],
  [
    "/_authenticated/voice-setup",
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
    "/_authenticated/voice",
    n(
      "الصوت التنفيذي لآريا",
      "ARIA Voice",
      "إعدادات الصوت، المعاينة، وسجل التشغيل",
      "voice settings, preview, and playback log",
      "حضور صوتي احترافي لآريا",
      "professional voice presence for ARIA",
    ),
  ],
  [
    "/_authenticated/elevenlabs-status",
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
    "/_authenticated/tasks",
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
    "/_authenticated/team",
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
    "/_authenticated/departments",
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
    "/_authenticated/events",
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
    "/_authenticated/files",
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
    "/_authenticated/leads",
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
    "/_authenticated/marketplace",
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
    "/_authenticated/investor",
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
    "/_authenticated/customers",
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
  [
    "/_authenticated/learn.index",
    n(
      "أكاديمية التعلّم",
      "Learning Academy",
      "المسارات، الدروس، والتقدّم",
      "learning tracks, lessons, and progress",
      "بناء كفاءة داخلية سريعة",
      "building rapid internal capability",
    ),
  ],
  [
    "/_authenticated/learn",
    n(
      "التعلّم",
      "Learning",
      "الدروس المفتوحة والمُقتَرَحة",
      "open and recommended lessons",
      "تطوير مستمر مُدمَج في يوم العمل",
      "continuous development embedded in the workday",
    ),
  ],
  [
    "/_authenticated/readiness",
    n(
      "مؤشر الجاهزية",
      "Readiness",
      "جاهزية المنصّة، الأشخاص، والإجراءات",
      "platform, people, and process readiness",
      "قراءة موحّدة للاستعداد التشغيلي",
      "a unified reading of operational readiness",
    ),
  ],
  [
    "/_authenticated/theater",
    n(
      "قاعة العرض",
      "Theater",
      "مشاهد حيّة لتوضيح القدرات للقيادة",
      "live scenes that explain capability to leadership",
      "تبنٍّ أسرع من قِبَل صنّاع القرار",
      "faster adoption by decision-makers",
    ),
  ],
  [
    "/_authenticated/hajj",
    n(
      "منظومة الحج ١٤٤٧",
      "Hajj 1447",
      "المؤشرات التشغيلية للحج بأدق تفصيل",
      "the operational indicators for Hajj at the finest detail",
      "أداء حج آمن يليق بمكانة المشعر",
      "safe Hajj operations worthy of the holy site",
    ),
  ],
  [
    "/_authenticated/digital-twin",
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
    "/_authenticated/bridge",
    n(
      "الجسر التنفيذي",
      "Executive Bridge",
      "ربط بين الفرق والقرارات الحيّة",
      "linking teams and live decisions",
      "قرار تنفيذي متزامن بلا فجوات",
      "synchronized executive decisions with no gaps",
    ),
  ],
  [
    "/_authenticated/exec",
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
    "/_authenticated/operations",
    n(
      "العمليات",
      "Operations",
      "قلب النشاط التشغيلي الحيّ",
      "the beating heart of live operations",
      "تحكّم تشغيلي كامل من مكان واحد",
      "complete operational control from one place",
    ),
  ],
  [
    "/_authenticated",
    {
      ar: "أنت الآن في منطقة العمل المصادَقة. جميع القدرات التنفيذية متاحة هنا.",
      en: "You are in the authenticated workspace. Every executive capability is available here.",
    },
  ],

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
  [
    "/executive-showcase",
    n(
      "العرض التنفيذي",
      "Executive Showcase",
      "أبرز القدرات مقدَّمة بلغة القرار",
      "the top capabilities framed in decision language",
      "تبنٍّ سريع من صنّاع القرار",
      "rapid buy-in from decision-makers",
    ),
  ],
  [
    "/executive-bridge",
    n(
      "الجسر التنفيذي العام",
      "Executive Bridge (Public)",
      "توضيح قناة القيادة بين المؤسسات",
      "clarifying the leadership channel between organizations",
      "شفافية استراتيجية للشركاء",
      "strategic transparency for partners",
    ),
  ],
  [
    "/executive",
    n(
      "الصفحة التنفيذية العامة",
      "Public Executive Page",
      "ملخص القدرات للمستوى التنفيذي",
      "an executive-level capability summary",
      "قراءة سريعة قبل الاجتماع",
      "a fast pre-meeting read",
    ),
  ],
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
    "/hajj-prime",
    n(
      "الحج برايم",
      "Hajj Prime",
      "الطبقة التنفيذية لمنظومة الحج",
      "the executive layer for the Hajj system",
      "أداء حج ذو جودة سيادية",
      "sovereign-quality Hajj performance",
    ),
  ],
  [
    "/runtime-hub",
    n(
      "مركز التشغيل",
      "Runtime Hub",
      "المكوّنات التشغيلية للمنصّة",
      "the runtime components of the platform",
      "شفافية هندسية موثوقة",
      "trustworthy engineering transparency",
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
  [
    "/films",
    n(
      "الأفلام التنفيذية",
      "Executive Films",
      "أفلام قصيرة تُقدّم الرؤية بلغة القيادة",
      "short films that present the vision in leadership language",
      "أثر تنفيذي طويل الأمد",
      "long-lasting executive impact",
    ),
  ],
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
    "/status",
    n(
      "حالة النظام",
      "Status",
      "توفّر الخدمات في الوقت الحقيقي",
      "real-time service availability",
      "شفافية تشغيلية دائمة",
      "always-on operational transparency",
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
    "/os",
    n(
      "نظام التشغيل المؤسسي",
      "Enterprise Operating System",
      "قاعة القيادة، النبض التشغيلي، والمؤشرات التنفيذية",
      "the command deck, live pulse, and executive indicators",
      "قرار تنفيذي من المشهد الأول للمنصّة",
      "an executive decision from the platform's very first screen",
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
      "الصفحة الرئيسية لنيكسيوس",
      "NEXIOS Home",
      "التعريف الأوّل بالمنصّة وقدراتها التنفيذية",
      "the first introduction to the platform and its executive capability",
      "قراءة سريعة لقيمة النظام",
      "a fast reading of the system's value",
    ),
  ],
];

/**
 * Return the narration for a route. Falls back to a neutral "you are now in
 * <label>" derived from the last segment when no entry matches, so ARIA
 * always has something honest to say instead of guessing.
 */
export function narrationFor(pathname: string, locale: "ar" | "en" = "ar"): PageNarration | null {
  if (isSilentRoute(pathname)) return null;
  const sorted = [...ENTRIES].sort((a, b) => b[0].length - a[0].length);
  for (const [prefix, entry] of sorted) {
    if (pathname === prefix || pathname.startsWith(prefix + "/") || pathname.startsWith(prefix)) {
      return entry;
    }
  }
  const last = pathname.split("/").filter(Boolean).pop() ?? "الرئيسية";
  const label = last.replace(/[-_.]/g, " ").trim() || "الرئيسية";
  return locale === "ar"
    ? {
        ar: `أنت الآن في صفحة ${label}. أعرض هنا محتوى الصفحة والقيمة التنفيذية المرتبطة بها.`,
        en: `You are on ${label}. I present the page content and its executive value here.`,
      }
    : {
        ar: `أنت الآن في صفحة ${label}. أعرض هنا محتوى الصفحة والقيمة التنفيذية المرتبطة بها.`,
        en: `You are on ${label}. I present the page content and its executive value here.`,
      };
}

export const NARRATE_STORAGE_KEY = "aria:narrate:enabled";
