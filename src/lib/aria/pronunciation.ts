/**
 * FINN pronunciation — constitution Article 22 §5 + the FINN Constitution's
 * spoken-clarity clause.
 *
 * The TTS layer (ElevenLabs, FINN male voice) must SPEAK:
 *  - Latin acronyms & directive codes as correct Arabic, not letter-spelled
 *    (SEC-18 → «سِك ثمانية عشر», PTW → «تصريح العمل»).
 *  - Every NUMBER as full words — Arabic in an Arabic reply, English in an
 *    English reply — so figures are never blurred digit-by-digit.
 *  - Day names clearly and deliberately (English day names are spoken in
 *    Arabic within an Arabic reply).
 *
 * Applied to the SPOKEN text only; the on-screen text keeps its canonical
 * form. Extensible with one line in TERMS / by widening the SEC/SAF pattern.
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
const HUNDREDS = [
  "",
  "مئة",
  "مئتان",
  "ثلاثمئة",
  "أربعمئة",
  "خمسمئة",
  "ستمئة",
  "سبعمئة",
  "ثمانمئة",
  "تسعمئة",
];

/** 0–99 as words, empty string for 0 (so it drops out of compounds). */
function arabicTwoDigit(n: number): string {
  if (n <= 0) return "";
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? TENS[t] : `${ONES[o]} و${TENS[t]}`;
}

/** 0–999 as words, empty string for 0. */
function arabicUnder1000(n: number): string {
  if (n < 100) return arabicTwoDigit(n);
  const h = Math.floor(n / 100);
  const r = n % 100;
  return r === 0 ? HUNDREDS[h] : `${HUNDREDS[h]} و${arabicTwoDigit(r)}`;
}

/** A scale group (thousands/millions) with simplified executive-register
 *  agreement: dual for 2, plural for 3–10, singular for 11+. */
function arabicScale(count: number, one: string, two: string, few: string): string {
  if (count === 1) return one;
  if (count === 2) return two;
  if (count >= 3 && count <= 10) return `${arabicUnder1000(count)} ${few}`;
  return `${arabicUnder1000(count)} ${one}`;
}

/** Arabic cardinal for 0–99 (covers every HCIS directive code). */
export function arabicCardinal(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n);
  return n === 0 ? "صفر" : arabicTwoDigit(n);
}

/** Arabic words for any non-negative integer up to the hundred-millions. */
export function arabicNumberWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n);
  const v = Math.floor(n);
  if (v === 0) return "صفر";
  if (v < 1000) return arabicUnder1000(v);
  const millions = Math.floor(v / 1_000_000);
  const thousands = Math.floor((v % 1_000_000) / 1000);
  const rest = v % 1000;
  const parts: string[] = [];
  if (millions) parts.push(arabicScale(millions, "مليون", "مليونان", "ملايين"));
  if (thousands) parts.push(arabicScale(thousands, "ألف", "ألفان", "آلاف"));
  if (rest) parts.push(arabicUnder1000(rest));
  return parts.join(" و");
}

const EN_ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const EN_TENS = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

function englishUnder1000(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h) parts.push(`${EN_ONES[h]} hundred`);
  if (r) {
    if (r < 20) parts.push(EN_ONES[r]);
    else {
      const t = Math.floor(r / 10);
      const o = r % 10;
      parts.push(o ? `${EN_TENS[t]}-${EN_ONES[o]}` : EN_TENS[t]);
    }
  }
  return parts.join(" ");
}

/** English words for any non-negative integer up to the hundred-millions. */
export function englishNumberWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n);
  const v = Math.floor(n);
  if (v === 0) return "zero";
  const millions = Math.floor(v / 1_000_000);
  const thousands = Math.floor((v % 1_000_000) / 1000);
  const rest = v % 1000;
  const parts: string[] = [];
  if (millions) parts.push(`${englishUnder1000(millions)} million`);
  if (thousands) parts.push(`${englishUnder1000(thousands)} thousand`);
  if (rest) parts.push(englishUnder1000(rest));
  return parts.join(" ");
}

/** English → Arabic weekday names, so an Arabic reply speaks the day clearly
 *  in Arabic instead of leaving a Latin word for the voice to mangle. */
