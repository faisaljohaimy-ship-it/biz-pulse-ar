/**
 * FINN speech normalization — unified, pure, deterministic (constitution
 * Article 22 §5 + the spoken-clarity clause).
 *
 * ONE function turns a user-visible reply into TTS-ready speech text WITHOUT
 * ever mutating what the user sees. `display` is returned untouched; `speech`
 * is the derived spoken form. It supersedes the ad-hoc pronunciation pass by
 * adding the token classes that were mispronounced before: phone numbers and
 * identifiers (digit-by-digit), dates, times, units, symbols, and Arabic-Indic
 * digits ٠١٢٣ — while reusing the existing Arabic/English number-word engine.
 *
 * Design rules honoured here:
 *   • display text and stored text are never changed — speech is a copy.
 *   • normalization happens BEFORE any chunking (chunkSpeechText below), and a
 *     protected token (number/date/id/unit) is expanded to WORDS first, so a
 *     sentence splitter can never cut through the middle of one.
 *   • no SSML is emitted; escapeForSSML defuses any XML/HTML in the input.
 *   • no general string replace that could rewrite letters inside other words —
 *     every rule is token-bounded.
 *
 * NOTE ON WIRING: this module is intentionally NOT yet wired into
 * `toFinnSpeechText`. Adopting it changes how a few acronyms are spoken (e.g.
 * HCIS spelled vs. the current full-name expansion) — a product decision that
 * must be reviewed before it goes live. See the audit report.
 */
import { arabicCardinal, arabicNumberWords, englishNumberWords } from "./pronunciation";

export type SpeechLang = "ar" | "en";

export interface SpeechContext {
  /** Force a language; default auto-detects Arabic by script presence. */
  readonly lang?: SpeechLang | "auto";
}

export interface FinnSpeech {
  /** The input, byte-for-byte unchanged — safe to render on screen. */
  readonly display: string;
  /** The TTS-ready spoken form. */
  readonly speech: string;
}

/* ── Central, editable pronunciation dictionary ─────────────────────────────
 * Whole-token acronym → spoken form. Editable in one place. Latin letters are
 * spelled in Arabic where spelling is the natural reading of a code/acronym. */
export const FINN_SPEECH_DICTIONARY: Readonly<Record<string, string>> = {
  FINN: "فِنّ",
  NEXIOS: "نِكْسِيُوس",
  // The assistant is FINN. This entry used to map the legacy token to its own
  // spoken form «آريا», which meant any stale text containing "ARIA" would be
  // SPOKEN as ARIA even though nothing on screen says it any more. Mapping it
  // to «فِنّ» closes the last channel the old name could still reach a user
  // through — the voice.
  ARIA: "فِنّ",
  HCIS: "إتش سي آي إس",
  PTW: "بي تي دبليو",
  KPI: "كي بي آي",
  RLS: "آر إل إس",
  QR: "كيو آر",
  SAP: "ساب",
  API: "إيه بي آي",
  AI: "إيه آي",
  SEC: "سِك",
  SAF: "ساف",
};

/** Latin letter → Arabic letter-name, for spelling out an unknown code. */
const LETTER_AR: Readonly<Record<string, string>> = {
  a: "إيه",
  b: "بي",
  c: "سي",
  d: "دي",
  e: "إي",
  f: "إف",
  g: "جي",
  h: "إتش",
  i: "آي",
  j: "جيه",
  k: "كيه",
  l: "إل",
  m: "إم",
  n: "إن",
  o: "أوه",
  p: "بي",
  q: "كيو",
  r: "آر",
  s: "إس",
  t: "تي",
  u: "يو",
  v: "في",
  w: "دبليو",
  x: "إكس",
  y: "واي",
  z: "زد",
};

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

const MONTHS_AR = [
  "",
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];
const MONTHS_EN = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Unit token → spoken words, per language. */
const UNIT_WORDS: Readonly<Record<string, { ar: string; en: string }>> = {
  "°C": { ar: "درجة مئوية", en: "degrees Celsius" },
  "km/h": { ar: "كيلومتر في الساعة", en: "kilometers per hour" },
  kV: { ar: "كيلوفولت", en: "kilovolt" },
  Hz: { ar: "هرتز", en: "hertz" },
  SAR: { ar: "ريال سعودي", en: "Saudi riyal" },
};

