/**
 * من الأوراق المقروءة إلى وثائق مكتبة المعرفة (أمر المالك ٢٠٢٦/١٠/٣١) — خادمٌ فقط، نقيّ.
 *
 * يأخذ `ImportSheet[]` من `safe-spreadsheet.server.ts` ويبني وثائق نصّية تُحفظ في `finn_documents`:
 *  - **الصف سطرٌ واحد** «عمود: قيمة · عمود: قيمة» (الخلايا الفارغة تُهمل)، وتُفصل الأسطر بسطرٍ
 *    فارغ ليحزم المُقطِّع (`chunkText`) صفوفًا كاملة في كل مقطع بدل أن يشقّ الصفّ في منتصفه.
 *  - **القطع عند حدود الصفوف** لا الأحرف: وثيقة ≤ `maxCharsPerDocument` (= `KNOWLEDGE_MAX_TEXT_CHARS`
 *    يتحقق اختبارٌ من التساوي)، وعددها ≤ `maxParts`. ما بعد ذلك يُسقَط ويُعلَن بدقة (حُمّل X من Y).
 *  - **الخصوصية**: أنماط الهوية الوطنية/الإقامة (١٠ أرقام تبدأ بـ١ أو ٢، متّصلة أو مجمَّعة بفاصلٍ
 *    واحد متّسق)، والجوالات والثوابت السعودية (بصيغ التنسيق الشائعة)، وأرقام الهاتف الدولية
 *    `+` بصيغة E.164، والبريد (بجزء محلي ونطاقٍ يونيكود) تُعدّ على النص الخام ثم **تُحجب دائمًا**
 *    في النص المخزَّن، بعد تطبيع الأرقام الهندية والفارسية وعريضة العرض والفواصل المتنوّعة إلى
 *    ASCII للمطابقة فقط (الأصل يبقى كما هو خارج المطابقات). الحجب **قبل** قياس الطول فلا تتجاوز
 *    الوثيقةُ الحدَّ بسبب رموز الحجب الأطول من أصلها. كل الأنماط خطّية الزمن (فواصل محدودة العدد
 *    بين الأرقام، بلا تكرارٍ متداخل)، ويثبت ذلك اختبارٌ بمدخلاتٍ معادية طويلة.
 *  - لا يخرج من هنا نصٌّ يصل النموذج؛ الوثائق تُكتب بيد المالك وحده بعد تأكيده.
 *
 * ملاحظة صريحة: نمط الهوية يحجب أيضًا أي عددٍ من ١٠ أرقام يبدأ بـ١ أو ٢ (أرقام أوامر بعض الأنظمة
 * مثلًا). الإفراط في الحجب هو الفشل الآمن لنسخةٍ مخزَّنة، وهو مُعلَن في العدّاد لا مخفيّ.
 * وفي المقابل **لا يُحجب بلا قرينة**: تاريخٌ (٢٠٢٦/١٠/٠٦ · ٠٦/١٠/٢٠٢٦ ١٤:٣٠)، ولا عددٌ أطول من
 * ١٠ أرقام، ولا رمز صنفٍ يسبقه حرف لاتيني وفاصل، ولا فاصلة/قوسان/شرطة مائلة بين أرقامٍ مفردة.
 * والحجب **بالصيغ المعروفة فقط، لا بكل صيغة**: ما لا يُحجب بأمان يبقى خارجًا (رقمٌ مقسومٌ عبر
 * خلايا، أرقامٌ رياضية عريضة، جوالٌ غير سعودي بلا `+`، سلسلةُ هوياتٍ مجمَّعةٌ متّصلة بالفاصل نفسه).
 */
import { FINN_IMPORT_LIMITS, type FinnImportSheetSummary } from "./contract";
import { cleanCell, type ImportSheet } from "./safe-spreadsheet.server";

const LIMITS = FINN_IMPORT_LIMITS;
const fmt = new Intl.NumberFormat("ar-SA");