const EN_TO_AR_DAYS: Array<[RegExp, string]> = [
  [/\bSunday\b/gi, "الأحد"],
  [/\bMonday\b/gi, "الاثنين"],
  [/\bTuesday\b/gi, "الثلاثاء"],
  [/\bWednesday\b/gi, "الأربعاء"],
  [/\bThursday\b/gi, "الخميس"],
  [/\bFriday\b/gi, "الجمعة"],
  [/\bSaturday\b/gi, "السبت"],
];

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
  [/\bFINN\b/gi, "فِن"],
];

const AR_DIGIT = [
  "صفر",
  "واحد",
  "اثنان",
  "ثلاثة",
  "أربعة",
  "خمسة",
  "ستة",
  "سبعة",
  "ثمانية",
  "تسعة",
];
const EN_DIGIT = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

/**
 * Speak a full numeric token as words, including thousands separators and a
 * decimal part. The integer part is a grouped cardinal; the fractional part is
 * read digit-by-digit after a spoken point («فاصلة» / "point"), the correct
 * convention for reading a decimal aloud. `"3.67"` → «ثلاثة فاصلة ستة سبعة».
 */
function spokenNumber(raw: string, lang: "ar" | "en"): string {
  const [intPart, fracPart] = raw.replace(/,/g, "").split(".");
  const words = lang === "ar" ? arabicNumberWords : englishNumberWords;
  const head = words(Number(intPart || "0"));
  if (fracPart == null || fracPart.length === 0) return head;
  const digits = lang === "ar" ? AR_DIGIT : EN_DIGIT;
  const point = lang === "ar" ? "فاصلة" : "point";
  const tail = fracPart
    .split("")
    .map((c) => digits[Number(c)] ?? c)
    .join(" ");
  return `${head} ${point} ${tail}`;
}

/**
 * Speak EVERY number as complete, correct words — integers, thousands,
 * millions, percentages AND decimals. Clock times (HH:MM[:SS]) and dotted
 * version strings (1.2.0) are protected so they are not mangled. `lang` picks
 * Arabic or English number words + the "percent" wording. Only simple regexes
 * are used — no lookbehind / lookahead, which older iOS Safari (< 16.4)
 * rejects at parse time.
 */
function expandNumbers(text: string, lang: "ar" | "en"): string {
  const stashed: string[] = [];
  const stash = (m: string): string => {
    const ch = String.fromCharCode(0xe000 + stashed.length);
    stashed.push(m);
    return ch;
  };
  let out = text.replace(/\d{1,2}:\d{2}(?::\d{2})?/g, stash).replace(/\d+\.\d+\.\d+/g, stash);

  const percent = lang === "ar" ? "بالمئة" : "percent";

  // Percentages first (integer OR decimal, consuming the % sign), then decimal
  // numbers, then any remaining integer runs. Each becomes full spoken words.
  out = out.replace(
    /(\d[\d,]*(?:\.\d+)?)\s*%/g,
    (_m, n: string) => `${spokenNumber(n, lang)} ${percent}`,
  );
  out = out.replace(/\d[\d,]*\.\d+/g, (m) => spokenNumber(m, lang));
  out = out.replace(/\d[\d,]*/g, (m) => spokenNumber(m, lang));

  // Restore the protected times/version strings from their placeholder chars.
  return out.replace(/[-]/g, (ch) => stashed[ch.charCodeAt(0) - 0xe000] ?? ch);
}

/** Rewrite a reply into speech-ready text for the TTS pipeline. */
export function applyFinnPronunciation(text: string): string {
  let out = text;
  // Directive codes first: SEC-18 → «سِك ثمانية عشر», SAF-07 → «ساف سبعة».
  out = out.replace(/\bSEC[-\s]?0*(\d{1,2})\b/gi, (_m, d) => `سِك ${arabicCardinal(Number(d))}`);
  out = out.replace(/\bSAF[-\s]?0*(\d{1,2})\b/gi, (_m, d) => `ساف ${arabicCardinal(Number(d))}`);
  // Bare SEC/SAF (no code).
  out = out.replace(/\bSEC\b/gi, "سِك").replace(/\bSAF\b/gi, "ساف");
  for (const [re, sub] of TERMS) out = out.replace(re, sub);

  // Language-aware clarity pass. Arabic reply → Arabic number words + Arabic
  // day names; otherwise English number words (day names stay English and are
  // already spoken correctly).
  const isArabic = /[؀-ۿ]/.test(out);
  if (isArabic) for (const [re, sub] of EN_TO_AR_DAYS) out = out.replace(re, sub);
  out = expandNumbers(out, isArabic ? "ar" : "en");

  return out;
}
