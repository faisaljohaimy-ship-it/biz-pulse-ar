// @vitest-environment node
/**
 * القارئ الآمن لملفات الاستيراد: xlsx (عبر الفاحص الصارم) · csv/tsv · txt/md · json.
 * كل الملفات اصطناعية تُبنى وقت التشغيل. تغطي: الصيغ الخاملة، الترويسات الخطرة (`__proto__`)،
 * قصّ النطاق، الترميزات، رفض الأنواع المتنكّرة، وعدم تسريب أي نصٍّ من الملف إلى `console`
 * أو الرسائل. الحراس المقابلة المُضعَّفة عمدًا في `guards.mutation.server.test.ts`.
 */
import * as XLSX from "xlsx";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FINN_IMPORT_LIMITS } from "./contract";
import { FINN_IMPORT_LEGACY_EXCEL_MESSAGE_AR, FINN_IMPORT_MESSAGES_AR } from "./messages.server";
import {
  FINN_JSON_MAX_DEPTH,
  FINN_XLSX_MAX_READ_CHARS,
  cleanCell,
  readImportFile,
  type ImportSheet,
  type ReadImportOk,
  type ReadImportResult,
} from "./safe-spreadsheet.server";
import {
  PRINTER_SETTINGS_ENTRY,
  asSpecs,
  buildRawXlsx,
  captureConsole,
  concat,
  makeXlsx,
  readZipEntries,
  rewriteXlsx,
  utf8,
  worksheetXml,
  type Aoa,
  type Bytes,
} from "./fixtures.test-support";

// مراقب `XLSX.read`: يسجّل الخيارات الممرَّرة والبايتات والأوراق المحلَّلة فعلًا، ويستدعي الأصل كما هو.
// هذا ما يجعل أثر الخيارات الخاملة (cellFormula/cellHTML/bookVBA) وعدد الأوراق المحلَّلة مرئيًّا في الاختبار.
const xlsxSpy = vi.hoisted(() => ({
  calls: [] as Array<{
    opts: Record<string, unknown>;
    data: Uint8Array;
    parsedSheets: string[];
  }>,
}));
vi.mock("xlsx", async (importOriginal) => {
  const actual = await importOriginal<typeof import("xlsx")>();
  return {
    ...actual,
    read: (data: Uint8Array, opts?: Record<string, unknown>) => {
      const workbook = actual.read(data, opts as never);
      xlsxSpy.calls.push({
        opts: { ...opts },
        data,
        parsedSheets: Object.keys(workbook.Sheets ?? {}),
      });
      return workbook;
    },
  };
});
beforeEach(() => {
  xlsxSpy.calls.length = 0;
});

const LIMITS = FINN_IMPORT_LIMITS;

function expectOk(r: ReadImportResult): ReadImportOk {
  expect(r.ok, r.ok ? "" : `unexpected failure ${r.error}`).toBe(true);
  return r as ReadImportOk;
}

function expectFail(r: ReadImportResult, error: string) {
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error).toBe(error);
}

const read = (name: string, bytes: Bytes) => readImportFile({ name, bytes });
const firstSheet = (r: ReadImportResult): ImportSheet => expectOk(r).sheets[0];

