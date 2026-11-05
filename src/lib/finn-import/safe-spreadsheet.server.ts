/**
 * قارئ الملفات الآمن لاستيراد فِن (أمر المالك ٢٠٢٦/١٠/٣١) — خادمٌ فقط، في الذاكرة، بلا أي كتابة.
 *
 * يحوّل ملفًّا مرفوعًا (xlsx · csv · tsv · txt · md · json) إلى أوراقٍ نصّية `ImportSheet[]` بحدود
 * `FINN_IMPORT_LIMITS`. **النموذج لا يرى شيئًا من هذا**: الناتج يمرّ إلى `to-text.server.ts` ثم إلى
 * مكتبة المعرفة بأمر المالك وحده.
 *
 * مبادئ ثابتة:
 *  - **المحتوى يطابق الامتداد**: xlsx يبدأ بـ`PK\x03\x04`؛ والأنواع النصّية لا تبدأ بتوقيع تنفيذي
 *    (PE/ELF/Mach-O/shebang) ولا بحاوية (zip/pdf/OLE/صورة) — تُرفض بدل أن تُقرأ نصًّا مشوّهًا.
 *  - **xlsx**: يمرّ على `safe-zip.server.ts` أوّلًا، ولا تُمرَّر للمكتبة إلا البايتات النظيفة
 *    المُعاد تغليفها. وخيارات المكتبة الافتراضية غير آمنة، فتُمرَّر دائمًا صريحةً:
 *    `cellFormula:false` (الصيغ نصٌّ خامل لا يُقيَّم ولا يُحفظ) · `cellHTML:false` · `bookVBA:false`
 *    · `dense:true` · `sheetRows: حدّ+٢` · `cellDates:true`. و`sheetRows` وحده لا يقصّ إلا حين
 *    يعلن الملف صفوفًا أكثر، فالقصّ **يُعاد هنا**: لا نمشي على النطاق المعلن أبدًا، بل على المصفوفة
 *    الكثيفة الفعلية بسقف صفوفٍ وأعمدة (ملفٌّ يعلن `A1:XFD1048576` يكلّف `sheet_to_json` نحو
 *    ٦٫٦ مللي ثانية للصفّ المعلن).
 *  - **كلفة التحليل مسقوفة بثلاث طرق (تدقيق ٢٠٢٦/١٠/٣١):** ① `sheets` تُمرَّر للمكتبة بمواضع أول
 *    `maxSheets` ورقة ظاهرة فلا تُحلَّل غيرها، ومصنّفٌ يحيل ورقتان مقروءتان منه إلى جزءٍ واحد
 *    مرفوض `malformed`؛ ② ميزانية محارف تراكمية (`FINN_XLSX_MAX_READ_CHARS`) تقطع القراءة وتُنذر
 *    بصدق قبل أن تُبنى مصفوفةٌ من ملايين الخلايا الطويلة؛ ③ مسح XML خطّي (لا تعابير تتراجع).
 *  - **لا كائنَ بمفاتيح من الملف**: الترويسات والأعمدة مصفوفاتٌ و`Map` فقط، فترويسة
 *    `__proto__` أو `constructor` تبقى نصًّا ولا تلوّث شيئًا.
 *  - **الأعداد الحقيقية**: `rowsTotal`/`colsTotal` أحجام الملف لا الأحجام المقروءة؛ فإن تعذّر الجزم
 *    (xlsx تجاوز حدّه) فـ`rowsTotalExact=false` والرقم تقدير مُعلَن لا يُقدَّم يقينًا (المادة ٢٧).
 *  - **لا تسريب**: لا `console` هنا، ولا يخرج نصٌّ من الملف في خطأ أو تحذير (التحذيرات تشير إلى
 *    الورقة برقمها لا باسمها). كل فشلٍ رمزٌ من العقد مع رسالةٍ عربية ثابتة.
 */
import {
  FINN_IMPORT_EXTENSIONS,
  FINN_IMPORT_LIMITS,
  type FinnImportErrorCode,
  type FinnImportFileKind,
} from "./contract";
import { FINN_IMPORT_LEGACY_EXCEL_MESSAGE_AR, finnImportMessageAr } from "./messages.server";
import { forEachXmlAttr, inspectXlsxZip, scanXmlTags } from "./safe-zip.server";

const LIMITS = FINN_IMPORT_LIMITS;
const fmt = new Intl.NumberFormat("ar-SA");

/** عمق JSON الأقصى المقبول (يُرفض ما يتجاوزه قبل أي معالجة تكرارية). */
export const FINN_JSON_MAX_DEPTH = 32;

/**
 * سقف مجموع محارف الخلايا المنظَّفة المقروءة من مصنّف xlsx كلّه (كل الأوراق). ما يُخزَّن فعلًا لا
 * يتجاوز `maxParts × maxCharsPerDocument` (ويستهلك العنوانُ المرسوم قبل كل قيمة جزءًا منه)، فالأربعة
 * أضعافه هامشٌ كافٍ، وما بعده لا يصل مكتبة المعرفة أصلًا. بدونه تُنشئ سلاسلُ مشتركة طويلة تُحال إليها
 * ملايين الخلايا مصفوفةً كاملة (قِيس: 4.1 غيغابايت و47 ثانية من ملف 2.2 ميغابايت). الفحص لكل صفّ، فالتجاوز
 * لا يزيد على صفٍّ واحد (≤ `maxCols × maxCellChars`).
 */
export const FINN_XLSX_MAX_READ_CHARS = LIMITS.maxParts * LIMITS.maxCharsPerDocument * 4;

