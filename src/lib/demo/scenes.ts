// Executive Storytelling — Scene metadata per DemoStep
// -----------------------------------------------------------------------------
// Phase 5 · Executive Presentation Engine
//
// Pure derivation of narrative "scenes" from the existing EXECUTIVE_DAY_TIMELINE.
// No new data source, no fetch — every field is a projection of what the
// scenario (runExecutiveScenario) already produced and what the timeline step
// already narrates. Consumed by the Story Overlay + Decision cards.

import { EXECUTIVE_DAY_TIMELINE, type DemoStep } from "./timeline";

export interface DemoDecisionOption {
  id: "approve" | "reject" | "investigate" | "assign" | "open_report";
  label_en: string;
  label_ar: string;
}

export interface DemoScene {
  stepId: string;
  title_en: string;
  title_ar: string;
  executiveMessage_en: string;
  executiveMessage_ar: string;
  evidence_en: string;
  evidence_ar: string;
  reasoning_en: string;
  reasoning_ar: string;
  decision_en: string;
  decision_ar: string;
  businessImpact_en: string;
  businessImpact_ar: string;
  nextAction_en: string;
  nextAction_ar: string;
  confidence: number; // 0..1
  /** ARIA alert overlay to render when this scene enters. */
  alert?: {
    severity: "low" | "medium" | "high" | "critical";
    location_en: string;
    location_ar: string;
    impact_en: string;
    impact_ar: string;
    recommended_en: string;
    recommended_ar: string;
    etaMinutes: number;
  };
  decisions?: DemoDecisionOption[];
}

const DEFAULT_DECISIONS: DemoDecisionOption[] = [
  { id: "approve", label_en: "Approve", label_ar: "اعتماد" },
  { id: "reject", label_en: "Reject", label_ar: "رفض" },
  { id: "investigate", label_en: "Investigate", label_ar: "تحقيق" },
  { id: "assign", label_en: "Assign", label_ar: "إسناد" },
  { id: "open_report", label_en: "Open Report", label_ar: "فتح التقرير" },
];

const SCENES_BY_ID: Record<
  string,
  Omit<
    DemoScene,
    "stepId" | "title_en" | "title_ar" | "executiveMessage_en" | "executiveMessage_ar"
  >
