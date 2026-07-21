/**
 * Arabic text shaping + run layout for PDF drawing.
 *
 * pdf-lib performs NO complex-script shaping, so Arabic is pre-shaped into
 * Unicode Presentation Forms-B (U+FE70–FEFF) here. Ordering, however, is
 * NOT ours to do inside a run: fontkit applies its own bidi reversal to
 * every RTL run it receives, so Arabic content must be handed over in
 * LOGICAL order — pre-reversing it produces double-reversed (backwards)
 * text. That double reversal was the exact defect seen in generated
 * reports («ةيموي تايلمعلا ريرقت»).
 *
 * What we DO own is the placement of runs across the line (the drawing
 * code positions each segment at an explicit x): layoutArabicLine()
 * returns draw-ready segments in VISUAL order — RTL base direction, with
 * embedded Latin/digit runs kept LTR and drawn by a Latin-capable font so
 * they never pass through fontkit's bidi. The bundled font subsets
 * (public/fonts/nexios-arabic{,-bold}.ttf — IBM Plex Sans Arabic, SIL
 * OFL) map every presentation form + lam-alef ligature produced here.
 * Harakat are stripped — combining-mark placement is unreliable in flat
 * PDF drawing.
 */

type Forms = { isolated: number; final: number; initial?: number; medial?: number };

/** Contextual forms for each base letter (Presentation Forms-B). */
const FORMS: Record<number, Forms> = {
  0x0621: { isolated: 0xfe80, final: 0xfe80 }, // ء
  0x0622: { isolated: 0xfe81, final: 0xfe82 }, // آ
  0x0623: { isolated: 0xfe83, final: 0xfe84 }, // أ
  0x0624: { isolated: 0xfe85, final: 0xfe86 }, // ؤ
  0x0625: { isolated: 0xfe87, final: 0xfe88 }, // إ
  0x0626: { isolated: 0xfe89, final: 0xfe8a, initial: 0xfe8b, medial: 0xfe8c }, // ئ
  0x0627: { isolated: 0xfe8d, final: 0xfe8e }, // ا
  0x0628: { isolated: 0xfe8f, final: 0xfe90, initial: 0xfe91, medial: 0xfe92 }, // ب
  0x0629: { isolated: 0xfe93, final: 0xfe94 }, // ة
  0x062a: { isolated: 0xfe95, final: 0xfe96, initial: 0xfe97, medial: 0xfe98 }, // ت
  0x062b: { isolated: 0xfe99, final: 0xfe9a, initial: 0xfe9b, medial: 0xfe9c }, // ث
  0x062c: { isolated: 0xfe9d, final: 0xfe9e, initial: 0xfe9f, medial: 0xfea0 }, // ج
  0x062d: { isolated: 0xfea1, final: 0xfea2, initial: 0xfea3, medial: 0xfea4 }, // ح
  0x062e: { isolated: 0xfea5, final: 0xfea6, initial: 0xfea7, medial: 0xfea8 }, // خ
  0x062f: { isolated: 0xfea9, final: 0xfeaa }, // د
  0x0630: { isolated: 0xfeab, final: 0xfeac }, // ذ
  0x0631: { isolated: 0xfead, final: 0xfeae }, // ر
  0x0632: { isolated: 0xfeaf, final: 0xfeb0 }, // ز
  0x0633: { isolated: 0xfeb1, final: 0xfeb2, initial: 0xfeb3, medial: 0xfeb4 }, // س
  0x0634: { isolated: 0xfeb5, final: 0xfeb6, initial: 0xfeb7, medial: 0xfeb8 }, // ش
  0x0635: { isolated: 0xfeb9, final: 0xfeba, initial: 0xfebb, medial: 0xfebc }, // ص
  0x0636: { isolated: 0xfebd, final: 0xfebe, initial: 0xfebf, medial: 0xfec0 }, // ض
  0x0637: { isolated: 0xfec1, final: 0xfec2, initial: 0xfec3, medial: 0xfec4 }, // ط
  0x0638: { isolated: 0xfec5, final: 0xfec6, initial: 0xfec7, medial: 0xfec8 }, // ظ
  0x0639: { isolated: 0xfec9, final: 0xfeca, initial: 0xfecb, medial: 0xfecc }, // ع
  0x063a: { isolated: 0xfecd, final: 0xfece, initial: 0xfecf, medial: 0xfed0 }, // غ
  0x0641: { isolated: 0xfed1, final: 0xfed2, initial: 0xfed3, medial: 0xfed4 }, // ف
  0x0642: { isolated: 0xfed5, final: 0xfed6, initial: 0xfed7, medial: 0xfed8 }, // ق
  0x0643: { isolated: 0xfed9, final: 0xfeda, initial: 0xfedb, medial: 0xfedc }, // ك
  0x0644: { isolated: 0xfedd, final: 0xfede, initial: 0xfedf, medial: 0xfee0 }, // ل
  0x0645: { isolated: 0xfee1, final: 0xfee2, initial: 0xfee3, medial: 0xfee4 }, // م
  0x0646: { isolated: 0xfee5, final: 0xfee6, initial: 0xfee7, medial: 0xfee8 }, // ن
  0x0647: { isolated: 0xfee9, final: 0xfeea, initial: 0xfeeb, medial: 0xfeec }, // ه
  0x0648: { isolated: 0xfeed, final: 0xfeee }, // و
  0x0649: { isolated: 0xfeef, final: 0xfef0 }, // ى
  0x064a: { isolated: 0xfef1, final: 0xfef2, initial: 0xfef3, medial: 0xfef4 }, // ي
  0x0640: { isolated: 0x0640, final: 0x0640, initial: 0x0640, medial: 0x0640 }, // ـ
};