export interface ImportSheet {
  name: string;
  /** ترويسات الأعمدة بعد التنظيف (الفارغ يُسمّى «عمود N»). فارغة لورقة نصّية صِرفة. */
  headers: string[];
  /** صفوف البيانات المقروءة (بعد الترويسة)، كلٌّ بعرض `headers.length`. */
  rows: string[][];
  /** صفوف البيانات في الملف (قبل اقتطاع الحدّ). */
  rowsTotal: number;
  /** `false` ⇐ `rowsTotal` تقدير (تجاوز الحدّ في xlsx ولم يُعدّ كل صفٍّ). */
  rowsTotalExact: boolean;
  /** الأعمدة في الملف (قبل اقتطاع `maxCols`). */
  colsTotal: number;
  /** ورقة أسطر نصّية (txt/md/json غير الجدولي): تُرسَم السطور كما هي بلا «عمود: قيمة». */
  plain: boolean;
}

export interface ReadImportOk {
  ok: true;
  kind: FinnImportFileKind;
  sheets: ImportSheet[];
  /** عدد الأوراق في الملف (قبل التجاهل والحدّ). */
  sheetsTotal: number;
  /** تحذيرات عربية ثابتة الصياغة؛ لا تحوي نصًّا من الملف. */
  warnings: string[];
}

export interface ReadImportFailure {
  ok: false;
  error: FinnImportErrorCode;
  /** رسالة عربية ثابتة آمنة للعرض. */
  message_ar: string;
}

export type ReadImportResult = ReadImportOk | ReadImportFailure;

function failure(error: FinnImportErrorCode, message?: string): ReadImportFailure {
  return { ok: false, error, message_ar: message ?? finnImportMessageAr(error) };
}

// ── تنظيف النص ───────────────────────────────────────────────────────────
// يُزال: محارف التحكّم، والعرض الصفري/الرابط الكلمي/BOM داخل النص، وتجاوزات الاتجاه والعزل
// (U+202A–202E, U+2066–2069: تزييف العرض على المالك)، ومحارف الوسوم U+E0000–E007F (حقن تعليمات
// خفيّ). تبقى LRM/RLM/ALM وZWJ/ZWNJ لأنها جزء من الكتابة العربية/الفارسية السليمة.
/* eslint-disable no-control-regex -- المطلوب بالضبط إزالة محارف التحكّم */
const STRIP_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B\u2060\uFEFF\u202A-\u202E\u2066-\u2069\u{E0000}-\u{E007F}]/gu;
const STRIP_CHARS_KEEP_TAB =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B\u2060\uFEFF\u202A-\u202E\u2066-\u2069\u{E0000}-\u{E007F}]/gu;
/* eslint-enable no-control-regex */
const WHITESPACE_RUN = /[\s\u0085]+/g;

function cutSafely(text: string, max: number): string {
  if (text.length <= max) return text;
  let end = max;
  const code = text.charCodeAt(end - 1);
  if (code >= 0xd800 && code <= 0xdbff) end -= 1; // لا نقطع زوجًا بديلًا
  return text.slice(0, end);
}

/** خلية: يُزال التحكّم وتُطوى المسافات/الأسطر وتُقتطع عند `max`. */
export function cleanCell(
  raw: string,
  max: number = LIMITS.maxCellChars,
): { text: string; truncated: boolean } {
  // سقفٌ مسبق يمنع تكلفة التعبير النمطي على خليةٍ بحجم ميغابايت.
  const bounded = raw.length > max * 4 ? raw.slice(0, max * 4) : raw;
  const cleaned = bounded.replace(STRIP_CHARS, "").replace(WHITESPACE_RUN, " ").trim();
  const over = raw.length > bounded.length || cleaned.length > max;
  return { text: over ? cutSafely(cleaned, max).trimEnd() : cleaned, truncated: over };
}

/** سطر نصّ صِرف: يُزال التحكّم وتُقصّ النهاية وتبقى المسافات الداخلية. */
function cleanLine(raw: string): string {
  return raw.replace(STRIP_CHARS_KEEP_TAB, "").replace(/\t/g, " ").trimEnd();
}

// ── كشف النوع من البايتات ────────────────────────────────────────────────
const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] as const;

type Sniffed = "executable" | "container" | null;

function startsWith(b: Uint8Array, sig: readonly number[]): boolean {
  if (b.length < sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (b[i] !== sig[i]) return false;
  return true;
}

function sniff(b: Uint8Array): Sniffed {
  // تنفيذية: PE (MZ + بايت صفر في الترويسة، فلا يُظلم csv يبدأ بالحرفين MZ) · ELF · Mach-O/Java · shebang.
  if (startsWith(b, [0x4d, 0x5a]) && b.subarray(2, 64).includes(0)) return "executable";
  if (startsWith(b, [0x7f, 0x45, 0x4c, 0x46])) return "executable";
  if (
    startsWith(b, [0xfe, 0xed, 0xfa, 0xce]) ||
    startsWith(b, [0xfe, 0xed, 0xfa, 0xcf]) ||
    startsWith(b, [0xce, 0xfa, 0xed, 0xfe]) ||
    startsWith(b, [0xcf, 0xfa, 0xed, 0xfe]) ||
    startsWith(b, [0xca, 0xfe, 0xba, 0xbe])
  ) {
    return "executable";
  }
  if (
    startsWith(b, [0x23, 0x21]) &&
    /^#!\s*\//.test(new TextDecoder("latin1").decode(b.subarray(0, 64)))
  ) {
    return "executable";
  }
  // حاويات/مستندات لا تُقرأ نصًّا.
  if (
    startsWith(b, [0x50, 0x4b, 0x03, 0x04]) ||
    startsWith(b, [0x50, 0x4b, 0x05, 0x06]) ||
    startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d]) || // %PDF-
    startsWith(b, OLE_SIGNATURE) || // OLE (xls/doc القديم)
    startsWith(b, [0x47, 0x49, 0x46, 0x38]) || // GIF8
    startsWith(b, [0x89, 0x50, 0x4e, 0x47]) || // PNG
    startsWith(b, [0xff, 0xd8, 0xff]) || // JPEG
    startsWith(b, [0x1f, 0x8b]) || // gzip
    startsWith(b, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]) || // 7z
    startsWith(b, [0x52, 0x61, 0x72, 0x21]) // Rar!
  ) {
    return "container";
  }
  return null;
}

