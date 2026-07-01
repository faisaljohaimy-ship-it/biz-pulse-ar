// Realistic pools used by the generators. Bilingual AR/EN.
export const DEPARTMENTS = [
  { code: "SEC", ar: "الأمن الصناعي", en: "Industrial Security" },
  { code: "HSE", ar: "الصحة والسلامة والبيئة", en: "HSE" },
  { code: "OPS", ar: "العمليات", en: "Operations" },
  { code: "MNT", ar: "الصيانة", en: "Maintenance" },
  { code: "LOG", ar: "الخدمات اللوجستية", en: "Logistics" },
  { code: "FIN", ar: "المالية", en: "Finance" },
  { code: "HR", ar: "الموارد البشرية", en: "Human Resources" },
  { code: "IT", ar: "تقنية المعلومات", en: "IT" },
  { code: "PRC", ar: "المشتريات", en: "Procurement" },
  { code: "LEG", ar: "الشؤون القانونية", en: "Legal" },
  { code: "TRN", ar: "التدريب", en: "Training" },
  { code: "EMR", ar: "الطوارئ", en: "Emergency Response" },
] as const;

export const FIRST_AR = [
  "محمد","أحمد","عبدالله","خالد","سلطان","فيصل","بندر","سعود","ياسر","ماجد",
  "نواف","تركي","عمر","علي","حسن","إبراهيم","يوسف","زياد","ريان","سامي",
  "نورة","سارة","هند","لمى","دانة","منيرة","ريم","شهد","لطيفة","أروى",
];
export const LAST_AR = [
  "القحطاني","الشمري","العتيبي","الحربي","المطيري","الدوسري","الغامدي","العنزي","الزهراني","السبيعي",
  "الشهري","الرشيدي","المالكي","العمري","الجهني","السلمي","الحازمي","النفيعي","الفهد","السليمان",
];
export const FIRST_EN = [
  "Mohammed","Ahmed","Abdullah","Khalid","Sultan","Faisal","Bandar","Saud","Yasser","Majed",
  "Nawaf","Turki","Omar","Ali","Hassan","Ibrahim","Yousef","Ziyad","Rayan","Sami",
  "Noura","Sarah","Hind","Lama","Dana","Munira","Reem","Shahad","Latifah","Arwa",
];
export const LAST_EN = [
  "Al-Qahtani","Al-Shammari","Al-Otaibi","Al-Harbi","Al-Mutairi","Al-Dossari","Al-Ghamdi","Al-Anzi","Al-Zahrani","Al-Subai'i",
  "Al-Shehri","Al-Rashidi","Al-Maliki","Al-Amri","Al-Juhani","Al-Sulami","Al-Hazmi","Al-Nufa'i","Al-Fahd","Al-Sulaiman",
];

export const ROLES = [
  { ar: "ضابط أمن", en: "Security Officer" },
  { ar: "مشرف نوبة", en: "Shift Supervisor" },
  { ar: "مدير موقع", en: "Site Manager" },
  { ar: "مفتش سلامة", en: "Safety Inspector" },
  { ar: "فني صيانة", en: "Maintenance Technician" },
  { ar: "أخصائي عمليات", en: "Operations Specialist" },
  { ar: "منسق طوارئ", en: "Emergency Coordinator" },
  { ar: "محلل مخاطر", en: "Risk Analyst" },
] as const;

export const GRADES = ["G4", "G5", "G6", "G7", "G8", "G9", "G10", "G11"] as const;

export const INCIDENT_TYPES = [
  { ar: "حريق بسيط", en: "Minor Fire", sev: "high" },
  { ar: "تسرب مادة كيميائية", en: "Chemical Spill", sev: "high" },
  { ar: "دخول غير مصرح", en: "Unauthorized Entry", sev: "medium" },
  { ar: "إصابة عمل", en: "Workplace Injury", sev: "high" },
  { ar: "عطل معدات حرجة", en: "Critical Equipment Failure", sev: "medium" },
  { ar: "انقطاع كهرباء", en: "Power Outage", sev: "medium" },
  { ar: "إنذار كاذب", en: "False Alarm", sev: "low" },
  { ar: "تجاوز سرعة داخل الموقع", en: "In-site Speeding", sev: "low" },
] as const;

export const NEAR_MISS_TITLES = [
  { ar: "سقوط أداة من ارتفاع", en: "Tool dropped from height" },
  { ar: "انزلاق بسبب أرضية مبتلة", en: "Slip on wet floor" },
  { ar: "شرارة قرب مواد قابلة للاشتعال", en: "Spark near flammables" },
  { ar: "تجاوز حاجز أمان", en: "Safety barrier bypass" },
  { ar: "استخدام أدوات بدون تصريح", en: "Tools used without permit" },
] as const;

export const INSPECTION_KINDS = ["fire_safety", "electrical", "ppe", "housekeeping", "access_control", "environmental"] as const;

export const RISK_CATEGORIES = ["operational", "safety", "security", "environmental", "compliance", "reputational"] as const;

export const MEETING_KINDS = ["operational", "safety_stand_down", "management_review", "training", "incident_review"] as const;

export const NOTIFICATION_TOPICS = ["incident.new", "permit.expiring", "inspection.due", "risk.escalated", "meeting.reminder", "task.assigned"] as const;

export const BUS_ROUTES = ["R-JED-01", "R-JED-02", "R-MEC-01", "R-MEC-02", "R-YNB-01", "R-YNB-02"] as const;
