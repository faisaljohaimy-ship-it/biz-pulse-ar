// Executive Demo — Timeline
// -----------------------------------------------------------------------------
// Phase 4.1 · Executive Demo Mode Foundation
//
// The timeline is a TYPED, DETERMINISTIC description of the same Executive Day
// scenario already produced server-side by `runExecutiveScenario`
// (src/lib/simulation/exec-scenario.server.ts). It is NOT a second source of
// truth for data — it is a projection of that scenario into presentation steps
// so the Demo Controller can drive UI focus, camera targets, and ARIA
// narration in sync with the real records the scenario inserts.
//
// No fake KPIs. Every step references entities the scenario actually creates
// (ref codes, sites, modules). Ready to be re-used by Phase 4.2 (camera/routing).

export type DemoModule =
  | "os"
  | "operations"
  | "incidents"
  | "risks"
  | "inspections"
  | "work-orders"
  | "meetings"
  | "executive-reports"
  | "aria";

export type DemoUiAction =
  | { kind: "navigate"; to: string }
  | { kind: "focus"; selector: string }
  | { kind: "highlight"; module: DemoModule }
  | { kind: "aria-speak"; ref?: string }
  | { kind: "none" };

export interface DemoStep {
  /** Stable id — safe for keys, telemetry, and deep-links. */
  id: string;
  /** Riyadh local wall-clock (HH:MM) — matches exec-scenario.server.ts. */
  timestamp: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  /** Modules whose dashboards this step is expected to affect. */
  affectedModules: DemoModule[];
  /** One-line executive framing shown in the HUD. */
  executiveMessage_en: string;
  executiveMessage_ar: string;
  /** Optional camera / focus hint for Phase 4.2. Free-form until then. */
  cameraTarget?: string;
  /** UI action the controller will emit. Renderers may listen and react. */
  uiAction: DemoUiAction;
  /** ARIA narration script (spoken via existing TTS pipeline downstream). */
  ariaNarration_en: string;
  ariaNarration_ar: string;
  /** Optional back-reference to a scenario ref (INS-, RSK-, INC-, ...). */
  scenarioRef?: string;
}

/**
 * Executive Day timeline — 06:00 → 18:00 Riyadh.
 * Mirrors the narrative in `runExecutiveScenario` exactly.
 * Keep in sync when the scenario narrative changes.
 */
