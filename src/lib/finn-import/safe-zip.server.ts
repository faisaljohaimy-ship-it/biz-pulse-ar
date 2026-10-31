/**
 * فاحص أرشيف xlsx الصارم لاستيراد فِن (أمر المالك ٢٠٢٦/١٠/٣١) — خادمٌ فقط.
 *
 * **لماذا فاحصٌ ثانٍ ولا نكتفي بـ`inspectZip` في `security/file-inspection.server.ts`:** قياسٌ
 * سابق (تدقيق قراءة فقط) أثبت فيه ثلاثة عيوب:
 *  ١) هو **ماسحٌ** يبحث عن توقيع الدليل المركزي في أي موضع من الملف ثم يقفز بحسب أطوال الرأس؛
 *     فرأسٌ مزوَّر داخل بيانات مدخلٍ مخزَّن يجعله يقفز فوق مدخل `vbaProject.bin` الحقيقي.
 *  ٢) يثق بأحجام الدليل المركزي وحدها، بينما قارئ xlsx يخصّص الذاكرة بأحجام **الرأس المحلي**
 *     (أرشيف ٦٥ كيلوبايت خصّص نحو ١ غيغابايت).
 *  ٣) يُنذر خطأً على `xl/printerSettings/printerSettings1.bin` الذي يكتبه Excel في ملفاته العادية.
 *
 * **ما يفعله هذا الفاحص بدلًا من ذلك:**
 *  - يقرأ الأرشيف **بنيويًّا** من نهايته: توقيع نهاية الدليل (EOCD) يجب أن يكون **آخر** توقيعٍ في
 *    الملف وتعليقه ينتهي عند آخر بايت (فلا EOCD مزوَّر في تعليق ولا بعد الأرشيف)، والدليل المركزي
 *    يتصل بالـEOCD بلا فجوة، ومداخله تُقرأ **تتابعيًّا** بحدود مفحوصة — لا مسح ولا قفز.
 *  - يقارن كل رأسٍ محلي بمدخله المركزي: التوقيع والاسم بايتًا ببايت والطريقة والأحجام.
 *  - يرفض: التداخل، والمكرَّر (بلا حساسية حالة)، والتشفير، والمسارات المطلقة/المتسلّلة/ذات الشرطة
 *    المائلة العكسية، وZIP64، والأقراص المتعدّدة، وحدود العدد والحجم والنسبة، وكل جزءٍ نشِط
 *    (ماكرو/ارتباط خارجي/تضمين/ActiveX/ورقة ماكرو) وأي `.bin` خارج `xl/printerSettings/`.
 *  - **لا يثق بالأحجام المعلنة أصلًا:** كل جزءٍ سيُقرأ يُفكّ ضغطه هنا بسقفٍ صارم يساوي حجمه
 *    المعلن، ويجب أن يطابقه تمامًا (قنبلة `deflate` بواصف بيانات كاذب لا تُكشَف بالرؤوس).
 *  - **لا مسح تربيعيًّا على أجزاء XML المعادية:** `[Content_Types].xml` و`xl/workbook.xml` و
 *    `xl/_rels/workbook.xml.rels` أجزاءٌ صغيرة بطبيعتها فتُسقَّف بـ`maxSmallPartBytes` قبل الفك
 *    (`part_oversize`)، والوسوم والسمات تُمسح بـ`scanXmlTags`/`forEachXmlAttr` خطّيًّا لا بتعابير
 *    تتراجع (تدقيق ٢٠٢٦/١٠/٣١: ثوانٍ من الحجب على ملفٍّ من ألفي بايت).
 *  - ثم يُعيد **تغليفًا نظيفًا** (`safeBytes`): أرشيف مخزَّن بلا ضغط ولا واصفات ولا حقول إضافية ولا
 *    تعليق، يحوي أجزاء XML المقروءة فقط بأحجامها الحقيقية. **هذا وحده** ما يجوز تمريره لقارئ
 *    xlsx — فيزول اختلاف التفسير بين الفاحص والقارئ من أصله، ولا يُشغَّل مفكّ الضغط الجافاسكربتي
 *    للمكتبة على بايتات المهاجم.
 *
 * لا يُسجَّل شيءٌ ولا يُعاد نصٌّ من الملف: `reason` رمزٌ من قائمة مغلقة، لا اسم مدخل ولا محتوى.
 */
