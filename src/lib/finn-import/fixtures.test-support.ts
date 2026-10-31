/**
 * أدوات اختبارٍ فقط لاستيراد فِن: تبني ملفات xlsx وأرشيفات zip **اصطناعية** في الذاكرة وقت التشغيل.
 *
 * لا بيانات حقيقية ولا ملفات في المستودع (CLAUDE.md: البيانات الحقيقية لا تدخل git). الهجمات تُبنى
 * بايتًا ببايت كي يُرى بالضبط ما يخالف الأرشيفُ فيه: رأسٌ مركزي مزوَّر، رأسٌ محلي بحجمٍ كاذب،
 * واصف بيانات كاذب، قنبلة ضغط، تداخل، أسماء متسلّلة… لا يستورده إلا ملفات الاختبار.
 */
import { deflateRawSync, inflateRawSync } from "node:zlib";
import * as XLSX from "xlsx";

export type Bytes = Uint8Array;

const encoder = new TextEncoder();
export const utf8 = (s: string): Bytes => encoder.encode(s);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Bytes): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function le16(v: number): number[] {
  return [v & 0xff, (v >>> 8) & 0xff];
}
function le32(v: number): number[] {
  return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
}

export function concat(...chunks: Array<Bytes | number[]>): Bytes {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of chunks) {
    out.set(c, p);
    p += c.length;
  }
  return out;
}

export interface ZipEntrySpec {
  name: string;
  /** المحتوى الخام قبل الضغط. */
  data?: Bytes | string;
  /** بايتات الضغط الجاهزة (تتجاوز `data`): لقنابل ضغط وبياناتٍ لا تطابق المعلن. */
  rawCompressed?: Bytes;
  /** 8 (deflate) افتراضيًّا؛ 0 مخزَّن؛ غيرهما يُكتب في الرؤوس كما هو (لاختبار الطرق غير المدعومة). */
  method?: number;
  /** بتّات إضافية في علَمَي الرأسين (مثل 1 للتشفير). */
  flags?: number;
  /** واصف بيانات بعد المحتوى (علَم 8): الأحجام المحلية أصفار ما لم تُحدَّد. */
  descriptor?: boolean;
  /** أحجام الدليل المركزي المعلنة (تتجاوز الحقيقة). */
  declaredCsz?: number;
  declaredUsz?: number;
  /** أحجام الرأس المحلي (تتجاوز الحقيقة). */
  localCsz?: number;
  localUsz?: number;
  /** اسم الرأس المحلي إن اختلف عن المركزي. */
  localName?: string;
  /** حقل إضافي في الرأس المحلي. */
  localExtra?: Bytes;
}

interface Prepared {
  spec: ZipEntrySpec;
  nameBytes: Bytes;
  stored: Bytes;
  csz: number;
  usz: number;
  flags: number;
  method: number;
}

function prepare(spec: ZipEntrySpec): Prepared {
  const method = spec.method ?? 8;
  const raw = typeof spec.data === "string" ? utf8(spec.data) : (spec.data ?? new Uint8Array(0));
  const stored = spec.rawCompressed ?? (method === 8 ? new Uint8Array(deflateRawSync(raw)) : raw);
  return {
    spec,
    nameBytes: utf8(spec.name),
    stored,
    csz: stored.length,
    usz: raw.length,
    flags: (spec.flags ?? 0) | (spec.descriptor ? 0x0008 : 0),
    method,
  };
}

function localHeaderBytes(e: Prepared): Bytes {
  const s = e.spec;
  const nameBytes = s.localName !== undefined ? utf8(s.localName) : e.nameBytes;
  const useZero = s.descriptor === true;
  const csz = s.localCsz ?? (useZero ? 0 : e.csz);
  const usz = s.localUsz ?? (useZero ? 0 : e.usz);
  const extra = s.localExtra ?? new Uint8Array(0);
  return concat(
    le32(0x04034b50),
    le16(20),
    le16(e.flags),
    le16(e.method),
    le16(0),
    le16(0x0021),
    le32(
      useZero
        ? 0
        : crc32(typeof s.data === "string" ? utf8(s.data) : (s.data ?? new Uint8Array(0))),
    ),
    le32(csz),
    le32(usz),
    le16(nameBytes.length),
    le16(extra.length),
    nameBytes,
    extra,
  );
}

function descriptorBytes(e: Prepared): Bytes {
  const s = e.spec;
  const raw = typeof s.data === "string" ? utf8(s.data) : (s.data ?? new Uint8Array(0));
  return concat(
    le32(0x08074b50),
    le32(crc32(raw)),
    le32(s.declaredCsz ?? e.csz),
    le32(s.declaredUsz ?? e.usz),
  );
}