// ── فك ترميز النص ────────────────────────────────────────────────────────
type Decoded = { ok: true; text: string; warnings: string[] } | ReadImportFailure;

const WARN_WINDOWS_1256 =
  "تعذّرت قراءة الملف بترميز UTF-8 فقُرئ بترميز Windows-1256 (عربي). تحقق من سلامة الحروف قبل التأكيد، وفضّل حفظه بترميز UTF-8.";

function swapBytePairs(b: Uint8Array): Uint8Array {
  const out = new Uint8Array(b.length - (b.length % 2));
  for (let i = 0; i + 1 < b.length; i += 2) {
    out[i] = b[i + 1];
    out[i + 1] = b[i];
  }
  return out;
}

function decodeText(bytes: Uint8Array): Decoded {
  const b0 = bytes[0];
  const b1 = bytes[1];
  // UTF-32 غير مدعوم (قد يبدو UTF-16 مع أصفار).
  if (
    (b0 === 0xff && b1 === 0xfe && bytes[2] === 0 && bytes[3] === 0) ||
    (b0 === 0 && b1 === 0 && bytes[2] === 0xfe && bytes[3] === 0xff)
  ) {
    return failure("unsupported_type");
  }
  try {
    if (b0 === 0xef && b1 === 0xbb && bytes[2] === 0xbf) {
      return {
        ok: true,
        text: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
        warnings: [],
      };
    }
    if (b0 === 0xff && b1 === 0xfe) {
      if (bytes.length % 2 !== 0) return failure("malformed");
      return {
        ok: true,
        text: new TextDecoder("utf-16le", { fatal: true }).decode(bytes),
        warnings: [],
      };
    }
    if (b0 === 0xfe && b1 === 0xff) {
      if (bytes.length % 2 !== 0) return failure("malformed");
      const swapped = swapBytePairs(bytes);
      return {
        ok: true,
        text: new TextDecoder("utf-16le", { fatal: true }).decode(swapped),
        warnings: [],
      };
    }
  } catch {
    return failure("malformed");
  }
  // بلا BOM: البايت الصفري يعني ثنائيًّا (أو UTF-16 بلا علامة) ⇒ مرفوض.
  if (bytes.includes(0)) return failure("malformed");
  try {
    return {
      ok: true,
      text: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      warnings: [],
    };
  } catch {
    // ليس UTF-8 سليمًا: ملفات Excel العربية القديمة تُصدَّر Windows-1256.
  }
  try {
    return {
      ok: true,
      text: new TextDecoder("windows-1256").decode(bytes),
      warnings: [WARN_WINDOWS_1256],
    };
  } catch {
    return failure("malformed");
  }
}

// ── CSV/TSV (RFC 4180) ───────────────────────────────────────────────────
interface DelimitedTable {
  /** أول سجلٍّ غير فارغ. */
  header: string[];
  rows: string[][];
  rowsTotal: number;
  colsTotal: number;
  truncatedCells: number;
}

const CANDIDATE_DELIMITERS = [",", ";", "\t", "|"] as const;

