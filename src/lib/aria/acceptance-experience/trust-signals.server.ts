// Trust signals (Phase 11.7 façade) — bilingual chips built on 11.6 assessor.
import { assessTrust } from "./trust-indicators.server";
import type { TrustInput } from "./trust-indicators.server";

export interface TrustChip {
  readonly key: "evidence" | "confidence" | "unavailable" | "verify";
  readonly label_ar: string;
  readonly label_en: string;
  readonly tone: "positive" | "neutral" | "warning";
}

export function buildTrustChips(input: TrustInput): readonly TrustChip[] {
  const a = assessTrust(input);
  const chips: TrustChip[] = [];
  if (a.signals.includes("evidence_linked")) chips.push({
    key: "evidence", label_ar: "مدعوم بالأدلة", label_en: "Evidence-backed", tone: "positive",
  });
  if (a.signals.includes("confidence_known") && input.confidence) chips.push({
    key: "confidence",
    label_ar: `ثقة: ${confAr(input.confidence)}`,
    label_en: `Confidence: ${input.confidence}`,
    tone: input.confidence === "high" ? "positive" : "neutral",
  });
  if (a.signals.includes("unavailable_stated")) chips.push({
    key: "unavailable", label_ar: "البيانات غير متاحة", label_en: "Data unavailable", tone: "neutral",
  });
  if (!a.ok) chips.push({
    key: "verify", label_ar: "يتطلب تحقّقاً", label_en: "Needs verification", tone: "warning",
  });
  return chips;
}

function confAr(c: "unknown" | "low" | "medium" | "high"): string {
  return c === "high" ? "عالية" : c === "medium" ? "متوسطة" : c === "low" ? "منخفضة" : "غير معروفة";
}