const SYMBOL_WORDS: Readonly<Record<string, { ar: string; en: string }>> = {
  "+": { ar: "زائد", en: "plus" },
  "=": { ar: "يساوي", en: "equals" },
  "@": { ar: "آت", en: "at" },
  "#": { ar: "رقم", en: "number" },
  "&": { ar: "و", en: "and" },
  "/": { ar: "شرطة مائلة", en: "slash" },
};

const words = (n: number, lang: SpeechLang) =>
  lang === "ar" ? arabicNumberWords(n) : englishNumberWords(n);

/** Convert Arabic-Indic (٠-٩) and Eastern Arabic-Indic (۰-۹) digits to ASCII. */
function toWesternDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** A whole numeric token as words: integer part grouped, fraction digit-by-digit. */
function spokenNumber(raw: string, lang: SpeechLang): string {
  const [intPart, fracPart] = raw.replace(/,/g, "").split(".");
  const head = words(Number(intPart || "0"), lang);
  if (!fracPart) return head;
  const digits = lang === "ar" ? AR_DIGIT : EN_DIGIT;
  const point = lang === "ar" ? "فاصلة" : "point";
  const tail = fracPart
    .split("")
    .map((c) => digits[Number(c)] ?? c)
    .join(" ");
  return `${head} ${point} ${tail}`;
}

/** Every digit read separately — phones, IDs, years-in-codes. */
function spokenDigits(raw: string, lang: SpeechLang): string {
  const digits = lang === "ar" ? AR_DIGIT : EN_DIGIT;
  return raw
    .replace(/\D/g, "")
    .split("")
    .map((c) => digits[Number(c)])
    .join(" ");
}

/** Spell a Latin run as letter-names (Arabic), honouring the dictionary first. */
function spellCode(letters: string, lang: SpeechLang): string {
  const up = letters.toUpperCase();
  if (FINN_SPEECH_DICTIONARY[up]) return FINN_SPEECH_DICTIONARY[up];
  if (lang === "en") return letters.toUpperCase().split("").join(" ");
  return letters
    .toLowerCase()
    .split("")
    .map((c) => LETTER_AR[c] ?? c)
    .join(" ");
}

/** Read an identifier body segment: letters spelled, digit runs digit-by-digit. */
function readIdBody(seg: string, lang: SpeechLang): string {
  return seg
    .split(/([A-Za-z]+|\d+)/)
    .filter((p) => p && p.trim() !== "")
    .map((p) => (/^\d+$/.test(p) ? spokenDigits(p, lang) : spellCode(p, lang)))
    .join(" ");
}

// ── Private-use placeholders keep protected tokens out of later passes. ──────
function makeStash() {
  const items: string[] = [];
  const keep = (expansion: string): string => {
    const ch = String.fromCharCode(0xe000 + items.length);
    items.push(expansion);
    return ` ${ch} `;
  };
  const restore = (text: string): string =>
    text.replace(/[-]/g, (ch) => items[ch.charCodeAt(0) - 0xe000] ?? ch);
  return { keep, restore };
}

/**
 * Structural markup removal — code fences, images, links, raw URLs, citation
 * tags, headings/list markers, newlines. Runs FIRST so URLs/code are never
 * tokenized. Headings/blockquotes require a trailing space so "#125" (a label)
 * and "SEC_001" survive for the token classifiers below.
 */
