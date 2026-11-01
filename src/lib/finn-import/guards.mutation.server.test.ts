// @vitest-environment node
/**
 * براهين التحمير (المادة ٣٠): كل حارسٍ في استيراد فِن يُثبَت أنه **يحمرّ** حين يُضعَّف عمدًا.
 *
 * الطريقة: لكل حارس «بطارية» من الهجمات المزروعة تُشغَّل أولًا على الكود الحقيقي (يجب ألا تُخطئ
 * شيئًا)، ثم على **نسخةٍ مُضعَّفة** من الملف نفسه مولَّدة وقت التشغيل بتبديل نصٍّ واحد (المرساة
 * يجب أن تظهر مرّةً واحدة بالضبط، وإلا فشل الاختبار بصوتٍ عالٍ إن تغيّر المصدر). المطلوب أن تُخطئ
 * البطارية في النسخة المُضعَّفة بالتسمية المتوقعة — أي أن الهجوم المزروع يمرّ فعلًا حين يغيب الحارس.
 *
 * النسخ المُضعَّفة تُكتب في `<جذر المستودع>/.mutant-scratch/` باسمٍ `__mutant_*` — **خارج `src/`** كي لا
 * تقع في `globSync("src/**\/*.{ts,tsx}")` لحرّاس العقد الأخرى فتُحدث ENOENT عشوائيًّا — وتُحذف فور
 * استيرادها (وما تبقّى من تشغيلٍ مقطوع يُنظَّف عند البدء). لا يستورد أي كودِ إنتاجٍ منها.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FINN_IMPORT_LIMITS } from "./contract";
import * as realSpreadsheet from "./safe-spreadsheet.server";
import * as realToken from "./import-token.server";
import * as realToText from "./to-text.server";
import * as realZip from "./safe-zip.server";
import {
  asSpecs,
  buildFakeCentralHeaderXlsx,
  buildOverlappingXlsx,
  buildZip,
  concat,
  makeXlsx,
  readZipEntries,
  rewriteXlsx,
  utf8,
  type Bytes,
  type ZipEntrySpec,
} from "./fixtures.test-support";
import {
  MUTANT_REPO_ROOT,
  MUTANT_SCRATCH_DIR,
  createMutantScratch,
  isMutantFileName,
  mutantFilesInsideSrc,
  rewriteRelativeImports,
} from "./mutant-scratch.test-support";

const LIMITS = FINN_IMPORT_LIMITS;
const DIR = path.dirname(fileURLToPath(import.meta.url));
const scratch = createMutantScratch("__mutant_");

const rpcState = vi.hoisted(() => ({
  buckets: new Map<string, number>(),
  override: null as null | "error",
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    async rpc(_fn: string, args: Record<string, unknown>) {
      if (rpcState.override === "error") return { data: null, error: { message: "boom" } };
      const key = String(args._bucket_key);
      const count = (rpcState.buckets.get(key) ?? 0) + 1;
      rpcState.buckets.set(key, count);
      return { data: count <= Number(args._max_requests), error: null };
    },
  },
}));

// ── أداة التضعيف ─────────────────────────────────────────────────────────
async function mutate<M>(file: string, edits: Array<[from: string, to: string]>): Promise<M> {
  const sourcePath = path.join(DIR, file);
  const source = fs.readFileSync(sourcePath, "utf8");
  let out = source;
  for (const [from, to] of edits) {
    const found = out.split(from).length - 1;
    if (found !== 1) {
      throw new Error(
        `مرساة التضعيف يجب أن تظهر مرّةً واحدة (وُجدت ${found}): ${from.slice(0, 90)}`,
      );
    }
    out = out.replace(from, () => to);
  }
  if (out === source) throw new Error("التضعيف لم يغيّر شيئًا");
  return scratch.importMutated<M>(sourcePath, out);
}

beforeAll(() => scratch.cleanStale());
afterAll(() => scratch.cleanStale());

describe("أداة التضعيف نفسها", () => {
  it("ترفض مرساةً غائبة أو مكرَّرة (فلا يمرّ تضعيفٌ وهميّ)", async () => {
    await expect(
      mutate("messages.server.ts", [["نص غير موجود إطلاقًا ٧٧٣١", "x"]]),
    ).rejects.toThrow(/وُجدت 0/);
    await expect(mutate("messages.server.ts", [["export", "x"]])).rejects.toThrow(/وُجدت [2-9]/);
  });

  it("لا تترك ملفات مُضعَّفة خلفها، ولا تُكتب داخل src أبدًا (وإلا كسرت globSync الحرّاس بسباق ENOENT)", async () => {
    await mutate("messages.server.ts", [
      ["export function finnImportMessageAr", "export function messageAr2"],
    ]);
    expect(scratch.leftovers()).toEqual([]);
    expect(mutantFilesInsideSrc()).toEqual([]);
    // المجلد نفسه خارج src/، لا مجلّدٌ فرعيّ منها.
    const rel = path.relative(path.join(MUTANT_REPO_ROOT, "src"), MUTANT_SCRATCH_DIR);
    expect(rel.startsWith("..") && !path.isAbsolute(rel)).toBe(true);
    expect(path.basename(MUTANT_SCRATCH_DIR)).toBe(".mutant-scratch");
  });

  it("كاشف الملفات المُضعَّفة يلتقط الأسماء الثلاثة في أي مستوى ولا يلتقط الأدوات (انتهاك مزروع)", () => {
    for (const planted of [
      "__mutant_12_3__safe-zip.server.ts",
      "lib/finn-import/__routemutant_9_1__import.ts",
      "src/__pii_mutant_4_0__to-text.server.ts",
    ]) {
      expect(isMutantFileName(planted), planted).toBe(true);
    }
    for (const real of [
      "mutant-scratch.test-support.ts",
      "guards.mutation.server.test.ts",
      "lib/finn-import/to-text.server.ts",
    ]) {
      expect(isMutantFileName(real), real).toBe(false);
    }
  });

  it("المجلد مُتجاهَل في git (وإلا التقطه git add .)", () => {
    const ignore = fs.readFileSync(path.join(MUTANT_REPO_ROOT, ".gitignore"), "utf8");
    expect(ignore.split("\n").map((l) => l.trim())).toContain(".mutant-scratch/");
  });

  it("تُحوَّل المحدِّدات النسبية كلها إلى مسارات مطلقة موجودة (الأشكال الأربعة)، ويبقى @/ كما هو", () => {
    const src = [
      'import { FINN_IMPORT_LIMITS } from "./contract";',
      "import type { X } from '../finn-import/messages.server';",
      'export * from "./safe-zip.server";',
      'import "./contract";',
      'const m = await import("./import-token.server");',
      'const a = await import("@/integrations/supabase/client.server");',
      'import { createHash } from "node:crypto";',
    ].join("\n");
    const out = rewriteRelativeImports(src, DIR);
    const specifiers = [...out.matchAll(/["']([^"'\n]+)["']/g)].map((m) => m[1]);
    expect(specifiers).toHaveLength(7);
    const relative = specifiers.filter((s) => /^\.\.?\//.test(s));
    expect(relative).toEqual([]);
    for (const s of specifiers.filter((s) => s.startsWith("/")))
      expect(fs.existsSync(s)).toBe(true);
    expect(out).toContain('"@/integrations/supabase/client.server"');
    expect(out).toContain('"node:crypto"');
    expect(specifiers.filter((s) => s.startsWith("/"))).toHaveLength(5);
  });

  it("محدِّدٌ نسبيّ يتعذّر حلّه أو يفلت من إعادة الكتابة يُفشل الأداة بصوتٍ عالٍ (انتهاك مزروع)", () => {
    expect(() => rewriteRelativeImports('import x from "./لا-وجود-له";', DIR)).toThrow(/تعذّر حلّ/);
    expect(() => rewriteRelativeImports("const m = await import(`./contract`);", DIR)).toThrow(
      /بقي محدِّد/,
    );
  });
});

// ═══ ١) فاحص الأرشيف ═════════════════════════════════════════════════════
type ZipModule = typeof realZip;

const zipBase = () =>
  makeXlsx([
    {
      name: "Data",
      rows: [
        ["a", "b"],
        ["1", "2"],
      ],
    },
  ]);

function zipAttacks(): Record<string, Bytes> {
  const base = zipBase();
  const withExtra = (extra: ZipEntrySpec[]) =>
    rewriteXlsx(base, (entries) => [
      ...asSpecs(entries).filter((s) => !extra.some((e) => e.name === s.name)),
      ...extra,
    ]);
  return {
    fake_central_header: buildFakeCentralHeaderXlsx(base).bytes,
    vba_plain: withExtra([{ name: "xl/vbaProject.bin", data: "x" }]),
    local_size_mismatch: rewriteXlsx(base, (entries) =>
      asSpecs(entries).map((s) =>
        s.name === "xl/worksheets/sheet1.xml" ? { ...s, localUsz: 1024 * 1024 * 1024 } : s,
      ),
    ),
    short_inflate: withExtra([
      {
        name: "xl/worksheets/sheet2.xml",
        data: "x".repeat(100),
        descriptor: true,
        declaredUsz: 5000,
      },
    ]),
    trailing_junk: buildZip(asSpecs(readZipEntries(base)), { trailing: utf8("JUNKJUNKJUNK") })
      .bytes,
    duplicate_entry: rewriteXlsx(base, (entries) => [
      ...asSpecs(entries),
      { name: "xl/workbook.xml", data: "<workbook/>" },
    ]),
    traversal: withExtra([{ name: "../../evil.xml", data: "<x/>" }]),
    overlap: buildOverlappingXlsx(base),
    encrypted: rewriteXlsx(base, (entries) =>
      asSpecs(entries).map((s) => (s.name === "xl/workbook.xml" ? { ...s, flags: 0x0001 } : s)),
    ),
  };
}

/** أسماء الهجمات التي **مرّت** (ما كان يجب أن تمرّ) + «control_rejected» إن رُفض الملف السليم. */
async function zipBattery(mod: ZipModule): Promise<string[]> {
  const bad: string[] = [];
  if (!(await mod.inspectXlsxZip(zipBase())).ok) bad.push("control_rejected");
  for (const [label, bytes] of Object.entries(zipAttacks())) {
    if ((await mod.inspectXlsxZip(bytes)).ok) bad.push(label);
  }
  return bad;
}

