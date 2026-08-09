/**
 * SADEED pronunciation — constitution Article 22 §5 + the SADEED Constitution's
 * spoken-clarity clause.
 *
 * The TTS layer (ElevenLabs, SADEED male voice) must SPEAK:
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

/* ─────────────── toArabicSpokenNumber — the one isolated entry ─────────────
 * Every numeric token bound for the Layan voice is rendered to clear Modern
 * Standard Arabic words by THIS function — percentages, magnitudes (M/K/B),
 * clock times, riyal amounts, years and decimals — so nothing reaches TTS as
 * raw digits. The on-screen text keeps its tabular numerals; this is spoken
 * form only. Unit-tested per category in pronunciation.test.ts.
 * ─────────────────────────────────────────────────────────────────────── */

export type ArabicNumberKind =
  | "auto"
  | "cardinal"
  | "decimal"
  | "percent"
  | "time"
  | "riyal"
  | "scaled"
  | "year";

/** Feminine ones (minutes/hours agree in the feminine when counting دقيقة). */
const ONES_F = ["", "واحدة", "اثنتان", "ثلاث", "أربع", "خمس", "ست", "سبع", "ثمان", "تسع"];
/** Genitive tens (for years: «وعشرين» not «وعشرون»). */
const TENS_GEN = ["", "", "عشرين", "ثلاثين", "أربعين", "خمسين", "ستين", "سبعين", "ثمانين", "تسعين"];
/** Ordinal feminine hours 1–12 (clock reading). */
const HOUR_ORDINAL_F = [
  "الثانية عشرة", // index 0 stands in for 12 (00:xx / 12:xx)
  "الواحدة",
  "الثانية",
  "الثالثة",
  "الرابعة",
  "الخامسة",
  "السادسة",
  "السابعة",
  "الثامنة",
  "التاسعة",
  "العاشرة",
  "الحادية عشرة",
  "الثانية عشرة",
];

/** Feminine 0–59 cardinal (minutes): «خمس وثلاثون», «خمس عشرة», «عشرون». */
function arabicTwoDigitFeminine(n: number): string {
  if (n <= 0) return "";
  if (n < 10) return ONES_F[n];
  if (n === 10) return "عشر";
  if (n === 11) return "إحدى عشرة";
  if (n === 12) return "اثنتا عشرة";
  if (n < 20) return `${ONES_F[n - 10]} عشرة`;
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? TENS[t] : `${ONES_F[o]} و${TENS[t]}`;
}

/** Genitive 0–99 (year tail): «ستة وعشرين». */
function arabicTwoDigitGenitive(n: number): string {
  if (n <= 0) return "";
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? TENS_GEN[t] : `${ONES[o]} و${TENS_GEN[t]}`;
}

/** Clock reading: «الثانية عشرة وخمس وثلاثون دقيقة». Seconds are dropped
 *  (spoken seconds are noise); the hour is read as a 12-hour ordinal.
 *  Returns "" on invalid input (non-integer or out of range) so the caller
 *  keeps the original text instead of voicing «undefined» or a wrong hour. */
export function arabicClock(hh: number, mm: number): string {
  if (!Number.isInteger(hh) || !Number.isInteger(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return "";
  }
  const hour12 = hh % 12;
  const hourWord = HOUR_ORDINAL_F[hour12];
  if (mm <= 0) return `${hourWord} تمامًا`;
  const minWord = arabicTwoDigitFeminine(mm);
  const minNoun = mm >= 3 && mm <= 10 ? "دقائق" : "دقيقة";
  return `${hourWord} و${minWord} ${minNoun}`;
}

/** Year in the spoken genitive: 2026 → «ألفين وستة وعشرين». 2000–2099 get
 *  the natural «ألفين» head; anything else falls back to the cardinal. */
export function arabicYear(y: number): string {
  if (!Number.isInteger(y) || y < 2000 || y > 2099) return arabicNumberWords(y);
  const tail = y - 2000;
  return tail === 0 ? "ألفين" : `ألفين و${arabicTwoDigitGenitive(tail)}`;
}

/** Split a magnitude suffix (M/K/B or م/ألف) into its multiplier. */
function magnitudeFactor(suffix: string): number {
  const s = suffix.trim().toLowerCase();
  if (s === "b" || s === "بليون" || s === "مليار") return 1_000_000_000;
  if (s === "m" || s === "مليون" || s === "م") return 1_000_000;
  if (s === "k" || s === "ألف" || s === "الف" || s === "ك") return 1000;
  return 1;
}

const CURRENCY_RE = /(sar|ر\.?\s*س|ريال|م\.?\s*ر)/i;
const MAGNITUDE_RE = /([kmbكمب])\b|(مليون|مليار|بليون|ألف|الف)/i;

/**
 * The single isolated converter. `kind` forces a category; `"auto"` sniffs it
 * from the token. Returns clear Arabic words — never raw digits.
 */
export function toArabicSpokenNumber(
  value: string | number,
  kind: ArabicNumberKind = "auto",
): string {
  const input = String(value).trim();
  // Split off a genuine leading minus so it is SPOKEN («ناقص») instead of
  // being dropped by the digit-only strips below or voiced as a bare dash.
  const negative = input.startsWith("-");
  const raw = negative ? input.slice(1).trim() : input;

  // Resolve auto → concrete kind.
  let k = kind;
  if (k === "auto") {
    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(raw)) k = "time";
    else if (CURRENCY_RE.test(raw)) k = "riyal";
    else if (/%\s*$/.test(raw) || /بالمئة/.test(raw)) k = "percent";
    else if (MAGNITUDE_RE.test(raw)) k = "scaled";
    else if (raw.includes(".")) k = "decimal";
    else k = "cardinal";
  }

  let spoken: string;
  switch (k) {
    case "time": {
      const [hh, mm] = raw.split(":");
      // Invalid clock → keep the original token rather than voice «undefined».
      spoken = arabicClock(Number(hh), Number(mm)) || raw;
      break;
    }
    case "year":
      spoken = arabicYear(Number(raw.replace(/[^\d]/g, "")));
      break;
    case "percent": {
      const num = raw.replace(/[%\s]|بالمئة/g, "");
      spoken = `${spokenNumber(num, "ar")} بالمئة`;
      break;
    }
    case "riyal": {
      const stripped = raw.replace(CURRENCY_RE, "").trim();
      spoken = `${scaledToWords(stripped)} ريال`;
      break;
    }
    case "scaled":
      spoken = scaledToWords(raw);
      break;
    case "decimal":
      spoken = spokenNumber(raw.replace(/[^\d.]/g, ""), "ar");
      break;
    case "cardinal":
    default:
      spoken = arabicNumberWords(Number(raw.replace(/[^\d]/g, "")));
      break;
  }
  return negative ? `ناقص ${spoken}` : spoken;
}