/** يختار الفاصل الأكثر ورودًا في السطر الأول المنطقي (خارج الاقتباس). الافتراضي الفاصلة. */
function detectDelimiter(text: string): string {
  const counts = new Map<string, number>(CANDIDATE_DELIMITERS.map((d) => [d, 0]));
  let inQuotes = false;
  const end = Math.min(text.length, 16_384);
  for (let i = 0; i < end; i++) {
    const ch = text[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (ch === "\n" || ch === "\r") break;
    const c = counts.get(ch);
    if (c !== undefined) counts.set(ch, c + 1);
  }
  let best = ",";
  let bestCount = 0;
  for (const d of CANDIDATE_DELIMITERS) {
    const c = counts.get(d) ?? 0;
    if (c > bestCount) {
      best = d;
      bestCount = c;
    }
  }
  return best;
}

/** `null` ⇐ علامة اقتباس لم تُغلق (الملف مشوّه، لا نخمّن). */
function parseDelimited(text: string, delimiter: string): DelimitedTable | null {
  const maxRows = LIMITS.maxRowsPerSheet;
  const maxCols = LIMITS.maxCols;
  const rawCap = LIMITS.maxCellChars * 2;
  const delimCode = delimiter.charCodeAt(0);

  let header: string[] | null = null;
  const rows: string[][] = [];
  let rowsTotal = 0;
  let colsTotal = 0;
  let truncatedCells = 0;

  let record: string[] = [];
  let recordHasContent = false;
  let recordFields = 0;
  let field = "";
  let inQuotes = false;
  let fieldStarted = false;

  const endField = () => {
    recordFields += 1;
    if (record.length < maxCols) {
      const cleaned = cleanCell(field);
      if (cleaned.truncated) truncatedCells += 1;
      record.push(cleaned.text);
      if (cleaned.text !== "") recordHasContent = true;
    } else if (!recordHasContent && field.trim() !== "") {
      recordHasContent = true;
    }
    field = "";
    fieldStarted = false;
  };

  const endRecord = () => {
    const had = recordHasContent;
    const width = recordFields;
    const captured = record;
    record = [];
    recordHasContent = false;
    recordFields = 0;
    if (!had) return; // سطرٌ فارغ أو كلُّه خلايا فارغة
    if (width > colsTotal) colsTotal = width;
    if (header === null) {
      header = captured;
      return;
    }
    rowsTotal += 1;
    if (rows.length < maxRows) rows.push(captured);
  };

  const n = text.length;
  for (let i = 0; i < n; i++) {
    const code = text.charCodeAt(i);
    if (inQuotes) {
      if (code === 0x22) {
        if (text.charCodeAt(i + 1) === 0x22) {
          if (field.length < rawCap) field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else if (field.length < rawCap) {
        field += text[i];
      }
      continue;
    }
    if (code === 0x22 && !fieldStarted && field === "") {
      inQuotes = true;
      fieldStarted = true;
      continue;
    }
    if (code === delimCode) {
      endField();
      continue;
    }
    if (code === 0x0a || code === 0x0d) {
      if (code === 0x0d && text.charCodeAt(i + 1) === 0x0a) i += 1;
      endField();
      endRecord();
      continue;
    }
    fieldStarted = true;
    if (field.length < rawCap) field += text[i];
  }
  if (inQuotes) return null;
  if (fieldStarted || field !== "" || recordFields > 0) {
    endField();
    endRecord();
  }
  return { header: header ?? [], rows, rowsTotal, colsTotal, truncatedCells };
}

// ── أسطر نصّية ───────────────────────────────────────────────────────────
function splitLongLine(line: string, max: number): string[] {
  if (line.length <= max) return [line];
  const pieces: string[] = [];
  let rest = line;
  while (rest.length > max) {
    let cut = -1;
    for (let i = max; i >= Math.floor(max / 2); i--) {
      if (rest.charCodeAt(i) === 32) {
        cut = i;
        break;
      }
    }
    const end = cut > 0 ? cut : cutSafely(rest, max).length;
    pieces.push(rest.slice(0, end).trimEnd());
    rest = rest.slice(cut > 0 ? cut + 1 : end).trimStart();
  }
  if (rest) pieces.push(rest);
  return pieces.filter((p) => p !== "");
}

const PLAIN_SHEET_NAME = "النص";

function linesToSheet(rawLines: Iterable<string>): ImportSheet {
  const rows: string[][] = [];
  let rowsTotal = 0;
  for (const raw of rawLines) {
    const line = cleanLine(raw);
    if (line.trim() === "") continue;
    for (const piece of splitLongLine(line, LIMITS.maxCellChars)) {
      rowsTotal += 1;
      if (rows.length < LIMITS.maxRowsPerSheet) rows.push([piece]);
    }
  }
  return {
    name: PLAIN_SHEET_NAME,
    headers: [],
    rows,
    rowsTotal,
    rowsTotalExact: true,
    colsTotal: 1,
    plain: true,
  };
}

const LINE_BREAKS = /\r\n|\r|\n|\u2028|\u2029/;

// ── JSON ─────────────────────────────────────────────────────────────────
/** عمق القيمة يتجاوز `max`؟ تكراري بمكدّس صريح (لا استدعاء ذاتي على بنيةٍ عدائية). */
function jsonTooDeep(root: unknown, max: number): boolean {
  const stack: Array<[unknown, number]> = [[root, 1]];
  while (stack.length > 0) {
    const [value, depth] = stack.pop() as [unknown, number];
    if (value === null || typeof value !== "object") continue;
    if (depth > max) return true;
    if (Array.isArray(value)) {
      for (const item of value) stack.push([item, depth + 1]);
    } else {
      for (const key of Object.keys(value))
        stack.push([(value as Record<string, unknown>)[key], depth + 1]);
    }
  }
  return false;
}

function isFlatObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  for (const key of Object.keys(value)) {
    const v = (value as Record<string, unknown>)[key];
    if (v !== null && typeof v === "object") return false;
  }
  return true;
}

/** حدّ أعمدة JSON المميّزة التي نعدّها قبل التوقف (الباقي لا يضيف معلومة). */
const JSON_COLUMN_COUNT_CAP = LIMITS.maxCols * 100;

function jsonScalar(value: unknown): { text: string; truncated: boolean } {
  if (value === null || value === undefined) return { text: "", truncated: false };
  if (typeof value === "string") return cleanCell(value);
  if (typeof value === "number")
    return { text: Number.isFinite(value) ? String(value) : "", truncated: false };
  if (typeof value === "boolean") return { text: value ? "true" : "false", truncated: false };
  return { text: "", truncated: false };
}

function readJson(
  text: string,
): { sheet: ImportSheet; truncatedCells: number } | ReadImportFailure {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return failure("malformed");
  }
  if (jsonTooDeep(parsed, FINN_JSON_MAX_DEPTH)) {
    return failure(
      "malformed",
      "بنية JSON متداخلة بعمقٍ يتجاوز الحدّ المسموح. بسّطها أو حوّلها إلى جدول.",
    );
  }
  if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(isFlatObject)) {
    // جدول: الأعمدة = اتحاد المفاتيح بترتيب الظهور (Map لا كائن: المفتاح `__proto__` نصٌّ عادي).
    const columns = new Map<string, number>();
    for (const item of parsed as Array<Record<string, unknown>>) {
      for (const key of Object.keys(item)) {
        if (!columns.has(key) && columns.size < JSON_COLUMN_COUNT_CAP)
          columns.set(key, columns.size);
      }
    }
    const keys = [...columns.keys()];
    const width = Math.min(keys.length, LIMITS.maxCols);
    let truncatedCells = 0;
    const headers = keys.slice(0, width).map((key, i) => {
      const cleaned = cleanCell(key, LIMITS.maxCellChars);
      if (cleaned.truncated) truncatedCells += 1;
      return cleaned.text || `عمود ${i + 1}`;
    });
    const rows: string[][] = [];
    const take = Math.min(parsed.length, LIMITS.maxRowsPerSheet);
    for (let r = 0; r < take; r++) {
      const item = parsed[r] as Record<string, unknown>;
      const row = new Array<string>(width).fill("");
      for (let c = 0; c < width; c++) {
        const key = keys[c];
        if (Object.prototype.hasOwnProperty.call(item, key)) {
          const cell = jsonScalar(item[key]);
          if (cell.truncated) truncatedCells += 1;
          row[c] = cell.text;
        }
      }
      rows.push(row);
    }
    return {
      sheet: {
        name: "JSON",
        headers,
        rows,
        rowsTotal: parsed.length,
        rowsTotalExact: true,
        colsTotal: columns.size,
        plain: false,
      },
      truncatedCells,
    };
  }
  if (
    parsed === null ||
    (Array.isArray(parsed) && parsed.length === 0) ||
    (typeof parsed === "object" && !Array.isArray(parsed) && Object.keys(parsed).length === 0)
  ) {
    return failure("empty");
  }
  const pretty = JSON.stringify(parsed, null, 2);
  if (typeof pretty !== "string") return failure("empty");
  return { sheet: linesToSheet(pretty.split("\n")), truncatedCells: 0 };
}