function centralEntryBytes(e: Prepared, localOffset: number): Bytes {
  const s = e.spec;
  const raw = typeof s.data === "string" ? utf8(s.data) : (s.data ?? new Uint8Array(0));
  return concat(
    le32(0x02014b50),
    le16(20),
    le16(20),
    le16(e.flags),
    le16(e.method),
    le16(0),
    le16(0x0021),
    le32(crc32(raw)),
    le32(s.declaredCsz ?? e.csz),
    le32(s.declaredUsz ?? e.usz),
    le16(e.nameBytes.length),
    le16(0),
    le16(0),
    le16(0),
    le16(0),
    le32(0),
    le32(localOffset),
    e.nameBytes,
  );
}

function eocdBytes(
  count: number,
  cdSize: number,
  cdOffset: number,
  comment: Bytes = new Uint8Array(0),
): Bytes {
  return concat(
    le32(0x06054b50),
    le16(0),
    le16(0),
    le16(count),
    le16(count),
    le32(cdSize),
    le32(cdOffset),
    le16(comment.length),
    comment,
  );
}

interface BuiltZip {
  bytes: Bytes;
  /** موضع بدء كل رأس محلي. */
  localOffsets: number[];
  /** موضع بدء كل مدخل مركزي. */
  centralOffsets: number[];
  cdOffset: number;
  eocdOffset: number;
}

export function buildZip(
  specs: ZipEntrySpec[],
  options: { comment?: Bytes; trailing?: Bytes } = {},
): BuiltZip {
  const prepared = specs.map(prepare);
  const chunks: Bytes[] = [];
  const localOffsets: number[] = [];
  let pos = 0;
  for (const e of prepared) {
    localOffsets.push(pos);
    const header = localHeaderBytes(e);
    chunks.push(header, e.stored);
    pos += header.length + e.stored.length;
    if (e.spec.descriptor) {
      const d = descriptorBytes(e);
      chunks.push(d);
      pos += d.length;
    }
  }
  const cdOffset = pos;
  const centralOffsets: number[] = [];
  let cdSize = 0;
  prepared.forEach((e, i) => {
    const entry = centralEntryBytes(e, localOffsets[i]);
    centralOffsets.push(cdOffset + cdSize);
    chunks.push(entry);
    cdSize += entry.length;
  });
  const eocdOffset = cdOffset + cdSize;
  chunks.push(eocdBytes(prepared.length, cdSize, cdOffset, options.comment));
  if (options.trailing) chunks.push(options.trailing);
  return { bytes: concat(...chunks), localOffsets, centralOffsets, cdOffset, eocdOffset };
}

/** يقرأ أرشيفًا سليمًا (للاختبار فقط: يفترض أن الأرشيف صحيح) ويعيد مداخله مفكوكة. */
export function readZipEntries(bytes: Bytes): Array<{ name: string; data: Bytes }> {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = bytes.length - 22;
  while (eocd >= 0 && dv.getUint32(eocd, true) !== 0x06054b50) eocd -= 1;
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out: Array<{ name: string; data: Bytes }> = [];
  for (let i = 0; i < count; i++) {
    const method = dv.getUint16(p + 10, true);
    const csz = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const lo = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nameLen));
    const lNameLen = dv.getUint16(lo + 26, true);
    const lExtraLen = dv.getUint16(lo + 28, true);
    const start = lo + 30 + lNameLen + lExtraLen;
    const chunk = bytes.subarray(start, start + csz);
    out.push({
      name,
      data: method === 0 ? new Uint8Array(chunk) : new Uint8Array(inflateRawSync(chunk)),
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

// ── مصنّفات xlsx حقيقية الشكل ────────────────────────────────────────────
export type Aoa = Array<Array<string | number | boolean | Date | null>>;

export function makeXlsx(
  sheets: Array<{ name: string; rows: Aoa; hidden?: boolean }>,
  options: { compression?: boolean } = {},
): Bytes {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(s.rows, { cellDates: true }), s.name);
  }
  if (sheets.some((s) => s.hidden)) {
    wb.Workbook = { Sheets: sheets.map((s) => ({ Hidden: s.hidden ? 1 : 0 })) };
  }
  const out = XLSX.write(wb, {
    type: "array",
    bookType: "xlsx",
    compression: options.compression ?? true,
  }) as ArrayBuffer | Uint8Array | number[];
  return out instanceof Uint8Array ? out : new Uint8Array(out);
}

export interface RawSheetSpec {
  name: string;
  /** XML الورقة كاملًا (`<worksheet>…</worksheet>`)؛ يُكتب في `xl/worksheets/sheet{N}.xml`. */
  xml: string;
  hidden?: boolean;
}

