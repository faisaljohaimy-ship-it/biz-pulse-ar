// Auto-split from kb-seed.data.ts — pure data, no logic.
import type { KbSeedArticle } from "./kb-seed.base";
import { POL, SOP, KPI } from "./kb-seed.base";

export const ARTICLES_B: KbSeedArticle[] = [
  {
    doc_code: SOP(19),
    category_code: "IS-INV",
    title_ar: "إجراء التحقيق الأمني",
    title_en: "Security Investigation Procedure",
    summary_ar: "تحقيق منهجي بعد الحادثة.",
    summary_en: "Methodical post-incident investigation.",
    procedure_ar:
      "1) حفظ مسرح الحادث.\n2) جمع شهادات الشهود.\n3) تحليل تسجيلات CCTV.\n4) فحص سجلات الدخول.\n5) تقرير الأسباب الجذرية.\n6) توصيات وقائية.",
    procedure_en:
      "1) Preserve scene. 2) Collect witness statements. 3) Analyze CCTV. 4) Review access logs. 5) Root-cause report. 6) Preventive recommendations.",
    risk_level: "high",
    priority: "elevated",
    related_workflows: ["Investigation"],
    related_agents: ["investigation_agent"],
    keywords_ar: ["تحقيق", "شهود", "CCTV", "سبب جذري"],
    keywords_en: ["investigation", "witnesses", "CCTV", "root cause"],
    version: "1.0",
  },
  {
    doc_code: SOP(20),
    category_code: "IS-INV",
    title_ar: "جمع الأدلة الجنائية",
    title_en: "Forensic Evidence Collection",
    summary_ar: "جمع وحفظ الأدلة بأسلوب يحفظ سلسلة العهدة.",
    summary_en: "Collect and preserve evidence maintaining chain of custody.",
    procedure_ar:
      "1) تصوير الموقع.\n2) ترقيم وتغليف الأدلة.\n3) نموذج سلسلة العهدة.\n4) تخزين مؤمَّن.\n5) تسليم للجهة المختصة.",
    procedure_en:
      "1) Photograph scene. 2) Number and seal evidence. 3) Chain-of-custody form. 4) Secured storage. 5) Hand over to authority.",
    risk_level: "high",
    priority: "urgent",
    related_agents: ["investigation_agent"],
    keywords_ar: ["أدلة", "عهدة", "تغليف", "جنائي"],
    keywords_en: ["evidence", "custody", "seal", "forensic"],
    version: "1.0",
  },

  // ============ SOP — REPORTS (IS-SOP) ============
  {
    doc_code: SOP(21),
    category_code: "IS-SOP",
    title_ar: "إعداد التقرير اليومي",
    title_en: "Daily Security Report",
    summary_ar: "تجميع أحداث 24 ساعة من جميع المواقع.",
    summary_en: "Aggregate 24-hour events across all sites.",
    procedure_ar:
      "1) تجميع `sec_incidents` اليوم.\n2) ملخص الدوريات.\n3) سجل الزوار.\n4) حالة CCTV.\n5) نشر للقيادة عبر Outlook.",
    procedure_en:
      "1) Aggregate today's `sec_incidents`. 2) Patrol summary. 3) Visitor log. 4) CCTV status. 5) Distribute to leadership via Outlook.",
    risk_level: "low",
    priority: "routine",
    related_workflows: ["Daily Security Report"],
    related_agents: ["executive_briefer", "reporting_agent"],
    keywords_ar: ["تقرير", "يومي", "ملخص", "قيادة"],
    keywords_en: ["report", "daily", "summary", "leadership"],
    version: "1.0",
  },
  {
    doc_code: SOP(22),
    category_code: "IS-SOP",
    title_ar: "إعداد التقرير الأسبوعي",
    title_en: "Weekly Security Report",
    summary_ar: "تجميع أداء الأسبوع ومقارنته بالأسبوع السابق.",
    summary_en: "Aggregate weekly performance vs. previous week.",
    procedure_ar:
      "1) جمع KPIs الأسبوع.\n2) مقارنة بالأسبوع السابق.\n3) تحليل الاتجاهات.\n4) توصيات.\n5) نشر يوم الأحد.",
    procedure_en:
      "1) Collect weekly KPIs. 2) Compare to previous week. 3) Trend analysis. 4) Recommendations. 5) Publish Sunday.",
    risk_level: "low",
    priority: "routine",
    related_agents: ["executive_briefer"],
    keywords_ar: ["تقرير", "أسبوعي", "اتجاهات", "مقارنة"],
    keywords_en: ["report", "weekly", "trends", "comparison"],
    version: "1.0",
  },
  {
    doc_code: SOP(23),
    category_code: "IS-SOP",
    title_ar: "التقرير الشهري",
    title_en: "Monthly Security Report",
    summary_ar: "لوحة قيادة شهرية شاملة للقيادة العليا.",
    summary_en: "Comprehensive monthly dashboard for senior leadership.",
    procedure_ar:
      "1) KPIs الشهر.\n2) تحليل الحوادث.\n3) الامتثال للسياسات.\n4) خطة الشهر القادم.\n5) عرض تنفيذي.",
    procedure_en:
      "1) Monthly KPIs. 2) Incident analytics. 3) Policy compliance. 4) Next-month plan. 5) Executive presentation.",
    risk_level: "low",
    priority: "routine",
    related_agents: ["executive_briefer"],
    keywords_ar: ["تقرير", "شهري", "تحليل", "لوحة قيادة"],
    keywords_en: ["report", "monthly", "analytics", "dashboard"],
    version: "1.0",
  },
  {
    doc_code: SOP(24),
    category_code: "IS-SOP",
    title_ar: "الموجز التنفيذي",
    title_en: "Executive Brief",
    summary_ar: "موجز يومي مكثف للمدير التنفيذي.",
    summary_en: "Daily condensed brief for the executive director.",
    procedure_ar:
      "1) 3 نقاط رئيسية.\n2) المخاطر العاجلة.\n3) قرارات مطلوبة.\n4) ARIA توليد + مراجعة بشرية.\n5) تسليم 06:00.",
    procedure_en:
      "1) 3 key points. 2) Urgent risks. 3) Decisions required. 4) ARIA-generated + human-reviewed. 5) Deliver 06:00.",
    risk_level: "medium",
    priority: "elevated",
    related_workflows: ["Executive Briefing"],
    related_agents: ["executive_briefer", "aria_executive"],
    keywords_ar: ["موجز", "تنفيذي", "قرارات", "ARIA"],
    keywords_en: ["brief", "executive", "decisions", "ARIA"],
    version: "1.0",
  },

  // ============ CCTV (IS-CCT) ============
  {
    doc_code: "CCT-001",
    category_code: "IS-CCT",
    title_ar: "تشغيل غرفة المراقبة CCTV",
    title_en: "CCTV Control Room Operations",
    summary_ar: "تشغيل وردية غرفة المراقبة 24/7.",
    summary_en: "24/7 CCTV control room shift operations.",
    procedure_ar:
      "1) تسليم الوردية بتقرير.\n2) فحص جميع الكاميرات (`sec_cameras.status`).\n3) مراقبة التنبيهات.\n4) أرشفة 90 يوم.\n5) إبلاغ فوري عن أي انقطاع.",
    procedure_en:
      "1) Shift handover report. 2) All-cameras check (`sec_cameras.status`). 3) Alert monitoring. 4) 90-day archive. 5) Immediate outage report.",
    risk_level: "high",
    priority: "elevated",
    related_agents: ["cctv_intelligence"],
    keywords_ar: ["كاميرا", "CCTV", "غرفة", "مراقبة", "وردية"],
    keywords_en: ["camera", "CCTV", "control room", "shift"],
    version: "1.0",
  },

  // ============ ACCESS CONTROL (IS-ACS) ============
  {
    doc_code: "ACS-001",
    category_code: "IS-ACS",
    title_ar: "إدارة بطاقات الدخول",
    title_en: "Access Card Management",
    summary_ar: "إصدار واسترداد وإلغاء بطاقات الدخول.",
    summary_en: "Issue, return, and revoke access cards.",
    procedure_ar:
      "1) طلب رسمي من المدير.\n2) إصدار بصلاحيات حسب الدور.\n3) تسجيل في النظام.\n4) إلغاء فوري عند انتهاء الخدمة.\n5) فقدان البطاقة = إلغاء + تحقيق.",
    procedure_en:
      "1) Formal manager request. 2) Issue with role-based privileges. 3) Register in system. 4) Immediate revocation on end-of-service. 5) Lost card = revoke + investigate.",
    risk_level: "high",
    priority: "elevated",
    related_agents: ["access_controller"],
    keywords_ar: ["بطاقة", "دخول", "صلاحيات", "إلغاء"],
    keywords_en: ["card", "access", "privileges", "revocation"],
    version: "1.0",
  },

  // ============ GATES (IS-GAT) ============
  {
    doc_code: "GAT-001",
    category_code: "IS-GAT",
    title_ar: "تشغيل البوابة الرئيسية",
    title_en: "Main Gate Operations",
    summary_ar: "تشغيل البوابة الرئيسية لمنع الدخول غير المصرح.",
    summary_en: "Main gate operations to prevent unauthorized entry.",
    procedure_ar:
      "1) فحص هوية كل داخل.\n2) مطابقة التصاريح.\n3) فحص المركبات (مرآة + كلب).\n4) تسجيل في `sec_activity_events`.\n5) منع التصوير.",
    procedure_en:
      "1) ID check on entry. 2) Permit match. 3) Vehicle check (mirror + K9). 4) Log to `sec_activity_events`. 5) No photography.",
    risk_level: "high",
    priority: "elevated",
    related_agents: ["vehicle_access_controller", "visitor_gatekeeper"],
    keywords_ar: ["بوابة", "فحص", "مركبة", "هوية"],
    keywords_en: ["gate", "screening", "vehicle", "ID"],
    version: "1.0",
  },

  // ============ ASSET PROTECTION (IS-AST) ============
  {
    doc_code: "AST-001",
    category_code: "IS-AST",
    title_ar: "جرد وحماية الأصول",
    title_en: "Asset Inventory & Protection",
    summary_ar: "جرد دوري وحماية الأصول الحرجة.",
    summary_en: "Periodic inventory and protection of critical assets.",
    procedure_ar:
      "1) جرد سنوي شامل.\n2) جرد ربع سنوي للأصول الحرجة.\n3) ربط `sec_assets` بـ RFID.\n4) فحص حركة الأصول.\n5) تحقيق في أي مفقود.",
    procedure_en:
      "1) Annual full inventory. 2) Quarterly critical-asset inventory. 3) RFID linkage in `sec_assets`. 4) Asset-movement check. 5) Investigate any loss.",
    risk_level: "medium",
    priority: "routine",
    related_agents: ["asset_health_monitor"],
    keywords_ar: ["جرد", "أصول", "RFID", "حماية"],
    keywords_en: ["inventory", "assets", "RFID", "protection"],
    version: "1.0",
  },

  // ============ HAJJ (IS-HAJ) ============
  {
    doc_code: "HAJ-001",
    category_code: "IS-HAJ",
    title_ar: "بروتوكول أمن الحج — الكثافة البشرية",
    title_en: "Hajj Security Protocol — Crowd Density",
    summary_ar: "إدارة الكثافات في المشاعر المقدسة لمنع التدافع.",
    summary_en: "Crowd density management in holy sites to prevent stampedes.",
    procedure_ar:
      "1) مراقبة لحظية للكثافة.\n2) تنبيه عند تجاوز 6 شخص/م².\n3) تحويل المسارات.\n4) فرق طوارئ في كل 200م.\n5) تنسيق مع رئاسة شؤون الحرمين.",
    procedure_en:
      "1) Real-time density monitoring. 2) Alert at >6 persons/m². 3) Path rerouting. 4) Emergency teams every 200m. 5) Coordinate with Presidency of Two Holy Mosques.",
    risk_level: "critical",
    priority: "immediate",
    related_agents: ["hajj_ops_director", "crisis_commander"],
    keywords_ar: ["حج", "كثافة", "تدافع", "مشاعر", "حرمين"],
    keywords_en: ["hajj", "crowd", "stampede", "mashaer", "holy mosques"],
    version: "1.0",
  },

  // ============ RISK & CRISIS (IS-RSK, IS-CRS) ============
  {
    doc_code: "RSK-001",
    category_code: "IS-RSK",
    title_ar: "تقييم المخاطر الدوري",
    title_en: "Periodic Risk Assessment",
    summary_ar: "Identify → Analyze → Evaluate → Mitigate → Monitor.",
    summary_en: "Identify → Analyze → Evaluate → Mitigate → Monitor.",
    procedure_ar:
      "1) جلسة تقييم ربع سنوية.\n2) سجل مخاطر محدث.\n3) خطط معالجة لكل مخاطرة عالية.\n4) مراجعة شهرية.\n5) رفع للقيادة.",
    procedure_en:
      "1) Quarterly assessment session. 2) Updated risk register. 3) Mitigation plan per high risk. 4) Monthly review. 5) Report to leadership.",
    risk_level: "high",
    priority: "elevated",
    related_agents: ["risk_intelligence", "aria_executive"],
    keywords_ar: ["مخاطر", "تقييم", "سجل", "معالجة"],
    keywords_en: ["risk", "assessment", "register", "mitigation"],
    version: "1.0",
  },
  {
    doc_code: "CRS-001",
    category_code: "IS-CRS",
    title_ar: "تفعيل غرفة إدارة الأزمات",
    title_en: "Crisis Management Room Activation",
    summary_ar: "تفعيل غرفة الأزمات عند الحادثة الحرجة.",
    summary_en: "Activate crisis room on critical event.",
    procedure_ar:
      "1) قرار التفعيل من قائد الأزمة.\n2) استدعاء الفريق.\n3) خط اتصال مباشر بالقيادة.\n4) لوحة قيادة لحظية.\n5) تسجيل القرارات.",
    procedure_en:
      "1) Activation decision by crisis commander. 2) Team callout. 3) Direct line to leadership. 4) Live command dashboard. 5) Decision log.",
    risk_level: "critical",
    priority: "immediate",
    related_agents: ["crisis_commander"],
    keywords_ar: ["أزمة", "غرفة", "تفعيل", "قرارات"],
    keywords_en: ["crisis", "room", "activation", "decisions"],
    version: "1.0",
  },

  // ============ BUSINESS CONTINUITY (IS-BCM) ============
  {
    doc_code: "BCM-001",
    category_code: "IS-BCM",
    title_ar: "خطة استمرارية أعمال الأمن",
    title_en: "Security Business Continuity Plan",
    summary_ar: "ضمان استمرار العمليات الأمنية في حال الأزمات.",
    summary_en: "Ensure security operations continuity during crises.",
    procedure_ar:
      "1) موقع بديل لغرفة العمليات.\n2) نسخة احتياطية يومية للبيانات.\n3) فريق احتياطي.\n4) اختبار ربع سنوي.",
    procedure_en:
      "1) Backup ops room site. 2) Daily data backup. 3) Backup team. 4) Quarterly test.",
    risk_level: "high",
    priority: "elevated",
    related_agents: ["crisis_commander"],
    keywords_ar: ["استمرارية", "بديل", "نسخة احتياطية", "اختبار"],
    keywords_en: ["continuity", "backup", "BCP", "test"],
    version: "1.0",
  },
  {
    doc_code: "DRP-001",
    category_code: "IS-DRP",
    title_ar: "خطة التعافي من الكوارث للأنظمة",
    title_en: "Systems Disaster Recovery Plan",
    summary_ar: "RTO 4 ساعات، RPO 1 ساعة.",
    summary_en: "RTO 4 hours, RPO 1 hour.",
    procedure_ar:
      "1) موقع تعافي ثانوي.\n2) نسخ احتياطية تلقائية.\n3) تشغيل تجريبي شهري.\n4) خطة إعادة التشغيل.",
    procedure_en:
      "1) Secondary recovery site. 2) Automated backups. 3) Monthly drill. 4) Restart plan.",
    risk_level: "high",
    priority: "elevated",
    related_agents: ["crisis_commander"],
    keywords_ar: ["تعافي", "كوارث", "RTO", "RPO", "نسخة احتياطية"],
    keywords_en: ["DR", "disaster", "RTO", "RPO", "backup"],
    version: "1.0",
  },

  // ============ AUDIT (IS-AUD) ============
  {
    doc_code: "AUD-001",
    category_code: "IS-AUD",
    title_ar: "التدقيق الأمني الداخلي",
    title_en: "Internal Security Audit",
    summary_ar: "تدقيق ربع سنوي على جميع المواقع.",
    summary_en: "Quarterly audit across all sites.",
    procedure_ar:
      "1) خطة تدقيق سنوية.\n2) قائمة تحقق لكل سياسة.\n3) عينات عشوائية.\n4) تقرير ملاحظات.\n5) خطة معالجة + متابعة.",
    procedure_en:
      "1) Annual audit plan. 2) Checklist per policy. 3) Random sampling. 4) Findings report. 5) Remediation plan + tracking.",
    risk_level: "medium",
    priority: "elevated",
    related_agents: ["compliance_auditor"],
    keywords_ar: ["تدقيق", "امتثال", "ملاحظات", "معالجة"],
    keywords_en: ["audit", "compliance", "findings", "remediation"],
    version: "1.0",
  },

  // ============ KPIs (IS-KPI) ============
  {
    doc_code: KPI(1),
    category_code: "IS-KPI",
    title_ar: "زمن الاستجابة للحوادث",
    title_en: "Incident Response Time",
    summary_ar: "زمن من فتح الحادثة إلى الاستجابة الأولى. الهدف: ≤15 دقيقة (High/Critical).",
    summary_en: "Time from incident open to first response. Target: ≤15 min (High/Critical).",
    procedure_ar: "محسوب من `sec_incidents.responded_at - created_at`. لوحة QC أسبوعية.",
    procedure_en: "Computed from `sec_incidents.responded_at - created_at`. Weekly QC dashboard.",
    risk_level: "high",
    priority: "elevated",
    keywords_ar: ["زمن", "استجابة", "حوادث", "KPI"],
    keywords_en: ["response time", "incident", "KPI"],
    version: "1.0",
  },
  {
    doc_code: KPI(2),
    category_code: "IS-KPI",
    title_ar: "نسبة الالتزام بالدوريات",
    title_en: "Patrol Compliance",
    summary_ar: "نسبة الدوريات المنجزة. الهدف: ≥95%.",
    summary_en: "Completed patrol ratio. Target: ≥95%.",
    procedure_ar: "محسوبة من `sec_patrols` completed/scheduled.",
    procedure_en: "Computed from `sec_patrols` completed/scheduled.",
    risk_level: "medium",
    priority: "routine",
    keywords_ar: ["دوريات", "التزام", "KPI"],
    keywords_en: ["patrol", "compliance", "KPI"],
    version: "1.0",
  },
  {
    doc_code: KPI(3),
    category_code: "IS-KPI",
    title_ar: "جاهزية كاميرات المراقبة",
    title_en: "CCTV Availability",
    summary_ar: "نسبة الكاميرات في حالة online. الهدف: ≥98%.",
    summary_en: "Ratio of online cameras. Target: ≥98%.",
    procedure_ar: "محسوبة من `sec_cameras.status='online'`.",
    procedure_en: "Computed from `sec_cameras.status='online'`.",
    risk_level: "high",
    priority: "elevated",
    keywords_ar: ["CCTV", "جاهزية", "كاميرات", "KPI"],
    keywords_en: ["CCTV", "availability", "cameras", "KPI"],
    version: "1.0",
  },
  {
    doc_code: KPI(4),
    category_code: "IS-KPI",
    title_ar: "درجة الأمن العامة",
    title_en: "Security Score",
    summary_ar: "درجة مركبة من جميع المؤشرات. الهدف: ≥85/100.",
    summary_en: "Composite from all KPIs. Target: ≥85/100.",
    procedure_ar: "وزن مرجح لـ KPI-001 حتى KPI-010 مع مضاعفات للحرج.",
    procedure_en: "Weighted of KPI-001…KPI-010 with critical multipliers.",
    risk_level: "high",
    priority: "elevated",
    keywords_ar: ["درجة", "أمن", "مؤشر", "شامل"],
    keywords_en: ["score", "security", "composite", "index"],
    version: "1.0",
  },

  // ============ EXECUTIVE & EVENT SECURITY ============
  {
    doc_code: "EXE-001",
    category_code: "IS-EXE",
    title_ar: "حماية الشخصيات التنفيذية",
    title_en: "Executive Protection",
    summary_ar: "حماية شخصية لكبار المسؤولين أثناء الزيارات.",
    summary_en: "Personal protection for senior officials during visits.",
    procedure_ar:
      "1) دراسة المخاطر مسبقاً.\n2) فريق حماية معتمد.\n3) تأمين المسار.\n4) موقع إخلاء بديل.\n5) تنسيق مع جهات الحماية.",
    procedure_en:
      "1) Pre-trip risk study. 2) Certified protection team. 3) Route security. 4) Backup evacuation site. 5) Protection authority coordination.",
    risk_level: "high",
    priority: "urgent",
    keywords_ar: ["حماية", "شخصيات", "تنفيذي", "VIP"],
    keywords_en: ["executive", "VIP", "protection", "officials"],
    version: "1.0",
  },
  {
    doc_code: "EVT-001",
    category_code: "IS-EVT",
    title_ar: "تأمين الفعاليات الكبرى",
    title_en: "Major Event Security",
    summary_ar: "خطة أمنية شاملة للمناسبات الكبرى.",
    summary_en: "Comprehensive security plan for major events.",
    procedure_ar:
      "1) خطة تشغيل قبل 30 يوم.\n2) فحص دخول للجمهور.\n3) خطة إخلاء.\n4) فرق طبية على الموقع.\n5) غرفة قيادة موحدة.",
    procedure_en:
      "1) Ops plan 30 days prior. 2) Public entry screening. 3) Evacuation plan. 4) On-site medical teams. 5) Unified command room.",
    risk_level: "high",
    priority: "elevated",
    keywords_ar: ["فعالية", "تأمين", "حشد", "قيادة"],
    keywords_en: ["event", "security", "crowd", "command"],
    version: "1.0",
  },

  // ============ FORMS & CHECKLISTS & TEMPLATES ============
  {
    doc_code: "FRM-VIS-001",
    category_code: "IS-FRM",
    title_ar: "نموذج تسجيل زائر",
    title_en: "Visitor Registration Form",
    summary_ar: "نموذج بيانات الزائر القياسي.",
    summary_en: "Standard visitor data form.",
    procedure_ar:
      "حقول: الاسم، الهوية، الجنسية، الجهة، المضيف، الغرض، وقت الدخول، وقت الخروج، التوقيع.",
    procedure_en:
      "Fields: Name, ID, Nationality, Company, Host, Purpose, Entry Time, Exit Time, Signature.",
    risk_level: "low",
    priority: "routine",
    keywords_ar: ["نموذج", "زائر", "تسجيل"],
    keywords_en: ["form", "visitor", "registration"],
    version: "1.0",
  },
  {
    doc_code: "CHK-PAT-001",
    category_code: "IS-CHK",
    title_ar: "قائمة تحقق الدورية الليلية",
    title_en: "Night Patrol Checklist",
    summary_ar: "قائمة بنود إلزامية للدورية الليلية.",
    summary_en: "Mandatory items for night patrol.",
    procedure_ar: "✓ جواز السلاح\n✓ راديو\n✓ كشاف\n✓ هاتف طوارئ\n✓ قائمة النقاط\n✓ بطاقة هوية",
    procedure_en:
      "✓ Weapon clearance ✓ Radio ✓ Flashlight ✓ Emergency phone ✓ Checkpoint list ✓ ID badge",
    risk_level: "medium",
    priority: "routine",
    keywords_ar: ["قائمة", "تحقق", "دورية", "ليلية"],
    keywords_en: ["checklist", "patrol", "night"],
    version: "1.0",
  },
  {
    doc_code: "TPL-RPT-001",
    category_code: "IS-TPL",
    title_ar: "قالب تقرير الحادثة",
    title_en: "Incident Report Template",
    summary_ar: "هيكل موحد لتقرير أي حادثة أمنية.",
    summary_en: "Unified structure for any security incident report.",
    procedure_ar:
      "أقسام: ملخص — التسلسل الزمني — الأشخاص — الأدلة — الأسباب الجذرية — الإجراءات التصحيحية — التوصيات.",
    procedure_en:
      "Sections: Summary — Timeline — People — Evidence — Root Causes — Corrective Actions — Recommendations.",
    risk_level: "low",
    priority: "routine",
    keywords_ar: ["قالب", "تقرير", "حادثة"],
    keywords_en: ["template", "report", "incident"],
    version: "1.0",
  },

  // ============ WORK INSTRUCTIONS (IS-WI) ============
  {
    doc_code: "WI-001",
    category_code: "IS-WI",
    title_ar: "تعليمات استخدام جهاز X-Ray للأمتعة",
    title_en: "Baggage X-Ray Operating Instructions",
    summary_ar: "تشغيل وتفسير صور جهاز الفحص الإشعاعي.",
    summary_en: "Operate and interpret radiation-based baggage scanner.",
    procedure_ar:
      "1) فحص يومي قبل التشغيل.\n2) معايرة أسبوعية.\n3) معدلات السلامة الإشعاعية.\n4) التعرف على الأشكال المشبوهة.\n5) إيقاف فوري عند أي عطل.",
    procedure_en:
      "1) Daily pre-op check. 2) Weekly calibration. 3) Radiation safety rates. 4) Suspicious shape recognition. 5) Immediate halt on fault.",
    risk_level: "high",
    priority: "elevated",
    keywords_ar: ["X-Ray", "أمتعة", "فحص", "إشعاع"],
    keywords_en: ["X-Ray", "baggage", "screening", "radiation"],
    version: "1.0",
  },

  // ============ CRITICAL INFRASTRUCTURE PROTECTION ============
  {
    doc_code: "CIP-001",
    category_code: "IS-CIP",
    title_ar: "حماية المنشآت الحيوية",
    title_en: "Critical Infrastructure Protection",
    summary_ar: "حماية متعددة الطبقات للمنشآت المصنفة حيوية.",
    summary_en: "Layered protection for critical-classified facilities.",
    procedure_ar:
      "1) محيط متعدد الطبقات.\n2) تصاريح خاصة للدخول.\n3) دوريات مكثفة.\n4) CCTV مع تحليل ذكي.\n5) ربط مع NCA.",
    procedure_en:
      "1) Multi-layer perimeter. 2) Special entry permits. 3) Intensified patrols. 4) AI-enabled CCTV. 5) NCA linkage.",
    risk_level: "critical",
    priority: "immediate",
    keywords_ar: ["حيوية", "حماية", "NCA", "طبقات"],
    keywords_en: ["critical", "infrastructure", "NCA", "layered"],
    version: "1.0",
  },
];