// ── الامتداد ─────────────────────────────────────────────────────────────
const LEGACY_EXCEL_EXTENSIONS = new Set(["xls", "xlsm", "xlsb"]);

function extensionOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot < 0 ? "" : base.slice(dot + 1).toLowerCase();
}

// ── xlsx ─────────────────────────────────────────────────────────────────
type DenseCell = { t?: string; v?: unknown; w?: string } | undefined;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** `YYYY-MM-DD` (+`THH:mm` إن وُجد وقت)؛ وقتٌ بلا تاريخ (Excel يرسمه 1899) ⇒ `HH:mm`. UTC: تاريخ Excel بلا منطقة. */
function formatDate(value: Date): string {
  const millis = value.getTime();
  if (!Number.isFinite(millis)) return "";
  // Excel stores fractions of a day. Round at display precision before extracting UTC fields.
  const d = new Date(Math.round(millis / 1000) * 1000);
  const y = d.getUTCFullYear();
  const h = d.getUTCHours();
  const mi = d.getUTCMinutes();
  const s = d.getUTCSeconds();
  const hasTime = h !== 0 || mi !== 0 || s !== 0;
  const time = `${pad2(h)}:${pad2(mi)}${s !== 0 ? `:${pad2(s)}` : ""}`;
  if (value.getUTCFullYear() < 1900) {
    const roundedToMidnight = d.getUTCDate() !== value.getUTCDate();
    return hasTime || roundedToMidnight ? time : "";
  }
  const date = `${String(y).padStart(4, "0")}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  return hasTime ? `${date}T${time}` : date;
}

function cellToString(cell: DenseCell): string {
  if (!cell || typeof cell !== "object") return "";
  const v = cell.v;
  switch (cell.t) {
    case "n": {
      if (typeof v !== "number" || !Number.isFinite(v)) return "";
      // 15 رقمًا معنويًّا كما يعرض Excel (يُسقط ضجيج الفاصلة العائمة 0.30000000000000004).
      return Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(15)));
    }
    case "b":
      return v ? "TRUE" : "FALSE";
    case "d":
      return v instanceof Date ? formatDate(v) : typeof v === "string" ? v : "";
    case "e":
      return typeof cell.w === "string" && cell.w !== "" ? cell.w : "#ERR";
    default:
      return typeof v === "string" ? v : v === undefined || v === null ? "" : String(v);
  }
}

const MAX_WORKBOOK_SHEET_TAGS = 5_000;

function tagAttrs(tag: string): Map<string, string> {
  const out = new Map<string, string>();
  forEachXmlAttr(tag, (name, value) => out.set(name, value));
  return out;
}

function resolveSheetTarget(target: string): string {
  const stack: string[] = target.startsWith("/") ? [] : ["xl"];
  for (const segment of target.replace(/^\/+/, "").split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") stack.pop();
    else stack.push(segment);
  }
  return stack.join("/").toLowerCase();
}

interface WorkbookLayout {
  /** جزء كل `<sheet>` بترتيب المصنّف (للعدّ الحقيقي للصفوف)؛ `null` ⇐ تعذّر الربط. */
  partNames: Array<string | null>;
  /**
   * مواضع الأوراق التي **تُحلَّل فقط**: أول `maxSheets` ظاهرة (الباقي لا يُقرأ أصلًا، فلا كلفة له).
   * تُمرَّر لـ`XLSX.read` خيارَ `sheets`؛ بدونه تحلّل المكتبة كل `<sheet>` ولو أحالت آلافُ الوسوم إلى
   * جزءٍ واحد (قِيس: 40 وسمًا لجزءٍ 7.9 ميغابايت ⇒ 18.9 ثانية وغيغابايت، والمقروء 10 أوراق).
   */
  readIndexes: number[];
  /** وسمان مقروءان أو أكثر يحيلان إلى الجزء نفسه: لا يكتب Excel ذلك أبدًا، وهو مضاعِف كلفة. */
  duplicateTargets: boolean;
}

function workbookLayout(parts: Map<string, Uint8Array>): WorkbookLayout {
  const lowerToKey = new Map<string, string>();
  for (const key of parts.keys()) lowerToKey.set(key.toLowerCase(), key);
  const workbook = parts.get("xl/workbook.xml");
  const rels = parts.get("xl/_rels/workbook.xml.rels");
  const decoder = new TextDecoder("utf-8");
  const relTargets = new Map<string, string>();
  if (rels) {
    for (const tag of scanXmlTags(decoder.decode(rels), "Relationship")) {
      const attrs = tagAttrs(tag);
      const id = attrs.get("Id");
      const target = attrs.get("Target");
      if (id !== undefined && target !== undefined) relTargets.set(id, resolveSheetTarget(target));
    }
  }
  const partNames: Array<string | null> = [];
  const readIndexes: number[] = [];
  if (workbook) {
    for (const tag of scanXmlTags(decoder.decode(workbook), "sheet")) {
      if (partNames.length >= MAX_WORKBOOK_SHEET_TAGS) break;
      const attrs = tagAttrs(tag);
      const rid = attrs.get("r:id") ?? attrs.get("id");
      const target = rid === undefined ? undefined : relTargets.get(rid);
      const state = attrs.get("state");
      if (state !== "hidden" && state !== "veryHidden" && readIndexes.length < LIMITS.maxSheets) {
        readIndexes.push(partNames.length);
      }
      partNames.push(target === undefined ? null : (lowerToKey.get(target) ?? null));
    }
  }
  // لم نجد وسمًا نفهمه (صيغة غريبة): المكتبة تقرّر، لكن بسقف الحدّ أيضًا.
  if (partNames.length === 0) {
    for (let i = 0; i < LIMITS.maxSheets; i++) readIndexes.push(i);
  }
  const seen = new Set<string>();
  let duplicateTargets = false;
  for (const index of readIndexes) {
    const name = partNames[index];
    if (name === undefined || name === null) continue;
    if (seen.has(name)) duplicateTargets = true;
    seen.add(name);
  }
  return { partNames, readIndexes, duplicateTargets };
}

const LATIN1 = new TextDecoder("latin1");

/** عدّ عناصر `<row>` في XML الورقة: غير ذاتية الإغلاق (فيها خلايا) وأكبر رقم صفّ. */
function scanSheetRows(bytes: Uint8Array): { contentRows: number; maxRow: number } {
  const text = LATIN1.decode(bytes);
  let pos = 0;
  let contentRows = 0;
  let current = 0;
  let maxRow = 0;
  for (;;) {
    const i = text.indexOf("<row", pos);
    if (i < 0) break;
    const after = text.charCodeAt(i + 4);
    pos = i + 4;
    if (after !== 32 && after !== 62 && after !== 47 && after !== 9 && after !== 10 && after !== 13)
      continue;
    const end = text.indexOf(">", pos);
    if (end < 0) break;
    const rm = /\sr\s*=\s*["'](\d{1,8})["']/.exec(text.slice(i, Math.min(end, i + 400)));
    current = rm ? Number.parseInt(rm[1], 10) : current + 1;
    if (current > maxRow) maxRow = current;
    if (text.charCodeAt(end - 1) !== 47) contentRows += 1;
    pos = end;
  }
  return { contentRows, maxRow };
}

function ownSheet(sheets: unknown, name: string): Record<string, unknown> | undefined {
  if (!sheets || typeof sheets !== "object") return undefined;
  // الوصول بالواصف الذاتي: اسم ورقة `__proto__` يُسند للنموذج الأولي لا كخاصية ذاتية.
  const descriptor = Object.getOwnPropertyDescriptor(sheets, name);
  const value = descriptor?.value as unknown;
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

async function readXlsx(bytes: Uint8Array): Promise<ReadImportResult> {
  const zip = await inspectXlsxZip(bytes);
  if (!zip.ok) return failure(zip.error);

  // قبل أي تحليل: وسمان يحيلان إلى جزء ورقةٍ واحد يضاعفان كلفة المكتبة بعدد الوسوم (ولا يكتب Excel ذلك).
  const layout = workbookLayout(zip.parts);
  if (layout.duplicateTargets) return failure("malformed");

  const XLSX = await import("xlsx");
  const window = LIMITS.maxRowsPerSheet + 2; // ترويسة + الحدّ + صفّ حارس يكشف التجاوز
  let workbook: ReturnType<typeof XLSX.read>;
  try {
    workbook = XLSX.read(zip.safeBytes, {
      type: "array",
      sheets: layout.readIndexes,
      cellFormula: false,
      cellHTML: false,
      bookVBA: false,
      dense: true,
      sheetRows: window,
      cellDates: true,
      cellNF: false,
      cellText: false,
      cellStyles: false,
      sheetStubs: false,
      bookProps: false,
      WTF: false,
    });
  } catch {
    return failure("malformed");
  }

  const names = workbook.SheetNames ?? [];
  const meta = workbook.Workbook?.Sheets;
  const readable = new Set(layout.readIndexes);
  const warnings: string[] = [];
  const sheets: ImportSheet[] = [];
  let hidden = 0;
  let unreadable = 0;
  let empty = 0;
  let ignored = 0;
  let truncatedCells = 0;
  let charsRead = 0; // مجموع محارف الخلايا المنظَّفة عبر المصنّف كلّه (الميزانية التراكمية)
  let budgetCutSheet = 0; // رقم (من 1) الورقة التي قُطعت قراءتها عند بلوغ الميزانية
  let budgetSkipped = 0; // أوراق لم تُقرأ لأن الميزانية نفدت قبلها

  for (let index = 0; index < names.length; index++) {
    const state = meta?.[index]?.Hidden;
    if (typeof state === "number" && state !== 0) {
      hidden += 1;
      continue;
    }
    if (sheets.length >= LIMITS.maxSheets || !readable.has(index)) {
      ignored += 1; // خارج أول `maxSheets` ظاهرة: لم تُحلَّل أصلًا
      continue;
    }
    const ws = ownSheet(workbook.Sheets, names[index]);
    const data = ws?.["!data"];
    if (!ws || !Array.isArray(data)) {
      if (ws === undefined) unreadable += 1;
      else empty += 1;
      continue;
    }

    const records: string[][] = [];
    let nonEmptyInWindow = 0;
    let colsSeen = 0;
    let budgetCut = false;
    const scanRows = Math.min(data.length, window);
    for (let r = 0; r < scanRows; r++) {
      if (charsRead >= FINN_XLSX_MAX_READ_CHARS) {
        budgetCut = true; // لا نبني بقية المصفوفة: كل ما بعد هذا لا يصل مكتبة المعرفة أصلًا
        break;
      }
      const row = data[r] as DenseCell[] | undefined;
      if (!Array.isArray(row)) continue;
      if (row.length > colsSeen) colsSeen = row.length;
      const width = Math.min(row.length, LIMITS.maxCols);
      const out = new Array<string>(width);
      let any = false;
      for (let c = 0; c < width; c++) {
        const cleaned = cleanCell(cellToString(row[c]));
        charsRead += cleaned.text.length;
        if (cleaned.truncated) truncatedCells += 1;
        out[c] = cleaned.text;
        if (cleaned.text !== "") any = true;
      }
      if (!any) continue;
      nonEmptyInWindow += 1;
      if (records.length <= LIMITS.maxRowsPerSheet) records.push(out);
    }
    if (records.length < 2) {
      // بلا صفوف بيانات (ترويسة فقط أو فراغ)؛ أو قُطعت القراءة قبل بلوغ صفوفها فلا تُسمّى «فارغة».
      if (budgetCut) budgetSkipped += 1;
      else empty += 1;
      continue;
    }

    // الحجم الحقيقي: ما بعد النافذة لا تراه المكتبة، فيُعدّ من XML الورقة نفسه.
    const windowFull = nonEmptyInWindow >= LIMITS.maxRowsPerSheet + 2;
    const declaredRef = (ws["!fullref"] ?? ws["!ref"]) as string | undefined;
    let declaredEnd = 0;
    if (typeof declaredRef === "string") {
      try {
        declaredEnd = XLSX.utils.decode_range(declaredRef).e.r + 1;
      } catch {
        declaredEnd = 0;
      }
    }
    let overflow = windowFull || budgetCut;
    let rowsTotal = Math.max(0, nonEmptyInWindow - 1);
    let rowsTotalExact = true;
    if (windowFull || budgetCut || declaredEnd >= window) {
      const partName = layout.partNames[index] ?? null;
      const part = partName === null ? undefined : zip.parts.get(partName);
      if (part) {
        const stats = scanSheetRows(part);
        if (stats.maxRow > window) overflow = true;
        if (overflow) {
          rowsTotal = Math.max(rowsTotal + 1, stats.contentRows - 1);
          rowsTotalExact = false;
        }
      } else if (windowFull || budgetCut) {
        // تعذّر الربط بجزء الورقة: لا رقم يقيني فوق ما قُرئ.
        rowsTotal = Math.max(rowsTotal + 1, declaredEnd - 1);
        rowsTotalExact = false;
      }
    }
    if (overflow && rowsTotalExact) rowsTotalExact = false;
    if (budgetCut) budgetCutSheet = index + 1;

    const colCount = records.reduce((m, rec) => Math.max(m, rec.length), 0);
    const headerCells = records[0];
    const headers = Array.from({ length: colCount }, (_, i) => {
      const h = headerCells[i];
      return h !== undefined && h !== "" ? h : `عمود ${i + 1}`;
    });
    const rows = records
      .slice(1, LIMITS.maxRowsPerSheet + 1)
      .map((rec) => Array.from({ length: colCount }, (_, i) => rec[i] ?? ""));

    const nameClean = cleanCell(names[index], 80).text;
    sheets.push({
      name: nameClean || `ورقة ${index + 1}`,
      headers,
      rows,
      rowsTotal,
      rowsTotalExact,
      colsTotal: Math.max(colsSeen, colCount),
      plain: false,
    });
    if (colsSeen > LIMITS.maxCols) {
      warnings.push(
        `الورقة رقم ${fmt.format(index + 1)}: فيها ${fmt.format(colsSeen)} عمودًا وقُرئ أول ${fmt.format(LIMITS.maxCols)} فقط.`,
      );
    }
  }

  if (hidden > 0) warnings.push(`تُجوهلت ${fmt.format(hidden)} ورقة مخفية ولم تُقرأ.`);
  if (ignored > 0) {
    warnings.push(
      `تُجوهلت ${fmt.format(ignored)} ورقة بعد أول ${fmt.format(LIMITS.maxSheets)} أوراق (الحدّ المسموح).`,
    );
  }
  if (empty > 0) warnings.push(`تُجوهلت ${fmt.format(empty)} ورقة فارغة أو بلا صفوف بيانات.`);
  if (unreadable > 0) warnings.push(`تعذّرت قراءة ${fmt.format(unreadable)} ورقة وتُجوهلت.`);
  if (budgetCutSheet > 0) {
    warnings.push(
      `بلغت القراءة سقف حجم النص المسموح (${fmt.format(FINN_XLSX_MAX_READ_CHARS)} حرف) عند الورقة رقم ${fmt.format(budgetCutSheet)} فتوقفت؛ لم تُقرأ بقية صفوفها وعددها الكلي تقدير لا يقين.`,
    );
  }
  if (budgetSkipped > 0) {
    warnings.push(
      `تُجوهلت ${fmt.format(budgetSkipped)} ورقة لأن القراءة بلغت سقف حجم النص المسموح قبلها.`,
    );
  }
  if (truncatedCells > 0) {
    warnings.push(
      `اقتُطع نص ${fmt.format(truncatedCells)} خلية تتجاوز ${fmt.format(LIMITS.maxCellChars)} حرفًا.`,
    );
  }
  return { ok: true, kind: "xlsx", sheets, sheetsTotal: names.length, warnings };
}

// ── الواجهة ──────────────────────────────────────────────────────────────
export async function readImportFile(input: {
  name: string;
  bytes: Uint8Array;
}): Promise<ReadImportResult> {
  try {
    const ext = extensionOf(input.name);
    if (LEGACY_EXCEL_EXTENSIONS.has(ext)) {
      return failure("unsupported_type", FINN_IMPORT_LEGACY_EXCEL_MESSAGE_AR);
    }
    if (!(FINN_IMPORT_EXTENSIONS as readonly string[]).includes(ext)) {
      return failure("unsupported_type");
    }
    const kind = ext as FinnImportFileKind;
    const bytes = input.bytes;
    if (bytes.length === 0) return failure("empty");
    if (bytes.length > LIMITS.maxFileBytes) return failure("too_large");

    const sniffed = sniff(bytes);
    if (kind === "xlsx") {
      if (sniffed === "executable") return failure("unsafe");
      if (!startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
        // OLE (xls قديم بامتداد xlsx) أو أي شيء آخر ⇒ لا يطابق الامتداد.
        return failure(
          "unsupported_type",
          startsWith(bytes, OLE_SIGNATURE) ? FINN_IMPORT_LEGACY_EXCEL_MESSAGE_AR : undefined,
        );
      }
      const result = await readXlsx(bytes);
      if (result.ok && result.sheets.length === 0) return failure("empty");
      return result;
    }

    // الأنواع النصّية: لا توقيع تنفيذي ولا حاوية.
    if (sniffed === "executable") return failure("unsafe");
    if (sniffed === "container") return failure("unsupported_type");
    const decoded = decodeText(bytes);
    if (!decoded.ok) return decoded;
    const warnings = [...decoded.warnings];

    let sheet: ImportSheet;
    let truncatedCells = 0;
    if (kind === "csv" || kind === "tsv") {
      const delimiter = kind === "tsv" ? "\t" : detectDelimiter(decoded.text);
      const table = parseDelimited(decoded.text, delimiter);
      if (table === null) {
        return failure(
          "malformed",
          "ملف CSV غير صالح: علامة اقتباس لم تُغلق. صحّح الملف أو احفظه من جديد.",
        );
      }
      if (table.rowsTotal === 0) return failure("empty");
      truncatedCells = table.truncatedCells;
      const colCount = Math.min(
        LIMITS.maxCols,
        Math.max(table.header.length, ...table.rows.map((r) => r.length)),
      );
      sheet = {
        name: kind.toUpperCase(),
        headers: Array.from({ length: colCount }, (_, i) =>
          table.header[i] !== undefined && table.header[i] !== ""
            ? table.header[i]
            : `عمود ${i + 1}`,
        ),
        rows: table.rows.map((rec) => Array.from({ length: colCount }, (_, i) => rec[i] ?? "")),
        rowsTotal: table.rowsTotal,
        rowsTotalExact: true,
        colsTotal: table.colsTotal,
        plain: false,
      };
      if (table.colsTotal > LIMITS.maxCols) {
        warnings.push(
          `فيه ${fmt.format(table.colsTotal)} عمودًا وقُرئ أول ${fmt.format(LIMITS.maxCols)} فقط.`,
        );
      }
    } else if (kind === "json") {
      const json = readJson(decoded.text);
      if ("ok" in json) return json;
      sheet = json.sheet;
      truncatedCells = json.truncatedCells;
      if (sheet.rowsTotal === 0) return failure("empty");
    } else {
      sheet = linesToSheet(decoded.text.split(LINE_BREAKS));
      if (sheet.rowsTotal === 0) return failure("empty");
    }
    if (truncatedCells > 0) {
      warnings.push(
        `اقتُطع نص ${fmt.format(truncatedCells)} خلية تتجاوز ${fmt.format(LIMITS.maxCellChars)} حرفًا.`,
      );
    }
    return { ok: true, kind, sheets: [sheet], sheetsTotal: 1, warnings };
  } catch {
    // لا يُسرَّب نصّ الخطأ: قد يحوي أجزاءً من الملف.
    return failure("malformed");
  }
}