describe("readImportFile — xlsx", () => {
  it("يقرأ ورقة عربية: ترويسات وأرقامًا وتواريخ وقيمًا منطقية", async () => {
    const bytes = makeXlsx([
      {
        name: "المخزون",
        rows: [
          ["الصنف", "الكمية", "التاريخ", "نشط", "سعر"],
          ["مضخة", 12, new Date(Date.UTC(2026, 9, 31, 14, 30)), true, 0.1 + 0.2],
          ["صمام", 1234567890123, new Date(Date.UTC(2026, 0, 5)), false, 99.5],
        ],
      },
    ]);
    const sheet = firstSheet(await read("inventory.xlsx", bytes));
    expect(sheet.name).toBe("المخزون");
    expect(sheet.headers).toEqual(["الصنف", "الكمية", "التاريخ", "نشط", "سعر"]);
    expect(sheet.rows).toEqual([
      ["مضخة", "12", "2026-10-31T14:30", "TRUE", "0.3"],
      ["صمام", "1234567890123", "2026-01-05", "FALSE", "99.5"],
    ]);
    expect(sheet.rowsTotal).toBe(2);
    expect(sheet.rowsTotalExact).toBe(true);
    expect(sheet.colsTotal).toBe(5);
    expect(sheet.plain).toBe(false);
  });

  it("التاريخ يُرسم بالتوقيت الثابت مهما كانت منطقة الخادم", async () => {
    const bytes = makeXlsx([
      { name: "S", rows: [["d"], [new Date(Date.UTC(2026, 9, 31, 14, 30))]] },
    ]);
    const original = process.env.TZ;
    const offsets = new Set<number>();
    try {
      for (const tz of ["UTC", "Asia/Riyadh", "America/Los_Angeles"]) {
        process.env.TZ = tz;
        offsets.add(new Date(2026, 0, 1).getTimezoneOffset());
        expect(firstSheet(await read("d.xlsx", bytes)).rows[0][0]).toBe("2026-10-31T14:30");
      }
    } finally {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
    expect(offsets.size, "تغيّر TZ فعلًا أثناء الاختبار").toBeGreaterThan(1);
  });

  it.each([
    [false, 46326.60416666666],
    [true, 44864.60416666666],
  ] as const)(
    "يعرض الثانية الأقرب لقيم Excel التسلسلية (تقويم 1904 = %s)",
    async (date1904, serial) => {
      const wb = XLSX.utils.book_new();
      wb.Workbook = { WBProps: { date1904 } };
      const dates = [
        serial,
        Math.floor(serial) + 0.99999710648,
        Math.floor(serial) + 0.49999305556,
      ];
      const ws = XLSX.utils.aoa_to_sheet([["وقت"], ...dates.map((n) => [n])]);
      for (const key of ["A2", "A3", "A4"]) ws[key].z = "yyyy-mm-dd hh:mm:ss";
      XLSX.utils.book_append_sheet(wb, ws, "Dates");
      const bytes = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
      expect(firstSheet(await read("dates.xlsx", bytes)).rows).toEqual([
        ["2026-10-31T14:30"],
        ["2026-11-01"],
        ["2026-10-31T11:59:59"],
      ]);
    },
  );

  it("يحافظ على تنسيق الوقت فقط عند التقريب عبر منتصف الليل", async () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([["وقت"], [0.99999710648]]);
    ws.A2.z = "hh:mm:ss";
    XLSX.utils.book_append_sheet(wb, ws, "Time");
    const bytes = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
    expect(firstSheet(await read("time.xlsx", bytes)).rows).toEqual([["00:00"]]);
  });

  it("الصيغ والنصوص الشبيهة بالصيغ تبقى نصًّا خاملًا ولا تُقيَّم", async () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["قيمة", "نص"],
      [1, "=1+1"],
      [2, "=cmd|' /C calc'!A0"],
      [3, "@SUM(1,1)"],
    ]);
    ws["A5"] = { t: "n", v: 42, f: "SUM(A2:A4)" };
    ws["B5"] = { t: "s", v: '+HYPERLINK("http://x")' };
    ws["!ref"] = "A1:B5";
    XLSX.utils.book_append_sheet(wb, ws, "F");
    const bytes = new Uint8Array(
      XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer,
    );
    const sheet = firstSheet(await read("f.xlsx", bytes));
    expect(sheet.rows[0]).toEqual(["1", "=1+1"]);
    expect(sheet.rows[1]).toEqual(["2", "=cmd|' /C calc'!A0"]);
    expect(sheet.rows[2]).toEqual(["3", "@SUM(1,1)"]);
    // خلية الصيغة تُقرأ بقيمتها المخزَّنة (42) لا بنص صيغتها.
    expect(sheet.rows[3]).toEqual(["42", '+HYPERLINK("http://x")']);
    expect(JSON.stringify(sheet)).not.toContain("SUM(A2:A4)");
  });

  it("ترويسات __proto__ و constructor و toString تبقى نصًّا ولا تلوّث الكائنات", async () => {
    const before = Object.getOwnPropertyNames(Object.prototype).sort();
    const bytes = makeXlsx([
      {
        name: "H",
        rows: [
          ["__proto__", "constructor", "toString", "hasOwnProperty", "polluted"],
          ["a", "b", "c", "d", "yes"],
        ],
      },
    ]);
    const sheet = firstSheet(await read("proto.xlsx", bytes));
    expect(sheet.headers).toEqual([
      "__proto__",
      "constructor",
      "toString",
      "hasOwnProperty",
      "polluted",
    ]);
    expect(sheet.rows[0]).toEqual(["a", "b", "c", "d", "yes"]);
    expect(Object.getOwnPropertyNames(Object.prototype).sort()).toEqual(before);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(sheet.headers)).toBe(Array.prototype);
  });

  it("ورقة اسمها __proto__ لا تكسر القراءة ولا تلوّث، وتُعدّ غير مقروءة", async () => {
    const bytes = makeXlsx([
      { name: "Data", rows: [["x"], ["1"]] },
      { name: "__proto__", rows: [["y"], ["2"]] },
    ]);
    const r = expectOk(await read("p.xlsx", bytes));
    expect(r.sheets.map((s) => s.name)).toEqual(["Data"]);
    expect(r.warnings.join(" ")).toContain("تعذّرت قراءة");
    expect(({} as Record<string, unknown>).y).toBeUndefined();
  });

  it("ورقة تعلن A1:XFD1048576 وفيها ثلاثة صفوف: تنتهي بسرعة ولا تُنسب لها صفوف مختلقة", async () => {
    const patched = rewriteXlsx(
      makeXlsx([
        {
          name: "Big",
          rows: [
            ["a", "b"],
            ["1", "2"],
            ["3", "4"],
          ],
        },
      ]),
      (entries) =>
        asSpecs(entries).map((s) => {
          if (s.name !== "xl/worksheets/sheet1.xml") return s;
          const xml = new TextDecoder().decode(s.data as Bytes);
          const out = xml.replace(
            /<dimension ref="[^"]*"\s*\/>/,
            '<dimension ref="A1:XFD1048576"/>',
          );
          expect(out).not.toBe(xml);
          return { ...s, data: out };
        }),
    );
    const started = performance.now();
    const r = expectOk(await read("big.xlsx", patched));
    const elapsed = performance.now() - started;
    expect(elapsed, `قراءة النطاق المعلن استغرقت ${Math.round(elapsed)} م.ث`).toBeLessThan(2_000);
    const sheet = r.sheets[0];
    expect(sheet.rows).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
    expect(sheet.rowsTotal).toBe(2);
    expect(sheet.rowsTotalExact).toBe(true);
    expect(sheet.colsTotal).toBe(2);
  });

  it("صفوف فوق الحدّ تُقتطع عند الحدّ ويُصرَّح بالتقدير لا باليقين", async () => {
    const over = LIMITS.maxRowsPerSheet + 5;
    const rows: Aoa = [["id", "v"]];
    for (let i = 1; i <= over; i++) rows.push([i, `r${i}`]);
    const sheet = firstSheet(await read("many.xlsx", makeXlsx([{ name: "M", rows }])));
    expect(sheet.rows.length).toBe(LIMITS.maxRowsPerSheet);
    expect(sheet.rows[0]).toEqual(["1", "r1"]);
    expect(sheet.rows[sheet.rows.length - 1]).toEqual([
      String(LIMITS.maxRowsPerSheet),
      `r${LIMITS.maxRowsPerSheet}`,
    ]);
    expect(sheet.rowsTotal).toBe(over);
    expect(sheet.rowsTotalExact).toBe(false);
  }, 30_000);

  it("أعمدة فوق الحدّ (خلية في XFD) تُقتطع ويبقى العدد الحقيقي", async () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ["a", "b"],
      ["1", "2"],
    ]);
    ws["XFD1"] = { t: "s", v: "far" };
    ws["XFD2"] = { t: "s", v: "farther" };
    ws["!ref"] = "A1:XFD2";
    XLSX.utils.book_append_sheet(wb, ws, "W");
    const bytes = new Uint8Array(
      XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer,
    );
    const r = expectOk(await read("wide.xlsx", bytes));
    const sheet = r.sheets[0];
    expect(sheet.headers.length).toBeLessThanOrEqual(LIMITS.maxCols);
    expect(sheet.rows.every((row) => row.length === sheet.headers.length)).toBe(true);
    expect(sheet.colsTotal).toBe(16_384);
    expect(r.warnings.join(" ")).toContain("عمودًا");
  });

  it("خلية أطول من الحدّ تُقتطع مع تحذير، ومحارف الاتجاه والعرض الصفري تُزال", async () => {
    const long = "س".repeat(LIMITS.maxCellChars + 500);
    const bytes = makeXlsx([
      {
        name: "C",
        rows: [
          ["ط", "ق"],
          [long, "ab\u202Ec\u200Bd\u2066e\n  f"],
        ],
      },
    ]);
    const r = expectOk(await read("c.xlsx", bytes));
    expect(r.sheets[0].rows[0][0].length).toBe(LIMITS.maxCellChars);
    expect(r.sheets[0].rows[0][1]).toBe("abcde f");
    expect(r.warnings.join(" ")).toContain("اقتُطع");
  });

  it("الأوراق المخفية تُتجاهل مع تحذير، والفارغة كذلك", async () => {
    const bytes = makeXlsx([
      { name: "ظاهرة", rows: [["x"], ["1"]] },
      { name: "سرية", rows: [["secret"], ["s3cr3t"]], hidden: true },
      { name: "فارغة", rows: [] },
    ]);
    const r = expectOk(await read("h.xlsx", bytes));
    expect(r.sheets.map((s) => s.name)).toEqual(["ظاهرة"]);
    expect(JSON.stringify(r.sheets)).not.toContain("s3cr3t");
    expect(r.warnings.join(" ")).toContain("مخفية");
    expect(r.warnings.join(" ")).toContain("فارغة");
    expect(r.sheetsTotal).toBe(3);
  });

  it("أكثر من الحدّ من الأوراق: يُقرأ الحدّ ويُصرَّح بالباقي", async () => {
    const sheets = Array.from({ length: LIMITS.maxSheets + 2 }, (_, i) => ({
      name: `S${i + 1}`,
      rows: [["k"], [String(i)]] as Aoa,
    }));
    const r = expectOk(await read("sheets.xlsx", makeXlsx(sheets)));
    expect(r.sheets.length).toBe(LIMITS.maxSheets);
    expect(r.sheetsTotal).toBe(LIMITS.maxSheets + 2);
    expect(r.warnings.join(" ")).toContain("تُجوهلت");
  });

  it("صفوف فارغة أولًا وأعمدة فارغة: الترويسة أول صفٍّ غير فارغ", async () => {
    const bytes = makeXlsx([
      {
        name: "L",
        rows: [
          [],
          [null, null],
          ["اسم", null, "قيمة"],
          ["أ", null, "1"],
          [null, null, null],
          ["ب", null, "2"],
        ],
      },
    ]);
    const sheet = firstSheet(await read("lead.xlsx", bytes));
    expect(sheet.headers).toEqual(["اسم", "عمود 2", "قيمة"]);
    expect(sheet.rows).toEqual([
      ["أ", "", "1"],
      ["ب", "", "2"],
    ]);
  });

  it("ورقة بترويسة فقط أو فارغة ⇒ empty", async () => {
    expectFail(await read("e.xlsx", makeXlsx([{ name: "E", rows: [["h1", "h2"]] }])), "empty");
    expectFail(await read("e2.xlsx", makeXlsx([{ name: "E", rows: [] }])), "empty");
  });

  it("يقرأ ملفًا فيه printerSettings1.bin وملفًا بواصفات بيانات (من الطرف إلى الطرف)", async () => {
    const base = makeXlsx([{ name: "D", rows: [["a"], ["1"]] }]);
    const withPrinter = rewriteXlsx(base, (entries) => [
      ...asSpecs(entries),
      PRINTER_SETTINGS_ENTRY,
    ]);
    expect(firstSheet(await read("p.xlsx", withPrinter)).rows).toEqual([["1"]]);
    const withDescriptors = rewriteXlsx(base, (entries) =>
      asSpecs(entries).map((s) => ({ ...s, descriptor: true })),
    );
    expect(firstSheet(await read("j.xlsx", withDescriptors)).rows).toEqual([["1"]]);
  });

  it("xlsx ملغوم (ماكرو) ⇒ unsafe، ولا يُمرَّر للمكتبة", async () => {
    const base = makeXlsx([{ name: "D", rows: [["a"], ["1"]] }]);
    const macro = rewriteXlsx(base, (entries) => [
      ...asSpecs(entries),
      { name: "xl/vbaProject.bin", data: "x" },
    ]);
    expectFail(await read("m.xlsx", macro), "unsafe");
  });

  it("ملف XLSX بصيغة OLE القديمة أو نصٍّ عادي بامتداد xlsx ⇒ unsupported_type", async () => {
    const ole = concat([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], new Array(64).fill(0));
    const r = await read("old.xlsx", ole);
    expectFail(r, "unsupported_type");
    if (!r.ok) expect(r.message_ar).toBe(FINN_IMPORT_LEGACY_EXCEL_MESSAGE_AR);
    expectFail(await read("text.xlsx", utf8("a,b\n1,2\n")), "unsupported_type");
  });
});