export const FINN_DOC_TITLE_PREFIX = "[FNN] ";
const TITLE_MAX_CHARS = 200;
const FILE_LABEL_MAX_CHARS = 80;
/** أطول سطرٍ مرسوم لصفٍّ واحد؛ ما بعده يُقتطع ويُعدّ. */
const MAX_ROW_LINE_CHARS = 20_000;
const SEPARATOR = "\n\n";

// ── حجب البيانات الشخصية ─────────────────────────────────────────────────
export const FINN_PII_TOKENS = {
  id: "[هوية محجوبة]",
  phone: "[جوال محجوب]",
  email: "[بريد محجوب]",
} as const;

export interface PiiCounts {
  id_numbers: number;
  phones: number;
  emails: number;
}

const NON_ASCII_DIGIT = /[٠-٩۰-۹０-９]/g;

/** يحوّل الأرقام الهندية/الفارسية/عريضة العرض إلى ASCII **بالطول نفسه** (فتتطابق المواضع مع الأصل). */
function foldDigits(text: string): string {
  return text.replace(NON_ASCII_DIGIT, (d) => String.fromCharCode(0x30 + (d.charCodeAt(0) & 0x0f)));
}

/**
 * يطوي علاماتٍ متنوعة إلى ASCII **محرفًا مقابل محرف** (فتتطابق المواضع مع الأصل): المسافات غير
 * القابلة للكسر وأخواتها ← مسافة · الشرطات بأنواعها (‐ ‑ ‒ – — ― −) ← `-` · الفاصلة العربية ←
 * `,` · عريضة العرض لـ `. / + @ ( )` · وعلامات الاتجاه/الربط (ZWNJ · LRM …) بين رقمين ← مسافة.
 * للمطابقة فقط؛ النص الأصلي يبقى كما هو خارج المطابقات.
 */