describe("براهين التحمير — فاحص الأرشيف", () => {
  it("الأساس: الكود الحقيقي يرفض كل الهجمات المزروعة ويقبل الملف السليم", async () => {
    expect(await zipBattery(realZip)).toEqual([]);
  });

  it.each([
    [
      "رأس مركزي مزوَّر: يمرّ حين يُعطَّل حارس الأجزاء المحظورة على الدليل الحقيقي",
      [
        [
          "function isForbiddenPart(lower: string): boolean {",
          "function isForbiddenPart(lower: string): boolean {\n  return false;",
        ],
      ],
      ["fake_central_header", "vba_plain"],
    ],
    [
      "حجم محلي كاذب (٦٥ كيلوبايت ⇒ ١ غيغابايت): يمرّ حين تُلغى مقارنة الأحجام المحلية بالمركزية",
      [
        ["(!hasDescriptor || lcsz !== 0) && lcsz !== csz", "false"],
        ["(!hasDescriptor || lusz !== 0) && lusz !== usz", "false"],
      ],
      ["local_size_mismatch"],
    ],
    [
      "مدخل أقصر من المعلن بواصف كاذب: يمرّ حين يُلغى فحص المطابقة التامة بعد الفك",
      [['if (written !== expected) return { ok: false, reason: "inflate_size_mismatch" };', ""]],
      ["short_inflate"],
    ],
    [
      "بايتات بعد نهاية الدليل: تمرّ حين يُرخى شرط «التعليق يبلغ آخر بايت»",
      [["if (eocd + EOCD_MIN + u16(bytes, eocd + 20) !== len)", "if (false)"]],
      ["trailing_junk"],
    ],
    [
      "مدخلان بالاسم نفسه: يمرّان حين يُلغى كشف التكرار",
      [["if (seen.has(lower))", "if (false)"]],
      ["duplicate_entry"],
    ],
    [
      "اسم متسلّل ../: يمرّ حين يُلغى فحص مقاطع المسار",
      [['segment === "" || segment === "." || segment === ".."', "false"]],
      ["traversal"],
    ],
    [
      "مدخلان متداخلان: يمرّان حين يُلغى فحص التداخل",
      [["byOffset[i].localOffset < byOffset[i - 1].dataEnd", "false"]],
      ["overlap"],
    ],
    [
      "علَم التشفير: يمرّ حين يُصفَّر القناع",
      [["const FLAG_ENCRYPTED_MASK = 0x2041;", "const FLAG_ENCRYPTED_MASK = 0;"]],
      ["encrypted"],
    ],
  ] as Array<[string, Array<[string, string]>, string[]]>)(
    "%s",
    async (_title, edits, expected) => {
      const mutant = await mutate<ZipModule>("safe-zip.server.ts", edits);
      const bad = await zipBattery(mutant);
      expect(bad).toEqual(expect.arrayContaining(expected));
      expect(bad).not.toContain("control_rejected");
    },
  );
});