const OOXML_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const OOXML_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const xmlEscape = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** XML ورقةٍ من صفوفٍ جاهزة (`<row>…</row>`). */
export const worksheetXml = (rowsXml: string): string =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="${OOXML_MAIN}"><sheetData>${rowsXml}</sheetData></worksheet>`;

/** `xl/sharedStrings.xml` من سلاسل نصّية. */
export const sharedStringsXml = (strings: string[]): string =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="${OOXML_MAIN}" count="${strings.length}" uniqueCount="${strings.length}">${strings.map((t) => `<si><t xml:space="preserve">${xmlEscape(t)}</t></si>`).join("")}</sst>`;

/**
 * xlsx **مبنيّ يدويًّا بايتًا ببايت** (لا عبر مكتبة الكتابة): للحالات التي يلزم فيها التحكّم بـXML
 * نفسه — سلاسل مشتركة، ووسوم `<sheet>` مكرّرة، وأجزاء مضخَّمة. يطابق ما يكتبه Excel في الشكل.
 */
export function buildRawXlsx(options: {
  sheets: RawSheetSpec[];
  sharedStrings?: string[];
  /** يستبدل محتوى `<sheets>…</sheets>` في workbook.xml كلّه. */
  workbookSheetsXml?: string;
  /** يستبدل وسوم `Relationship` في workbook.xml.rels كلّها. */
  workbookRelsXml?: string;
  /** يُلحَق بوسوم `[Content_Types].xml`. */
  contentTypesExtra?: string;
  extraEntries?: ZipEntrySpec[];
}): Bytes {
  const { sheets } = options;
  const sstRel = options.sharedStrings
    ? `<Relationship Id="rIdSst" Type="${OOXML_REL}/sharedStrings" Target="sharedStrings.xml"/>`
    : "";
  const sheetTags = sheets
    .map(
      (s, i) =>
        `<sheet name="${xmlEscape(s.name)}" sheetId="${i + 1}"${s.hidden ? ' state="hidden"' : ""} r:id="rId${i + 1}"/>`,
    )
    .join("");
  const sheetRels = sheets
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="${OOXML_REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
    )
    .join("");
  const overrides = [
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`,
    ...sheets.map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    ),
    options.sharedStrings
      ? `<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>`
      : "",
  ].join("");
  const specs: ZipEntrySpec[] = [
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>${overrides}${options.contentTypesExtra ?? ""}</Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${OOXML_REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="${OOXML_MAIN}" xmlns:r="${OOXML_REL}"><sheets>${options.workbookSheetsXml ?? sheetTags}</sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${options.workbookRelsXml ?? sheetRels + sstRel}</Relationships>`,
    },
    ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: s.xml })),
  ];
  if (options.sharedStrings) {
    specs.push({ name: "xl/sharedStrings.xml", data: sharedStringsXml(options.sharedStrings) });
  }
  return buildZip([...specs, ...(options.extraEntries ?? [])]).bytes;
}

/** يعيد بناء xlsx بتعديل مدخلاته: يستبدل/يضيف/يحذف (قيمة `null` تحذف). */
export function rewriteXlsx(
  xlsx: Bytes,
  change: (entries: Array<{ name: string; data: Bytes }>) => ZipEntrySpec[],
): Bytes {
  return buildZip(change(readZipEntries(xlsx))).bytes;
}

/** أمثلة جاهزة لمدخلات تُضاف إلى xlsx سليم. */
export const asSpecs = (entries: Array<{ name: string; data: Bytes }>): ZipEntrySpec[] =>
  entries.map((e) => ({ name: e.name, data: e.data }));

export const PRINTER_SETTINGS_ENTRY: ZipEntrySpec = {
  name: "xl/printerSettings/printerSettings1.bin",
  // رأس DEVMODE اصطناعي: بايتات غير نصّية كما في ملفات Excel الحقيقية.
  data: new Uint8Array([
    0x4d, 0x00, 0x69, 0x00, 0x63, 0x00, 0x00, 0x00, 0x01, 0x04, 0x00, 0x00, 0xff, 0xfe,
  ]),
};

// ── الماسح القديم (نسخة طبق الأصل من منطق `inspectZip` في file-inspection.server.ts) ──
// يُستخدم لإثبات أن الأرشيف المزوَّر **يخدع الماسح القديم فعلًا** (فالهجوم حقيقي لا نظري)،
// بينما يرفضه الفاحص الجديد. لا يدخل أي مسار إنتاج.
export function legacyScanNames(bytes: Bytes): string[] {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const names: string[] = [];
  for (let offset = 0; offset + 46 <= bytes.length; offset++) {
    if (dv.getUint32(offset, true) !== 0x02014b50) continue;
    const nameLength = dv.getUint16(offset + 28, true);
    const extraLength = dv.getUint16(offset + 30, true);
    const commentLength = dv.getUint16(offset + 32, true);
    const end = offset + 46 + nameLength + extraLength + commentLength;
    if (end > bytes.length || nameLength === 0) throw new Error("legacy: malformed");
    names.push(
      new TextDecoder("latin1")
        .decode(bytes.subarray(offset + 46, offset + 46 + nameLength))
        .toLowerCase(),
    );
    offset = end - 1;
  }
  return names;
}