import type { FinnImportErrorCode } from "./contract";

export const FINN_ZIP_LIMITS = {
  /** مداخل الأرشيف كلّها (ملفات ومجلدات). Excel العادي أقل من مئة. */
  maxEntries: 1_000,
  /** حجم مدخلٍ واحد بعد الفك (المعلن). ورقةٌ بـ٢٠ ألف صفٍّ × ١٠٠ عمود أقل من هذا. */
  maxEntryBytes: 40 * 1024 * 1024,
  /** مجموع الأحجام المعلنة بعد الفك لكل المداخل. */
  maxTotalBytes: 64 * 1024 * 1024,
  /** نسبة الضغط القصوى للمدخل الواحد (تُقاس فوق `ratioFloorBytes`). */
  maxEntryRatio: 200,
  ratioFloorBytes: 512 * 1024,
  /** نسبة المجموع إلى حجم الملف، تُقاس فوق ٨ ميغابايت. */
  maxTotalRatio: 300,
  maxNameBytes: 255,
  /**
   * سقف الأجزاء الصغيرة بطبيعتها التي تمسحها وظيفتنا نفسها: `[Content_Types].xml` و`xl/workbook.xml`
   * و`xl/_rels/workbook.xml.rels` (الشرعي منها كيلوبايتات قليلة). الأكبر ⇒ مرفوض قبل أي فكٍّ أو مسح.
   * (قياس التدقيق: 520 كيلوبايت من `<Override ` كلّفت المسح القديم 8.9 ثانية على حلقة الأحداث.)
   */
  maxSmallPartBytes: 256 * 1024,
} as const;

export type ZipRejectReason =
  | "not_zip"
  | "eocd_missing"
  | "eocd_inconsistent"
  | "multi_disk"
  | "zip64"
  | "entry_count"
  | "cd_bounds"
  | "cd_signature"
  | "bad_name"
  | "unsafe_name"
  | "duplicate_entry"
  | "encrypted"
  | "unsupported_method"
  | "local_header"
  | "local_name_mismatch"
  | "local_method_mismatch"
  | "local_size_mismatch"
  | "data_bounds"
  | "entries_overlap"
  | "size_cap"
  | "part_oversize"
  | "ratio"
  | "forbidden_part"
  | "active_content_type"
  | "active_relationship"
  | "required_part_missing"
  | "inflate_failed"
  | "inflate_size_mismatch"
  | "inflate_overflow"
  | "unavailable";

export interface ZipEntryInfo {
  name: string;
  method: 0 | 8;
  compressedSize: number;
  uncompressedSize: number;
}

export type ZipInspection =
  | {
      ok: true;
      /** كل مداخل الأرشيف (ما قُرئ وما تُجوهل). */
      entries: ZipEntryInfo[];
      /** مجموع الأحجام المعلنة (والمطابقة لما فُكَّ فعلًا في الأجزاء المقروءة). */
      totalUncompressed: number;
      /** الأجزاء المقروءة (XML/rels) بمحتواها المفكوك — مفتاحها اسم المدخل كما في الأرشيف. */
      parts: Map<string, Uint8Array>;
      /** الأرشيف النظيف الوحيد المسموح تمريره لقارئ xlsx. */
      safeBytes: Uint8Array;
    }
  | {
      ok: false;
      error: Extract<FinnImportErrorCode, "malformed" | "unsafe" | "too_large">;
      reason: ZipRejectReason;
    };

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;

const EOCD_MIN = 22;
const CENTRAL_MIN = 46;
const LOCAL_MIN = 30;
const MAX_EOCD_COMMENT = 0xffff;

/** البتّات 0 (تشفير) و6 (تشفير قوي) و13 (ترويسة مقنَّعة) — نفس قناع قارئ xlsx. */
const FLAG_ENCRYPTED_MASK = 0x2041;
const FLAG_DATA_DESCRIPTOR = 0x0008;

