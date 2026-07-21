/**
 * ARIA pronunciation — constitution Article 22 §5.
 *
 * The TTS layer (ElevenLabs Layan) must SPEAK Latin acronyms and directive
 * codes as correct Arabic, not spell them letter-by-letter or leave digits
 * detached. Applied to the spoken text only; the on-screen text keeps the
 * canonical Latin form. Extensible with one line in TERMS / by widening the
 * SEC/SAF pattern.
 *
 *   SEC-18 → «سِك ثمانية عشر»   ·   PTW → «تصريح العمل»
 *   HCIS   → «الهيئة العليا للأمن الصناعي»
 */

const ONES = [
  "",
  "واحد",
  "اثنان",
  "ثلاثة",
  "أربعة",
  "خمسة",
  "ستة",
  "سبعة",
  "ثمانية",
  "تسعة",
  "عشرة",
  "أحد عشر",
  "اثنا عشر",
  "ثلاثة عشر",
  "أربعة عشر",
  "خمسة عشر",
  "ستة عشر",
  "سبعة عشر",
  "ثمانية عشر",
  "تسعة عشر",
];
const TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];

/** Arabic cardinal for 0–99 (covers every HCIS directive code). */
export function arabicCardinal(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n);
  if (n < 20) return ONES[n] || "صفر";
  const t = Math.floor(n / 10);
  const o = n % 10;
  if (o === 0) return TENS[t];
  return `${ONES[o]} و${TENS[t]}`;
}

/** Fixed acronym → spoken Arabic. Order-independent (whole-token match). */
const TERMS: Array<[RegExp, string]> = [
  [/\bHCIS\b/gi, "الهيئة العليا للأمن الصناعي"],
  [/\bPTW\b/gi, "تصريح العمل"],
  [/\bCCTV\b/gi, "كاميرات المراقبة"],
  [/\bKPIs?\b/gi, "مؤشرات الأداء"],
  [/\bSLA\b/gi, "اتفاقية مستوى الخدمة"],
  [/\bPDPL\b/gi, "نظام حماية البيانات الشخصية"],
  [/\bMCP\b/gi, "ربط الوكلاء"],
  [/\bNEXIOS\b/gi, "نكسيوس"],
  [/\bARIA\b/gi, "آريا"],
];

/** Rewrite a reply into speech-ready Arabic for the TTS pipeline. */
export function applyAriaPronunciation(text: string): string {
  let out = text;
  // Directive codes first: SEC-18 → «سِك ثمانية عشر», SAF-07 → «ساف سبعة».
  out = out.replace(/\bSEC[-\s]?0*(\d{1,2})\b/gi, (_m, d) => `سِك ${arabicCardinal(Number(d))}`);
  out = out.replace(/\bSAF[-\s]?0*(\d{1,2})\b/gi, (_m, d) => `ساف ${arabicCardinal(Number(d))}`);
  // Bare SEC/SAF (no code).
  out = out.replace(/\bSEC\b/gi, "سِك").replace(/\bSAF\b/gi, "ساف");
  for (const [re, sub] of TERMS) out = out.replace(re, sub);
  return out;
}