describe("readImportFile — الامتدادات والأحجام", () => {
  it.each(["old.xls", "macro.xlsm", "binary.xlsb", "UPPER.XLS"])(
    "%s ⇒ رسالة Excel القديم",
    async (name) => {
      const r = await read(name, utf8("x"));
      expectFail(r, "unsupported_type");
      if (!r.ok) {
        expect(r.message_ar).toBe(FINN_IMPORT_LEGACY_EXCEL_MESSAGE_AR);
        expect(r.message_ar).toContain("xlsx");
        expect(r.message_ar).toContain("csv");
      }
    },
  );

  it.each(["tool.exe", "noextension", "archive.zip", "doc.pdf", "weird.csv.exe"])(
    "%s ⇒ unsupported_type",
    async (name) => {
      expectFail(await read(name, utf8("a,b\n1,2")), "unsupported_type");
    },
  );

  it("ملف فارغ ⇒ empty، وفوق ٤ ميغابايت ⇒ too_large", async () => {
    expectFail(await read("a.csv", new Uint8Array(0)), "empty");
    expectFail(await read("a.csv", new Uint8Array(LIMITS.maxFileBytes + 1)), "too_large");
  });
});

describe("readImportFile — الأنواع النصّية المتنكّرة", () => {
  const pe = concat(
    [0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00],
    new Array(60).fill(0),
    utf8("PE\0\0"),
  );
  const elf = concat([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00], new Array(60).fill(0));
  const macho = concat([0xcf, 0xfa, 0xed, 0xfe, 0x07, 0x00, 0x00, 0x01], new Array(60).fill(1));
  const shebang = utf8("#!/bin/sh\necho hi\n");
  const pdf = utf8("%PDF-1.7\n%âãÏÓ\n1 0 obj\n");
  const zip = concat([0x50, 0x4b, 0x03, 0x04], new Array(40).fill(0));
  const png = concat([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], new Array(30).fill(2));
  const ole = concat([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1], new Array(30).fill(0));
  const gzip = concat([0x1f, 0x8b, 0x08, 0x00], new Array(30).fill(3));

  it.each([
    ["PE", pe, "unsafe"],
    ["ELF", elf, "unsafe"],
    ["Mach-O", macho, "unsafe"],
    ["shebang", shebang, "unsafe"],
    ["PDF", pdf, "unsupported_type"],
    ["zip", zip, "unsupported_type"],
    ["PNG", png, "unsupported_type"],
    ["OLE", ole, "unsupported_type"],
    ["gzip", gzip, "unsupported_type"],
  ] as const)("%s متنكّرًا بامتداد csv/txt/json/md/tsv ⇒ مرفوض", async (_label, bytes, error) => {
    for (const ext of ["csv", "tsv", "txt", "md", "json"]) {
      expectFail(await read(`renamed.${ext}`, bytes), error);
    }
  });

  it("نصٌّ يبدأ بالحرفين MZ بلا بنية PE يبقى مقبولًا", async () => {
    const sheet = firstSheet(await read("codes.csv", utf8("MZ,قيمة\nMZ-1,10\n")));
    expect(sheet.headers).toEqual(["MZ", "قيمة"]);
    expect(sheet.rows).toEqual([["MZ-1", "10"]]);
  });
});