type Verdict = Extract<ZipInspection, { ok: false }>;
const fail = (error: Verdict["error"], reason: ZipRejectReason): Verdict => ({
  ok: false,
  error,
  reason,
});

function u16(b: Uint8Array, o: number): number {
  return b[o] | (b[o + 1] << 8);
}

function u32(b: Uint8Array, o: number): number {
  return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
}

function w16(b: Uint8Array, o: number, v: number): void {
  b[o] = v & 0xff;
  b[o + 1] = (v >>> 8) & 0xff;
}

function w32(b: Uint8Array, o: number, v: number): void {
  b[o] = v & 0xff;
  b[o + 1] = (v >>> 8) & 0xff;
  b[o + 2] = (v >>> 16) & 0xff;
  b[o + 3] = (v >>> 24) & 0xff;
}

/** آخر موضعٍ لتوقيعٍ من أربعة بايتات يبدأ عند `>= floor`؛ -1 إن لم يوجد. */
function findLastSignature(b: Uint8Array, sig: number, floor: number): number {
  for (let i = b.length - 4; i >= floor; i--) {
    if (u32(b, i) === sig) return i;
  }
  return -1;
}

// ── أسماء المداخل ────────────────────────────────────────────────────────
const UTF8_FATAL = new TextDecoder("utf-8", { fatal: true });
const UTF8_LAX = new TextDecoder("utf-8");

// eslint-disable-next-line no-control-regex -- المطلوب بالضبط كشف محارف التحكّم في أسماء المداخل
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/;
const DRIVE_LETTER = /^[a-zA-Z]:/;
const EXECUTABLE_EXTENSION =
  /\.(?:exe|dll|bat|cmd|com|scr|jar|js|jse|vbs|vbe|wsf|wsh|ps1|psm1|sh|lnk|msi|hta|cpl|pif|reg|inf|sys|app|dmg)[\s.]*$/i;

type NameVerdict = "ok" | "bad_name" | "unsafe_name";

function checkName(name: string): NameVerdict {
  if (name.length === 0) return "bad_name";
  if (new TextEncoder().encode(name).length > FINN_ZIP_LIMITS.maxNameBytes) return "bad_name";
  if (CONTROL_CHARS.test(name)) return "unsafe_name";
  if (name.includes("\\")) return "unsafe_name";
  if (name.startsWith("/") || DRIVE_LETTER.test(name)) return "unsafe_name";
  const body = name.endsWith("/") ? name.slice(0, -1) : name;
  for (const segment of body.split("/")) {
    if (segment === "" || segment === "." || segment === "..") return "unsafe_name";
  }
  return "ok";
}

/** أجزاءٌ نشِطة أو خارجية: رفضٌ صريح مهما كان محتواها. */
function isForbiddenPart(lower: string): boolean {
  if (lower.includes("vbaproject") || lower.includes("vbadata")) return true;
  if (lower.startsWith("xl/externallinks/")) return true;
  if (lower.startsWith("xl/embeddings/")) return true;
  if (lower.startsWith("xl/activex/")) return true;
  if (lower.startsWith("xl/macrosheets/")) return true;
  if (lower.startsWith("xl/ctrlprops/")) return true;
  if (lower.startsWith("customui/")) return true;
  if (EXECUTABLE_EXTENSION.test(lower)) return true;
  // أي `.bin` يرفض إلا ما يكتبه Excel لإعدادات الطابعة (لا يُقرأ ولا يُمرَّر).
  if (/\.bin[\s.]*$/.test(lower) && !lower.startsWith("xl/printersettings/")) return true;
  return false;
}

/** أجزاءٌ XML ثقيلة لا تقرؤها وظيفتنا (نصّ الخلايا) فلا نفكّها ولا نمرّرها. */
const SKIPPED_XML_PREFIXES = [
  "xl/drawings/",
  "xl/charts/",
  "xl/diagrams/",
  "xl/media/",
  "xl/pivotcache/",
  "xl/pivottables/",
  "customxml/",
] as const;