function foldPunct(text: string): string {
  return text
    .replace(/[\t\v\f\u0085\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, " ")
    .replace(/[\u2010-\u2015\u2212\ufe58\ufe63\uff0d]/g, "-")
    .replace(/[\u060c\uff0c]/g, ",")
    .replace(/\uff0e/g, ".")
    .replace(/[\u2044\u2215\uff0f]/g, "/")
    .replace(/\uff0b/g, "+")
    .replace(/[\ufe6b\uff20]/g, "@")
    .replace(/\uff08/g, "(")
    .replace(/\uff09/g, ")")
    .replace(/(?<=[0-9])\p{Cf}+(?=[0-9])/gu, (m) => " ".repeat(m.length));
}

// فاصل ضيّق بين أرقام الجوال: حتى محرفين من (مسافة · تنسيق · نقطة · شرطة).
const SEP = "[\\s\\p{Cf}.\\-]{0,2}";
// فاصل واسع لجوالٍ ذي بادئة معروفة: حتى ٣ محارف تضيف الفاصلة والشرطة المائلة والقوسين
// («(055) 123-4567» · «055 - 123 - 4567» · «055/123/4567» · «055,123,4567»). الواسع لا يصحّ إلا
// بين مجموعتين من رقمين فأكثر (`acceptPhone`) كي لا تصير قائمةُ أعدادٍ «٠٫٥، ١٫٢، …» جوالًا.
const GAP = "[\\s\\p{Cf}.,/()\\-]{0,3}";
const KSA_PREFIX = `\\(?(?:(?:\\+|00)?966${GAP}(?:\\(?0\\)?${GAP})?|0${GAP})`;
// بريدٌ بجزءٍ محلي ونطاقٍ يونيكود (عربي · IDN) وعمقٍ بلا سقفٍ عملي (≤ ١٢٧ مستوى = سقف RFC).
const EMAIL =
  /[\p{L}\p{M}\p{N}._%+-]{1,64}@(?:[\p{L}\p{M}\p{N}-]{1,63}\.){1,127}[\p{L}\p{M}][\p{L}\p{M}\p{N}-]{1,62}/gu;
// جوال: ببادئةٍ معروفة (٠ · ٩٦٦ · +٩٦٦ · ٠٠٩٦٦) فاصلٌ واسع، وبلا بادئةٍ ٩ أرقام تبدأ بـ٥ بفاصلٍ ضيّق.
const PHONE_MOBILE = new RegExp(
  `(?<![0-9])(?:${KSA_PREFIX}5(?:${GAP}[0-9]){8}|5(?:${SEP}[0-9]){8})(?![0-9])`,
  "gu",
);
// ثابت: مفتاح المنطقة ١١ ١٢ ١٣ ١٤ ١٦ ١٧ — البادئة (٠ أو ٩٦٦) إلزامية حتى لا يبتلع عددًا من ٩ أرقام.
const PHONE_LANDLINE = new RegExp(
  `(?<![0-9])${KSA_PREFIX}1[1-467](?:${GAP}[0-9]){7}(?![0-9])`,
  "gu",
);
// دولي E.164 عامّ: `+` ثم ٨–١٥ رقمًا بفواصل شائعة (مسافة · نقطة · شرطة · قوسان). السعودي (+966)
// له نمطاه أعلاه فيُستثنى هنا.
const INTL_GAP = "[\\s\\p{Cf}.()\\-]{0,2}";
const PHONE_INTL = new RegExp(
  `(?<![0-9])\\+(?!${INTL_GAP}966)${INTL_GAP}[1-9](?:${INTL_GAP}[0-9]){7,14}(?![0-9])`,
  "gu",
);
const NATIONAL_ID = /(?<![0-9])[12][0-9]{9}(?![0-9])/g;
// هويةٌ مجمَّعة: ١٠ أرقام أولها ١ أو ٢ بينها فاصلٌ (مسافة · شرطة · نقطة · مائلة) من ١ إلى ٣ محارف.
// لا يبدأ في منتصف سلسلة أرقام (رقم + فاصل قبله) ولا بعد حرفٍ لاتيني ملاصق أو يليه فاصل (رمز صنف
// «SKU-…»). الباقي (الفاصل المتّسق · حجم المجموعات · التاريخ · امتداد السلسلة) في `acceptGroupedId`.
const NATIONAL_ID_GROUPED =
  /(?<![0-9A-Za-z]|[0-9A-Za-z][.\-/]|[0-9] )[12](?:[ .\-/]{1,3}[0-9]|[0-9]){9}(?![0-9])/g;

// تاريخٌ في أول النص (سنة-شهر-يوم أو يوم-شهر-سنة بفاصلٍ متّسق): ليس جوالًا ولا هوية وإن تبعه رقم
// ساعة («05/10/2026 14:30» تبدو ١٠ أرقام تبدأ بـ٠٥).
const DAY = "(?:0?[1-9]|[12][0-9]|3[01])";
const MONTH = "(?:0?[1-9]|1[0-2])";
const YEAR = "(?:19|20)[0-9]{2}";
const DATE_LIKE = new RegExp(
  `^(?:${YEAR}([ ./-])${MONTH}\\1${DAY}|${DAY}([ ./-])${MONTH}\\2${YEAR})(?![0-9])`,
);
const looksLikeDate = (s: string): boolean => DATE_LIKE.test(s);

/** قبولٌ إضافيّ لمطابقةٍ مرشَّحة؛ الرفض يُبقيها كما هي. */
type Accept = (match: RegExpMatchArray, text: string) => boolean;

/** جوال/ثابت مرشَّح: ليس تاريخًا، والفاصل الواسع (، / () أو ٣ محارف) لا يقع إلا بين رقمين فأكثر. */
const acceptPhone: Accept = (match) => {
  const s = match[0].replace("(0)", ""); // «+966 (0) 55…» الصفر الاختياري ليس مجموعة
  if (looksLikeDate(s)) return false;
  const parts = s.split(/([0-9]+)/); // [فاصل، أرقام، فاصل، أرقام، …، فاصل]
  for (let i = 2; i < parts.length - 1; i += 2) {
    const wide = /[,/()]/.test(parts[i]) || parts[i].length > 2;
    if (wide && (parts[i - 1].length < 2 || parts[i + 1].length < 2)) return false;
  }
  return true;
};

/** هوية مجمَّعة مرشَّحة: فاصلٌ واحد متّسق، أول مجموعة ≤ ٥ وما بعدها ≥ ٢، ليست تاريخًا ولا بعضَ سلسلة. */
const acceptGroupedId: Accept = (match, text) => {
  const s = match[0];
  const seps = s.match(/[^0-9]+/g);
  if (!seps) return false; // متّصلة ⇐ للنمط العادي
  const sep = seps[0];
  if (seps.some((x) => x !== sep)) return false;
  const groups = s.split(sep);
  if (groups[0].length > 5 || groups.some((g, i) => i > 0 && g.length < 2)) return false;
  if (looksLikeDate(s)) return false;
  const end = (match.index ?? 0) + s.length;
  return !(text.startsWith(sep, end) && /[0-9]/.test(text.charAt(end + sep.length)));
};

function maskPattern(
  original: string,
  folded: string,
  pattern: RegExp,
  token: string,
  accept?: Accept,
): { original: string; folded: string; count: number } {
  let count = 0;
  let last = 0;
  const o: string[] = [];
  const f: string[] = [];
  for (const m of folded.matchAll(pattern)) {
    if (accept && !accept(m, folded)) continue;
    const start = m.index ?? 0;
    o.push(original.slice(last, start), token);
    f.push(folded.slice(last, start), token);
    last = start + m[0].length;
    count += 1;
  }
  if (count === 0) return { original, folded, count: 0 };
  o.push(original.slice(last));
  f.push(folded.slice(last));
  return { original: o.join(""), folded: f.join(""), count };
}

/**
 * يعدّ ويحجب. الترتيب بريد ← دولي ← هوية مجمَّعة ← جوال/ثابت سعودي ← هوية متّصلة: كل مرحلة تُبدِّل
 * مطابقاتها برمزٍ بلا أرقام فلا تعيد المرحلة التالية مطابقتها (والدوليّ قبل الهوية المجمَّعة كي لا
 * تقتطع الأخيرةُ عشرةَ أرقامٍ من منتصف «+44 20 7946 0958»). يُطبَّق على السطر الواحد (لا على النص
 * كله) كي لا يعبر فاصل `\s` في نمط الجوال حدَّ سطرين فيلصق أرقام صفّين متجاورين.
 */
export function maskPii(input: string): { text: string; counts: PiiCounts } {
  const counts: PiiCounts = { id_numbers: 0, phones: 0, emails: 0 };
  if (!input) return { text: "", counts };
  let original = input;
  let folded = foldPunct(foldDigits(input));
  const apply = (pattern: RegExp, token: string, key: keyof PiiCounts, accept?: Accept) => {
    const r = maskPattern(original, folded, pattern, token, accept);
    original = r.original;
    folded = r.folded;
    counts[key] += r.count;
  };
  if (folded.includes("@")) {
    apply(EMAIL, FINN_PII_TOKENS.email, "emails");
  }
  if (folded.includes("+")) {
    apply(PHONE_INTL, FINN_PII_TOKENS.phone, "phones");
  }
  apply(NATIONAL_ID_GROUPED, FINN_PII_TOKENS.id, "id_numbers", acceptGroupedId);
  for (const pattern of [PHONE_MOBILE, PHONE_LANDLINE]) {
    apply(pattern, FINN_PII_TOKENS.phone, "phones", acceptPhone);
  }
  apply(NATIONAL_ID, FINN_PII_TOKENS.id, "id_numbers");
  return { text: original, counts };
}

// ── بناء الوثائق ─────────────────────────────────────────────────────────
export interface BuiltPart {
  title: string;
  text: string;
  /** صفوف البيانات التي دخلت هذه الوثيقة. */
  rows: number;
}

export interface BuiltDocuments {
  parts: BuiltPart[];
  /** كل صفوف البيانات في الملف (قبل أي اقتطاع). */
  rows_total: number;
  /** ما حُمِّل فعلًا في الوثائق. */
  rows_loaded: number;
  truncated: boolean;
  /** تحذيرات عربية ثابتة الصياغة؛ لا نصّ من الملف. */
  warnings: string[];
  /** ما رُصد وحُجب في النص المخزَّن. */
  pii: PiiCounts;
}

function fileLabel(fileName: string): { text: string; counts: PiiCounts } {
  const base = fileName.split(/[\\/]/).pop() ?? "";
  const cleaned = cleanCell(base, FILE_LABEL_MAX_CHARS).text;
  const r = maskPii(cleaned);
  return { text: r.text || "ملف", counts: r.counts };
}

function renderRow(sheet: ImportSheet, row: string[]): string {
  if (sheet.plain) return row[0] ?? "";
  const pieces: string[] = [];
  for (let c = 0; c < row.length; c++) {
    const value = row[c];
    if (value === "" || value === undefined) continue;
    pieces.push(`${sheet.headers[c] ?? `عمود ${c + 1}`}: ${value}`);
  }
  return pieces.join(" · ");
}

interface OpenPart {
  lines: string[];
  length: number;
  rows: number;
  /** الورقة التي كُتب عنوانها في هذه الوثيقة (-1 ⇐ لا عنوان بعد). */
  headingSheet: number;
}

function sheetHeading(name: string, continued: boolean): string {
  return `## الورقة: ${name}${continued ? " (تابع)" : ""}`;
}

export function buildDocuments(
  sheets: readonly ImportSheet[],
  options: { fileName: string },
): BuiltDocuments {
  // العدّاد يعدّ ما **حُجب في النص المخزَّن فعلًا**: صفٌّ لم يتّسع في الوثائق (أو عنوانُ ورقةٍ لم
  // يُكتب) لا يدخل العدّ، وإن رُصد فيه نمطٌ أثناء الفحص.
  const pii: PiiCounts = { id_numbers: 0, phones: 0, emails: 0 };
  const tally = (c: PiiCounts) => {
    pii.id_numbers += c.id_numbers;
    pii.phones += c.phones;
    pii.emails += c.emails;
  };

  const open: OpenPart[] = [];
  const startPart = (): OpenPart => {
    const part: OpenPart = { lines: [], length: 0, rows: 0, headingSheet: -1 };
    open.push(part);
    return part;
  };
  const lineCost = (part: OpenPart, line: string) =>
    line.length + (part.lines.length > 0 ? SEPARATOR.length : 0);
  const push = (part: OpenPart, line: string) => {
    part.length += lineCost(part, line);
    part.lines.push(line);
  };

  let rowsTotal = 0;
  let rowsLoaded = 0;
  let readCapped = 0; // صفوف تجاوزت حدّ القراءة لكل ورقة
  let notStored = 0; // مقروءة لكنها لا تتّسع في الوثائق
  let cutRows = 0;
  let anyEstimated = false;
  let full = false;
  let current: OpenPart | null = null;

  sheets.forEach((sheet, sheetIndex) => {
    rowsTotal += sheet.rowsTotal;
    if (!sheet.rowsTotalExact) anyEstimated = true;
    readCapped += Math.max(0, sheet.rowsTotal - sheet.rows.length);
    const heading = maskPii(sheet.name);
    const headingBase = heading.text;
    let placedInSheet = 0;

    for (let r = 0; r < sheet.rows.length; r++) {
      if (full) {
        notStored += 1;
        continue;
      }
      let line = renderRow(sheet, sheet.rows[r]);
      if (line === "") {
        rowsLoaded += 1; // صفٌّ بلا خلايا مرسومة: لا نصّ، ولا يُعدّ اقتطاعًا
        continue;
      }
      if (line.length > MAX_ROW_LINE_CHARS) {
        line = line.slice(0, MAX_ROW_LINE_CHARS).trimEnd();
        cutRows += 1;
      }
      const maskedLine = maskPii(line);
      line = maskedLine.text;

      // يتّسع في الوثيقة الحالية؟ وإلا نفتح التالية إن بقي لنا منها.
      for (let attempt = 0; attempt < 2; attempt++) {
        if (current === null) current = startPart();
        const needsHeading = current.headingSheet !== sheetIndex;
        const headingLine = needsHeading ? sheetHeading(headingBase, placedInSheet > 0) : "";
        const headingCost = needsHeading ? lineCost(current, headingLine) : 0;
        // بعد العنوان (أو مع سطرٍ سابق) يسبق السطرَ فاصل.
        const lineAfter =
          line.length + (needsHeading || current.lines.length > 0 ? SEPARATOR.length : 0);
        if (current.length + headingCost + lineAfter <= LIMITS.maxCharsPerDocument) {
          if (needsHeading) {
            push(current, headingLine);
            current.headingSheet = sheetIndex;
            if (placedInSheet === 0) tally(heading.counts); // أول كتابةٍ لعنوان هذه الورقة
          }
          tally(maskedLine.counts);
          push(current, line);
          current.rows += 1;
          rowsLoaded += 1;
          placedInSheet += 1;
          break;
        }
        // لا يتّسع: افتح وثيقةً جديدة أو أعلن الامتلاء.
        if (open.length >= LIMITS.maxParts || current.lines.length === 0) {
          full = true;
          notStored += 1;
          break;
        }
        current = startPart();
      }
    }
  });

  // العناوين والأجزاء.
  const label = fileLabel(options.fileName);
  const partCount = open.length;
  if (partCount > 0) tally(label.counts); // الاسم يدخل عنوانَ كل وثيقة محجوبًا: يُعدّ مرّةً
  const parts: BuiltPart[] = open.map((p, i) => {
    let suffix: string;
    if (partCount > 1) suffix = `جزء ${fmt.format(i + 1)}/${fmt.format(partCount)}`;
    else if (sheets.length === 1) suffix = maskPii(sheets[0].name).text || "الورقة";
    else suffix = `${fmt.format(sheets.length)} أوراق`;
    const title = cutTitle(`${FINN_DOC_TITLE_PREFIX}${label.text} — ${suffix}`);
    return { title, text: p.lines.join(SEPARATOR), rows: p.rows };
  });

  const warnings: string[] = [];
  const approx = anyEstimated ? "نحو " : "";
  if (readCapped > 0) {
    warnings.push(
      `تجاوزت أوراقٌ في الملف حدّ القراءة (${fmt.format(LIMITS.maxRowsPerSheet)} صفًّا لكل ورقة)، فلم تُقرأ ${approx}${fmt.format(readCapped)} صفًّا.`,
    );
  }
  if (notStored > 0) {
    warnings.push(
      `لم تتّسع ${fmt.format(notStored)} صفًّا في الوثائق (الحدّ ${fmt.format(LIMITS.maxParts)} وثائق × ${fmt.format(LIMITS.maxCharsPerDocument)} حرف) فلم تُحمَّل.`,
    );
  }
  if (cutRows > 0) {
    warnings.push(
      `اقتُطع ${fmt.format(cutRows)} صفًّا طويلًا عند ${fmt.format(MAX_ROW_LINE_CHARS)} حرفًا.`,
    );
  }
  const truncated = rowsLoaded < rowsTotal;
  if (truncated) {
    warnings.unshift(
      `الملف لم يُحمَّل كاملًا: سيُحمَّل ${fmt.format(rowsLoaded)} صفًّا من أصل ${approx}${fmt.format(rowsTotal)}.`,
    );
  }
  return {
    parts,
    rows_total: rowsTotal,
    rows_loaded: rowsLoaded,
    truncated,
    warnings,
    pii,
  };
}

function cutTitle(title: string): string {
  if (title.length <= TITLE_MAX_CHARS) return title;
  return `${title.slice(0, TITLE_MAX_CHARS - 1).trimEnd()}…`;
}

/**
 * ملخّص الأوراق للمعاينة (للمالك وحده في الواجهة؛ لا يدخل سياق النموذج). الترويسات تُقتطع وتُحجب
 * فيها الأنماط الشخصية — ملفٌّ بلا صفّ ترويسة يجعل صفَّ بياناتٍ ترويسةً فلا يُعرض خامًا.
 */
export function summarizeSheets(sheets: readonly ImportSheet[]): FinnImportSheetSummary[] {
  return sheets.map((sheet) => ({
    name: maskPii(sheet.name).text,
    rows: sheet.rows.length,
    cols: sheet.headers.length,
    headers: sheet.headers
      .slice(0, LIMITS.previewHeaders)
      .map((h) => maskPii(cleanCell(h, LIMITS.previewHeaderChars).text).text),
  }));
}