describe("readImportFile — csv/tsv", () => {
  it("BOM وCRLF وحقول مقتبسة بأسطر داخلية وعلامات اقتباس مضاعفة", async () => {
    const text =
      '\uFEFFالاسم,الوصف,الرقم\r\n"أحمد","سطر أول\r\nسطر ثانٍ، ""مقتبس""",10\r\n"سعد",عادي,20\r\n';
    const sheet = firstSheet(await read("a.csv", utf8(text)));
    expect(sheet.headers).toEqual(["الاسم", "الوصف", "الرقم"]);
    expect(sheet.rows).toEqual([
      ["أحمد", 'سطر أول سطر ثانٍ، "مقتبس"', "10"],
      ["سعد", "عادي", "20"],
    ]);
    expect(sheet.rowsTotal).toBe(2);
    expect(sheet.rowsTotalExact).toBe(true);
  });

  it("يكتشف الفاصلة المنقوطة، ويقرأ tsv بالجدولة، ويتجاهل الأسطر الفارغة", async () => {
    expect(firstSheet(await read("s.csv", utf8("a;b;c\n1;2;3\n\n4;5;6\n"))).rows).toEqual([
      ["1", "2", "3"],
      ["4", "5", "6"],
    ]);
    expect(firstSheet(await read("t.tsv", utf8("a\tb\n1, x\t2\n"))).rows).toEqual([["1, x", "2"]]);
  });

  it("سجلّ بلا سطر أخير، وحقول ناقصة وزائدة، وترويسة فارغة الاسم", async () => {
    const sheet = firstSheet(await read("r.csv", utf8("a,,c\n1,2\n3,4,5,6")));
    expect(sheet.headers).toEqual(["a", "عمود 2", "c", "عمود 4"]);
    expect(sheet.rows).toEqual([
      ["1", "2", "", ""],
      ["3", "4", "5", "6"],
    ]);
    expect(sheet.colsTotal).toBe(4);
  });

  it("علامة اقتباس لم تُغلق ⇒ malformed بدل ابتلاع بقية الملف", async () => {
    expectFail(await read("q.csv", utf8('a,b\n"1,2\n3,4\n')), "malformed");
  });

  it("علامة اقتباس وسط حقل غير مقتبس تبقى حرفًا", async () => {
    expect(firstSheet(await read("q2.csv", utf8('size,note\n5" pipe,ok\n'))).rows).toEqual([
      ['5" pipe', "ok"],
    ]);
  });

  it("UTF-16 LE وBE بعلامة BOM", async () => {
    const text = "الاسم,القيمة\nأحمد,5\n";
    const le = new Uint8Array(2 + text.length * 2);
    le.set([0xff, 0xfe]);
    const be = new Uint8Array(2 + text.length * 2);
    be.set([0xfe, 0xff]);
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      le[2 + i * 2] = c & 0xff;
      le[3 + i * 2] = c >> 8;
      be[2 + i * 2] = c >> 8;
      be[3 + i * 2] = c & 0xff;
    }
    for (const bytes of [le, be]) {
      const sheet = firstSheet(await read("u16.csv", bytes));
      expect(sheet.headers).toEqual(["الاسم", "القيمة"]);
      expect(sheet.rows).toEqual([["أحمد", "5"]]);
    }
    // طول فردي ⇒ تالف
    expectFail(await read("odd.csv", le.slice(0, le.length - 1)), "malformed");
  });

  it("ملف windows-1256 (غير UTF-8) يُقرأ مع تحذير صريح", async () => {
    // «الاسم,القيمة» ثم «احمد,5» بترميز windows-1256.
    const cp1256 = new Uint8Array([
      0xc7, 0xe1, 0xc7, 0xd3, 0xe3, 0x2c, 0xc7, 0xe1, 0xde, 0xed, 0xe3, 0xc9, 0x0a, 0xc7, 0xcd,
      0xe3, 0xcf, 0x2c, 0x35, 0x0a,
    ]);
    const r = expectOk(await read("legacy.csv", cp1256));
    expect(r.sheets[0].headers).toEqual(["الاسم", "القيمة"]);
    expect(r.sheets[0].rows).toEqual([["احمد", "5"]]);
    expect(r.warnings.join(" ")).toContain("Windows-1256");
  });

  it("بايت NUL بلا BOM ⇒ malformed (ثنائي أو UTF-16 بلا علامة)", async () => {
    expectFail(
      await read("n.csv", new Uint8Array([0x61, 0x2c, 0x62, 0x0a, 0x31, 0x2c, 0x00, 0x0a])),
      "malformed",
    );
    expectFail(await read("n2.txt", new Uint8Array([0x61, 0x00, 0x62, 0x00])), "malformed");
  });

  it("UTF-32 غير مدعوم", async () => {
    expectFail(
      await read("u32.csv", new Uint8Array([0xff, 0xfe, 0x00, 0x00, 0x61, 0, 0, 0])),
      "unsupported_type",
    );
  });

  it("محارف التحكّم تُزال والمسافات تُطوى، وكل الخلايا الفارغة ⇒ empty", async () => {
    const sheet = firstSheet(await read("c.csv", utf8("a,b\nx\u0007y\u0001, p \t q \u202E\n")));
    expect(sheet.rows).toEqual([["xy", "p q"]]);
    expectFail(await read("blank.csv", utf8("\n\n  \n")), "empty");
    expectFail(await read("hdr.csv", utf8("only,header\n")), "empty");
    expectFail(await read("bom.csv", utf8("\uFEFF")), "empty");
  });

  it("ترويسة __proto__ في csv تبقى نصًّا", async () => {
    const before = Object.getOwnPropertyNames(Object.prototype).sort();
    const sheet = firstSheet(await read("p.csv", utf8("__proto__,constructor,toString\n1,2,3\n")));
    expect(sheet.headers).toEqual(["__proto__", "constructor", "toString"]);
    expect(Object.getOwnPropertyNames(Object.prototype).sort()).toEqual(before);
  });

  it("صفوف فوق الحدّ تُقتطع والعدد الحقيقي محفوظ", async () => {
    const lines = ["id,v"];
    for (let i = 1; i <= LIMITS.maxRowsPerSheet + 7; i++) lines.push(`${i},x`);
    const sheet = firstSheet(await read("big.csv", utf8(lines.join("\n"))));
    expect(sheet.rows.length).toBe(LIMITS.maxRowsPerSheet);
    expect(sheet.rowsTotal).toBe(LIMITS.maxRowsPerSheet + 7);
    expect(sheet.rowsTotalExact).toBe(true);
  });

  it("أعمدة فوق الحدّ تُقتطع مع تحذير والعدد الحقيقي محفوظ", async () => {
    const cols = LIMITS.maxCols + 25;
    const header = Array.from({ length: cols }, (_, i) => `c${i}`).join(",");
    const row = Array.from({ length: cols }, (_, i) => String(i)).join(",");
    const r = expectOk(await read("wide.csv", utf8(`${header}\n${row}\n`)));
    expect(r.sheets[0].headers.length).toBe(LIMITS.maxCols);
    expect(r.sheets[0].colsTotal).toBe(cols);
    expect(r.warnings.join(" ")).toContain("عمودًا");
  });
});