function isKeptPart(lower: string): boolean {
  if (lower.endsWith("/")) return false;
  if (!(lower.endsWith(".xml") || lower.endsWith(".rels"))) return false;
  return !SKIPPED_XML_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

// ── فكّ الضغط المسقوف ────────────────────────────────────────────────────
type InflateOutcome =
  | { ok: true; bytes: Uint8Array }
  | {
      ok: false;
      reason: "inflate_failed" | "inflate_size_mismatch" | "inflate_overflow" | "unavailable";
    };

/**
 * يفكّ `deflate` الخام بسقفٍ صارم يساوي الحجم المعلن. تجاوز السقف يُلغي القراءة فورًا (لا يُخصَّص
 * أكثر من المعلن أبدًا)، ونقصانه عن المعلن مرفوض كذلك. `DecompressionStream` معيارٌ ويب (Node ≥ 21
 * وWorkers) فلا نعتمد `node:zlib`.
 */
async function inflateRawExact(data: Uint8Array, expected: number): Promise<InflateOutcome> {
  if (typeof DecompressionStream === "undefined") return { ok: false, reason: "unavailable" };
  const out = new Uint8Array(expected);
  let written = 0;
  try {
    const stream = new DecompressionStream("deflate-raw");
    const writer = stream.writable.getWriter();
    // نسخةٌ مملوكة: قد يكون `data` مشاهدةً على ذاكرة الملف المرفوع كلّها.
    const writing = writer
      .write(new Uint8Array(data))
      .then(() => writer.close())
      .catch(() => undefined); // الخطأ الحقيقي يظهر من جهة القراءة
    const reader = stream.readable.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (written + value.length > expected) {
        await reader.cancel().catch(() => undefined);
        await writing;
        return { ok: false, reason: "inflate_overflow" };
      }
      out.set(value, written);
      written += value.length;
    }
    await writing;
  } catch {
    return { ok: false, reason: "inflate_failed" };
  }
  if (written !== expected) return { ok: false, reason: "inflate_size_mismatch" };
  return { ok: true, bytes: out };
}

// ── التغليف النظيف ───────────────────────────────────────────────────────
interface RepackEntry {
  name: Uint8Array;
  data: Uint8Array;
  crc: number;
}

/** أرشيف مخزَّن بلا ضغط ولا واصفات ولا إضافات ولا تعليق: كلّ ما فيه مطابقٌ لما فُحص. */
function buildStoredZip(entries: RepackEntry[]): Uint8Array {
  let localTotal = 0;
  let centralTotal = 0;
  for (const e of entries) {
    localTotal += LOCAL_MIN + e.name.length + e.data.length;
    centralTotal += CENTRAL_MIN + e.name.length;
  }
  const out = new Uint8Array(localTotal + centralTotal + EOCD_MIN);
  let lp = 0;
  let cp = localTotal;
  for (const e of entries) {
    const offset = lp;
    w32(out, lp, SIG_LOCAL);
    w16(out, lp + 4, 20); // الإصدار اللازم
    w16(out, lp + 6, 0x0800); // أسماء UTF-8، بلا واصف بيانات
    w16(out, lp + 8, 0); // مخزَّن
    w16(out, lp + 10, 0); // وقت DOS
    w16(out, lp + 12, 0x0021); // 1980-01-01
    w32(out, lp + 14, e.crc);
    w32(out, lp + 18, e.data.length);
    w32(out, lp + 22, e.data.length);
    w16(out, lp + 26, e.name.length);
    w16(out, lp + 28, 0);
    out.set(e.name, lp + LOCAL_MIN);
    out.set(e.data, lp + LOCAL_MIN + e.name.length);
    lp += LOCAL_MIN + e.name.length + e.data.length;

    w32(out, cp, SIG_CENTRAL);
    w16(out, cp + 4, 20);
    w16(out, cp + 6, 20);
    w16(out, cp + 8, 0x0800);
    w16(out, cp + 10, 0);
    w16(out, cp + 12, 0);
    w16(out, cp + 14, 0x0021);
    w32(out, cp + 16, e.crc);
    w32(out, cp + 20, e.data.length);
    w32(out, cp + 24, e.data.length);
    w16(out, cp + 28, e.name.length);
    // إضافات/تعليق/قرص/سمات داخلية/خارجية: أصفار
    w32(out, cp + 42, offset);
    out.set(e.name, cp + CENTRAL_MIN);
    cp += CENTRAL_MIN + e.name.length;
  }
  w32(out, cp, SIG_EOCD);
  w16(out, cp + 8, entries.length);
  w16(out, cp + 10, entries.length);
  w32(out, cp + 12, centralTotal);
  w32(out, cp + 16, localTotal);
  return out;
}