// ═══ ٢) القارئ: قصّ النطاق والأنواع ══════════════════════════════════════
type SpreadsheetModule = typeof realSpreadsheet;

function spreadsheetFixtures() {
  const wide = (() => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["a", "b"],
      ["1", "2"],
    ]);
    ws["XFD1"] = { t: "s", v: "far" };
    ws["XFD2"] = { t: "s", v: "farther" };
    ws["!ref"] = "A1:XFD2";
    XLSX.utils.book_append_sheet(wb, ws, "W");
    return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
  })();
  const manyRows = (() => {
    const rows: Array<Array<string | number>> = [["id", "v"]];
    for (let i = 1; i <= LIMITS.maxRowsPerSheet + 5; i++) rows.push([i, `r${i}`]);
    return makeXlsx([{ name: "M", rows }]);
  })();
  const csv = (() => {
    const lines = ["id,v"];
    for (let i = 1; i <= LIMITS.maxRowsPerSheet + 7; i++) lines.push(`${i},x`);
    return utf8(lines.join("\n"));
  })();
  const hidden = makeXlsx([
    { name: "ظاهرة", rows: [["x"], ["1"]] },
    { name: "سرية", rows: [["secret"], ["HIDDEN_VALUE_9917"]], hidden: true },
  ]);
  const elf = concat([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00], new Array(60).fill(0));
  return { wide, manyRows, csv, hidden, elf };
}