/** lam + alef variants → mandatory ligatures (isolated, final). */
const LAM_ALEF: Record<number, [number, number]> = {
  0x0622: [0xfef5, 0xfef6],
  0x0623: [0xfef7, 0xfef8],
  0x0625: [0xfef9, 0xfefa],
  0x0627: [0xfefb, 0xfefc],
};

const HARAKAT = /[ً-ٰٕ]/g;

const isArabicLetter = (cp: number) => FORMS[cp] !== undefined;
const joinsBefore = (cp: number) => {
  const f = FORMS[cp];
  return !!f && f.initial !== undefined; // dual-joining letters connect forward
};

/** Shape one Arabic word (letters only) into presentation forms. */
function shapeWord(word: string): string {
  const src = Array.from(word).map((c) => c.codePointAt(0)!);
  const out: number[] = [];
  let i = 0;
  while (i < src.length) {
    const cp = src[i]!;
    const forms = FORMS[cp];
    if (!forms) {
      out.push(cp);
      i += 1;
      continue;
    }
    const prev = i > 0 ? src[i - 1]! : null;
    const connectsFromPrev = prev !== null && isArabicLetter(prev) && joinsBefore(prev);

    // Mandatory lam-alef ligature.
    if (cp === 0x0644 && i + 1 < src.length && LAM_ALEF[src[i + 1]!]) {
      const [iso, fin] = LAM_ALEF[src[i + 1]!]!;
      out.push(connectsFromPrev ? fin : iso);
      i += 2;
      continue;
    }

    const next = i + 1 < src.length ? src[i + 1]! : null;
    const connectsToNext = next !== null && isArabicLetter(next) && joinsBefore(cp);
    let form: number;
    if (connectsFromPrev && connectsToNext) form = forms.medial ?? forms.final;
    else if (connectsFromPrev) form = forms.final;
    else if (connectsToNext) form = forms.initial ?? forms.isolated;
    else form = forms.isolated;
    out.push(form);
    i += 1;
  }
  return String.fromCodePoint(...out);
}

const AR_RUN = /[\u0621-\u064A\u0640]+/g;
const RTL_CHAR = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const NEUTRAL = /^[\s\u060C\u061B\u061F.,:;!?()%\u00AB\u00BB\-\u2013\u2014\u00B7\u2022/]+$/;
const AR_SCRIPT_SPLIT =
  /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]+|[^\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;

/** One draw-ready piece of a line: `ar` picks the Arabic font (fontkit
 *  path — content in LOGICAL order, fontkit's bidi flips it) vs the Latin
 *  font (digits/ASCII — drawn verbatim, immune to fontkit's bidi). */
export type ArabicSegment = { ar: boolean; text: string };

/**
 * Shape + lay out a mixed Arabic/Latin/digit line for manual placement.
 * Returns segments in VISUAL order (place them left-to-right; right-align
 * the total yourself). Arabic segment CONTENT stays in logical order on
 * purpose — fontkit applies its own bidi reversal per RTL run, so
 * pre-reversed content would come out backwards (the exact defect this
 * replaces; see header comment).
 */
export function layoutArabicLine(input: string): ArabicSegment[] {
  const stripped = input.replace(HARAKAT, "");
  // Shape every Arabic letter-run into presentation forms, logical order.
  const shaped = stripped.replace(AR_RUN, (w) => shapeWord(w));

  // Tokenize, classify, group into direction runs.
  const tokens = shaped.split(/(\s+)/).filter((t) => t.length > 0);
  type Run = { rtl: boolean; parts: string[] };
  const runs: Run[] = [];
  let current: Run | null = null;
  for (const tok of tokens) {
    const prevRtl: boolean = current ? current.rtl : true;
    const rtl: boolean = RTL_CHAR.test(tok) || (NEUTRAL.test(tok) ? prevRtl : false);
    if (!current || current.rtl !== rtl) {
      current = { rtl, parts: [tok] };
      runs.push(current);
    } else {
      current.parts.push(tok);
    }
  }

  // Emit runs in reverse (RTL base direction). Inside an RTL run the
  // script sub-segments are ALSO emitted in reverse so their left-to-right
  // placement reads right-to-left — while each sub-segment's content stays
  // logical (Arabic → fontkit flips it; digits/ASCII → drawn verbatim, so
  // numbers keep most-significant-first without any digit protection).
  const segments: ArabicSegment[] = [];
  const push = (ar: boolean, text: string) => {
    const last = segments[segments.length - 1];
    if (last && last.ar === ar) last.text += text;
    else segments.push({ ar, text });
  };
  for (const run of runs.reverse()) {
    if (!run.rtl) {
      push(false, run.parts.join(""));
      continue;
    }
    // Mirror paired punctuation: fontkit's reversal flips positions but
    // not glyphs, so a logical "(" must be handed over as ")".
    const text = run.parts.join("").replace(/[()]/g, (c) => (c === "(" ? ")" : "("));
    const subs = text.match(AR_SCRIPT_SPLIT);
    if (!subs) continue;
    for (const sub of subs.reverse()) push(RTL_CHAR.test(sub), sub);
  }
  return segments;
}

/** Flat convenience: the visual line as one string (segment order only —
 *  Arabic content logical). Prefer layoutArabicLine() for drawing. */
export function shapeArabic(input: string): string {
  return layoutArabicLine(input)
    .map((s) => s.text)
    .join("");
}

/** Convert Western digits to Arabic-Indic (optional nicety for headers). */
export function toArabicDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => String.fromCodePoint(0x0660 + Number(d)));
}