export const EXECUTIVE_DAY_TIMELINE: readonly DemoStep[] = [
  {
    id: "step-00-intro",
    timestamp: "06:00",
    title_en: "Shift Start — JED-P1",
    title_ar: "بداية الوردية — جدة P1",
    description_en: "Day shift opens at Jeddah Industrial Site. Baseline KPIs green.",
    description_ar: "افتتاح الوردية النهارية في موقع جدة الصناعي. المؤشرات الأساسية خضراء.",
    affectedModules: ["os", "operations"],
    executiveMessage_en: "The operating day begins.",
    executiveMessage_ar: "يبدأ اليوم التشغيلي.",
    cameraTarget: "os.grid",
    uiAction: { kind: "navigate", to: "/os" },
    ariaNarration_en: "Good morning. Shift open at Jeddah Industrial Site. All systems nominal.",
    ariaNarration_ar: "صباح الخير. بدأت الوردية في موقع جدة الصناعي، وجميع الأنظمة تعمل بشكل طبيعي.",
  },
  {
    id: "step-01-patrol",
    timestamp: "06:15",
    title_en: "Patrol Alpha detects hot-work violation",
    title_ar: "دورية ألفا ترصد مخالفة أعمال ساخنة",
    description_en: "Perimeter patrol reaches Tank Farm A and reports unpermitted hot-work.",
    description_ar: "تصل دورية المحيط إلى حوض التخزين أ وتُبلغ عن أعمال ساخنة بدون تصريح.",
    affectedModules: ["operations", "incidents"],
    executiveMessage_en: "First deviation of the day — caught by patrol, not by an incident.",
    executiveMessage_ar: "أول انحراف في اليوم — رصدته الدورية قبل وقوع الحادث.",
    cameraTarget: "site.jed-p1.tank-farm-a",
    uiAction: { kind: "highlight", module: "operations" },
    ariaNarration_en: "Patrol Alpha reports hot-work without a permit near Tank Farm A. Flagging for inspection.",
    ariaNarration_ar: "دورية ألفا تُبلّغ عن أعمال ساخنة بدون تصريح قرب حوض التخزين أ. سأرفعها للتفتيش.",
  },
  {
    id: "step-02-near-miss",
    timestamp: "06:30",
    title_en: "Near-miss filed",
    title_ar: "تسجيل حالة وشك حدوث",
    description_en: "Near-miss NM-01 filed by the patrol officer — potential severity: high.",
    description_ar: "تم تسجيل حالة وشك NM-01 من ضابط الدورية — الشدة المحتملة: مرتفعة.",
    affectedModules: ["incidents", "risks"],
    executiveMessage_en: "A near-miss now — or a real fire later.",
    executiveMessage_ar: "حالة وشك الآن — أو حريق حقيقي لاحقًا.",
    scenarioRef: "NM-*-01",
    uiAction: { kind: "highlight", module: "incidents" },
    ariaNarration_en: "Near-miss recorded with high potential severity. Escalation path opened.",
    ariaNarration_ar: "تم تسجيل حالة وشك حدوث بشدة محتملة مرتفعة، وفُتح مسار التصعيد.",
  },
  {
    id: "step-03-inspection",
    timestamp: "07:40",
    title_en: "Hot-work audit — score 62 / 100",
    title_ar: "تدقيق الأعمال الساخنة — النتيجة 62 / 100",
    description_en: "Inspector completes a hot-work audit with 4 findings: missing PTW, no fire watch, expired extinguisher, no gas test.",
    description_ar: "أكمل المفتش تدقيق الأعمال الساخنة بأربع ملاحظات: غياب التصريح، عدم وجود مراقب حريق، طفاية منتهية، عدم إجراء اختبار الغاز.",
    affectedModules: ["inspections", "risks"],
    executiveMessage_en: "The audit confirms a procedure gap, not a one-off error.",
    executiveMessage_ar: "التدقيق يؤكد وجود فجوة إجرائية وليس خطأ فرديًا.",
    scenarioRef: "INS-*-01",
    uiAction: { kind: "highlight", module: "inspections" },
    ariaNarration_en: "Inspection complete. Four findings, all traceable to a single SOP gap.",
    ariaNarration_ar: "اكتمل التفتيش. أربع ملاحظات، جميعها ترجع إلى فجوة واحدة في الإجراء.",
  },
  {
    id: "step-04-risk",
    timestamp: "07:45",
    title_en: "Risk elevated to Critical (score 20)",
    title_ar: "رفع الخطر إلى حرج (النتيجة 20)",
    description_en: "Fire risk profile at Tank Farm A reaches likelihood 4 × impact 5 = 20.",
    description_ar: "بروفايل خطر الحريق في حوض التخزين أ يصل إلى احتمالية 4 × أثر 5 = 20.",
    affectedModules: ["risks", "executive-reports"],
    executiveMessage_en: "Predictive signal fires — we expect an incident within the shift.",
    executiveMessage_ar: "الإشارة التنبؤية تُطلق — نتوقع حادثًا خلال الوردية.",
    scenarioRef: "RSK-*-01",
    uiAction: { kind: "highlight", module: "risks" },
    ariaNarration_en: "Risk elevated to critical. I recommend suspending hot-work permits immediately.",
    ariaNarration_ar: "تم رفع الخطر إلى حرج. أوصي بتعليق تصاريح الأعمال الساخنة فورًا.",
  },
  {
    id: "step-05-car",
    timestamp: "08:00",
    title_en: "Corrective Action assigned to HSE Manager",
    title_ar: "تعيين إجراء تصحيحي على مدير السلامة",
    description_en: "CAR-01 issued: suspend hot-work, retrain permit issuers, replace expired extinguishers, re-audit in 14 days.",
    description_ar: "صدر الإجراء CAR-01: تعليق الأعمال الساخنة، إعادة تدريب مصدري التصاريح، استبدال الطفايات المنتهية، إعادة التدقيق خلال 14 يومًا.",
    affectedModules: ["work-orders", "executive-reports"],
    executiveMessage_en: "Ownership placed. Clock started.",
    executiveMessage_ar: "تم تحديد المسؤولية وبدأت الساعة.",
    scenarioRef: "CAR-*-01",
    uiAction: { kind: "highlight", module: "work-orders" },
    ariaNarration_en: "Corrective action assigned with an end-of-day due time. I will track compliance.",
    ariaNarration_ar: "تم تعيين الإجراء التصحيحي بموعد نهاية اليوم. سأتتبع الالتزام.",
  },
  {
    id: "step-06-incident",
    timestamp: "08:10",
    title_en: "Fire incident — contained in 6 minutes",
    title_ar: "حادث حريق — احتواؤه خلال 6 دقائق",
    description_en: "Contained fire at Tank Farm A. The morning risk elevation predicted this event.",
    description_ar: "حريق محدود في حوض التخزين أ. توقّع رفع الخطر الصباحي هذا الحدث.",
    affectedModules: ["incidents", "operations"],
    executiveMessage_en: "The prediction becomes evidence — response time defined the outcome.",
    executiveMessage_ar: "أصبح التنبؤ دليلًا — وقت الاستجابة هو ما حدّد النتيجة.",
    scenarioRef: "INC-*-01",
    uiAction: { kind: "highlight", module: "incidents" },
    ariaNarration_en: "Fire contained in six minutes. No injuries. Root cause matches the morning audit.",
    ariaNarration_ar: "تم احتواء الحريق خلال ست دقائق. لا إصابات. السبب الجذري مطابق لتدقيق الصباح.",
  },
  {
    id: "step-07-work-order",
    timestamp: "08:15",
    title_en: "Work Order opened — extinguisher replacement",
    title_ar: "فتح أمر عمل — استبدال الطفايات",
    description_en: "WO-01 links back to the incident, risk and inspection chain.",
    description_ar: "أمر العمل WO-01 مرتبط بسلسلة الحادث والخطر والتفتيش.",
    affectedModules: ["work-orders"],
    executiveMessage_en: "Every record now references every other. No orphan data.",
    executiveMessage_ar: "كل سجل مرتبط بالآخر. لا توجد بيانات معزولة.",
    scenarioRef: "WO-*-01",
    uiAction: { kind: "highlight", module: "work-orders" },
    ariaNarration_en: "Work order opened and linked into the full evidence chain.",
    ariaNarration_ar: "تم فتح أمر العمل وربطه بسلسلة الأدلة الكاملة.",
  },
  {
    id: "step-08-policy",
    timestamp: "09:30",
    title_en: "SOP-012 revision assigned to Ops Director",
    title_ar: "تعديل الإجراء SOP-012 يُسند إلى مدير العمليات",
    description_en: "CAR-02 requires dual sign-off and gas-test photo evidence before any hot-work ignition.",
    description_ar: "يتطلب الإجراء CAR-02 توقيعًا مزدوجًا ودليل صورة لاختبار الغاز قبل أي إشعال أعمال ساخنة.",
    affectedModules: ["executive-reports"],
    executiveMessage_en: "Root cause fixed at the policy layer, not just the site.",
    executiveMessage_ar: "معالجة السبب الجذري على مستوى السياسة، لا الموقع فقط.",
    scenarioRef: "CAR-*-02",
    uiAction: { kind: "highlight", module: "executive-reports" },
    ariaNarration_en: "Policy fix drafted. Publishing tomorrow noon.",
    ariaNarration_ar: "تمت صياغة تعديل السياسة، وسيُنشر غدًا ظهرًا.",
  },
  {
    id: "step-09-meeting",
    timestamp: "14:00",
    title_en: "Executive Incident Review",
    title_ar: "المراجعة التنفيذية للحادث",
    description_en: "One-hour executive review with Ops Director, HSE Manager, Inspector, Shift Supervisor.",
    description_ar: "مراجعة تنفيذية لمدة ساعة مع مدير العمليات ومدير السلامة والمفتش ومشرف الوردية.",
    affectedModules: ["meetings", "executive-reports"],
    executiveMessage_en: "Three decisions recorded and traceable to sources.",
    executiveMessage_ar: "ثلاثة قرارات مسجّلة وقابلة للتتبع حتى المصادر.",
    scenarioRef: "MTG-*-01",
    uiAction: { kind: "highlight", module: "meetings" },
    ariaNarration_en: "Executive review closed with three ratified decisions and clear owners.",
    ariaNarration_ar: "أُغلقت المراجعة التنفيذية بثلاثة قرارات معتمدة ومسؤوليات واضحة.",
  },
  {
    id: "step-10-close",
    timestamp: "18:00",
    title_en: "Day close — briefing generated",
    title_ar: "إغلاق اليوم — إصدار التقرير التنفيذي",
    description_en: "Compliance closed at 74% (baseline 92%). Response time strong at 6 minutes. ARIA briefing generated at confidence 0.92.",
    description_ar: "أُغلق الالتزام عند 74% (المستوى المرجعي 92%). زمن الاستجابة قوي عند 6 دقائق. تم إنشاء تقرير أريا بثقة 0.92.",
    affectedModules: ["executive-reports", "aria"],
    executiveMessage_en: "A prevented catastrophe — with a full evidence chain and a policy fix in flight.",
    executiveMessage_ar: "كارثة تم منعها — مع سلسلة أدلة كاملة وتعديل سياسة قيد التنفيذ.",
    cameraTarget: "reports.executive-briefing",
    uiAction: { kind: "navigate", to: "/_authenticated/executive-reports" },
    ariaNarration_en:
      "Day closed. Compliance dropped to 74 percent from findings, but response time stayed at six minutes. I have generated the executive briefing.",
    ariaNarration_ar:
      "أُغلق اليوم. انخفض الالتزام إلى 74 بالمئة بسبب الملاحظات، لكن زمن الاستجابة بقي عند ست دقائق. لقد أعددت التقرير التنفيذي.",
  },
] as const;

export type ExecutiveDayTimeline = typeof EXECUTIVE_DAY_TIMELINE;
export const EXECUTIVE_DAY_STEP_COUNT = EXECUTIVE_DAY_TIMELINE.length;