async function spreadsheetBattery(mod: SpreadsheetModule): Promise<string[]> {
  const f = spreadsheetFixtures();
  const bad: string[] = [];
  const wide = await mod.readImportFile({ name: "wide.xlsx", bytes: f.wide });
  if (!wide.ok || wide.sheets[0].headers.length > LIMITS.maxCols) bad.push("wide_cols_unclamped");
  const many = await mod.readImportFile({ name: "many.xlsx", bytes: f.manyRows });
  if (!many.ok || many.sheets[0].rows.length > LIMITS.maxRowsPerSheet) bad.push("rows_unclamped");
  const csv = await mod.readImportFile({ name: "many.csv", bytes: f.csv });
  if (!csv.ok || csv.sheets[0].rows.length > LIMITS.maxRowsPerSheet) bad.push("csv_rows_unclamped");
  const hidden = await mod.readImportFile({ name: "h.xlsx", bytes: f.hidden });
  if (!hidden.ok || JSON.stringify(hidden.sheets).includes("HIDDEN_VALUE_9917"))
    bad.push("hidden_sheet_read");
  const elf = await mod.readImportFile({ name: "run.txt", bytes: f.elf });
  if (elf.ok || elf.error !== "unsafe") bad.push("elf_not_unsafe");
  return bad;
}

describe("براهين التحمير — قصّ النطاق والأنواع في القارئ", () => {
  it("الأساس: الكود الحقيقي يقصّ كل شيء ويرفض ELF", async () => {
    expect(await spreadsheetBattery(realSpreadsheet)).toEqual([]);
  }, 30_000);

  it.each([
    [
      "أعمدة XFD: تتسرّب حين يُلغى سقف الأعمدة",
      [["const width = Math.min(row.length, LIMITS.maxCols);", "const width = row.length;"]],
      ["wide_cols_unclamped"],
    ],
    [
      "صفوف xlsx فوق الحدّ: تتسرّب حين يُلغى سقف الصفوف",
      [
        ["const window = LIMITS.maxRowsPerSheet + 2;", "const window = 1_000_000;"],
        ["if (records.length <= LIMITS.maxRowsPerSheet) records.push(out);", "records.push(out);"],
        [".slice(1, LIMITS.maxRowsPerSheet + 1)", ".slice(1)"],
      ],
      ["rows_unclamped"],
    ],
    [
      "صفوف csv فوق الحدّ: تتسرّب حين يُلغى السقف",
      [["if (rows.length < maxRows) rows.push(captured);", "rows.push(captured);"]],
      ["csv_rows_unclamped"],
    ],
    [
      "الورقة المخفية: تُقرأ حين يُلغى تجاهلها",
      [
        ['if (typeof state === "number" && state !== 0) {', "if (false) {"],
        // طبقة ثانية (خيار `sheets`): المخفية لا تُحلَّل أصلًا، فيُعطَّل الحارسان معًا.
        ['state !== "hidden" && state !== "veryHidden" && ', ""],
      ],
      ["hidden_sheet_read"],
    ],
    [
      "ELF بامتداد نصّي: لا يُسمّى unsafe حين يُلغى كشف التوقيع التنفيذي",
      [
        [
          '    // الأنواع النصّية: لا توقيع تنفيذي ولا حاوية.\n    if (sniffed === "executable") return failure("unsafe");',
          "    // (مُضعَّف)",
        ],
      ],
      ["elf_not_unsafe"],
    ],
  ] as Array<[string, Array<[string, string]>, string[]]>)(
    "%s",
    async (_title, edits, expected) => {
      const mutant = await mutate<SpreadsheetModule>("safe-spreadsheet.server.ts", edits);
      const bad = await spreadsheetBattery(mutant);
      expect(bad).toEqual(expect.arrayContaining(expected));
    },
    30_000,
  );
});

