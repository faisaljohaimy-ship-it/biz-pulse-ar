import type { ConfidenceBadge, ConfidenceLevel } from "./types";

export interface ConfidenceInput {
  readonly evidenceCount: number;
  readonly hasContradiction?: boolean;
  readonly dataFreshMs?: number;
}

export function computeConfidence(input: ConfidenceInput): ConfidenceBadge {
  let level: ConfidenceLevel = "unknown";
  if (input.evidenceCount === 0) level = "unknown";
  else if (input.hasContradiction) level = "low";
  else if (input.evidenceCount >= 3 && (input.dataFreshMs ?? 0) < 15 * 60_000) level = "high";
  else if (input.evidenceCount >= 1) level = "medium";
  const labels: Record<ConfidenceLevel, { ar: string; en: string }> = {
    unknown: { ar: "غير معروفة", en: "Unknown" },
    low: { ar: "منخفضة", en: "Low" },
    medium: { ar: "متوسطة", en: "Medium" },
    high: { ar: "عالية", en: "High" },
  };
  return {
    level,
    evidenceCount: input.evidenceCount,
    label_ar: `الثقة: ${labels[level].ar}`,
    label_en: `Confidence: ${labels[level].en}`,
  };
}
