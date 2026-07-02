// Deterministic AR vs EN detector — dominant script wins.
import type { LocaleDetection, Confidence } from "./types";

const AR_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const EN_RE = /[A-Za-z]/;

export function detectLocale(text: string): LocaleDetection {
  const t = text ?? "";
  let ar = 0, en = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (AR_RE.test(c)) ar++;
    else if (EN_RE.test(c)) en++;
  }
  const total = ar + en;
  const lang = ar >= en && ar > 0 ? "ar" : "en";
  let confidence: Confidence = "unknown";
  if (total >= 6) {
    const dom = Math.max(ar, en) / total;
    confidence = dom >= 0.85 ? "high" : dom >= 0.65 ? "medium" : "low";
  } else if (total > 0) {
    confidence = "low";
  }
  return { lang, confidence, arChars: ar, enChars: en, total };
}
