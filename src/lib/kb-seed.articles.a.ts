// Auto-split from kb-seed.data.ts — pure data, no logic.
import type { KbSeedArticle } from "./kb-seed.base";
import { POL, SOP, KPI } from "./kb-seed.base";

export const ARTICLES_A: KbSeedArticle[] = [
  // ============ POLICIES (IS-POL) ============
  {
    doc_code: POL(1),
    category_code: "IS-POL",
    title_ar: "السياسة العامة للأمن الصناعي",
    title_en: "Industrial Security General Policy",
    summary_ar: "الإطار الحاكم لحماية المنشآت والأفراد والأصول في المنطقة الغربية.",
    summary_en:
      "Governing framework for protecting facilities, people, and assets across the Western Region.",
    purpose_ar:
      "تأسيس قواعد موحدة لحماية كل عناصر المنشأة من التهديدات الأمنية، السلامة، والكوارث.",
    purpose_en:
      "Establish unified rules to protect facility elements from security, safety, and disaster threats.",
    scope_ar:
      "تشمل جميع المواقع، الموظفين، المقاولين، الزوار، الأصول، والأنظمة في إدارة الأمن الصناعي بالمنطقة الغربية.",
    scope_en:
      "Covers all sites, employees, contractors, visitors, assets, and systems in the Western Region.",
    procedure_ar:
      "1) تطبيق التحكم بالدخول 24/7.\n2) مراقبة محيط المنشآت عبر CCTV.\n3) تشغيل دوريات منتظمة.\n4) توثيق كل الأحداث في `sec_activity_events`.\n5) مراجعة سنوية للسياسة.",
    procedure_en:
      "1) Enforce 24/7 access control. 2) Monitor perimeter via CCTV. 3) Run regular patrols. 4) Log all events to `sec_activity_events`. 5) Review policy annually.",
    risk_level: "high",
    priority: "elevated",
    escalation_level: "Director — Industrial Security",
    related_policies: ["POL-002", "POL-003"],
    related_agents: ["security_commander", "aria_executive"],
    keywords_ar: ["سياسة", "حماية", "منشآت", "أمن صناعي", "المنطقة الغربية"],
    keywords_en: ["policy", "protection", "facilities", "industrial security", "western region"],
    owner: "Director — Industrial Security",
    version: "1.0",
  },
  {
    doc_code: POL(2),
    category_code: "IS-POL",
    title_ar: "سياسة عدم التسامح مع الخروقات الأمنية",
    title_en: "Zero-Tolerance Policy for Security Breaches",
    summary_ar: "أي خرق أمني — متعمد أو إهمالاً — يخضع للتحقيق الفوري وإجراء تأديبي.",
    summary_en:
      "Any security breach — intentional or negligent — triggers immediate investigation and disciplinary action.",
    procedure_ar:
      "1) فتح حادثة في `sec_incidents` بأولوية critical.\n2) إخطار قائد العمليات خلال 15 دقيقة.\n3) إيقاف صلاحيات المسؤول إذا لزم.\n4) فتح تحقيق رسمي.\n5) إبلاغ المدير التنفيذي.",
    procedure_en:
      "1) Open critical-severity incident in `sec_incidents`. 2) Notify operations commander within 15 min. 3) Suspend access if needed. 4) Open formal investigation. 5) Report to executive director.",
    risk_level: "critical",
    priority: "immediate",
    escalation_level: "Executive Director",
    related_workflows: ["Incident Response", "Investigation"],
    related_agents: ["incident_commander", "investigation_agent"],
    keywords_ar: ["خرق", "انتهاك", "تحقيق", "عقوبة", "صفر تسامح"],
    keywords_en: ["breach", "violation", "investigation", "disciplinary", "zero tolerance"],
    version: "1.0",
  },

  // ============ REGULATIONS (IS-REG) ============
  {
    doc_code: "REG-001",
    category_code: "IS-REG",
    title_ar: "الامتثال للهيئة الوطنية للأمن السيبراني (NCA)",
    title_en: "National Cybersecurity Authority (NCA) Compliance",
    summary_ar: "تطبيق ضوابط الـ ECC و CSCC لكل أنظمة الأمن الصناعي المتصلة بالشبكة.",
    summary_en: "Apply ECC and CSCC controls to every networked industrial security system.",
    procedure_ar:
      "1) تصنيف الأنظمة حسب الحساسية.\n2) تطبيق ضوابط ECC-1:2018.\n3) تدقيق سنوي بواسطة Compliance Auditor.\n4) رفع تقرير الامتثال للهيئة.",
    procedure_en:
      "1) Classify systems by sensitivity. 2) Apply ECC-1:2018 controls. 3) Annual audit by Compliance Auditor. 4) Submit compliance report to NCA.",
    risk_level: "high",
    priority: "elevated",
    related_agents: ["compliance_auditor", "policy_advisor"],
    keywords_ar: ["NCA", "الهيئة الوطنية", "سيبراني", "ECC", "امتثال"],
    keywords_en: ["NCA", "cybersecurity", "ECC", "CSCC", "compliance"],
    version: "1.0",
  },
  {
    doc_code: "REG-002",
    category_code: "IS-REG",
    title_ar: "نظام حماية البيانات الشخصية (PDPL)",
    title_en: "Personal Data Protection Law (PDPL)",
    summary_ar: "حماية بيانات الموظفين والزوار والمقاولين وفق نظام PDPL السعودي.",
    summary_en: "Protect employee, visitor, and contractor data per Saudi PDPL.",
    procedure_ar:
      "1) تصنيف البيانات (عام/داخلي/سري).\n2) تخزين البيانات الحساسة بـ RLS على مستوى المنظمة.\n3) إخفاء الهوية في التقارير.\n4) سجل وصول مدقّق.",
    procedure_en:
      "1) Classify data (public/internal/confidential). 2) Store sensitive data with org-level RLS. 3) Anonymize in reports. 4) Audited access log.",
    risk_level: "high",
    priority: "elevated",
    related_agents: ["compliance_auditor"],
    keywords_ar: ["PDPL", "بيانات شخصية", "خصوصية", "سعودية"],
    keywords_en: ["PDPL", "personal data", "privacy", "saudi"],
    version: "1.0",
  },

  // ============ SOP — VISITOR (IS-SOP / IS-VIS) ============
  {
    doc_code: SOP(1),
    category_code: "IS-VIS",
    title_ar: "تسجيل دخول الزوار",
    title_en: "Visitor Check-In",
    summary_ar: "إجراء قياسي لاستقبال الزوار وإصدار بطاقة الزيارة والتحقق من المضيف.",
    summary_en: "Standard procedure for receiving visitors, issuing badges, and verifying hosts.",
    purpose_ar: "ضمان مرور كل الزوار عبر التحقق من الهوية وموافقة المضيف قبل الدخول.",
    purpose_en: "Ensure every visitor passes ID verification and host approval before entry.",
    procedure_ar:
      "1) طلب الهوية الوطنية / الإقامة.\n2) التحقق من المضيف عبر النظام.\n3) فحص حقيبة الزائر.\n4) إصدار بطاقة الزيارة.\n5) إنشاء سجل في `sec_visitors` بحالة `checked_in`.\n6) إخطار المضيف.",
    procedure_en:
      "1) Request national ID / Iqama. 2) Verify host in system. 3) Bag screening. 4) Issue visitor badge. 5) Create `sec_visitors` record with status `checked_in`. 6) Notify host.",
    responsibilities_ar:
      "ضابط البوابة: التحقق. مشرف الزوار: الموافقة. ARIA: التنبيه إذا انتهت المدة.",
    responsibilities_en:
      "Gate officer: verification. Visitor supervisor: approval. ARIA: alert on overstay.",
    requirements_ar: "هوية سارية + مضيف مسجل + تصريح أمني للمناطق الحساسة.",
    requirements_en: "Valid ID + registered host + security clearance for sensitive areas.",
    risk_level: "medium",
    priority: "routine",
    related_forms: ["FRM-VIS-001"],
    related_workflows: ["Visitor Check-in"],
    related_agents: ["visitor_gatekeeper"],
    keywords_ar: ["زائر", "تسجيل", "بطاقة", "بوابة", "استقبال"],
    keywords_en: ["visitor", "check-in", "badge", "gate", "reception"],
    version: "1.0",
  },
  {
    doc_code: SOP(2),
    category_code: "IS-VIS",
    title_ar: "إنهاء زيارة الزائر",
    title_en: "Visitor Check-Out",
    summary_ar: "إجراء قياسي لإنهاء الزيارة واسترداد البطاقة.",
    summary_en: "Standard procedure for ending a visit and reclaiming the badge.",
    procedure_ar:
      "1) استرداد بطاقة الزيارة.\n2) التحقق من إعادة أي معدات.\n3) تحديث `sec_visitors.status = checked_out`.\n4) تسجيل وقت الخروج.\n5) تنبيه فوري عند تجاوز المدة المسموحة.",
    procedure_en:
      "1) Reclaim badge. 2) Verify equipment return. 3) Update `sec_visitors.status = checked_out`. 4) Log exit time. 5) Immediate alert on overstay.",
    risk_level: "low",
    priority: "routine",
    related_workflows: ["Visitor Check-out"],
    related_agents: ["visitor_gatekeeper"],
    keywords_ar: ["خروج", "زائر", "بطاقة", "انتهاء", "تسجيل"],
    keywords_en: ["check-out", "visitor", "badge", "exit"],
    version: "1.0",
  },

  // ============ SOP — CONTRACTOR (IS-CON) ============
  {
    doc_code: SOP(3),
    category_code: "IS-CON",
    title_ar: "دخول المقاولين",
    title_en: "Contractor Entry",
    summary_ar: "إجراء قياسي للتحقق من تصاريح وتأمين المقاول قبل دخول الموقع.",
    summary_en: "Standard procedure to verify contractor permits and insurance before site entry.",
    procedure_ar:
      "1) التحقق من السجل التجاري الساري.\n2) التحقق من شهادة التأمين (تنتهي > 30 يوم).\n3) شهادة GOSI سارية.\n4) شهادة سلامة HSE صالحة.\n5) شهادة Nitaqat (نطاق أخضر للأعمال الحرجة).\n6) إصدار تصريح مؤقت.\n7) تسجيل في `sec_contractors`.",
    procedure_en:
      "1) Verify valid Commercial Registration. 2) Verify insurance certificate (expiry > 30 days). 3) Current GOSI certificate. 4) Valid HSE safety cert. 5) Saudization (Green Nitaqat) for critical work. 6) Issue temporary permit. 7) Register in `sec_contractors`.",
    risk_level: "high",
    priority: "elevated",
    related_workflows: ["Contractor Approval"],
    related_agents: ["contractor_compliance"],
    keywords_ar: ["مقاول", "تأمين", "سجل تجاري", "سعودة", "سلامة"],
    keywords_en: ["contractor", "insurance", "CR", "saudization", "HSE"],
    version: "1.0",
  },

  // ============ SOP — PERMIT TO WORK (IS-PTW) ============
  {
    doc_code: SOP(4),
    category_code: "IS-PTW",
    title_ar: "تصريح العمل العام",
    title_en: "Permit To Work — General",
    summary_ar: "البروتوكول الرئيسي لإصدار أي تصريح عمل في المواقع الصناعية.",
    summary_en: "Master protocol for issuing any work permit on industrial sites.",
    procedure_ar:
      "1) طلب التصريح من المقاول.\n2) تقييم المخاطر.\n3) موافقة مسؤول السلامة.\n4) موافقة قائد الموقع.\n5) إصدار التصريح في `sec_permits`.\n6) تفعيل للمدة المحددة فقط.",
    procedure_en:
      "1) Contractor permit request. 2) Risk assessment. 3) Safety officer approval. 4) Site commander approval. 5) Issue permit in `sec_permits`. 6) Activate only for defined duration.",
    risk_level: "high",
    priority: "elevated",
    related_workflows: ["Permit Approval"],
    related_agents: ["permit_officer"],
    keywords_ar: ["تصريح", "عمل", "سلامة", "موافقة"],
    keywords_en: ["permit", "work", "safety", "approval"],
    version: "1.0",
  },
  {
    doc_code: SOP(5),
    category_code: "IS-PTW",
    title_ar: "تصريح العمل الساخن",
    title_en: "Hot Work Permit",
    summary_ar: "تصريح خاص لأي عمل ينتج لهب/شرر (لحام، قطع، طحن).",
    summary_en: "Special permit for any work producing flame/sparks (welding, cutting, grinding).",
    procedure_ar:
      "1) تطبيق جميع شروط SOP-004.\n2) فحص جو العمل بـ Gas Detector.\n3) إزالة المواد القابلة للاشتعال شعاع 11م.\n4) توفير طفاية حريق + مراقب حريق.\n5) صلاحية 8 ساعات قصوى.",
    procedure_en:
      "1) Apply all SOP-004 conditions. 2) Gas detector atmosphere test. 3) Remove combustibles within 11m. 4) Provide extinguisher + fire watch. 5) Max validity 8 hours.",
    risk_level: "critical",
    priority: "urgent",
    escalation_level: "Site Commander",
    related_workflows: ["Permit Approval"],
    related_agents: ["permit_officer"],
    keywords_ar: ["عمل ساخن", "لحام", "حريق", "شرر", "تصريح"],
    keywords_en: ["hot work", "welding", "fire", "sparks", "permit"],
    version: "1.0",
  },
  {
    doc_code: SOP(6),
    category_code: "IS-PTW",
    title_ar: "تصريح الأماكن المغلقة",
    title_en: "Confined Space Entry Permit",
    summary_ar: "تصريح خاص للدخول إلى الأماكن المغلقة مع رصد الجو ورقابة من خارج المكان.",
    summary_en:
      "Special permit for confined-space entry with atmosphere monitoring and outside attendant.",
    procedure_ar:
      "1) قياس O2 (19.5-23.5%)، LEL<10%، CO<25ppm، H2S<10ppm.\n2) تهوية مستمرة.\n3) مراقب خارجي.\n4) خطة إنقاذ موثقة.\n5) اتصال لاسلكي دائم.",
    procedure_en:
      "1) Atmosphere test O2 (19.5-23.5%), LEL<10%, CO<25ppm, H2S<10ppm. 2) Continuous ventilation. 3) Outside attendant. 4) Documented rescue plan. 5) Constant radio contact.",
    risk_level: "critical",
    priority: "urgent",
    related_workflows: ["Permit Approval"],
    related_agents: ["permit_officer"],
    keywords_ar: ["أماكن مغلقة", "تهوية", "غاز", "إنقاذ"],
    keywords_en: ["confined space", "ventilation", "gas", "rescue"],
    version: "1.0",
  },
  {
    doc_code: SOP(7),
    category_code: "IS-PTW",
    title_ar: "تصريح الحفر",
    title_en: "Excavation Permit",
    summary_ar: "تصريح للحفريات > 30سم لتجنب الإضرار بالكابلات والأنابيب.",
    summary_en: "Permit for excavations > 30cm to prevent damage to cables and pipes.",
    procedure_ar:
      "1) فحص مخطط الخدمات تحت الأرض.\n2) Cable Locator scan.\n3) حواجز وإضاءة ليلية.\n4) لا تجاوز للعمق دون موافقة جديدة.",
    procedure_en:
      "1) Review underground services map. 2) Cable locator scan. 3) Barriers and night lighting. 4) No depth overrun without new approval.",
    risk_level: "high",
    priority: "elevated",
    related_workflows: ["Permit Approval"],
    related_agents: ["permit_officer"],
    keywords_ar: ["حفر", "كابلات", "أنابيب", "تصريح"],
    keywords_en: ["excavation", "cables", "pipes", "permit"],
    version: "1.0",
  },
  {
    doc_code: SOP(8),
    category_code: "IS-PTW",
    title_ar: "تصريح العمل على الكهرباء",
    title_en: "Electrical Work Permit",
    summary_ar: "تصريح للعمل على دوائر >50 فولت أو لوحات توزيع.",
    summary_en: "Permit for work on >50V circuits or distribution panels.",
    procedure_ar: "1) عزل التيار (LOTO).\n2) إثبات انعدام الجهد.\n3) تأريض.\n4) فني معتمد فقط.",
    procedure_en:
      "1) Lock-Out Tag-Out isolation. 2) Voltage absence proof. 3) Grounding. 4) Certified electrician only.",
    risk_level: "critical",
    priority: "urgent",
    related_workflows: ["Permit Approval"],
    related_agents: ["permit_officer"],
    keywords_ar: ["كهرباء", "LOTO", "عزل", "جهد"],
    keywords_en: ["electrical", "LOTO", "isolation", "voltage"],
    version: "1.0",
  },

  // ============ SOP — PATROL (IS-PAT) ============
  {
    doc_code: SOP(9),
    category_code: "IS-PAT",
    title_ar: "تنفيذ الدورية الأمنية",
    title_en: "Security Patrol Execution",
    summary_ar: "تنفيذ جولة دورية وتسجيل النقاط ومتابعة الانحرافات.",
    summary_en: "Execute a patrol round, log checkpoints, and track deviations.",
    procedure_ar:
      "1) استلام جدول الدورية من `sec_patrols`.\n2) المرور على كل النقاط.\n3) مسح QR/NFC عند كل نقطة.\n4) توثيق أي ملاحظة.\n5) إغلاق الدورية برقم تسلسلي.",
    procedure_en:
      "1) Receive patrol schedule from `sec_patrols`. 2) Visit every checkpoint. 3) Scan QR/NFC at each. 4) Log any observation. 5) Close patrol with serial number.",
    risk_level: "medium",
    priority: "routine",
    related_workflows: ["Patrol Monitoring"],
    related_agents: ["patrol_dispatcher"],
    keywords_ar: ["دورية", "جولة", "نقاط تفتيش", "QR"],
    keywords_en: ["patrol", "round", "checkpoints", "QR"],
    version: "1.0",
  },
  {
    doc_code: SOP(10),
    category_code: "IS-PAT",
    title_ar: "تفتيش المحيط",
    title_en: "Perimeter Inspection",
    summary_ar: "فحص دوري للسور الخارجي والبوابات والأسلاك.",
    summary_en: "Routine inspection of perimeter fence, gates, and wires.",
    procedure_ar:
      "1) فحص بصري للسور.\n2) فحص استشعار الاهتزاز.\n3) اختبار البوابات.\n4) فحص الإضاءة الليلية.\n5) إبلاغ فوري عن أي خرق.",
    procedure_en:
      "1) Visual fence inspection. 2) Vibration sensor check. 3) Gate test. 4) Night lighting check. 5) Immediate report of any breach.",
    risk_level: "high",
    priority: "elevated",
    related_agents: ["patrol_dispatcher"],
    keywords_ar: ["محيط", "سور", "تفتيش", "إضاءة"],
    keywords_en: ["perimeter", "fence", "inspection", "lighting"],
    version: "1.0",
  },

  // ============ SOP — EMERGENCY (IS-ERP) ============
  {
    doc_code: SOP(11),
    category_code: "IS-ERP",
    title_ar: "إجراء الإخلاء العام",
    title_en: "General Evacuation Procedure",
    summary_ar: "إخلاء كامل للمنشأة في حالة الطوارئ.",
    summary_en: "Full facility evacuation in emergency.",
    procedure_ar:
      "1) تفعيل إنذار الإخلاء.\n2) إغلاق صمامات الغاز/الوقود.\n3) إرشاد للمخارج الآمنة.\n4) التجمع في نقاط التجمع المعتمدة.\n5) جرد الحضور.\n6) إبلاغ الدفاع المدني 998.",
    procedure_en:
      "1) Activate evacuation alarm. 2) Shut gas/fuel valves. 3) Guide to safe exits. 4) Assemble at designated muster points. 5) Headcount. 6) Notify Civil Defense 998.",
    risk_level: "critical",
    priority: "immediate",
    escalation_level: "Crisis Commander",
    related_workflows: ["Emergency Escalation"],
    related_agents: ["crisis_commander", "emergency_coordinator"],
    keywords_ar: ["إخلاء", "طوارئ", "تجمع", "إنذار", "998"],
    keywords_en: ["evacuation", "emergency", "muster", "alarm", "998"],
    version: "1.0",
  },
  {
    doc_code: SOP(12),
    category_code: "IS-FLS",
    title_ar: "الاستجابة للحريق",
    title_en: "Fire Response",
    summary_ar: "الإجراء الأول عند اكتشاف حريق.",
    summary_en: "First-action procedure on fire detection.",
    procedure_ar:
      "1) تفعيل أقرب نقطة إنذار.\n2) محاولة إخماد بالطفاية إذا كان آمناً.\n3) إخطار غرفة العمليات.\n4) الاتصال بالدفاع المدني 998.\n5) بدء الإخلاء.\n6) فتح حادثة بأولوية critical.",
    procedure_en:
      "1) Activate nearest alarm point. 2) Attempt extinguish with extinguisher if safe. 3) Notify control room. 4) Call Civil Defense 998. 5) Start evacuation. 6) Open critical-severity incident.",
    risk_level: "critical",
    priority: "immediate",
    related_workflows: ["Emergency Escalation", "Incident Response"],
    related_agents: ["crisis_commander", "incident_commander"],
    keywords_ar: ["حريق", "طفاية", "إنذار", "998", "دفاع مدني"],
    keywords_en: ["fire", "extinguisher", "alarm", "998", "civil defense"],
    version: "1.0",
  },
  {
    doc_code: SOP(13),
    category_code: "IS-HAZ",
    title_ar: "الاستجابة لتسرب الغاز",
    title_en: "Gas Leak Response",
    summary_ar: "الإجراء عند رصد تسرب غاز قابل للاشتعال أو سام.",
    summary_en: "Response on detection of flammable or toxic gas leak.",
    procedure_ar:
      "1) عزل المصدر إذا أمكن.\n2) منع أي شرارة.\n3) تهوية المنطقة.\n4) إخلاء المحيط 50م.\n5) قياس التركيز كل 5 دقائق.\n6) Civil Defense + HAZMAT team.",
    procedure_en:
      "1) Isolate source if possible. 2) Eliminate all ignition. 3) Ventilate area. 4) Evacuate 50m radius. 5) Concentration measurement every 5 min. 6) Civil Defense + HAZMAT team.",
    risk_level: "critical",
    priority: "immediate",
    related_agents: ["crisis_commander", "emergency_coordinator"],
    keywords_ar: ["غاز", "تسرب", "HAZMAT", "تهوية", "اشتعال"],
    keywords_en: ["gas", "leak", "HAZMAT", "ventilation", "ignition"],
    version: "1.0",
  },
  {
    doc_code: SOP(14),
    category_code: "IS-ERP",
    title_ar: "الاستجابة لانقطاع الكهرباء",
    title_en: "Power Failure Response",
    summary_ar: "الإجراء عند انقطاع التيار الرئيسي.",
    summary_en: "Procedure on main power outage.",
    procedure_ar:
      "1) التحقق من تشغيل المولدات.\n2) فحص جاهزية UPS لـ CCTV ونقاط الدخول.\n3) دوريات يدوية إضافية.\n4) إخطار شركة الكهرباء.",
    procedure_en:
      "1) Verify generator startup. 2) UPS readiness for CCTV and access points. 3) Add manual patrols. 4) Notify electricity company.",
    risk_level: "high",
    priority: "urgent",
    related_agents: ["crisis_commander"],
    keywords_ar: ["كهرباء", "انقطاع", "مولد", "UPS"],
    keywords_en: ["power", "outage", "generator", "UPS"],
    version: "1.0",
  },
  {
    doc_code: SOP(15),
    category_code: "IS-ERP",
    title_ar: "فقدان اتصالات الموقع",
    title_en: "Site Communication Failure",
    summary_ar: "الإجراء عند فقدان الراديو أو الشبكة.",
    summary_en: "Procedure on radio or network loss.",
    procedure_ar:
      "1) التحول إلى القناة الاحتياطية.\n2) إرسال رسل بين النقاط الحرجة.\n3) تفعيل أرقام الهاتف البديلة.\n4) إبلاغ المسؤول التقني.",
    procedure_en:
      "1) Switch to backup channel. 2) Send runners between critical points. 3) Activate backup phones. 4) Notify IT.",
    risk_level: "high",
    priority: "urgent",
    related_agents: ["crisis_commander"],
    keywords_ar: ["اتصالات", "راديو", "شبكة", "بديل"],
    keywords_en: ["communications", "radio", "network", "backup"],
    version: "1.0",
  },

  // ============ SOP — INCIDENTS (IS-INC, IS-INV) ============
  {
    doc_code: SOP(16),
    category_code: "IS-INC",
    title_ar: "الإبلاغ عن جسم مشبوه",
    title_en: "Suspicious Object Reporting",
    summary_ar: "الإجراء عند رصد جسم مشبوه.",
    summary_en: "Procedure on suspicious object detection.",
    procedure_ar:
      "1) لا تلمس.\n2) إخلاء 100م.\n3) إبلاغ غرفة العمليات.\n4) إخطار الجهات المختصة (911/998).\n5) توثيق بالصور من بُعد.",
    procedure_en:
      "1) Do not touch. 2) Evacuate 100m. 3) Notify control room. 4) Notify authorities (911/998). 5) Document with photos from distance.",
    risk_level: "critical",
    priority: "immediate",
    related_agents: ["incident_commander", "crisis_commander"],
    keywords_ar: ["جسم مشبوه", "تهديد", "إخلاء", "911", "998"],
    keywords_en: ["suspicious object", "threat", "evacuate", "911", "998"],
    version: "1.0",
  },
  {
    doc_code: SOP(17),
    category_code: "IS-INC",
    title_ar: "الاستجابة للاقتحام",
    title_en: "Intrusion Response",
    summary_ar: "الإجراء عند اكتشاف اقتحام للمنشأة.",
    summary_en: "Procedure on facility intrusion detection.",
    procedure_ar:
      "1) إصدار إنذار اقتحام.\n2) إرسال أقرب دورية.\n3) إغلاق البوابات الذكية.\n4) متابعة عبر CCTV.\n5) إبلاغ الشرطة 911.",
    procedure_en:
      "1) Issue intrusion alarm. 2) Dispatch nearest patrol. 3) Lock smart gates. 4) Track via CCTV. 5) Notify Police 911.",
    risk_level: "critical",
    priority: "immediate",
    related_agents: ["incident_commander", "cctv_intelligence"],
    keywords_ar: ["اقتحام", "تسلل", "إنذار", "911"],
    keywords_en: ["intrusion", "breach", "alarm", "911"],
    version: "1.0",
  },
  {
    doc_code: SOP(18),
    category_code: "IS-INC",
    title_ar: "الإبلاغ عن الحادثة الأمنية",
    title_en: "Security Incident Reporting",
    summary_ar: "تسجيل الحادثة في النظام وفق الـ workflow الموحد.",
    summary_en: "Log incident in system per unified workflow.",
    procedure_ar:
      "1) فتح سجل في `sec_incidents`.\n2) تحديد الخطورة (low/medium/high/critical).\n3) تعيين مسؤول.\n4) ملف الأدلة.\n5) متابعة حتى الإغلاق.",
    procedure_en:
      "1) Open `sec_incidents` record. 2) Set severity. 3) Assign owner. 4) Evidence file. 5) Track to closure.",
    risk_level: "high",
    priority: "elevated",
    related_workflows: ["Incident Response"],
    related_agents: ["incident_commander"],
    keywords_ar: ["حادثة", "تسجيل", "تصنيف", "خطورة"],
    keywords_en: ["incident", "logging", "classification", "severity"],
    version: "1.0",
  },
];
