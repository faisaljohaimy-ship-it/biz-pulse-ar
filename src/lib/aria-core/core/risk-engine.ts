/**
 * RiskEngine — signal-based risk assessment from prompt + context.
 * Pure function. Never invents facts; when signals are absent, returns "info".
 */
import type { RiskLevel, RiskSignal } from "../types/executive";
import type { AriaContextSnapshot } from "../types/aria";

const CRITICAL = /(breach|attack|fire|explosion|casualt|fatal|outage|down|إخلاء|حريق|هجوم|اختراق|وفاة|انفجار|توقف)/i;
const HIGH = /(incident|failure|violation|leak|urgent|critical|حادث|عطل|مخالفة|تسريب|عاجل|حرج)/i;
const MEDIUM = /(delay|risk|issue|warning|degrad|تأخير|مخاطر|مشكلة|تحذير|تدهور)/i;
const LOW = /(monitor|watch|review|observe|مراقبة|متابعة|مراجعة|رصد)/i;

function classify(text: string): { level: RiskLevel; probability: number; impact: number } {
  if (CRITICAL.test(text)) return { level: "critical", probability: 0.85, impact: 0.95 };
  if (HIGH.test(text)) return { level: "high", probability: 0.7, impact: 0.75 };
  if (MEDIUM.test(text)) return { level: "medium", probability: 0.5, impact: 0.5 };
  if (LOW.test(text)) return { level: "low", probability: 0.3, impact: 0.3 };
  return { level: "info", probability: 0.1, impact: 0.15 };
}

const URGENCY_KEYWORDS = /(now|immediat|today|asap|الآن|عاجل|فوراً|اليوم)/i;

export const riskEngine = {
  assess(prompt: string, context: AriaContextSnapshot): RiskSignal {
    const c = classify(prompt);
    const urgency = URGENCY_KEYWORDS.test(prompt) ? 0.9 : c.probability * 0.7;
    // Confidence in the risk classification itself — depends on evidence density.
    const facts = Object.keys(context.pageMeta ?? {}).length;
    const confidence = Math.max(0.2, Math.min(0.9, 0.35 + facts * 0.08));

    const titles: Record<RiskLevel, { ar: string; en: string }> = {
      critical: { ar: "خطر حرج يستدعي تدخلاً فورياً", en: "Critical risk — immediate action required" },
      high: { ar: "مستوى مخاطر مرتفع", en: "High risk exposure" },
      medium: { ar: "مخاطر متوسطة تحت المراقبة", en: "Medium risk — monitor closely" },
      low: { ar: "مخاطر منخفضة", en: "Low risk" },
      info: { ar: "لا توجد إشارات مخاطر واضحة", en: "No clear risk signals detected" },
    };
    const mitigations: Record<RiskLevel, { ar: string; en: string }> = {
      critical: {
        ar: "فعّل بروتوكول الأزمات وأبلغ القيادة التنفيذية فوراً.",
        en: "Activate crisis protocol and notify executive leadership immediately.",
      },
      high: {
        ar: "كلّف مالكاً مسؤولاً وحدد مهلة زمنية قصيرة.",
        en: "Assign an accountable owner with a short deadline.",
      },
      medium: {
        ar: "أدرج البند في مراجعة اليوم التشغيلية.",
        en: "Add to today's operational review.",
      },
      low: {
        ar: "استمر في الرصد ضمن دورة المراجعة الاعتيادية.",
        en: "Continue routine monitoring.",
      },
      info: {
        ar: "لا يلزم إجراء الآن — البيانات غير كافية للتصعيد.",
        en: "No action needed — evidence insufficient to escalate.",
      },
    };

    return {
      level: c.level,
      probability: c.probability,
      impact: c.impact,
      urgency,
      confidence,
      title_ar: titles[c.level].ar,
      title_en: titles[c.level].en,
      mitigation_ar: mitigations[c.level].ar,
      mitigation_en: mitigations[c.level].en,
    };
  },
};