// ── الفحص ────────────────────────────────────────────────────────────────
interface CentralEntry {
  name: string;
  nameBytes: Uint8Array;
  lower: string;
  method: 0 | 8;
  crc: number;
  csz: number;
  usz: number;
  localOffset: number;
  dataStart: number;
  dataEnd: number;
}

// ── مسح XML خطّي الزمن ───────────────────────────────────────────────────
// التعابير النمطية `<X\b[^>]*>` وسمة `([A-Za-z_][\w:.-]*)\s*=\s*"…"` تتراجع تربيعيًّا على مدخلٍ معادٍ
// (قِيس: 52 ألف × `<Override ` ⇒ 9 ثوانٍ، و100 ألف حرف اسم سمة ⇒ 4.6 ثانية) وتحجب حلقة الأحداث عن كل
// الطلبات. فالمسح هنا يدويّ: `indexOf` وحلقة محارف، كل بايتٍ يُزار مرّةً واحدة. يشاركه قارئ الجداول.
// التزامًا بسلوك التعابير القديمة: أول `>` يُنهي الوسم (لا مراعاة للاقتباس)، والسمة المكرَّرة تُزار كلّها.

/** `[A-Za-z0-9_:.-]` — محارف اسم الوسم/السمة (مثل `\w:.-`). */
function isNameCode(c: number): boolean {
  return (
    (c >= 48 && c <= 58) || // 0-9 و:
    (c >= 65 && c <= 90) ||
    (c >= 97 && c <= 122) ||
    c === 95 ||
    c === 45 ||
    c === 46
  );
}

function isNameStart(c: number): boolean {
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95;
}

/** مثل `\s` في جافاسكربت. */
function isSpaceCode(c: number): boolean {
  return (
    c === 32 ||
    (c >= 9 && c <= 13) ||
    c === 0xa0 ||
    c === 0x1680 ||
    (c >= 0x2000 && c <= 0x200a) ||
    c === 0x2028 ||
    c === 0x2029 ||
    c === 0x202f ||
    c === 0x205f ||
    c === 0x3000 ||
    c === 0xfeff
  );
}

/**
 * وسوم عنصرٍ باسمه المحلي (تُقبل بادئة `x:`)، كلٌّ من `<` إلى أول `>`. مع `ignoreCase` يُعاد النص
 * بأحرفٍ صغيرة كلّه. وسمٌ بلا `>` يُنهي المسح (لا وسم بعده يمكن أن يُغلق).
 */
export function* scanXmlTags(
  xml: string,
  localName: string,
  ignoreCase = false,
): Generator<string> {
  const text = ignoreCase ? xml.toLowerCase() : xml;
  const wanted = ignoreCase ? localName.toLowerCase() : localName;
  const n = text.length;
  let pos = 0;
  for (;;) {
    const lt = text.indexOf("<", pos);
    if (lt < 0) return;
    let i = lt + 1;
    let localStart = i;
    while (i < n && isNameCode(text.charCodeAt(i))) {
      if (text.charCodeAt(i) === 58) localStart = i + 1;
      i += 1;
    }
    if (i - localStart === wanted.length && text.startsWith(wanted, localStart)) {
      const end = text.indexOf(">", i);
      if (end < 0) return;
      yield text.slice(lt, end + 1);
      pos = end + 1;
    } else {
      pos = i;
    }
  }
}