/**
 * أرشيف xlsx حقيقي الشكل يخفي `xl/vbaProject.bin` عن الماسح القديم برأسٍ مركزيٍّ مزوَّر داخل بيانات
 * مدخلٍ مخزَّن: الرأس المزوَّر يعلن تعليقًا طويلًا يقفز بالماسح فوق مدخل الماكرو الحقيقي.
 */
export function buildFakeCentralHeaderXlsx(base: Bytes): { bytes: Bytes; hiddenName: string } {
  const hiddenName = "xl/vbaProject.bin";
  const baseSpecs = asSpecs(readZipEntries(base));
  const build = (jump: number) => {
    const fakeName = utf8("a".repeat(8));
    const fakeHeader = concat(
      le32(0x02014b50),
      le16(20),
      le16(20),
      le16(0),
      le16(0),
      le16(0),
      le16(0x0021),
      le32(0),
      le32(0),
      le32(0),
      le16(fakeName.length),
      le16(0),
      le16(jump),
      le16(0),
      le16(0),
      le32(0),
      le32(0),
      fakeName,
    );
    const decoy: ZipEntrySpec = { name: "docProps/decoy.xml", data: fakeHeader, method: 0 };
    const specs: ZipEntrySpec[] = [
      decoy,
      { name: hiddenName, data: utf8("not really a macro"), method: 0 },
      ...baseSpecs,
    ];
    return buildZip(specs);
  };
  // التمريرة الأولى تقيس التخطيط، والثانية تضبط قفزة الرأس المزوَّر لتهبط عند أول مدخلٍ بعد الماكرو.
  const first = build(0);
  const fakeAt = first.localOffsets[0] + (30 + utf8("docProps/decoy.xml").length);
  const landing = first.centralOffsets[2];
  const jump = landing - (fakeAt + 46 + 8);
  const second = build(jump);
  return { bytes: second.bytes, hiddenName };
}

/** مدخلان متداخلان: الثاني (رأسه محلي وبياناته) مدفونٌ داخل بيانات الأول. */
export function buildOverlappingXlsx(base: Bytes): Bytes {
  const specs = asSpecs(readZipEntries(base)).filter((s) => s.name !== "xl/styles.xml");
  const inner = prepare({ name: "xl/styles.xml", data: "<styleSheet/>", method: 0 });
  const innerBytes = concat(localHeaderBytes(inner), inner.stored);
  const prefix = utf8("<sst>");
  const outerData = concat(prefix, innerBytes, utf8("</sst>"));
  const outer: ZipEntrySpec = { name: "xl/sharedStrings.xml", data: outerData, method: 0 };
  const rest = specs.filter((s) => s.name !== "xl/sharedStrings.xml");
  const all = [outer, ...rest];
  const prepared = all.map(prepare);
  const chunks: Bytes[] = [];
  const offsets: number[] = [];
  let pos = 0;
  for (const e of prepared) {
    offsets.push(pos);
    const h = localHeaderBytes(e);
    chunks.push(h, e.stored);
    pos += h.length + e.stored.length;
  }
  // الثاني يشير إلى الرأس المدفون داخل بيانات الأول.
  const innerOffset = offsets[0] + localHeaderBytes(prepared[0]).length + prefix.length;
  const cdOffset = pos;
  let cdSize = 0;
  prepared.forEach((e, i) => {
    const entry = centralEntryBytes(e, offsets[i]);
    chunks.push(entry);
    cdSize += entry.length;
  });
  const innerEntry = centralEntryBytes(inner, innerOffset);
  chunks.push(innerEntry);
  cdSize += innerEntry.length;
  chunks.push(eocdBytes(prepared.length + 1, cdSize, cdOffset));
  return concat(...chunks);
}

/** هل المستدعي يستطيع تعطيل `console`؟ يلتقط كل مخرجات `console.*` أثناء `fn` ويعيدها نصًّا واحدًا. */
export async function captureConsole<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; output: string }> {
  const lines: string[] = [];
  const methods = ["log", "info", "warn", "error", "debug", "trace"] as const;
  const originals = methods.map((m) => console[m]);
  methods.forEach((m) => {
    console[m] = (...args: unknown[]) => {
      lines.push(
        args
          .map((a) => {
            if (typeof a === "string") return a;
            try {
              return JSON.stringify(a);
            } catch {
              return String(a);
            }
          })
          .join(" "),
      );
    };
  });
  try {
    const result = await fn();
    return { result, output: lines.join("\n") };
  } finally {
    methods.forEach((m, i) => {
      console[m] = originals[i];
    });
  }
}