function stripStructural(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|mailto:|tel:)[^)]*\)/gi, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\[(?:DOC|KB):[^\]]+\]/gi, " ")
    .replace(/\[(?:\d+(?:\s*[-,]\s*\d+)*)\]/g, " ")
    .replace(/^\s{0,3}(?:#{1,6}\s+|>\s*|[-*+]\s|\d+[.)]\s)/gm, "")
    .replace(/\s*\n\s*/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Inline emphasis removal — runs AFTER token protection so identifier
 *  underscores (SEC_001) are not mistaken for markdown emphasis. */
function stripInline(value: string): string {
  return value
    .replace(/[*_~`|]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function detectLang(text: string, ctx?: SpeechContext): SpeechLang {
  if (ctx?.lang && ctx.lang !== "auto") return ctx.lang;
  return /[؀-ۿ]/.test(text) ? "ar" : "en";
}

/**
 * Turn a reply into `{ display, speech }`. `display` is the untouched input;
 * `speech` is normalized. Pure and deterministic — no clock, no network.
 */
export function normalizeFinnSpeechText(displayText: string, ctx?: SpeechContext): FinnSpeech {
  const display = displayText;
  let s = stripStructural(displayText.normalize("NFC"));
  s = toWesternDigits(s);
  const lang = detectLang(s, ctx);
  const { keep, restore } = makeStash();
  const unit = (u: string) => (lang === "ar" ? UNIT_WORDS[u].ar : UNIT_WORDS[u].en);

  // 1) Emails — before symbols/numbers eat "@" or ".".
  s = s.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, (m) => {
    const at = lang === "ar" ? "آت" : "at";
    const dot = lang === "ar" ? "نقطة" : "dot";
    const spoken = m
      .replace(/@/g, ` ${at} `)
      .replace(/\./g, ` ${dot} `)
      .replace(/\s+/g, " ")
      .trim();
    return keep(spoken);
  });

  // 2) Version strings 1.2.0 — before decimals.
  s = s.replace(/\b\d+\.\d+\.\d+\b/g, (m) => keep(readIdBody(m.replace(/\./g, " "), lang)));

  // 3) Dates dd/mm/yyyy and yyyy-mm-dd — before fractions/times/cardinals.
  const months = lang === "ar" ? MONTHS_AR : MONTHS_EN;
  s = s.replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, (_m, d: string, mo: string, y: string) => {
    const mi = Number(mo);
    const mn = mi >= 1 && mi <= 12 ? months[mi] : words(mi, lang);
    return keep(`${words(Number(d), lang)} ${mn} ${words(Number(y), lang)}`);
  });
  s = s.replace(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g, (_m, y: string, mo: string, d: string) => {
    const mi = Number(mo);
    const mn = mi >= 1 && mi <= 12 ? months[mi] : words(mi, lang);
    return keep(`${words(Number(d), lang)} ${mn} ${words(Number(y), lang)}`);
  });

  // 4) Times HH:MM[:SS].
  s = s.replace(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/g, (_m, h: string, mi: string, se?: string) => {
    if (lang === "ar") {
      const base = `الساعة ${arabicCardinal(Number(h))} والدقيقة ${arabicCardinal(Number(mi))}`;
      return keep(se ? `${base} والثانية ${arabicCardinal(Number(se))}` : base);
    }
    const base = `${englishNumberWords(Number(h))} ${englishNumberWords(Number(mi))}`;
    return keep(se ? `${base} and ${englishNumberWords(Number(se))} seconds` : base);
  });

  // 5) Units — value + unit spoken together, never split.
  s = s.replace(/(\d[\d,]*(?:\.\d+)?)\s*(°C|km\/h|kV|Hz|SAR)/g, (_m, n: string, u: string) =>
    keep(`${spokenNumber(n, lang)} ${unit(u)}`),
  );

  // 6) Phones — leading + country code or a Saudi 0-prefixed run — digit-by-digit.
  s = s.replace(/\+\d[\d\s-]{6,}\d/g, (m) => {
    const plus = lang === "ar" ? "زائد" : "plus";
    return keep(`${plus} ${spokenDigits(m, lang)}`);
  });
  s = s.replace(/\b0\d{7,}\b/g, (m) => keep(spokenDigits(m, lang)));

  // 7) "#125" → "رقم …".
  s = s.replace(/#(\d+)/g, (_m, n: string) =>
    keep(`${lang === "ar" ? "رقم" : "number"} ${words(Number(n), lang)}`),
  );

  // 8) Identifiers: underscore codes and multi-segment hyphen codes.
  s = s.replace(/\b([A-Za-z]{2,})_([A-Za-z0-9_]+)\b/g, (_m, pre: string, body: string) => {
    const us = lang === "ar" ? "شرطة سفلية" : "underscore";
    const parts = body.split("_").map((seg) => readIdBody(seg, lang));
    return keep(`${spellCode(pre, lang)} ${us} ${parts.join(` ${us} `)}`);
  });
  s = s.replace(
    /\b([A-Za-z]{2,})-(\d{2,})-([A-Za-z0-9-]+)\b/g,
    (_m, pre: string, g2: string, g3: string) => {
      const dash = lang === "ar" ? "شرطة" : "dash";
      const rest = g3
        .split("-")
        .map((seg) => readIdBody(seg, lang))
        .join(` ${dash} `);
      return keep(`${spellCode(pre, lang)} ${dash} ${spokenDigits(g2, lang)} ${dash} ${rest}`);
    },
  );

  // 9) Fractions/ratios n/m.
  s = s.replace(/\b(\d{1,3})\/(\d{1,3})\b/g, (_m, a: string, b: string) => {
    const over = lang === "ar" ? "على" : "over";
    return keep(`${words(Number(a), lang)} ${over} ${words(Number(b), lang)}`);
  });

  // Inline emphasis is stripped only now — after every identifier/underscore
  // token has already been protected above.
  s = stripInline(s);

  // 10) Directive codes SEC-18 / SAF-07 (single-segment).
  s = s.replace(
    /\bSEC[-\s]?0*(\d{1,2})\b/gi,
    (_m, d: string) => `سِك ${arabicCardinal(Number(d))}`,
  );
  s = s.replace(
    /\bSAF[-\s]?0*(\d{1,2})\b/gi,
    (_m, d: string) => `ساف ${arabicCardinal(Number(d))}`,
  );

  // 11) Standalone acronyms from the dictionary (whole-token).
  const acronyms = Object.keys(FINN_SPEECH_DICTIONARY).sort((a, b) => b.length - a.length);
  s = s.replace(new RegExp(`\\b(${acronyms.join("|")})\\b`, "g"), (m) =>
    m === m.toUpperCase() ? FINN_SPEECH_DICTIONARY[m] : m,
  );

  // 12) Percent, decimals, then remaining cardinals.
  const percent = lang === "ar" ? "بالمئة" : "percent";
  s = s.replace(
    /(\d[\d,]*(?:\.\d+)?)\s*%/g,
    (_m, n: string) => `${spokenNumber(n, lang)} ${percent}`,
  );
  s = s.replace(/\d[\d,]*\.\d+/g, (m) => spokenNumber(m, lang));
  s = s.replace(/\d[\d,]*/g, (m) => spokenNumber(m, lang));

  // 13) Remaining bare symbols (protected tokens already stashed).
  const sym = (c: keyof typeof SYMBOL_WORDS) =>
    lang === "ar" ? SYMBOL_WORDS[c].ar : SYMBOL_WORDS[c].en;
  s = s
    .replace(/\+/g, ` ${sym("+")} `)
    .replace(/=/g, ` ${sym("=")} `)
    .replace(/@/g, ` ${sym("@")} `)
    .replace(/#/g, ` ${sym("#")} `)
    .replace(/&/g, ` ${sym("&")} `)
    .replace(/\//g, ` ${sym("/")} `)
    .replace(/_/g, " ");

  s = restore(s).replace(/\s+/g, " ").trim();
  return { display, speech: s };
}

/** XML-escape so input can never inject SSML/markup if ever wrapped in SSML. */
export function escapeForSSML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Split already-normalized speech into TTS segments on sentence boundaries,
 * never exceeding maxChars and never cutting a word. Because normalization ran
 * first, numbers/dates/ids/units are already whole WORDS — a split can only
 * fall on a sentence terminator or a space, never mid-token.
 */
export function chunkSpeechText(speech: string, maxChars = 4000): string[] {
  const text = speech.trim();
  if (!text) return [];
  const sentences = text.match(/[^.!?؟\n]+[.!?؟\n]*/g) ?? [text];

  const out: string[] = [];
  let buf = "";
  const flush = () => {
    const t = buf.trim();
    if (t) out.push(t);
    buf = "";
  };
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    if (sentence.length > maxChars) {
      flush();
      for (const word of sentence.split(/\s+/)) {
        if ((buf + " " + word).trim().length > maxChars) flush();
        buf = buf ? `${buf} ${word}` : word;
      }
      flush();
      continue;
    }
    if ((buf + " " + sentence).trim().length > maxChars) flush();
    buf = buf ? `${buf} ${sentence}` : sentence;
  }
  flush();

  // Merge very short trailing fragments into the previous segment (fewer TTS calls).
  const merged: string[] = [];
  for (const seg of out) {
    if (merged.length && seg.length < 8) merged[merged.length - 1] += ` ${seg}`;
    else merged.push(seg);
  }
  return merged;
}