/** سمات وسمٍ بالترتيب (`name="v"` أو `name='v'`)؛ المكرَّرة تُزار كلّها. بلا تراجع: خطّي في طول الوسم. */
export function forEachXmlAttr(tag: string, visit: (name: string, value: string) => void): void {
  const n = tag.length;
  let i = 0;
  while (i < n) {
    if (!isNameCode(tag.charCodeAt(i))) {
      i += 1;
      continue;
    }
    const runStart = i;
    while (i < n && isNameCode(tag.charCodeAt(i))) i += 1;
    // الاسم يبدأ عند أول محرف بدء داخل الجريان (كما كانت التعابير القديمة تبدأ).
    let nameStart = runStart;
    while (nameStart < i && !isNameStart(tag.charCodeAt(nameStart))) nameStart += 1;
    if (nameStart === i) continue;
    let j = i;
    while (j < n && isSpaceCode(tag.charCodeAt(j))) j += 1;
    if (tag.charCodeAt(j) !== 61) continue; // "="
    j += 1;
    while (j < n && isSpaceCode(tag.charCodeAt(j))) j += 1;
    const quote = tag.charCodeAt(j);
    if (quote !== 34 && quote !== 39) continue;
    const close = tag.indexOf(quote === 34 ? '"' : "'", j + 1);
    if (close < 0) continue;
    visit(tag.slice(nameStart, i), tag.slice(j + 1, close));
    i = close + 1;
  }
}

// نوع المحتوى النشِط يُحكَم عليه من عناصر `<Override>` (الأجزاء الفعلية) لا من `<Default>`: مكتبة
// SheetJS — وهي من أكثر مولّدات xlsx شيوعًا — تكتب دائمًا `Default Extension="bin"` بنوع xlsb
// macroEnabled في ملفات xlsx العادية، ولا جزءَ `.bin` يمرّ على كل حال (يُرفض بالاسم أعلاه).
const ACTIVE_CONTENT_TYPE_VALUE = /macroenabled|vbaproject|macrosheet/i;

function hasActiveContentType(contentTypesXml: string): boolean {
  for (const tag of scanXmlTags(contentTypesXml, "Override", true)) {
    let active = false;
    forEachXmlAttr(tag, (name, value) => {
      if (name === "contenttype" && ACTIVE_CONTENT_TYPE_VALUE.test(value)) active = true;
    });
    if (active) return true;
  }
  return false;
}

/** الأجزاء التي تمسحها وظيفتنا نحن (لا المكتبة): تُسقَّف قبل الفك. */
function isSmallScannedPart(lower: string): boolean {
  return (
    lower === "[content_types].xml" ||
    lower === "xl/workbook.xml" ||
    lower === "xl/_rels/workbook.xml.rels"
  );
}

const ACTIVE_RELATIONSHIP =
  /Type\s*=\s*["'][^"']*\/(?:externalLink|vbaProject|oleObject|macroSheet|activeXControl|activeXControlBinary|package|ctrlProp)["']/i;

function sameBytes(a: Uint8Array, aStart: number, b: Uint8Array): boolean {
  for (let i = 0; i < b.length; i++) if (a[aStart + i] !== b[i]) return false;
  return true;
}

