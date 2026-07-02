import type { DailySummary, ExecutiveLanguage, Confidence } from "./types";
import { assertDailySummary, EXECUTIVE_CONTRACTS } from "./contracts";

export interface DailySummaryInput {
  readonly language: ExecutiveLanguage;
  readonly openItems?: number | null;
  readonly closedItems?: number | null;
  readonly bullets: readonly { ar: string; en: string }[];
  readonly evidenceCount: number;
}

export function composeDailySummary(input: DailySummaryInput): DailySummary {
  const bullets = input.bullets.slice(0, EXECUTIVE_CONTRACTS.DAILY_MAX_BULLETS);
  const oi = typeof input.openItems === "number" && Number.isFinite(input.openItems) ? input.openItems : null;
  const ci = typeof input.closedItems === "number" && Number.isFinite(input.closedItems) ? input.closedItems : null;
  const headlineAr = oi === null && ci === null
    ? "الملخص اليومي: البيانات غير متاحة بالكامل."
    : `الملخص اليومي: ${oi ?? "غير متاح"} مفتوحة / ${ci ?? "غير متاح"} مغلقة.`;
  const headlineEn = oi === null && ci === null
    ? "Daily summary: data not fully available."
    : `Daily summary: ${oi ?? "unavailable"} open / ${ci ?? "unavailable"} closed.`;
  const confidence: Confidence =
    input.evidenceCount === 0 ? "unknown"
    : input.evidenceCount >= 4 ? "high"
    : input.evidenceCount >= 2 ? "medium" : "low";
  const s: DailySummary = {
    issuedAt: Date.now(),
    language: input.language,
    headline_ar: headlineAr,
    headline_en: headlineEn,
    bullets_ar: bullets.map((b) => b.ar),
    bullets_en: bullets.map((b) => b.en),
    openItems: oi,
    closedItems: ci,
    confidence,
  };
  assertDailySummary(s);
  return s;
}