> = {
  "step-00-intro": {
    evidence_en: "Roster locked · perimeter clean · KPIs green on baseline (compliance 92%).",
    evidence_ar: "اكتمل الفريق · محيط سليم · المؤشرات خضراء على المستوى المرجعي (الالتزام 92%).",
    reasoning_en: "Baseline established for the shift. Nothing anomalous in the last 6 hours.",
    reasoning_ar: "تم اعتماد المستوى المرجعي للوردية. لا يوجد أي انحراف خلال آخر ست ساعات.",
    decision_en: "Continue standard operating rhythm.",
    decision_ar: "الاستمرار على الإيقاع التشغيلي القياسي.",
    businessImpact_en: "Zero lost time — full production capacity available.",
    businessImpact_ar: "لا وقت مهدور — الطاقة الإنتاجية كاملة متاحة.",
    nextAction_en: "Monitor perimeter patrols and PTW queue.",
    nextAction_ar: "متابعة دوريات المحيط وقائمة تصاريح العمل.",
    confidence: 0.98,
  },
  "step-01-patrol": {
    evidence_en: "Patrol Alpha reports hot-work near Tank Farm A without an open PTW record.",
    evidence_ar: "دورية ألفا تُبلّغ عن أعمال ساخنة قرب حوض التخزين أ بدون تصريح عمل مفتوح.",
    reasoning_en: "PTW registry shows no active permit for that location — deviation confirmed.",
    reasoning_ar: "سجل التصاريح خالٍ من أي تصريح ساري لهذا الموقع — تأكّد الانحراف.",
    decision_en: "Elevate to near-miss and dispatch inspector.",
    decision_ar: "تصعيدها إلى حالة وشك وإرسال المفتش.",
    businessImpact_en: "Contains a Tier-1 fire risk before ignition window opens.",
    businessImpact_ar: "احتواء خطر حريق من المستوى الأول قبل نافذة الاشتعال.",
    nextAction_en: "Open near-miss · notify HSE Manager.",
    nextAction_ar: "فتح حالة وشك · إبلاغ مدير السلامة.",
    confidence: 0.94,
    decisions: DEFAULT_DECISIONS,
  },
  "step-02-near-miss": {
    evidence_en: "Near-miss NM-01 filed · potential severity: high · linked to Tank Farm A.",
    evidence_ar: "تسجيل حالة وشك NM-01 · شدة محتملة: مرتفعة · مرتبطة بحوض التخزين أ.",
    reasoning_en: "Same location as morning patrol finding — pattern, not one-off.",
    reasoning_ar: "نفس موقع ملاحظة الدورية الصباحية — نمط وليس حالة فردية.",
    decision_en: "Open escalation path · trigger hot-work audit.",
    decision_ar: "فتح مسار التصعيد · بدء تدقيق الأعمال الساخنة.",
    businessImpact_en: "Prevents recurrence · protects continuity of tank farm operations.",
    businessImpact_ar: "يمنع تكرار الحدث · يحمي استمرارية تشغيل حوض التخزين.",
    nextAction_en: "Dispatch inspector to complete SOP-012 audit.",
    nextAction_ar: "إرسال المفتش لإكمال تدقيق الإجراء SOP-012.",
    confidence: 0.92,
    decisions: DEFAULT_DECISIONS,
  },
  "step-03-inspection": {
    evidence_en:
      "Audit INS-01 = 62/100 · 4 findings: missing PTW · no fire watch · expired extinguisher · no gas test.",
    evidence_ar:
      "التدقيق INS-01 = 62/100 · أربع ملاحظات: غياب التصريح · لا مراقب حريق · طفاية منتهية · لا اختبار غاز.",
    reasoning_en: "Four independent gaps trace back to one SOP gap — systemic, not human.",
    reasoning_ar: "أربع فجوات مستقلة ترجع لفجوة واحدة في الإجراء — منظومي وليس بشرياً.",
    decision_en: "Escalate risk profile · draft corrective action.",
    decision_ar: "رفع بروفايل الخطر · صياغة الإجراء التصحيحي.",
    businessImpact_en: "Turns 4 tactical findings into 1 policy fix — cost avoidance ~SAR 480k.",
    businessImpact_ar:
      "تحويل أربع ملاحظات تكتيكية إلى تعديل سياسة واحد — تجنّب تكلفة ~480 ألف ريال.",
    nextAction_en: "Elevate risk RSK-01 to critical.",
    nextAction_ar: "رفع الخطر RSK-01 إلى حرج.",
    confidence: 0.9,
    decisions: DEFAULT_DECISIONS,
  },
  "step-04-risk": {
    evidence_en: "Risk RSK-01 · likelihood 4 × impact 5 = 20 · critical band.",
    evidence_ar: "الخطر RSK-01 · احتمالية 4 × أثر 5 = 20 · النطاق الحرج.",
    reasoning_en: "Predictive signal crosses threshold — incident probability within shift > 60%.",
    reasoning_ar: "الإشارة التنبؤية تعبر العتبة — احتمال حدوث حادث خلال الوردية > 60%.",
    decision_en: "Recommend immediate suspension of hot-work permits.",
    decision_ar: "التوصية بتعليق فوري لتصاريح الأعمال الساخنة.",
    businessImpact_en: "Blocks ~3 planned jobs today · protects potential SAR 2.1M asset loss.",
    businessImpact_ar: "تعليق ثلاث مهام مخططة اليوم · حماية أصل بقيمة محتملة ~2.1 مليون ريال.",
    nextAction_en: "Issue CAR-01 to HSE Manager.",
    nextAction_ar: "إصدار الإجراء التصحيحي CAR-01 لمدير السلامة.",
    confidence: 0.88,
    alert: {
      severity: "critical",
      location_en: "Tank Farm A · JED-P1",
      location_ar: "حوض التخزين أ · جدة P1",
      impact_en: "Potential Tier-1 fire · SAR 2.1M asset exposure",
      impact_ar: "حريق محتمل من المستوى الأول · انكشاف أصول بقيمة 2.1 مليون ريال",
      recommended_en: "Suspend hot-work permits · dispatch fire watch",
      recommended_ar: "تعليق تصاريح الأعمال الساخنة · إرسال مراقب حريق",
      etaMinutes: 15,
    },
    decisions: DEFAULT_DECISIONS,
  },
  "step-05-car": {
    evidence_en: "CAR-01 issued to HSE Manager · 4 sub-actions · due end of day.",
    evidence_ar: "صدر CAR-01 لمدير السلامة · أربع إجراءات فرعية · الاستحقاق نهاية اليوم.",
    reasoning_en: "Ownership + deadline transforms recommendation into an enforceable commitment.",
    reasoning_ar: "المسؤولية + الموعد النهائي تحوّل التوصية إلى التزام قابل للتنفيذ.",
    decision_en: "Track compliance every 2 hours until closure.",
    decision_ar: "تتبع الالتزام كل ساعتين حتى الإغلاق.",
    businessImpact_en: "Guarantees policy change is executed, not just approved.",
    businessImpact_ar: "يضمن تنفيذ تغيير السياسة، وليس مجرد اعتمادها.",
    nextAction_en: "Prepare re-audit checklist for +14d.",
    nextAction_ar: "إعداد قائمة إعادة التدقيق بعد 14 يوماً.",
    confidence: 0.93,
    decisions: DEFAULT_DECISIONS,
  },
  "step-06-incident": {
    evidence_en: "Incident INC-01 · contained fire · 6 min response · 0 injuries · Tank Farm A.",
    evidence_ar: "الحادث INC-01 · حريق محتوى · استجابة 6 دقائق · 0 إصابات · حوض التخزين أ.",
    reasoning_en: "Morning risk elevation was correct — response time defined outcome.",
    reasoning_ar: "كان رفع الخطر الصباحي صائباً — زمن الاستجابة هو ما حدد النتيجة.",
    decision_en: "Convert learning into permanent SOP revision.",
    decision_ar: "تحويل الدروس إلى تعديل دائم للإجراء.",
    businessImpact_en: "Prevented catastrophic loss · confirms predictive engine value.",
    businessImpact_ar: "منع خسارة كارثية · يؤكد قيمة المحرك التنبؤي.",
    nextAction_en: "Open WO-01 · schedule SOP-012 revision.",
    nextAction_ar: "فتح أمر العمل WO-01 · جدولة تعديل SOP-012.",
    confidence: 0.96,
    alert: {
      severity: "high",
      location_en: "Tank Farm A · JED-P1",
      location_ar: "حوض التخزين أ · جدة P1",
      impact_en: "Contained fire · 0 injuries · asset intact",
      impact_ar: "حريق محتوى · 0 إصابات · الأصل سليم",
      recommended_en: "Root-cause review · lock area for 24h",
      recommended_ar: "مراجعة السبب الجذري · إغلاق المنطقة 24 ساعة",
      etaMinutes: 6,
    },
    decisions: DEFAULT_DECISIONS,
  },
  "step-07-work-order": {
    evidence_en: "WO-01 opened · linked to INC-01 · RSK-01 · INS-01 · CAR-01.",
    evidence_ar: "فتح أمر العمل WO-01 · مرتبط بـ INC-01 · RSK-01 · INS-01 · CAR-01.",
    reasoning_en: "Full evidence chain — every record traces back to its source.",
    reasoning_ar: "سلسلة أدلة كاملة — كل سجل يعود إلى مصدره.",
    decision_en: "Prioritize as P1 · execute today.",
    decision_ar: "تحديد الأولوية P1 · التنفيذ اليوم.",
    businessImpact_en: "Restores operational readiness of Tank Farm A within 24h.",
    businessImpact_ar: "استعادة الجاهزية التشغيلية لحوض التخزين أ خلال 24 ساعة.",
    nextAction_en: "Assign maintenance team · attach evidence.",
    nextAction_ar: "إسناد فريق الصيانة · إرفاق الأدلة.",
    confidence: 0.95,
    decisions: DEFAULT_DECISIONS,
  },
  "step-08-policy": {
    evidence_en: "SOP-012 draft: dual sign-off + gas-test photo before hot-work ignition.",
    evidence_ar: "مسودة SOP-012: توقيع مزدوج + صورة اختبار غاز قبل إشعال الأعمال الساخنة.",
    reasoning_en: "Fixes root cause at policy layer — reproducible across all sites.",
    reasoning_ar: "معالجة السبب الجذري على مستوى السياسة — قابلة للتكرار في كل المواقع.",
    decision_en: "Publish tomorrow noon · train issuers this week.",
    decision_ar: "النشر ظهر الغد · تدريب مصدّري التصاريح هذا الأسبوع.",
    businessImpact_en: "Compliance uplift +8pt within 30 days across all Western Region sites.",
    businessImpact_ar: "رفع الالتزام +8 نقاط خلال 30 يوماً في كل مواقع المنطقة الغربية.",
    nextAction_en: "Ops Director sign-off required.",
    nextAction_ar: "يتطلّب توقيع مدير العمليات.",
    confidence: 0.9,
    decisions: DEFAULT_DECISIONS,
  },
  "step-09-meeting": {
    evidence_en: "MTG-01 · 3 decisions ratified · 4 attendees · 1h duration · minutes linked.",
    evidence_ar: "MTG-01 · اعتماد 3 قرارات · 4 حضور · مدة ساعة · محضر مرتبط.",
    reasoning_en: "Every decision links back to its source record — zero orphan governance.",
    reasoning_ar: "كل قرار مرتبط بسجله المصدري — لا حوكمة معزولة.",
    decision_en: "Close incident review · assign owners.",
    decision_ar: "إغلاق مراجعة الحادث · تعيين المسؤولين.",
    businessImpact_en: "Institutionalizes the learning cycle in under 6 hours.",
    businessImpact_ar: "تأسيس دورة التعلم مؤسسياً في أقل من 6 ساعات.",
    nextAction_en: "Generate executive briefing at 18:00.",
    nextAction_ar: "إصدار التقرير التنفيذي عند الساعة 18:00.",
    confidence: 0.94,
    decisions: DEFAULT_DECISIONS,
  },
  "step-10-close": {
    evidence_en:
      "Compliance 74% · response 6 min · 1 incident contained · 1 policy in flight · confidence 0.92.",
    evidence_ar:
      "الالتزام 74% · الاستجابة 6 دقائق · حادث واحد محتوى · سياسة قيد التنفيذ · الثقة 0.92.",
    reasoning_en: "Compliance dip is the *evidence of work done*, not a regression.",
    reasoning_ar: "انخفاض الالتزام هو *دليل على العمل المنجز*، وليس تراجعاً.",
    decision_en: "Approve briefing · distribute to executive board.",
    decision_ar: "اعتماد التقرير · توزيعه على المجلس التنفيذي.",
    businessImpact_en: "Full audit-ready evidence chain for a prevented catastrophe.",
    businessImpact_ar: "سلسلة أدلة كاملة جاهزة للتدقيق لكارثة تم منعها.",
    nextAction_en: "Publish SOP-012 revision · re-audit in 14d.",
    nextAction_ar: "نشر تعديل SOP-012 · إعادة التدقيق بعد 14 يوماً.",
    confidence: 0.92,
    decisions: DEFAULT_DECISIONS,
  },
};

export function sceneForStep(step: DemoStep | null): DemoScene | null {
  if (!step) return null;
  const extra = SCENES_BY_ID[step.id];
  if (!extra) return null;
  return {
    stepId: step.id,
    title_en: step.title_en,
    title_ar: step.title_ar,
    executiveMessage_en: step.executiveMessage_en,
    executiveMessage_ar: step.executiveMessage_ar,
    ...extra,
  };
}

export const ALL_SCENES: DemoScene[] = EXECUTIVE_DAY_TIMELINE.map((s) => sceneForStep(s)).filter(
  (s): s is DemoScene => !!s,
);

export const SCENARIO_LABEL_EN = "Executive Day · Jeddah Industrial Site (JED-P1)";
export const SCENARIO_LABEL_AR = "يوم تنفيذي · موقع جدة الصناعي (JED-P1)";