export async function inspectXlsxZip(bytes: Uint8Array): Promise<ZipInspection> {
  const len = bytes.length;
  if (len < EOCD_MIN + LOCAL_MIN || u32(bytes, 0) !== SIG_LOCAL)
    return fail("malformed", "not_zip");

  // ١) نهاية الدليل: آخر توقيع، وتعليقه يبلغ آخر بايت بالضبط.
  const eocd = findLastSignature(bytes, SIG_EOCD, Math.max(0, len - EOCD_MIN - MAX_EOCD_COMMENT));
  if (eocd < 0) return fail("malformed", "eocd_missing");
  if (eocd + EOCD_MIN + u16(bytes, eocd + 20) !== len)
    return fail("malformed", "eocd_inconsistent");

  const diskNo = u16(bytes, eocd + 4);
  const cdDisk = u16(bytes, eocd + 6);
  const entriesOnDisk = u16(bytes, eocd + 8);
  const entryCount = u16(bytes, eocd + 10);
  const cdSize = u32(bytes, eocd + 12);
  const cdOffset = u32(bytes, eocd + 16);
  if (diskNo !== 0 || cdDisk !== 0 || entriesOnDisk !== entryCount)
    return fail("malformed", "multi_disk");
  if (entryCount === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    return fail("too_large", "zip64");
  }
  if (entryCount === 0) return fail("malformed", "cd_bounds");
  if (entryCount > FINN_ZIP_LIMITS.maxEntries) return fail("too_large", "entry_count");
  // الدليل المركزي يتصل بنهاية الدليل بلا فجوة، ويقع كلّه داخل الملف.
  if (cdOffset + cdSize !== eocd || cdOffset < LOCAL_MIN) return fail("malformed", "cd_bounds");

  // ٢) مداخل الدليل المركزي: تتابعيًّا بحدودٍ مفحوصة.
  const entries: CentralEntry[] = [];
  const seen = new Set<string>();
  let totalDeclared = 0;
  let p = cdOffset;
  for (let i = 0; i < entryCount; i++) {
    if (p + CENTRAL_MIN > eocd) return fail("malformed", "cd_bounds");
    if (u32(bytes, p) !== SIG_CENTRAL) return fail("malformed", "cd_signature");
    const flags = u16(bytes, p + 8);
    const method = u16(bytes, p + 10);
    const crc = u32(bytes, p + 16);
    const csz = u32(bytes, p + 20);
    const usz = u32(bytes, p + 24);
    const nameLen = u16(bytes, p + 28);
    const extraLen = u16(bytes, p + 30);
    const commentLen = u16(bytes, p + 32);
    const diskStart = u16(bytes, p + 34);
    const localOffset = u32(bytes, p + 42);
    const next = p + CENTRAL_MIN + nameLen + extraLen + commentLen;
    if (next > eocd) return fail("malformed", "cd_bounds");

    if (flags & FLAG_ENCRYPTED_MASK) return fail("unsafe", "encrypted");
    if (diskStart !== 0) return fail("malformed", "multi_disk");
    if (csz === 0xffffffff || usz === 0xffffffff || localOffset === 0xffffffff) {
      return fail("too_large", "zip64");
    }
    if (method !== 0 && method !== 8) return fail("malformed", "unsupported_method");

    const nameBytes = bytes.subarray(p + CENTRAL_MIN, p + CENTRAL_MIN + nameLen);
    let name: string;
    try {
      name = UTF8_FATAL.decode(nameBytes);
    } catch {
      return fail("malformed", "bad_name");
    }
    const verdict = checkName(name);
    if (verdict === "bad_name") return fail("malformed", "bad_name");
    if (verdict === "unsafe_name") return fail("unsafe", "unsafe_name");

    const lower = name.normalize("NFC").toLowerCase();
    if (seen.has(lower)) return fail("unsafe", "duplicate_entry");
    seen.add(lower);
    if (isForbiddenPart(lower)) return fail("unsafe", "forbidden_part");

    // الأحجام المعلنة: سقوفٌ قبل أي فكّ.
    if (usz > FINN_ZIP_LIMITS.maxEntryBytes) return fail("too_large", "size_cap");
    if (usz > FINN_ZIP_LIMITS.maxSmallPartBytes && isSmallScannedPart(lower)) {
      return fail("unsafe", "part_oversize");
    }
    totalDeclared += usz;
    if (totalDeclared > FINN_ZIP_LIMITS.maxTotalBytes) return fail("too_large", "size_cap");
    if (method === 0 && csz !== usz) return fail("malformed", "local_size_mismatch");
    if (method === 8 && usz > 0 && csz === 0) return fail("unsafe", "ratio");
    if (
      method === 8 &&
      usz > FINN_ZIP_LIMITS.ratioFloorBytes &&
      usz / csz > FINN_ZIP_LIMITS.maxEntryRatio
    ) {
      return fail("unsafe", "ratio");
    }

    // ٣) الرأس المحلي يطابق مدخله المركزي.
    const lo = localOffset;
    if (lo + LOCAL_MIN > cdOffset) return fail("malformed", "local_header");
    if (u32(bytes, lo) !== SIG_LOCAL) return fail("malformed", "local_header");
    const lflags = u16(bytes, lo + 6);
    const lmethod = u16(bytes, lo + 8);
    const lcsz = u32(bytes, lo + 18);
    const lusz = u32(bytes, lo + 22);
    const lnameLen = u16(bytes, lo + 26);
    const lextraLen = u16(bytes, lo + 28);
    if (lflags & FLAG_ENCRYPTED_MASK) return fail("unsafe", "encrypted");
    if (lcsz === 0xffffffff || lusz === 0xffffffff) return fail("too_large", "zip64");
    const dataStart = lo + LOCAL_MIN + lnameLen + lextraLen;
    if (dataStart > cdOffset) return fail("malformed", "local_header");
    if (lnameLen !== nameLen || !sameBytes(bytes, lo + LOCAL_MIN, nameBytes)) {
      return fail("malformed", "local_name_mismatch");
    }
    if (lmethod !== method) return fail("malformed", "local_method_mismatch");
    // الأحجام المحلية: تُقارَن إلا في حالة واصف البيانات حين يكون الحقل صفرًا (الكاتب لم يعرفه
    // بعد). حقلٌ محلي غير صفري يخالف المركزي مرفوض دائمًا — هو ما يخصّص القارئ ذاكرته به.
    const hasDescriptor = (lflags & FLAG_DATA_DESCRIPTOR) !== 0;
    if ((!hasDescriptor || lcsz !== 0) && lcsz !== csz)
      return fail("malformed", "local_size_mismatch");
    if ((!hasDescriptor || lusz !== 0) && lusz !== usz)
      return fail("malformed", "local_size_mismatch");
    const dataEnd = dataStart + csz;
    if (dataEnd > cdOffset) return fail("malformed", "data_bounds");

    entries.push({
      name,
      nameBytes,
      lower,
      method: method as 0 | 8,
      crc,
      csz,
      usz,
      localOffset,
      dataStart,
      dataEnd,
    });
    p = next;
  }
  if (p !== eocd) return fail("malformed", "cd_bounds");

  if (totalDeclared > 8 * 1024 * 1024 && totalDeclared / len > FINN_ZIP_LIMITS.maxTotalRatio) {
    return fail("unsafe", "ratio");
  }

  // ٤) لا تداخل بين مناطق المداخل.
  const byOffset = [...entries].sort((a, b) => a.localOffset - b.localOffset);
  for (let i = 1; i < byOffset.length; i++) {
    if (byOffset[i].localOffset < byOffset[i - 1].dataEnd) return fail("unsafe", "entries_overlap");
  }

  // ٥) الأجزاء اللازمة.
  const names = new Set(entries.map((e) => e.lower));
  if (!names.has("[content_types].xml") || !names.has("xl/workbook.xml")) {
    return fail("malformed", "required_part_missing");
  }

  // ٦) فكّ الأجزاء المقروءة بسقفٍ صارم، وفحص نوع المحتوى والعلاقات.
  const parts = new Map<string, Uint8Array>();
  const repack: RepackEntry[] = [];
  const encoder = new TextEncoder();
  for (const e of entries) {
    if (!isKeptPart(e.lower)) continue;
    let data: Uint8Array;
    if (e.method === 0) {
      data = bytes.slice(e.dataStart, e.dataEnd);
    } else {
      const inflated = await inflateRawExact(bytes.subarray(e.dataStart, e.dataEnd), e.usz);
      if (!inflated.ok) return fail("unsafe", inflated.reason);
      data = inflated.bytes;
    }
    if (e.lower === "[content_types].xml" || e.lower.endsWith(".rels")) {
      const text = UTF8_LAX.decode(data);
      if (e.lower === "[content_types].xml" && hasActiveContentType(text)) {
        return fail("unsafe", "active_content_type");
      }
      if (e.lower.endsWith(".rels") && ACTIVE_RELATIONSHIP.test(text)) {
        return fail("unsafe", "active_relationship");
      }
    }
    parts.set(e.name, data);
    repack.push({ name: encoder.encode(e.name), data, crc: e.crc });
  }

  return {
    ok: true,
    entries: entries.map((e) => ({
      name: e.name,
      method: e.method,
      compressedSize: e.csz,
      uncompressedSize: e.usz,
    })),
    totalUncompressed: totalDeclared,
    parts,
    safeBytes: buildStoredZip(repack),
  };
}