describe("readImportFile — txt/md/json", () => {
  it("txt: سطور بلا فارغها، والسطر الطويل يُقسَّم بدل أن يُفقد", async () => {
    const longLine = `${"كلمة ".repeat(1_000)}النهاية`;
    const r = expectOk(await read("n.txt", utf8(`أول\r\n\r\n  ثانٍ  \n${longLine}\n`)));
    const sheet = r.sheets[0];
    expect(sheet.plain).toBe(true);
    expect(sheet.headers).toEqual([]);
    expect(sheet.rows[0]).toEqual(["أول"]);
    expect(sheet.rows[1]).toEqual(["  ثانٍ"]);
    expect(sheet.rows.slice(2).every((row) => row[0].length <= LIMITS.maxCellChars)).toBe(true);
    expect(
      sheet.rows
        .slice(2)
        .map((row) => row[0])
        .join(" "),
    ).toContain("النهاية");
    expect(sheet.rowsTotal).toBe(sheet.rows.length);
  });

  it("md يُقرأ كما هو سطرًا سطرًا", async () => {
    const sheet = firstSheet(await read("d.md", utf8("# عنوان\n\n- بند ١\n- بند ٢\n")));
    expect(sheet.rows.map((row) => row[0])).toEqual(["# عنوان", "- بند ١", "- بند ٢"]);
  });

  it("json: مصفوفة كائنات مسطّحة ⇒ جدول باتحاد المفاتيح، و__proto__ مفتاحٌ عادي", async () => {
    const before = Object.getOwnPropertyNames(Object.prototype).sort();
    const text =
      '[{"الاسم":"أحمد","العمر":30,"__proto__":"x"},{"الاسم":"سعد","نشط":true,"ملاحظة":null}]';
    const sheet = firstSheet(await read("t.json", utf8(text)));
    expect(sheet.headers).toEqual(["الاسم", "العمر", "__proto__", "نشط", "ملاحظة"]);
    expect(sheet.rows).toEqual([
      ["أحمد", "30", "x", "", ""],
      ["سعد", "", "", "true", ""],
    ]);
    expect(sheet.rowsTotal).toBe(2);
    expect(Object.getOwnPropertyNames(Object.prototype).sort()).toEqual(before);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });

  it("json: غير الجدولي ⇒ أسطر منسّقة", async () => {
    const sheet = firstSheet(await read("o.json", utf8('{"a":{"b":[1,2]},"s":"نص"}')));
    expect(sheet.plain).toBe(true);
    expect(sheet.rows.map((row) => row[0].trim())).toContain('"s": "نص"');
    const nested = firstSheet(await read("n.json", utf8('[{"a":{"b":1}}]')));
    expect(nested.plain).toBe(true);
  });

  it("json: عمق فوق الحدّ أو جملة تالفة ⇒ malformed", async () => {
    const deep = "[".repeat(FINN_JSON_MAX_DEPTH + 5) + "]".repeat(FINN_JSON_MAX_DEPTH + 5);
    expectFail(await read("d.json", utf8(deep)), "malformed");
    expectFail(await read("huge-depth.json", utf8("[".repeat(200_000))), "malformed");
    expectFail(await read("bad.json", utf8("{not json")), "malformed");
    expectFail(await read("empty.json", utf8("[]")), "empty");
  });
});

describe("cleanCell", () => {
  it("يقتطع بلا قطع زوجٍ بديل ويطوي المسافات", () => {
    const r = cleanCell("😀".repeat(10), 5);
    expect(r.truncated).toBe(true);
    expect([...r.text].every((ch) => ch === "😀")).toBe(true);
    expect(cleanCell("  a \n\t b  ").text).toBe("a b");
    expect(cleanCell("x\u{E0041}y").text).toBe("xy"); // محارف الوسوم (حقن خفيّ)
    expect(cleanCell("مرحبا\u200Fعالم").text).toBe("مرحبا\u200Fعالم"); // RLM مشروع يبقى
  });
});

describe("readImportFile — الخصوصية", () => {
  const MARKER = "SECRET_CELL_7731";

  afterEach(() => {
    delete process.env.TZ;
  });

  it("لا يتسرّب نصّ الملف إلى console ولا إلى الرسائل والتحذيرات في أي مسار", async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        [`${MARKER}_H1`, "ب"],
        [`${MARKER}_V1`, "x".repeat(LIMITS.maxCellChars + 10)],
      ]),
      `${MARKER}_SHEET`,
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["h"], ["v"]]), `${MARKER}_HIDDEN`);
    wb.Workbook = { Sheets: [{ Hidden: 0 }, { Hidden: 1 }] };
    const xlsx = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer);
    const evilXlsx = rewriteXlsx(xlsx, (entries) => [
      ...asSpecs(entries),
      { name: `xl/${MARKER}.bin`, data: MARKER },
    ]);
    // الجمل الثابتة وحدها: جدول الرموز + الجملة المخصَّصة لـExcel القديم + جملتا القارئ المكتوبتان حرفيًّا في مصدره
    // (CSV بعلامة اقتباس مفتوحة · JSON فوق العمق). أي جملة أخرى — ولو عربيةً غير فارغة — تُدان لأنها قد تحمل أثر الملف.
    const allowed = new Set<string>([
      ...Object.values(FINN_IMPORT_MESSAGES_AR),
      FINN_IMPORT_LEGACY_EXCEL_MESSAGE_AR,
      "ملف CSV غير صالح: علامة اقتباس لم تُغلق. صحّح الملف أو احفظه من جديد.",
      "بنية JSON متداخلة بعمقٍ يتجاوز الحدّ المسموح. بسّطها أو حوّلها إلى جدول.",
    ]);
    const inputs: Array<[string, Bytes]> = [
      [`${MARKER}.xlsx`, xlsx],
      [`${MARKER}-evil.xlsx`, evilXlsx],
      [`${MARKER}.csv`, utf8(`${MARKER}_H,b\n${MARKER}_V,"unterminated`)],
      [`${MARKER}.csv`, utf8(`${MARKER}_H,b\n${MARKER}_V,2`)],
      [`${MARKER}.json`, utf8(`{"${MARKER}": [`)],
      [`${MARKER}.json`, utf8(`[{"${MARKER}":"${MARKER}"}]`)],
      [`${MARKER}.txt`, concat(utf8(MARKER), [0])],
      [`${MARKER}.xls`, utf8(MARKER)],
      [`${MARKER}.exe`, utf8(MARKER)],
    ];
    const { output } = await captureConsole(async () => {
      for (const [name, bytes] of inputs) {
        const r = await read(name, bytes);
        if (r.ok) {
          expect(r.warnings.join("\n")).not.toContain(MARKER);
        } else {
          // مجموعة الجمل الثابتة وحدها: أي نصٍّ آخر (ولو عربيًّا غير فارغ) إدانةٌ — قد يحمل أثر الملف.
          expect(allowed.has(r.message_ar), `رسالة خارج المجموعة الثابتة: ${r.message_ar}`).toBe(
            true,
          );
          expect(r.message_ar).not.toContain(MARKER);
        }
      }
    });
    expect(output).not.toContain(MARKER);
    expect(output).toBe("");
  });

  it("رسائل الفشل كلها ثابتة وعربية ولا تحوي عبارات مصادقة", () => {
    for (const message of [
      ...Object.values(FINN_IMPORT_MESSAGES_AR),
      FINN_IMPORT_LEGACY_EXCEL_MESSAGE_AR,
    ]) {
      expect(message).toMatch(/[؀-ۿ]/);
      expect(message).not.toMatch(/authenticat|unauthor|token/i);
    }
  });
});