// ═══ ٣) حجب البيانات الشخصية ═════════════════════════════════════════════
type ToTextModule = typeof realToText;

const PLANTED_PII = {
  idAscii: "1012345678",
  idArabicIndic: "١٠١٢٣٤٥٦٧٨",
  phonePlain: "0551234567",
  phoneGrouped: "+966 55 123 4567",
  phoneArabicIndic: "٠٥٥١٢٣٤٥٦٧",
  email: "ahmad.ali@example.com",
} as const;

function piiBattery(mod: ToTextModule): string[] {
  const leaked: string[] = [];
  for (const [label, value] of Object.entries(PLANTED_PII)) {
    const built = mod.buildDocuments(
      [
        {
          name: "S",
          headers: ["قيمة"],
          rows: [[`قبل ${value} بعد`]],
          rowsTotal: 1,
          rowsTotalExact: true,
          colsTotal: 1,
          plain: false,
        },
      ],
      { fileName: "pii.csv" },
    );
    const stored = built.parts.map((p) => `${p.title}\n${p.text}`).join("\n");
    if (stored.includes(value)) leaked.push(label);
    if (built.pii.id_numbers + built.pii.phones + built.pii.emails === 0)
      leaked.push(`${label}:uncounted`);
  }
  return leaked;
}

describe("براهين التحمير — حجب البيانات الشخصية", () => {
  it("الأساس: الكود الحقيقي يحجب كل القيم المزروعة ويعدّها", () => {
    expect(piiBattery(realToText)).toEqual([]);
  });

  it.each([
    [
      "نمط الهوية: تتسرّب الهوية حين يُغيَّر النمط",
      [
        [
          "const NATIONAL_ID = /(?<![0-9])[12][0-9]{9}(?![0-9])/g;",
          "const NATIONAL_ID = /(?<![0-9])[3][0-9]{9}(?![0-9])/g;",
        ],
      ],
      ["idAscii", "idArabicIndic"],
    ],
    [
      "تطبيع الأرقام الهندية: تتسرّب الهوية والجوال المكتوبان بها حين يُلغى",
      [
        [
          "return text.replace(NON_ASCII_DIGIT, (d) => String.fromCharCode(0x30 + (d.charCodeAt(0) & 0x0f)));",
          "return text;",
        ],
      ],
      ["idArabicIndic", "phoneArabicIndic"],
    ],
    [
      "البريد: يتسرّب حين تُعطَّل مرحلته",
      [['if (folded.includes("@")) {', "if (false) {"]],
      ["email"],
    ],
    [
      "الجوال: يتسرّب حين يُسقط نمط الجوال من المراحل",
      [
        [
          "for (const pattern of [PHONE_MOBILE, PHONE_LANDLINE]) {",
          "for (const pattern of [PHONE_LANDLINE]) {",
        ],
      ],
      ["phonePlain", "phoneGrouped", "phoneArabicIndic"],
    ],
  ] as Array<[string, Array<[string, string]>, string[]]>)(
    "%s",
    async (_title, edits, expected) => {
      const mutant = await mutate<ToTextModule>("to-text.server.ts", edits);
      expect(piiBattery(mutant)).toEqual(expect.arrayContaining(expected));
    },
  );
});

// ═══ ٤) رمز التأكيد ══════════════════════════════════════════════════════
type TokenModule = typeof realToken;

const SECRET = "t".repeat(40);
const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const NOW = Date.UTC(2026, 9, 31, 12, 0, 0);

beforeEach(() => {
  process.env.FINN_IMPORT_SIGNING_SECRET = SECRET;
  delete process.env.SADEED_MESSAGE_APPROVAL_SECRET;
  delete process.env.ARIA_MESSAGE_APPROVAL_SECRET;
  rpcState.buckets.clear();
  rpcState.override = null;
});

