// Trust indicators — derived from response evidence; never fabricated.
import type { TrustSignal } from "./types";

export interface TrustInput {
  readonly hasEvidence: boolean;
  readonly confidence?: "unknown" | "low" | "medium" | "high";
  readonly dataAvailable: boolean;
  readonly fabricationSuspected?: boolean;
}

export interface TrustAssessment {
  readonly signals: readonly TrustSignal[];
  readonly label_ar: string;
  readonly label_en: string;
  readonly ok: boolean;
}

export function assessTrust(input: TrustInput): TrustAssessment {
  const signals: TrustSignal[] = [];
  if (input.hasEvidence) signals.push("evidence_linked");
  if (input.confidence && input.confidence !== "unknown") signals.push("confidence_known");
  if (!input.dataAvailable) signals.push("unavailable_stated");
  if (!input.fabricationSuspected) signals.push("no_fabrication");
  const ok = signals.includes("no_fabrication") && (input.hasEvidence || !input.dataAvailable);
  const label_ar = ok
    ? input.dataAvailable
      ? "مدعوم بالأدلة"
      : "البيانات غير متاحة حالياً"
    : "يتطلب تحقّقاً إضافياً";
  const label_en = ok
    ? input.dataAvailable
      ? "Evidence-backed"
      : "Data currently unavailable"
    : "Needs additional verification";
  return { signals, label_ar, label_en, ok };
}