// ═══ سقوف كلفة التحليل (تدقيق ٢٠٢٦/١٠/٣١) ════════════════════════════════
const OOXML_WORKSHEET_REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet";
/** سقف زمني فضفاض: الأصل ثوانٍ على هذه الحمولات والحلّ الخطّي أجزاء من المئة مللي ثانية. */
const FAST_MS = 1_000;

const inlineCell = (ref: string, text: string) =>
  `<c r="${ref}" t="inlineStr"><is><t>${text}</t></is></c>`;
const tinySheet = (key: string, value: string) =>
  worksheetXml(
    `<row r="1">${inlineCell("A1", key)}</row><row r="2">${inlineCell("A2", value)}</row>`,
  );

async function timedRead(name: string, bytes: Bytes) {
  const started = performance.now();
  const result = await readImportFile({ name, bytes });
  return { result, elapsed: performance.now() - started };
}

describe("readImportFile — خيارات المكتبة تُمرَّر صريحةً ويُرى أثرها", () => {
  it("cellFormula/cellHTML/bookVBA معطَّلة، والقراءة كثيفة بنافذة صفوف، وبتواريخ، وبالبايتات النظيفة وحدها", async () => {
    const bytes = makeXlsx([{ name: "S", rows: [["a"], ["b"]] }]);
    expectOk(await read("o.xlsx", bytes));
    expect(xlsxSpy.calls).toHaveLength(1);
    const { opts, data } = xlsxSpy.calls[0];
    expect(opts).toMatchObject({
      type: "array",
      cellFormula: false,
      cellHTML: false,
      bookVBA: false,
      dense: true,
      sheetRows: LIMITS.maxRowsPerSheet + 2,
      cellDates: true,
      cellNF: false,
      cellText: false,
      cellStyles: false,
      sheetStubs: false,
      bookProps: false,
    });
    // ما سُلِّم للمكتبة هو التغليف النظيف (كل مداخله مخزَّنة بلا ضغط) لا بايتات الرفع.
    expect(data).not.toEqual(bytes);
    expect(readZipEntries(data).length).toBeGreaterThan(0);
    expect(Array.from(data.subarray(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(data.length).toBeGreaterThan(0);
  });

  it("خيار sheets يُمرَّر دائمًا مصفوفةً بمواضع أول maxSheets ورقة ظاهرة (لا undefined)", async () => {
    expectOk(await read("o.xlsx", makeXlsx([{ name: "S", rows: [["a"], ["b"]] }])));
    expect(xlsxSpy.calls[0].opts.sheets).toEqual([0]);
  });
});

describe("readImportFile — ميزانية المحارف التراكمية (السلاسل المشتركة)", () => {
  /** ورقة R صفًّا × C عمودًا كلّ خلاياها سلاسل مشتركة طويلة (≈١٩٠٠ حرف بمسافات). */
  function sharedStringBomb(rowsCount: number, cols: number = LIMITS.maxCols, distinct = 20) {
    const strings = Array.from({ length: distinct }, (_, i) => `${i} ${"س ".repeat(950)}`);
    const rowsXml = Array.from(
      { length: rowsCount },
      (_, r) =>
        `<row r="${r + 1}">${Array.from(
          { length: cols },
          (_, c) =>
            `<c r="${XLSX.utils.encode_col(c)}${r + 1}" t="s"><v>${(r * cols + c) % distinct}</v></c>`,
        ).join("")}</row>`,
    ).join("");
    return { strings, xml: worksheetXml(rowsXml) };
  }
  const storedChars = (sheet: ImportSheet) =>
    sheet.headers.join("").length + sheet.rows.reduce((n, row) => n + row.join("").length, 0);

  it("عشرون سلسلة مشتركة طويلة تُحال إليها ٦٠ ألف خلية: تتوقف القراءة عند السقف وتُبلّغ بصدق", async () => {
    const ROWS = 600;
    const { strings, xml } = sharedStringBomb(ROWS);
    const bytes = buildRawXlsx({ sheets: [{ name: "B", xml }], sharedStrings: strings });
    expect(bytes.length, "الملف صغير وتحت حدّ الرفع").toBeLessThan(LIMITS.maxFileBytes);

    const { result, elapsed } = await timedRead("sst.xlsx", bytes);
    const r = expectOk(result);
    const sheet = r.sheets[0];
    // ما قُرئ مسقوفٌ بالميزانية (+ صفٌّ واحد على الأكثر) لا بالمصفوفة الكاملة (٦٠٠ × ١٠٠ × ١٩٠٠ حرف).
    expect(storedChars(sheet)).toBeLessThanOrEqual(
      FINN_XLSX_MAX_READ_CHARS + LIMITS.maxCols * LIMITS.maxCellChars,
    );
    expect(sheet.rows.length).toBeGreaterThan(0);
    expect(sheet.rows.length).toBeLessThan(ROWS / 10);
    // الصدق: التقدير مُعلَن، والرقم مقيسٌ من XML الورقة (٦٠٠ صفًّا بينها ترويسة) لا مختلَق.
    expect(sheet.rowsTotalExact).toBe(false);
    expect(sheet.rowsTotal).toBe(ROWS - 1);
    const warnings = r.warnings.join(" | ");
    expect(warnings).toContain("سقف حجم النص");
    expect(warnings).toContain("تقدير لا يقين");
    expect(warnings).toContain("الورقة رقم ١");
    expect(elapsed, `${Math.round(elapsed)} م.ث`).toBeLessThan(10_000);
  }, 30_000);

  it("الميزانية تراكمية عبر المصنّف: ورقة تليها بعد النفاد لا تُقرأ ويُصرَّح بها", async () => {
    const { strings, xml } = sharedStringBomb(40); // ٤٠ × ١٠٠ × ١٩٠٠ ≈ ٧٫٦ مليون حرف > السقف
    const bytes = buildRawXlsx({
      sheets: [
        { name: "كبيرة", xml },
        { name: "صغيرة", xml: tinySheet("k", "v") },
      ],
      sharedStrings: strings,
    });
    const r = expectOk(await read("two.xlsx", bytes));
    expect(r.sheets.map((s) => s.name)).toEqual(["كبيرة"]);
    expect(r.sheetsTotal).toBe(2);
    const warnings = r.warnings.join(" | ");
    expect(warnings).toContain("بلغت القراءة سقف حجم النص");
    expect(warnings).toContain("لأن القراءة بلغت سقف حجم النص");
  }, 30_000);

  it("ملف تحت الميزانية لا يُقطع ولا يُنذَر (لا إنذار كاذب)", async () => {
    const { strings, xml } = sharedStringBomb(10, 20, 5); // ٢٠٠ خلية × ١٩٠٠ ≈ ٣٨٠ ألف حرف
    const bytes = buildRawXlsx({ sheets: [{ name: "ok", xml }], sharedStrings: strings });
    const r = expectOk(await read("under.xlsx", bytes));
    const sheet = r.sheets[0];
    expect(sheet.rows.length).toBe(9);
    expect(sheet.rowsTotal).toBe(9);
    expect(sheet.rowsTotalExact).toBe(true);
    expect(r.warnings.join(" ")).not.toContain("سقف حجم النص");
    expect(storedChars(sheet)).toBeLessThan(FINN_XLSX_MAX_READ_CHARS);
  });

  it("السقف مشتقّ من حدود العقد لا رقمٌ سحري: أربعة أضعاف ما يتّسع في الوثائق", () => {
    expect(FINN_XLSX_MAX_READ_CHARS).toBe(LIMITS.maxParts * LIMITS.maxCharsPerDocument * 4);
    expect(FINN_XLSX_MAX_READ_CHARS).toBeGreaterThanOrEqual(
      LIMITS.maxParts * LIMITS.maxCharsPerDocument,
    );
  });
});

describe("readImportFile — تكرار الأوراق لا يضاعف التحليل", () => {
  const manyRows = (n: number) =>
    worksheetXml(
      Array.from(
        { length: n },
        (_, r) =>
          `<row r="${r + 1}">${Array.from({ length: 10 }, (_, c) => inlineCell(`${XLSX.utils.encode_col(c)}${r + 1}`, `v${r}x${c}`)).join("")}</row>`,
      ).join(""),
    );
  const sheetTag = (i: number) => `<sheet name="S${i + 1}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`;
  const relTo = (i: number, target: string) =>
    `<Relationship Id="rId${i + 1}" Type="${OOXML_WORKSHEET_REL}" Target="${target}"/>`;

  it("أربعون وسم <sheet> تحيل إلى جزء واحد ⇒ malformed قبل أن تُستدعى المكتبة أصلًا", async () => {
    const N = 40;
    const bytes = buildRawXlsx({
      sheets: [{ name: "S1", xml: manyRows(2_000) }],
      workbookSheetsXml: Array.from({ length: N }, (_, i) => sheetTag(i)).join(""),
      workbookRelsXml: Array.from({ length: N }, (_, i) => relTo(i, "worksheets/sheet1.xml")).join(
        "",
      ),
    });
    const { result, elapsed } = await timedRead("dup.xlsx", bytes);
    expectFail(result, "malformed");
    expect(xlsxSpy.calls, "لم يُحلَّل شيء").toHaveLength(0);
    expect(elapsed, `${Math.round(elapsed)} م.ث`).toBeLessThan(FAST_MS);
  });

  it("وسمان فقط لجزءٍ واحد يكفيان للرفض (لا عتبة عددية)", async () => {
    const bytes = buildRawXlsx({
      sheets: [{ name: "S1", xml: tinySheet("k", "v") }],
      workbookSheetsXml: [0, 1].map(sheetTag).join(""),
      workbookRelsXml: [0, 1].map((i) => relTo(i, "worksheets/sheet1.xml")).join(""),
    });
    expectFail(await read("dup2.xlsx", bytes), "malformed");
  });

  it("الهدف نفسه بتهجئتين (نسبي ومطلق) مرفوض أيضًا", async () => {
    const bytes = buildRawXlsx({
      sheets: [{ name: "S1", xml: tinySheet("k", "v") }],
      workbookSheetsXml: [0, 1].map(sheetTag).join(""),
      workbookRelsXml: `${relTo(0, "worksheets/sheet1.xml")}${relTo(1, "/xl/worksheets/sheet1.xml")}`,
    });
    expectFail(await read("dup3.xlsx", bytes), "malformed");
  });

  it("أربعون ورقة مختلفة: تُحلَّل أول maxSheets فقط (خيار sheets) ويُصرَّح بالباقي", async () => {
    const sheets = Array.from({ length: 40 }, (_, i) => ({
      name: `S${i + 1}`,
      xml: tinySheet("k", `v${i}`),
    }));
    const r = expectOk(await read("forty.xlsx", buildRawXlsx({ sheets })));
    expect(xlsxSpy.calls).toHaveLength(1);
    expect(xlsxSpy.calls[0].opts.sheets).toEqual(
      Array.from({ length: LIMITS.maxSheets }, (_, i) => i),
    );
    expect(xlsxSpy.calls[0].parsedSheets).toHaveLength(LIMITS.maxSheets);
    expect(r.sheets).toHaveLength(LIMITS.maxSheets);
    expect(r.sheets[LIMITS.maxSheets - 1].rows).toEqual([[`v${LIMITS.maxSheets - 1}`]]);
    expect(r.sheetsTotal).toBe(40);
    expect(r.warnings.join(" ")).toContain("ورقة بعد أول");
  });

  it("المخفية لا تُحلَّل ولا تستهلك من الحدّ: ٣ مخفية ثم ١٢ ظاهرة ⇒ تُقرأ عشر ظاهرة", async () => {
    const sheets = Array.from({ length: 15 }, (_, i) => ({
      name: `S${i + 1}`,
      xml: tinySheet("k", `v${i}`),
      hidden: i < 3,
    }));
    const r = expectOk(await read("hid.xlsx", buildRawXlsx({ sheets })));
    expect(xlsxSpy.calls[0].opts.sheets).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(xlsxSpy.calls[0].parsedSheets).toHaveLength(10);
    expect(r.sheets.map((s) => s.name)).toEqual(sheets.slice(3, 13).map((s) => s.name));
    const warnings = r.warnings.join(" ");
    expect(warnings).toContain("مخفية");
    expect(warnings).toContain("ورقة بعد أول");
  });

  it("وسوم مكرَّرة خارج أول عشر ظاهرة لا تُحلَّل: لا مضاعفة ولا رفض، والمقروء كما هو", async () => {
    const distinct = Array.from({ length: LIMITS.maxSheets }, (_, i) => ({
      name: `S${i + 1}`,
      xml: tinySheet("k", `v${i}`),
    }));
    const extra = 30;
    const tags = [
      ...Array.from({ length: LIMITS.maxSheets }, (_, i) => sheetTag(i)),
      ...Array.from({ length: extra }, (_, j) => sheetTag(LIMITS.maxSheets + j)),
    ].join("");
    const rels = [
      ...Array.from({ length: LIMITS.maxSheets }, (_, i) =>
        relTo(i, `worksheets/sheet${i + 1}.xml`),
      ),
      ...Array.from({ length: extra }, (_, j) =>
        relTo(LIMITS.maxSheets + j, "worksheets/sheet1.xml"),
      ),
    ].join("");
    const bytes = buildRawXlsx({
      sheets: distinct,
      workbookSheetsXml: tags,
      workbookRelsXml: rels,
    });
    const r = expectOk(await read("tail-dups.xlsx", bytes));
    expect(r.sheets).toHaveLength(LIMITS.maxSheets);
    expect(xlsxSpy.calls[0].parsedSheets).toHaveLength(LIMITS.maxSheets);
    expect(r.sheetsTotal).toBe(LIMITS.maxSheets + extra);
  });
});

describe("readImportFile — ReDoS على أجزاء المصنّف (تدقيق ٢٠٢٦/١٠/٣١)", () => {
  /** يُلحِق ذيلًا عدائيًّا (بلا «>» أبدًا) بجزءٍ من مصنّفٍ سليم دون تجاوز سقف الأجزاء الصغيرة. */
  const withTail = (part: string, tail: string): Bytes =>
    rewriteXlsx(buildRawXlsx({ sheets: [{ name: "S", xml: tinySheet("k", "v") }] }), (entries) =>
      asSpecs(entries).map((e) =>
        e.name === part ? { ...e, data: `${new TextDecoder().decode(e.data as Bytes)}${tail}` } : e,
      ),
    );

  async function expectFastOk(part: string, tail: string) {
    const bytes = withTail(part, tail);
    const size = readZipEntries(bytes).find((e) => e.name === part)!.data.length;
    expect(size, "تحت سقف الأجزاء الصغيرة فلا يردّه السقف: المسح نفسه هو المختبَر").toBeLessThan(
      256 * 1024,
    );
    const { result, elapsed } = await timedRead("redos.xlsx", bytes);
    const r = expectOk(result);
    expect(r.sheets[0].rows).toEqual([["v"]]);
    expect(elapsed, `${Math.round(elapsed)} م.ث`).toBeLessThan(FAST_MS);
  }

  it("[Content_Types].xml: ٢٤ ألف '<Override ' بلا إغلاق ⇒ يُقرأ الملف في زمنٍ خطّي", async () => {
    await expectFastOk("[Content_Types].xml", "<Override ".repeat(24_000));
  });

  it("workbook.xml.rels: ١٨ ألف '<Relationship ' بلا إغلاق ⇒ يُقرأ الملف في زمنٍ خطّي", async () => {
    await expectFastOk("xl/_rels/workbook.xml.rels", "<Relationship ".repeat(18_000));
  });

  it("workbook.xml: ٣٦ ألف '<sheet ' بلا إغلاق ⇒ يُقرأ الملف في زمنٍ خطّي", async () => {
    await expectFastOk("xl/workbook.xml", "<sheet ".repeat(36_000));
  });

  it("مئة ألف حرف اسم سمة بلا «=» داخل وسم Relationship ⇒ يُقرأ الملف في زمنٍ خطّي", async () => {
    const base = buildRawXlsx({ sheets: [{ name: "S", xml: tinySheet("k", "v") }] });
    const bytes = rewriteXlsx(base, (entries) =>
      asSpecs(entries).map((e) =>
        e.name === "xl/_rels/workbook.xml.rels"
          ? {
              ...e,
              data: new TextDecoder()
                .decode(e.data as Bytes)
                .replace(
                  'Target="worksheets/sheet1.xml"',
                  `Target="worksheets/sheet1.xml" ${"a".repeat(100_000)}`,
                ),
            }
          : e,
      ),
    );
    const { result, elapsed } = await timedRead("attr.xlsx", bytes);
    expect(expectOk(result).sheets[0].rows).toEqual([["v"]]);
    expect(elapsed, `${Math.round(elapsed)} م.ث`).toBeLessThan(FAST_MS);
  });

  it("مئة ألف حرف اسم سمة داخل وسم <sheet> ⇒ تنتهي القراءة سريعًا (بنتيجةٍ مصنَّفة لا بتعليق)", async () => {
    const base = buildRawXlsx({ sheets: [{ name: "S", xml: tinySheet("k", "v") }] });
    const bytes = rewriteXlsx(base, (entries) =>
      asSpecs(entries).map((e) =>
        e.name === "xl/workbook.xml"
          ? {
              ...e,
              data: new TextDecoder()
                .decode(e.data as Bytes)
                .replace('r:id="rId1"/>', `r:id="rId1" ${"a".repeat(100_000)}/>`),
            }
          : e,
      ),
    );
    const { result, elapsed } = await timedRead("attr2.xlsx", bytes);
    expect(result.ok || typeof result.error === "string").toBe(true);
    expect(elapsed, `${Math.round(elapsed)} م.ث`).toBeLessThan(FAST_MS);
  });

  it("جزء أكبر من السقف يُرفض unsafe بالرسالة العربية الثابتة قبل أي تحليل", async () => {
    const bytes = withTail("xl/workbook.xml", "<sheet ".repeat(60_000));
    const { result, elapsed } = await timedRead("big.xlsx", bytes);
    expectFail(result, "unsafe");
    if (!result.ok) expect(result.message_ar).toBe(FINN_IMPORT_MESSAGES_AR.unsafe);
    expect(xlsxSpy.calls).toHaveLength(0);
    expect(elapsed).toBeLessThan(FAST_MS);
  });
});