async function tokenBattery(mod: TokenModule): Promise<string[]> {
  const bad: string[] = [];
  const sha1 = mod.fileSha256Hex(utf8("one"));
  const sha2 = mod.fileSha256Hex(utf8("two"));
  const signed = await mod.signImportToken({
    userId: USER_A,
    fileSha256: sha1,
    parts: 1,
    rows: 3,
    now: NOW,
  });
  if (!signed.ok) return ["sign_failed"];
  const verify = (
    over: { userId?: string; fileSha256?: string; now?: number },
    token = signed.token,
  ) =>
    mod.verifyImportToken(token, { userId: USER_A, fileSha256: sha1, now: NOW + 1_000, ...over });
  if (!(await verify({})).ok) bad.push("control_rejected");
  if ((await verify({ userId: USER_B })).ok) bad.push("other_user_accepted");
  if ((await verify({ fileSha256: sha2 })).ok) bad.push("other_file_accepted");
  if ((await verify({ now: NOW + LIMITS.tokenTtlMs + 1 })).ok) bad.push("expired_accepted");
  const [payload, signature] = signed.token.split(".");
  const flipped = `${signature.slice(0, 5)}${signature[5] === "A" ? "B" : "A"}${signature.slice(6)}`;
  if ((await verify({}, `${payload}.${flipped}`)).ok) bad.push("forged_signature_accepted");
  // الاستهلاك مرّةً واحدة
  const first = await mod.claimImportToken({ nonce: signed.nonce, userId: USER_A });
  const second = await mod.claimImportToken({ nonce: signed.nonce, userId: USER_A });
  if (!first.ok) bad.push("claim_first_rejected");
  if (second.ok) bad.push("replay_accepted");
  rpcState.override = "error";
  if ((await mod.claimImportToken({ nonce: "other", userId: USER_A })).ok)
    bad.push("claim_fail_open");
  rpcState.override = null;
  return bad;
}

describe("براهين التحمير — رمز التأكيد", () => {
  it("الأساس: الكود الحقيقي يرفض كل المخالفات ويقبل الصالح", async () => {
    expect(await tokenBattery(realToken)).toEqual([]);
  });

  it.each([
    [
      "ربط المستخدم: رمز A يصلح لـB حين يُلغى الشرط",
      [['if (payload.uid !== expected.userId) return { ok: false, error: "token_invalid" };', ""]],
      ["other_user_accepted"],
    ],
    [
      "ربط الملف: رمز ملفٍ يصلح لملفٍ آخر حين يُلغى الشرط",
      [
        [
          'if (payload.sha !== expected.fileSha256) return { ok: false, error: "file_changed" };',
          "",
        ],
      ],
      ["other_file_accepted"],
    ],
    [
      "الانتهاء: الرمز المنتهي يمرّ حين يُلغى الشرط",
      [
        [
          'if (payload.exp <= (expected.now ?? Date.now())) return { ok: false, error: "token_expired" };',
          "",
        ],
      ],
      ["expired_accepted"],
    ],
    [
      "التوقيع: الرمز المزوَّر يمرّ حين تُلغى المقارنة",
      [["!timingSafeEqual(actual, wanted)", "false"]],
      ["forged_signature_accepted"],
    ],
    [
      "الاستهلاك مرّةً واحدة: الإعادة تمرّ حين يُتجاهل جواب الانتخاب",
      [
        [
          'return data ? { ok: true } : { ok: false, error: "already_used" };',
          "return { ok: true };",
        ],
      ],
      ["replay_accepted"],
    ],
    [
      "الفشل المغلق: عطل المخزن يُمرّر الكتابة حين يُعامَل غير-false نجاحًا",
      [
        ['if (error || typeof data !== "boolean") return { ok: false, error: "unavailable" };', ""],
        [
          'return data ? { ok: true } : { ok: false, error: "already_used" };',
          'return data === false ? { ok: false, error: "already_used" } : { ok: true };',
        ],
      ],
      ["claim_fail_open"],
    ],
  ] as Array<[string, Array<[string, string]>, string[]]>)(
    "%s",
    async (_title, edits, expected) => {
      const mutant = await mutate<TokenModule>("import-token.server.ts", edits);
      expect(await tokenBattery(mutant)).toEqual(expect.arrayContaining(expected));
    },
  );
});