/** Fold an optional magnitude suffix into the value, then speak it. A whole
 *  result is a grouped cardinal («ثلاثة ملايين وستمئة وسبعون ألفًا»); a value
 *  that stays fractional is read with a spoken point. */
function scaledToWords(raw: string): string {
  const match = raw.match(/^([\d,]*\.?\d+)\s*([kmbكمب]|مليون|مليار|بليون|ألف|الف)?/i);
  if (!match) return spokenNumber(raw.replace(/[^\d.]/g, ""), "ar");
  const base = Number(match[1].replace(/,/g, ""));
  const factor = match[2] ? magnitudeFactor(match[2]) : 1;
  const scaled = base * factor;
  if (Number.isInteger(scaled)) return arabicNumberWords(scaled);
  return spokenNumber(String(scaled), "ar");
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
  // اسم المنصة السابق. كان يُنطق «نكسيوس» — أي أن الاسم المُزال من كل شاشة
  // كان لا يزال يخرج من مكبّر الصوت. صار يُنطق «المنصة»، فتُغلق آخر قناة
  // يصل بها الاسم القديم إلى المستخدم (نفس علاج مدخلة ARIA في المُطبِّع).
  [/\bNEXIOS\b/gi, "المنصة"],
  // اسم المساعد. وُحِّد مع اسم المنتج بقرار المالك ٢٠٢٦/٠٨/٠٩، والطرف
  // الأيسر يبقى مفتاح مطابقة لنصوص مخزّنة قديمة — حذفه يجعلها تُتهجّى حرفًا حرفًا.
  [/\bSADEED\b/gi, "سَدِيد"],
  // اسم المساعد **السابق**. كسر المعرّفات ٢٠٢٦/٠٨/٠٩ أزاله من الكود، لكنه
  // باقٍ في صفوف `finn_knowledge` و`aria_conversations` وفي الرسائل المحفوظة —
  // وهذه المدخلة هي ما يمنع نطقه «إف-آي-إن-إن» حرفًا حرفًا من مكبّر الصوت.
  [/\bFINN\b/gi, "سَدِيد"],
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
  // Dotted version strings (1.2.0) stay protected — they are not quantities.
  let out = text.replace(/\d+\.\d+\.\d+/g, stash);

  const percent = lang === "ar" ? "بالمئة" : "percent";

  // A genuine minus SIGN — start of string, or after whitespace / an opener /
  // an Arabic comma, immediately before a digit — is spoken as a word so
  // negatives are never dropped. A hyphen BETWEEN digits (a range like 5-10)
  // is left untouched. No lookbehind/lookahead (older iOS Safari rejects them).
  const neg = lang === "ar" ? "ناقص " : "minus ";
  out = out.replace(/(^|[\s([،])-(\d)/g, `$1${neg}$2`);

  if (lang === "ar") {
    // Arabic replies route quantities through the one isolated converter so
    // currency, magnitudes and clock times speak as clear words. Order:
    // currency (may carry M/K) → bare magnitude → clock → generic passes.
    out = out.replace(/\d[\d,]*(?:\.\d+)?(?:[KMB])?\s*(?:SAR|ر\.?\s*س|ريال|م\.?\s*ر)/gi, (m) =>
      toArabicSpokenNumber(m, "riyal"),
    );
    out = out.replace(/\d[\d,]*(?:\.\d+)?[KMB](?![A-Za-z])/g, (m) =>
      toArabicSpokenNumber(m, "scaled"),
    );
    out = out.replace(
      /\b(\d{1,2}):(\d{2})(?::\d{2})?\b/g,
      (m, hh: string, mm: string) =>
        // Invalid clock (e.g. 45:99) → keep the token, don't voice a wrong hour.
        arabicClock(Number(hh), Number(mm)) || m,
    );
  } else {
    // English replies keep clock times protected (spoken correctly as-is).
    out = out.replace(/\d{1,2}:\d{2}(?::\d{2})?/g, stash);
  }

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
export function applySadeedPronunciation(text: string): string {
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
