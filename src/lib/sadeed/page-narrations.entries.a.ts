// Auto-split from page-narrations.ts — pure data (uses the n() composer).
import type { PageNarration } from "./page-narrations.base";
import { n } from "./page-narrations.base";

export const ENTRIES_A: ReadonlyArray<readonly [string, PageNarration]> = [
  // حُذفت صفوف «/sec/assets» و«/sec/kpi» و«/sec/safety» و«/sec/integrations»
  // و«/sec/knowledge»: مسارات مخفية بأمر المالك ٢٠٢٦/٠٨/٢٠ (hidden-routes.ts)
  // تُعيد التوجيه إلى /sec.
  // ── SEC command surface ─────────────────────────────────────────────
  [
    "/sec/incidents",
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
    "/sec/cctv",
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
    "/sec/patrols",
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
    "/sec/permits",
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
    "/sec/exec",
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
    "/sec/risks",
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
    "/sec/emergency",
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
    "/sec/maintenance",
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
    "/sec/facilities",
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
    "/sec/projects",
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
    "/sec/reports",
    n(
      "لوحة التقارير التنفيذية للأمن",
      "Security Executive Reports",
      "تقارير يومية وأسبوعية وشهرية قابلة للتصدير مبنية على بيانات حيّة",
      "daily, weekly, and monthly exportable reports built on live data",
      "شفافية للجهات الرقابية وقرارات مدعومة بالأدلة",
      "transparency for regulators and evidence-backed decisions",
      "التقارير تُولَّد من finn_reports + executive_briefings عبر pg_cron، وتُصدَّر PDF/Excel، وتُسلَّم عبر Outlook تلقائيًا حسب الجدولة",
      "reports are generated from finn_reports + executive_briefings via pg_cron, exported as PDF/Excel, and delivered via Outlook on schedule",
    ),
  ],
  [
    "/sec/timeline",
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
    "/sec/shifts",
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
  // حُذف «/sec/sections» (لوحة الأقسام): مسار مخفي بأمر المالك ٢٠٢٦/٠٨/٢٠
  // (hidden-routes.ts) — «حذف الواجهة بالكامل».
  // حُذف «/sec/circles» (الدوائر التشغيلية): مسار مخفي بأمر المالك ٢٠٢٦/٠٨/٢٠
  // (hidden-routes.ts) — «حذف الواجهة بالكامل».
  [
    "/sec/ai",
    n(
      "طبقة الذكاء الأمني",
      "Security AI Layer",
      "نماذج الاكتشاف، تصنيف الأحداث، والتوصيات الاستباقية",
      "detection models, event classification, and proactive recommendations",
      "استباق التهديدات بدلاً من الرد المتأخر",
      "anticipate threats instead of reacting late",
      "يعمل الاستدلال حصريًا عبر Google Gemini، ويُنتج توصيات موثّقة بدرجة ثقة، ولا ينفّذ الإجراءات المؤثرة تلقائيًا بل يعرضها للاعتماد التنفيذي (needsApproval)",
      "intelligence runs exclusively on Google Gemini, produces evidence-backed confidence-scored recommendations, and never auto-executes consequential actions — each requires executive approval (needsApproval)",
    ),
  ],
  [
    "/sec/access",
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
    "/sec/contractors",
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
    "/sec/visitors",
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
    "/sec/vehicles",
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
];
