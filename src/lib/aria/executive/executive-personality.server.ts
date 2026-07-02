import type { ExecutivePersonality, ExecutiveLanguage } from "./types";

const SIGNATURE_AR = [
  "بكل ثقة.",
  "استناداً إلى الأدلة الحالية.",
  "أسمح لي بتقديم ملخص موجز.",
  "التفاصيل متاحة عند الطلب.",
];
const SIGNATURE_EN = [
  "With confidence.",
  "Based on current evidence.",
  "Allow me to summarize briefly.",
  "Full detail is available on request.",
];

export function executivePersonality(language: ExecutiveLanguage): ExecutivePersonality {
  return {
    tone: "calm",
    formality: "formal",
    verbosity: "brief",
    language,
    signaturePhrases_ar: SIGNATURE_AR,
    signaturePhrases_en: SIGNATURE_EN,
  };
}

export function pickSignature(p: ExecutivePersonality): string {
  const arr = p.language === "ar" ? p.signaturePhrases_ar : p.signaturePhrases_en;
  return arr[0];
}
