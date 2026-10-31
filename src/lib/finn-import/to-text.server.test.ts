// @vitest-environment node
/**
 * من الأوراق إلى وثائق المعرفة: شكل الصف، القطع عند حدود الصفوف، سقف الحجم والعدد، العناوين،
 * وحجب البيانات الشخصية (الأرقام الهندية والفارسية والجوالات المجمّعة). النصّ المخزَّن لا يحوي
 * أبدًا القيم المزروعة. البرهان المقابل على المطابقات المُضعَّفة في `guards.mutation.server.test.ts`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CHUNK_OVERLAP_CHARS,
  CHUNK_TARGET_CHARS,
  KNOWLEDGE_MAX_TEXT_CHARS,
  MAX_CHUNKS_PER_DOCUMENT,
  chunkText,
} from "@/lib/sadeed/knowledge-ingest-core";
import { FINN_IMPORT_LIMITS } from "./contract";
import type { ImportSheet } from "./safe-spreadsheet.server";
import * as realToText from "./to-text.server";
import {
  FINN_DOC_TITLE_PREFIX,
  FINN_PII_TOKENS,
  buildDocuments,
  maskPii,
  summarizeSheets,
} from "./to-text.server";
import { captureConsole } from "./fixtures.test-support";
import { createMutantScratch } from "./mutant-scratch.test-support";

const LIMITS = FINN_IMPORT_LIMITS;
const fmt = new Intl.NumberFormat("ar-SA");

function sheet(
  partial: Partial<ImportSheet> & Pick<ImportSheet, "name" | "headers" | "rows">,
): ImportSheet {
  return {
    rowsTotal: partial.rows.length,
    rowsTotalExact: true,
    colsTotal: partial.headers.length,
    plain: false,
    ...partial,
  };
}

describe("حدود العقد", () => {
  it("maxCharsPerDocument يساوي KNOWLEDGE_MAX_TEXT_CHARS بالضبط", () => {
    expect(LIMITS.maxCharsPerDocument).toBe(KNOWLEDGE_MAX_TEXT_CHARS);
  });

  it("وثيقة بأقصى حجم تتّسع في سقف المقاطع (٤٠٠) فلا يُفقد منها شيء", () => {
    const rows = Array.from({ length: 3_000 }, (_, i) => [`${i}`, "ق".repeat(70)]);
    const built = buildDocuments([sheet({ name: "S", headers: ["رقم", "نص"], rows })], {
      fileName: "max.csv",
    });
    const biggest = Math.max(...built.parts.map((p) => p.text.length));
    expect(biggest).toBeGreaterThan(LIMITS.maxCharsPerDocument * 0.9);
    for (const part of built.parts) {
      expect(part.text.length).toBeLessThanOrEqual(KNOWLEDGE_MAX_TEXT_CHARS);
      expect(chunkText(part.text).length).toBeLessThanOrEqual(MAX_CHUNKS_PER_DOCUMENT);
    }
    expect(CHUNK_TARGET_CHARS).toBeGreaterThan(CHUNK_OVERLAP_CHARS);
  });
});

describe("buildDocuments — الشكل", () => {
  it("الصف سطر «عمود: قيمة · عمود: قيمة» والخلايا الفارغة تُهمل، والأسطر يفصلها سطر فارغ", () => {
    const built = buildDocuments(
      [
        sheet({
          name: "المخزون",
          headers: ["الصنف", "الكمية", "الموقع"],
          rows: [
            ["مضخة", "12", ""],
            ["", "7", "المستودع ٣"],
          ],
        }),
      ],
      { fileName: "inventory.xlsx" },
    );
    expect(built.parts).toHaveLength(1);
    expect(built.parts[0].text).toBe(
      "## الورقة: المخزون\n\nالصنف: مضخة · الكمية: 12\n\nالكمية: 7 · الموقع: المستودع ٣",
    );
    expect(built.parts[0].rows).toBe(2);
    expect(built.rows_total).toBe(2);
    expect(built.rows_loaded).toBe(2);
    expect(built.truncated).toBe(false);
    expect(built.warnings).toEqual([]);
  });

  it("الورقة النصّية الصِّرفة تُرسم سطورها كما هي", () => {
    const built = buildDocuments(
      [sheet({ name: "النص", headers: [], rows: [["# عنوان"], ["- بند"]], plain: true })],
      { fileName: "notes.md" },
    );
    expect(built.parts[0].text).toBe("## الورقة: النص\n\n# عنوان\n\n- بند");
  });

  it("العناوين: ورقة واحدة ⇒ اسمها، عدة أوراق ⇒ عدّادها، عدة أجزاء ⇒ جزء N/M", () => {
    const one = buildDocuments([sheet({ name: "ورقة1", headers: ["a"], rows: [["x"]] })], {
      fileName: "تقرير.xlsx",
    });
    expect(one.parts[0].title).toBe(`${FINN_DOC_TITLE_PREFIX}تقرير.xlsx — ورقة1`);
    const two = buildDocuments(
      [
        sheet({ name: "أ", headers: ["a"], rows: [["x"]] }),
        sheet({ name: "ب", headers: ["a"], rows: [["y"]] }),
      ],
      { fileName: "تقرير.xlsx" },
    );
    expect(two.parts).toHaveLength(1);
    expect(two.parts[0].title).toBe(`${FINN_DOC_TITLE_PREFIX}تقرير.xlsx — ${fmt.format(2)} أوراق`);
    expect(two.parts[0].text).toContain("## الورقة: أ");
    expect(two.parts[0].text).toContain("## الورقة: ب");
    const rows = Array.from({ length: 700 }, (_, i) => [`${i}`, "ع".repeat(600)]);
    const multi = buildDocuments([sheet({ name: "ك", headers: ["n", "v"], rows })], {
      fileName: "k.csv",
    });
    expect(multi.parts.length).toBeGreaterThan(1);
    multi.parts.forEach((part, i) => {
      expect(part.title).toBe(
        `${FINN_DOC_TITLE_PREFIX}k.csv — جزء ${fmt.format(i + 1)}/${fmt.format(multi.parts.length)}`,
      );
    });
  });

  it("اسم الملف يُنظَّف: مسار وتحكّم وبيانات شخصية وطول", () => {
    const built = buildDocuments([sheet({ name: "S", headers: ["a"], rows: [["x"]] })], {
      fileName: `C:\\Users\\x\\docs/تقرير\u0007\u202E 1012345678 ${"ط".repeat(300)}.xlsx`,
    });
    const title = built.parts[0].title;
    expect(title.startsWith(FINN_DOC_TITLE_PREFIX)).toBe(true);
    expect(title.length).toBeLessThanOrEqual(200);
    expect(title).not.toContain("C:");
    expect(title).not.toContain("Users");
    expect(title).not.toContain("\u0007");
    expect(title).not.toContain("\u202E");
    expect(title).not.toContain("1012345678");
    expect(title).toContain(FINN_PII_TOKENS.id);
    expect(
      buildDocuments([sheet({ name: "S", headers: ["a"], rows: [["x"]] })], { fileName: "" })
        .parts[0].title,
    ).toContain("ملف");
  });
});

describe("buildDocuments — القطع والسقوف", () => {
  const wide = (n: number, cellChars: number) =>
    Array.from({ length: n }, (_, i) => [`${i}`, "ع".repeat(cellChars)]);

  it("يقطع عند حدود الصفوف: كل سطر في الأجزاء صفٌّ كامل بعينه", () => {
    const rows = wide(700, 600);
    const built = buildDocuments([sheet({ name: "ك", headers: ["n", "v"], rows })], {
      fileName: "k.csv",
    });
    expect(built.parts.length).toBeGreaterThan(1);
    expect(built.truncated).toBe(false);
    const expectedRows = rows.map((r) => `n: ${r[0]} · v: ${r[1]}`);
    const seen: string[] = [];
    for (const part of built.parts) {
      expect(part.text.length).toBeLessThanOrEqual(LIMITS.maxCharsPerDocument);
      const lines = part.text.split("\n\n").filter((l) => !l.startsWith("## الورقة:"));
      expect(lines.length).toBe(part.rows);
      seen.push(...lines);
    }
    expect(seen).toEqual(expectedRows);
    // الورقة المستمرّة بين جزأين تُعنون في الثاني «تابع».
    expect(built.parts[1].text.startsWith("## الورقة: ك (تابع)")).toBe(true);
    expect(built.parts[0].text.startsWith("## الورقة: ك\n")).toBe(true);
  });

  it("يتوقف عند maxParts ويُعلن بدقة كم حُمِّل وكم أُسقِط", () => {
    const rows = wide(1_200, 900); // ≈ 1.1 مليون حرف > ٣ × ٢٥٠ ألف
    const built = buildDocuments([sheet({ name: "ك", headers: ["n", "v"], rows })], {
      fileName: "k.csv",
    });
    expect(built.parts).toHaveLength(LIMITS.maxParts);
    expect(built.truncated).toBe(true);
    expect(built.rows_total).toBe(1_200);
    expect(built.rows_loaded).toBeLessThan(1_200);
    expect(built.rows_loaded).toBeGreaterThan(0);
    const dropped = built.rows_total - built.rows_loaded;
    expect(built.warnings[0]).toBe(
      `الملف لم يُحمَّل كاملًا: سيُحمَّل ${fmt.format(built.rows_loaded)} صفًّا من أصل ${fmt.format(1_200)}.`,
    );
    expect(built.warnings.join(" ")).toContain(fmt.format(dropped));
    // الصفوف المحمَّلة بدايةُ الملف متّصلة (لا ثقوب).
    const lastPart = built.parts[built.parts.length - 1];
    const lastLine = lastPart.text.split("\n\n").pop()!;
    expect(lastLine).toBe(`n: ${built.rows_loaded - 1} · v: ${"ع".repeat(900)}`);
    expect(built.parts.reduce((n, p) => n + p.rows, 0)).toBe(built.rows_loaded);
  });

  it("صفوف تجاوزت حدّ القراءة تُحتسب في الإجمالي وتُعلَن، والتقدير يُسمّى تقديرًا", () => {
    const s = sheet({
      name: "كبيرة",
      headers: ["a"],
      rows: [["x"], ["y"]],
      rowsTotal: 30_000,
      rowsTotalExact: false,
    });
    const built = buildDocuments([s], { fileName: "big.xlsx" });
    expect(built.rows_total).toBe(30_000);
    expect(built.rows_loaded).toBe(2);
    expect(built.truncated).toBe(true);
    expect(built.warnings[0]).toContain("نحو");
    expect(built.warnings.join(" ")).toContain(fmt.format(LIMITS.maxRowsPerSheet));
  });

  it("الحجب لا يُضخّم الوثيقة فوق الحدّ (رمز الحجب أطول من البريد القصير)", () => {
    const rows = Array.from({ length: 12_000 }, (_, i) => [`a${i % 10}@b.co`, "x".repeat(8)]);
    const built = buildDocuments([sheet({ name: "S", headers: ["e", "v"], rows })], {
      fileName: "m.csv",
    });
    for (const part of built.parts) {
      expect(part.text.length).toBeLessThanOrEqual(LIMITS.maxCharsPerDocument);
    }
    expect(built.pii.emails).toBeGreaterThan(0);
  });

  it("صفٌّ طويل جدًّا يُقتطع ويُعلَن، وصفٌّ بلا خلايا مرسومة لا يُعدّ اقتطاعًا", () => {
    const headers = Array.from({ length: 50 }, (_, i) => `h${i}`);
    const longRow = headers.map(() => "ق".repeat(1_900));
    const built = buildDocuments(
      [
        sheet({
          name: "S",
          headers,
          rows: [longRow, headers.map(() => ""), headers.map(() => "1")],
        }),
      ],
      { fileName: "long.csv" },
    );
    expect(built.truncated).toBe(false);
    expect(built.rows_loaded).toBe(3);
    expect(built.warnings.join(" ")).toContain("طويلًا");
    expect(built.parts[0].text.split("\n\n").every((l) => l.length <= 20_000)).toBe(true);
  });

  it("لا يطبع شيئًا إلى console", async () => {
    const { output } = await captureConsole(async () =>
      buildDocuments([sheet({ name: "S", headers: ["a"], rows: [["1012345678"]] })], {
        fileName: "x.csv",
      }),
    );
    expect(output).toBe("");
  });
});

describe("حجب البيانات الشخصية", () => {
  const PLANTED = {
    idAscii: "1012345678",
    idIqama: "2098765432",
    idArabicIndic: "١٠١٢٣٤٥٦٧٨",
    idPersian: "۲۰۹۸۷۶۵۴۳۲",
    phonePlain: "0551234567",
    phonePlus: "+966 55 123 4567",
    phone00: "00966551234567",
    phoneDash: "055-123-4567",
    phoneIndic: "٠٥٥١٢٣٤٥٦٧",
    phoneLandline: "0112345678",
    phoneLandlineIntl: "+966 11 234 5678",
    email: "ahmad.ali+x@example.co.uk",
    emailArabicDigits: "user١٢٣@mail.sa",
  } as const;

  /** القيم كما تظهر بعد تحويل الأرقام الهندية إلى ASCII — يجب ألا تظهر بدورها. */
  const asciiForm = (v: string) =>
    v.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, (d) =>
      String.fromCharCode(0x30 + (d.charCodeAt(0) & 0x0f)),
    );

  it("النص المخزَّن (الخلايا والترويسات واسم الورقة والعنوان) لا يحوي أيًّا من القيم المزروعة", () => {
    const values = Object.values(PLANTED);
    const built = buildDocuments(
      [
        sheet({
          name: `ورقة ${PLANTED.idAscii}`,
          headers: [`هوية ${PLANTED.idIqama}`, "اتصال", "بريد", "ملاحظة"],
          rows: [
            [PLANTED.idAscii, PLANTED.phonePlain, PLANTED.email, `رقمي ${PLANTED.phonePlus}`],
            [PLANTED.idArabicIndic, PLANTED.phone00, PLANTED.emailArabicDigits, PLANTED.phoneDash],
            [
              PLANTED.idPersian,
              PLANTED.phoneIndic,
              "—",
              `${PLANTED.phoneLandline} / ${PLANTED.phoneLandlineIntl}`,
            ],
            [PLANTED.idIqama, "قيمة عادية ٣٥ مضخة", "x", "91234567890"],
          ],
        }),
      ],
      { fileName: `${PLANTED.phonePlain}.xlsx` },
    );
    const stored = built.parts.map((p) => `${p.title}\n${p.text}`).join("\n");
    for (const value of values) {
      expect(stored, `القيمة ${value} ظهرت في النص المخزَّن`).not.toContain(value);
      expect(stored, `الصيغة المطبَّعة لـ${value} ظهرت`).not.toContain(asciiForm(value));
    }
    expect(stored).toContain(FINN_PII_TOKENS.id);
    expect(stored).toContain(FINN_PII_TOKENS.phone);
    expect(stored).toContain(FINN_PII_TOKENS.email);
    // لا يمسّ غير الشخصي: أرقام قصيرة وكلمات عربية وعدد من ١١ رقمًا.
    expect(stored).toContain("قيمة عادية ٣٥ مضخة");
    expect(stored).toContain("91234567890");
    // العدّاد: رصد الأنماط في النصّ الخام قبل الحجب.
    expect(built.pii.id_numbers).toBeGreaterThanOrEqual(5);
    expect(built.pii.phones).toBeGreaterThanOrEqual(7);
    expect(built.pii.emails).toBe(2);
  });

  it("maskPii: عدّ دقيق لكل صنف وإبقاء ما حول المطابقة كما هو", () => {
    const r = maskPii("الهوية ١٠١٢٣٤٥٦٧٨ والجوال 0551234567 والبريد a@b.sa وانتهى");
    expect(r.text).toBe(
      `الهوية ${FINN_PII_TOKENS.id} والجوال ${FINN_PII_TOKENS.phone} والبريد ${FINN_PII_TOKENS.email} وانتهى`,
    );
    expect(r.counts).toEqual({ id_numbers: 1, phones: 1, emails: 1 });
    expect(maskPii("").counts).toEqual({ id_numbers: 0, phones: 0, emails: 0 });
  });

  it("maskPii: لا يحجب غير الهوية (٩ أو ١١ رقمًا، أو يبدأ بـ٣) ولا الأرقام العادية", () => {
    for (const harmless of [
      "3012345678",
      "101234567",
      "10123456789",
      "12345",
      "2026-10-31",
      "مضخة 35",
    ]) {
      expect(maskPii(harmless).text).toBe(harmless);
    }
  });

  it("maskPii: مجهول الأثر على إعادة التطبيق (idempotent)", () => {
    const once = maskPii("1012345678 0551234567 a@b.sa").text;
    const twice = maskPii(once);
    expect(twice.text).toBe(once);
    expect(twice.counts).toEqual({ id_numbers: 0, phones: 0, emails: 0 });
  });

  it("الحجب لكل سطر: أرقام صفّين متجاورين لا تلتصق فتصير جوالًا", () => {
    const built = buildDocuments(
      [sheet({ name: "S", headers: ["a"], rows: [["055"], ["1234567"]] })],
      { fileName: "adj.csv" },
    );
    expect(built.pii.phones).toBe(0);
    expect(built.parts[0].text).toContain("a: 055");
    expect(built.parts[0].text).toContain("a: 1234567");
  });
});

describe("summarizeSheets — المعاينة", () => {
  it("يقتطع الترويسات (العدد والطول) ويحجب فيها الأنماط الشخصية", () => {
    const headers = Array.from({ length: 30 }, (_, i) =>
      i === 0 ? "1012345678" : `ترويسة ${i} ${"ط".repeat(80)}`,
    );
    const [summary] = summarizeSheets([
      sheet({ name: "الاسم 0551234567", headers, rows: [headers.map(() => "x")], rowsTotal: 5 }),
    ]);
    expect(summary.headers).toHaveLength(LIMITS.previewHeaders);
    expect(
      summary.headers.every(
        (h) => h.length <= LIMITS.previewHeaderChars + FINN_PII_TOKENS.id.length,
      ),
    ).toBe(true);
    expect(summary.headers[0]).toBe(FINN_PII_TOKENS.id);
    expect(summary.name).toBe(`الاسم ${FINN_PII_TOKENS.phone}`);
    expect(summary.rows).toBe(1);
    expect(summary.cols).toBe(30);
    expect(
      summarizeSheets([sheet({ name: "t", headers: [], rows: [["l"]], plain: true })])[0].headers,
    ).toEqual([]);
  });
});

// ═══ الصيغ الشائعة: كل صيغةٍ في حالة (مراجعة الأمن ٣ · مراجعة التضعيف ٩) ═══════════════════════════
type PiiKind = "id" | "phone" | "email";
const COUNT_KEY = { id: "id_numbers", phone: "phones", email: "emails" } as const;

const indic = (digits: string) =>
  digits.replace(/[0-9]/g, (d) => String.fromCharCode(0x0660 + Number(d)));
const LANDLINE_AREAS = ["11", "12", "13", "14", "16", "17"] as const;

/** [القيمة، الصنف]: كلٌّ منها يجب أن يُحجب كاملًا ويُعدّ مرّةً واحدة بالضبط. */
const FORMATS: ReadonlyArray<readonly [value: string, kind: PiiKind]> = [
  // هوية/إقامة مجمَّعة: مسافات · شرطات · نقاط · مائلة · NBSP · en-dash · هندية · علامات اتجاه
  ["1 234 567 891", "id"],
  ["1234 567 892", "id"],
  ["123 456 7893", "id"],
  ["1234 5678 94", "id"],
  ["12345 67895", "id"],
  ["1234-567-896", "id"],
  ["1-234-567-897", "id"],
  ["1.234.567.898", "id"],
  ["1234/567/899", "id"],
  ["1\u00a0234\u00a0567\u00a0890", "id"],
  ["1234\u2013567\u2013891", "id"],
  ["2 098 765 432", "id"],
  [`${indic("1")} ${indic("234")} ${indic("567")} ${indic("893")}`, "id"],
  ["10123\u200E45678", "id"],
  ["10123\u200C45678", "id"],
  // جوال سعودي: أقواس · فاصل من ٣ محارف · مائلة · فاصلة · en-dash · U+2011 · نقاط · دولي · هندي
  ["(055) 123-4567", "phone"],
  ["(055) 765-4321", "phone"],
  ["055 - 123 - 4567", "phone"],
  ["055/123/4567", "phone"],
  ["055/111/2222", "phone"],
  ["055,123,4567", "phone"],
  ["055\u2013123\u20134567", "phone"],
  ["055\u2011123\u20114567", "phone"],
  ["055.123.4567", "phone"],
  ["055\u060c 123\u060c 4567", "phone"],
  ["055\u200E123\u200E4567", "phone"],
  ["+966 55 123 4567", "phone"],
  ["+966-55-123-4567", "phone"],
  ["+966 (0) 55 123 4567", "phone"],
  ["+966 (55) 123 4567", "phone"],
  ["00966 55 123 4567", "phone"],
  ["966551234567", "phone"],
  ["05 5123 4567", "phone"],
  ["0551 234 567", "phone"],
  [`${indic("055")}/${indic("123")}/${indic("4567")}`, "phone"],
  ["\uff08055\uff09123-4567", "phone"],
  // ثابت: كل مفاتيح المناطق بكل الأشكال
  ...LANDLINE_AREAS.flatMap(
    (a) =>
      [
        [`0${a}2345678`, "phone"],
        [`0${a} 234 5678`, "phone"],
        [`(0${a}) 234-5678`, "phone"],
        [`0${a}/234/5678`, "phone"],
        [`+966 ${a} 234 5678`, "phone"],
        [`966${a}2345678`, "phone"],
        [indic(`0${a}2345678`), "phone"],
      ] as const,
  ),
  // دولي E.164 غير سعودي
  ["+20 100 123 4567", "phone"],
  ["+91 98765 43210", "phone"],
  ["+1 (415) 555-2671", "phone"],
  ["+44 20 7946 0958", "phone"],
  ["+44 (0)20 7946 0958", "phone"],
  ["+12025550123", "phone"],
  ["+971 50 123 4567", "phone"],
  ["+49 30 901820", "phone"],
  ["+86-138-0013-8000", "phone"],
  [`+${indic("20")} ${indic("100")} ${indic("123")} ${indic("4567")}`, "phone"],
  ["\uff0b971 50 123 4567", "phone"],
  // بريد: جزء محلي عربي · نطاق عربي/IDN/punycode · نطاق عميق · عريضة العرض
  ["محمد@example.com", "email"],
  ["بريد.عمل@شركة.مثال.السعودية", "email"],
  ["ahmad@مثال.السعودية", "email"],
  ["x@ex\u00e4mple.com", "email"],
  ["a@xn--mgbh0fb.xn--mgberp4a5d4ar", "email"],
  ["u@a.b.c.d.e.f.g.h.i.j.k.l.example.com", "email"],
  ["user.name+tag@sub.domain.example.co.uk", "email"],
  ["ali\uff20example.com", "email"],
];

/** تبقى كما هي حرفًا بحرف ولا تُعدّ: تواريخ وأرقام طويلة ورموز أصناف وقوائم أعداد. */
const NEGATIVES: readonly string[] = [
  "2026/10/06",
  "2026-10-06",
  "06/10/2026",
  "2026-10-06 12:30",
  "06/10/2026 14:30",
  "05/10/2026 14:30",
  "05-10-2026 14:30",
  "5-10-2026 14:30",
  "5 10 2026 14",
  "20261006 12",
  "2026 10 06 12",
  "1234567890123",
  "رقم طلب 1234567890123 بتاريخ 2026/10/06",
  "4001501234567",
  "05512345678",
  "+1234567",
  "+1234567890123456",
  "SKU-2045-1234-56",
  "MTR-1000-2345-67",
  "A12-34-5678-9012-345",
  "PO 2026 1006 0012 345",
  "1 234 567 890 12",
  "1 2 3 4 6 7 8 9 10",
  "2045-1234 56",
  "1,234,567,890",
  "0.5, 1.2, 3.4, 5.6, 7.8",
  "5,12,34,56,78",
  "0,5,12,34,56,78",
  "0152345678",
  "3012345678",
  "101234567",
  "10123456789",
  "مضخة 35",
];

const TOKEN_OF: Record<PiiKind, string> = {
  id: FINN_PII_TOKENS.id,
  phone: FINN_PII_TOKENS.phone,
  email: FINN_PII_TOKENS.email,
};

/** البطارية: تعيد ما أخطأ (قيمةٌ لم تُحجب كاملة/لم تُعدّ مرّة، أو `fp:` نصٌّ لا يجب أن يُمسّ). */
function piiFormatsBattery(mod: typeof realToText): string[] {
  const bad: string[] = [];
  for (const [value, kind] of FORMATS) {
    const r = mod.maskPii(`قبل ${value} بعد`);
    const counts = { id_numbers: 0, phones: 0, emails: 0, [COUNT_KEY[kind]]: 1 };
    if (
      r.text !== `قبل ${TOKEN_OF[kind]} بعد` ||
      JSON.stringify(r.counts) !== JSON.stringify(counts)
    )
      bad.push(value);
  }
  for (const text of NEGATIVES) {
    const r = mod.maskPii(text);
    if (r.text !== text || r.counts.id_numbers + r.counts.phones + r.counts.emails !== 0)
      bad.push(`fp:${text}`);
  }
  return bad;
}

describe("حجب البيانات الشخصية — الصيغ الشائعة (كل صيغة في حالة)", () => {
  it.each(FORMATS.map(([value, kind]) => ({ value, kind })))(
    "$kind: «$value» يُحجب كاملًا ويُعدّ مرّةً واحدة",
    ({ value, kind }) => {
      const r = maskPii(`قبل ${value} بعد`);
      expect(r.text).toBe(`قبل ${TOKEN_OF[kind]} بعد`);
      expect(r.counts).toEqual({ id_numbers: 0, phones: 0, emails: 0, [COUNT_KEY[kind]]: 1 });
    },
  );

  it.each(NEGATIVES.map((text) => ({ text })))("بلا قرينة لا يُحجب: «$text»", ({ text }) => {
    const r = maskPii(text);
    expect(r.text).toBe(text);
    expect(r.counts).toEqual({ id_numbers: 0, phones: 0, emails: 0 });
  });

  it("مفتاح المنطقة ١٥ خارج المجموعة المعتمدة (١١ ١٢ ١٣ ١٤ ١٦ ١٧) فلا يُحجب ثابتٌ به", () => {
    expect(maskPii("0152345678").text).toBe("0152345678");
    for (const a of LANDLINE_AREAS) expect(maskPii(`0${a}2345678`).text).toBe(TOKEN_OF.phone);
  });

  it("الحدّ الفاصل: رقمٌ أطول لا يُقتطع منه جوال ولا ثابت ولا هوية", () => {
    // ١٣ رقمًا ينتهي بجوالٍ كامل (٠٥٠١٢٣٤٥٦٧) أو يحوي تسعةً تبدأ بـ٥: البادئة/الأرقام الملاصقة تمنع القصّ.
    for (const longer of [
      "4001501234567",
      "9990551234567",
      "10123456789012",
      "5512345678901",
      "0112345678901",
    ]) {
      const r = maskPii(longer);
      expect(r.text, longer).toBe(longer);
      expect(r.counts).toEqual({ id_numbers: 0, phones: 0, emails: 0 });
    }
    // وبعده: رقمٌ ملاصقٌ بعد العاشر يُبطل المطابقة (١١ رقمًا).
    expect(maskPii("05512345678").text).toBe("05512345678");
    expect(maskPii("20987654321").text).toBe("20987654321");
  });

  it("أكثر من رقمٍ في الخلية: يُحجب كلٌّ منها ويُعدّ، وما بينها يبقى", () => {
    const r = maskPii(
      "هوية 1 234 567 891 وجوال (055) 765-4321 وآخر +20 100 123 4567 وبريد محمد@example.com وتاريخ 2026/10/06",
    );
    expect(r.text).toBe(
      `هوية ${TOKEN_OF.id} وجوال ${TOKEN_OF.phone} وآخر ${TOKEN_OF.phone} وبريد ${TOKEN_OF.email} وتاريخ 2026/10/06`,
    );
    expect(r.counts).toEqual({ id_numbers: 1, phones: 2, emails: 1 });
  });

  it("صيغ المراجعة كما وردت (خلايا CSV) لا تصل النص المخزَّن ولا تُفلت من العدّاد", () => {
    const rows = [
      ["(055) 765-4321", "1 234 567 891", "محمد@example.com"],
      ["055/111/2222", "1234-567-892", "x@ex\u00e4mple.com"],
    ];
    const built = buildDocuments(
      [sheet({ name: "S", headers: ["الجوال", "الهوية", "البريد"], rows })],
      { fileName: "contacts.csv" },
    );
    const stored = built.parts.map((p) => `${p.title}\n${p.text}`).join("\n");
    for (const value of rows.flat()) expect(stored, value).not.toContain(value);
    expect(stored).not.toMatch(/[0-9]{3}/);
    expect(built.pii).toEqual({ id_numbers: 2, phones: 2, emails: 2 });
  });

  it("الأرقام الهندية والفارسية وعريضة العرض في الصيغ المجمَّعة تُطوى كما هي اليوم", () => {
    expect(maskPii("١ ٢٣٤ ٥٦٧ ٨٩١").text).toBe(TOKEN_OF.id);
    expect(maskPii("۱۲۳۴-۵۶۷-۸۹۲").text).toBe(TOKEN_OF.id);
    expect(maskPii("１２３４-５６７-８９３").text).toBe(TOKEN_OF.id);
    expect(maskPii("（０５５）１２３-４５６７").text).toBe(TOKEN_OF.phone);
  });

  it("مجهول الأثر على إعادة التطبيق في الصيغ كلها (لا رمزَ يُحجب ثانيةً ولا رقمَ يظهر)", () => {
    for (const [value] of FORMATS) {
      const once = maskPii(`ج ${value} ك`).text;
      const twice = maskPii(once);
      expect(twice.text).toBe(once);
      expect(twice.counts).toEqual({ id_numbers: 0, phones: 0, emails: 0 });
    }
  });

  it("الترويسات واسم الورقة في المعاينة تحجب الصيغ الجديدة أيضًا", () => {
    const [summary] = summarizeSheets([
      sheet({
        name: "ورقة (055) 765-4321",
        headers: ["1 234 567 891", "+20 100 123 4567", "محمد@example.com", "عادي"],
        rows: [["a", "b", "c", "d"]],
      }),
    ]);
    expect(summary.name).toBe(`ورقة ${TOKEN_OF.phone}`);
    expect(summary.headers).toEqual([TOKEN_OF.id, TOKEN_OF.phone, TOKEN_OF.email, "عادي"]);
  });
});

describe("حجب البيانات الشخصية — الزمن خطّي على المدخلات المعادية", () => {
  const N = 150_000;
  const HOSTILE: Record<string, string> = {
    "أرقام متّصلة": "1".repeat(N),
    "خمسات مفصولة": "5 ".repeat(N / 2),
    "آحاد مفصولة": "1 ".repeat(N / 2),
    "أصفار وخمسات": "0 5 ".repeat(N / 4),
    "قائمة أعداد عشرية": "0.5, ".repeat(N / 5),
    "أقواس مفتوحة ثم جوال": "(".repeat(N) + "0551234567",
    "جوالات بفواصل واسعة": "(055) - 123 / 4567, ".repeat(N / 19),
    "علامات زائد": "+".repeat(N),
    "دولي طويل": `+${"1 ".repeat(N / 2)}`,
    "دوليّات متكررة": "+1 ".repeat(N / 3),
    "@ بلا نطاق": `${"a".repeat(N)}@`,
    "@ متكررة": "a@".repeat(N / 2),
    "نطاق بنقاط بلا نهاية": `x@${"a.".repeat(N / 2)}`,
    "جزء محلي عربي طويل": `${"محمد".repeat(N / 4)}@`,
    "نقاط ثم نطاق": `${"a.".repeat(N / 2)}@x.com`,
    "علامات اتجاه بين الأرقام": "1\u200E".repeat(N / 2),
    "علامات اتجاه متتالية": `1${"\u200E".repeat(N)}1`,
    NBSP: "1\u00a0".repeat(N / 2),
    "سلسلة هويات مجمَّعة": "1 234 567 890 ".repeat(N / 14),
    "رموز أصناف": "SKU-1234-5678-90 ".repeat(N / 17),
    "خليط حقيقي": "الهوية 1 234 567 890 جوال (055) 123-4567 بريد a@b.sa ".repeat(N / 52),
  };

  it.each(Object.entries(HOSTILE))("«%s» ينتهي في أقل من ثانيتين ونصف", (_name, input) => {
    const started = performance.now();
    const r = maskPii(input);
    const elapsed = performance.now() - started;
    expect(typeof r.text).toBe("string");
    expect(elapsed).toBeLessThan(2_500);
  });
});

describe("العدّاد يعكس ما حُجب في النص المخزَّن فعلًا", () => {
  const occurrences = (text: string, token: string) => text.split(token).length - 1;
  const heavy = (n: number, tail: string) =>
    Array.from({ length: n }, (_, i) => [`${i}`, `${"ع".repeat(880)} ${tail}`]);

  it("الأرقام في النص المخزَّن بعدد الرموز المكتوبة: الصفّ الذي لم يتّسع لا يُعدّ", () => {
    const built = buildDocuments(
      [sheet({ name: "ك", headers: ["n", "v"], rows: heavy(1_300, "0551234567") })],
      { fileName: "big.csv" },
    );
    expect(built.truncated).toBe(true);
    const stored = built.parts.map((p) => p.text).join("\n\n");
    expect(occurrences(stored, FINN_PII_TOKENS.phone)).toBe(built.rows_loaded);
    expect(built.pii.phones).toBe(built.rows_loaded);
  });

  it("اسم ورقةٍ لم يُكتب عنوانها (لم يتّسع شيء منها) لا يدخل العدّ", () => {
    const built = buildDocuments(
      [
        sheet({ name: "الأولى", headers: ["n", "v"], rows: heavy(1_300, "x") }),
        sheet({ name: "ورقة 1012345678", headers: ["a"], rows: [["y"], ["z"]] }),
      ],
      { fileName: "two.csv" },
    );
    expect(built.truncated).toBe(true);
    const stored = built.parts.map((p) => p.text).join("\n\n");
    expect(stored).not.toContain("## الورقة: ورقة");
    expect(stored).not.toContain(FINN_PII_TOKENS.id);
    expect(built.pii).toEqual({ id_numbers: 0, phones: 0, emails: 0 });
  });

  it("اسم الملف المحجوب في عناوين الوثائق يُعدّ مرّةً واحدة مهما تعدّدت الأجزاء", () => {
    const built = buildDocuments(
      [sheet({ name: "ك", headers: ["n", "v"], rows: heavy(700, "x") })],
      { fileName: "قائمة (055) 765-4321.xlsx" },
    );
    expect(built.parts.length).toBeGreaterThan(1);
    for (const part of built.parts) expect(part.title).toContain(FINN_PII_TOKENS.phone);
    expect(built.pii).toEqual({ id_numbers: 0, phones: 1, emails: 0 });
  });

  it("اسم الورقة المحجوب يُعدّ مرّةً واحدة وإن تكرّر عنوانها في أجزاء", () => {
    const built = buildDocuments(
      [sheet({ name: "ورقة 1 234 567 891", headers: ["n", "v"], rows: heavy(700, "x") })],
      { fileName: "k.csv" },
    );
    expect(built.parts.length).toBeGreaterThan(1);
    expect(built.parts.every((p) => p.text.includes(FINN_PII_TOKENS.id))).toBe(true);
    expect(built.pii).toEqual({ id_numbers: 1, phones: 0, emails: 0 });
  });
});

// ═══ انتهاكات مزروعة (المادة ٣٠): تعطيل أي نمطٍ أو قاعدة يُحمّر البطارية بالتسمية المتوقعة ═════════
const DIR = path.dirname(fileURLToPath(import.meta.url));
const scratch = createMutantScratch("__pii_mutant_");
const TO_TEXT_FILE = path.join(DIR, "to-text.server.ts");

/** نسخةٌ مُضعَّفة من الملف نفسه (تُكتب خارج src): المرساة يجب أن تظهر مرّةً واحدة بالضبط وإلا فشل الاختبار بصوتٍ عالٍ. */
async function mutateToText(edits: Array<[from: string, to: string]>): Promise<typeof realToText> {
  let out = fs.readFileSync(TO_TEXT_FILE, "utf8");
  for (const [from, to] of edits) {
    const found = out.split(from).length - 1;
    if (found !== 1) {
      throw new Error(
        `مرساة التضعيف يجب أن تظهر مرّةً واحدة (وُجدت ${found}): ${from.slice(0, 90)}`,
      );
    }
    out = out.replace(from, () => to);
  }
  return scratch.importMutated<typeof realToText>(TO_TEXT_FILE, out);
}

beforeAll(() => scratch.cleanStale());
afterAll(() => scratch.cleanStale());

describe("براهين التحمير — الصيغ الشائعة", () => {
  it("الأساس: الكود الحقيقي يجتاز البطارية كاملةً (لا تسرّب ولا إيجابية كاذبة)", () => {
    expect(piiFormatsBattery(realToText)).toEqual([]);
  });

  it.each([
    [
      "الدولي E.164: يتسرّب غير السعودي حين تُعطَّل مرحلته",
      [['if (folded.includes("+")) {', "if (false) {"]],
      ["+20 100 123 4567", "+91 98765 43210", "+1 (415) 555-2671", "+12025550123"],
    ],
    [
      "الهوية المجمَّعة: تتسرّب بكل تجميع حين تُعطَّل مرحلتها",
      [['apply(NATIONAL_ID_GROUPED, FINN_PII_TOKENS.id, "id_numbers", acceptGroupedId);', ""]],
      ["1 234 567 891", "1234-567-896", "1.234.567.898", "1234/567/899", "2 098 765 432"],
    ],
    [
      "الفاصل الواسع: أقواس وفاصل ثلاثي ومائلة وفاصلة تتسرّب حين يُضيَّق",
      [['const GAP = "[\\\\s\\\\p{Cf}.,/()\\\\-]{0,3}";', "const GAP = SEP;"]],
      ["(055) 123-4567", "055 - 123 - 4567", "055/123/4567", "055,123,4567", "055/111/2222"],
    ],
    [
      "مفاتيح المناطق: ١٦ و١٧ تتسرّبان حين تُضيَّق المجموعة إلى ١١–١٤",
      [["1[1-467](?:", "1[1-4](?:"]],
      ["0162345678", "0172345678", "+966 16 234 5678", "(017) 234-5678"],
    ],
    [
      "الحدّ الفاصل (lookbehind): يُقتطع جوالٌ من رقمٍ أطول حين يُحذف",
      [["`(?<![0-9])(?:${KSA_PREFIX}5", "`(?:${KSA_PREFIX}5"]],
      ["fp:4001501234567"],
    ],
    [
      "الحدّ الفاصل (lookahead): يُقتطع جوالٌ من ١١ رقمًا حين يُحذف",
      [["(?:${SEP}[0-9]){8})(?![0-9])`", "(?:${SEP}[0-9]){8})`"]],
      ["fp:05512345678"],
    ],
    [
      "التاريخ: يصير تاريخٌ بساعة جوالًا أو هوية حين يُعطَّل كاشفه",
      [
        [
          "const looksLikeDate = (s: string): boolean => DATE_LIKE.test(s);",
          "const looksLikeDate = (_s: string): boolean => false;",
        ],
      ],
      ["fp:05/10/2026 14:30", "fp:05-10-2026 14:30", "fp:5 10 2026 14", "fp:2026 10 06 12"],
    ],
    [
      "الفاصل الواسع بين رقمين فأكثر: قائمة الأعداد تصير جوالًا حين تُلغى القاعدة",
      [["if (wide && (parts[i - 1].length < 2 || parts[i + 1].length < 2)) return false;", ""]],
      ["fp:0.5, 1.2, 3.4, 5.6, 7.8", "fp:0,5,12,34,56,78"],
    ],
    [
      "الفاصل المتّسق: تجميعٌ بفواصل مختلطة يصير هوية حين تُلغى القاعدة",
      [["if (seps.some((x) => x !== sep)) return false;", ""]],
      ["fp:2045-1234 56"],
    ],
    [
      "حجم المجموعات: آحادٌ مفصولة وثمانية أرقامٍ ثم ساعة تصير هوية حين تُلغى القاعدة",
      [
        [
          "if (groups[0].length > 5 || groups.some((g, i) => i > 0 && g.length < 2)) return false;",
          "",
        ],
      ],
      ["fp:1 2 3 4 6 7 8 9 10", "fp:20261006 12"],
    ],
    [
      "رمز الصنف: يصير «SKU-…» هوية حين يُحذف شرط الحرف اللاتيني السابق",
      [["(?<![0-9A-Za-z]|[0-9A-Za-z][.\\-/]|[0-9] )", "(?<![0-9])"]],
      ["fp:SKU-2045-1234-56", "fp:MTR-1000-2345-67"],
    ],
    [
      "امتداد السلسلة: يُقتطع عشرة أرقامٍ من سلسلةٍ مجمَّعة أطول حين يُلغى الشرط",
      [
        [
          "return !(text.startsWith(sep, end) && /[0-9]/.test(text.charAt(end + sep.length)));",
          "return true;",
        ],
      ],
      ["fp:1 234 567 890 12"],
    ],
    [
      "البريد اليونيكود: يتسرّب العربي وIDN حين يعود النمط إلى ASCII",
      [
        [
          "/[\\p{L}\\p{M}\\p{N}._%+-]{1,64}@(?:[\\p{L}\\p{M}\\p{N}-]{1,63}\\.){1,127}[\\p{L}\\p{M}][\\p{L}\\p{M}\\p{N}-]{1,62}/gu;",
          "/[A-Za-z0-9._%+-]{1,64}@(?:[A-Za-z0-9-]{1,63}\\.){1,127}[A-Za-z]{2,24}/gu;",
        ],
      ],
      [
        "محمد@example.com",
        "ahmad@مثال.السعودية",
        "x@ex\u00e4mple.com",
        "بريد.عمل@شركة.مثال.السعودية",
      ],
    ],
    [
      "عمق النطاق: يتسرّب نطاق أعمق من ٨ مستويات حين يُسقَّف عند ٨",
      [["\\.){1,127}", "\\.){1,8}"]],
      ["u@a.b.c.d.e.f.g.h.i.j.k.l.example.com"],
    ],
    [
      "طيّ الشرطات: en-dash وU+2011 تتسرّبان حين يُلغى الطيّ",
      [
        [
          '.replace(/[\\u2010-\\u2015\\u2212\\ufe58\\ufe63\\uff0d]/g, "-")',
          '.replace(/\\ufe58/g, "-")',
        ],
      ],
      ["1234\u2013567\u2013891", "055\u2013123\u20134567", "055\u2011123\u20114567"],
    ],
    [
      "طيّ المسافات: الهوية بـNBSP تتسرّب حين تُلغى المسافات الخاصة",
      [
        [
          '.replace(/[\\t\\v\\f\\u0085\\u00a0\\u1680\\u2000-\\u200a\\u202f\\u205f\\u3000]/g, " ")',
          '.replace(/\\t/g, " ")',
        ],
      ],
      ["1\u00a0234\u00a0567\u00a0890"],
    ],
    [
      "علامات الاتجاه بين الأرقام: LRM وZWNJ داخل الهوية تُفلتان حين تبقيان",
      [['(m) => " ".repeat(m.length)', "(m) => m"]],
      ["10123\u200E45678", "10123\u200C45678"],
    ],
    [
      "عريضة العرض: الأقواس العريضة تُفلت حين يُلغى طيّها",
      [['.replace(/\\uff09/g, ")")', '.replace(/\\uff09/g, "]")']],
      ["\uff08055\uff09123-4567"],
    ],
  ] as Array<[string, Array<[string, string]>, string[]]>)(
    "%s",
    async (_title, edits, expected) => {
      const mutant = await mutateToText(edits);
      expect(piiFormatsBattery(mutant)).toEqual(expect.arrayContaining(expected));
    },
  );

  it("العدّ: الصفّ الذي لم يتّسع يُعدّ حين يعود العدّ إلى ما قبل الصفّ (انتهاك مزروع)", async () => {
    const mutant = await mutateToText([
      ["tally(maskedLine.counts);\n          push(current, line);", "push(current, line);"],
      [
        "const maskedLine = maskPii(line);",
        "const maskedLine = maskPii(line);\n      tally(maskedLine.counts);",
      ],
    ]);
    const rows = Array.from({ length: 1_300 }, (_, i) => [`${i}`, `${"ع".repeat(880)} 0551234567`]);
    const built = mutant.buildDocuments([sheet({ name: "ك", headers: ["n", "v"], rows })], {
      fileName: "big.csv",
    });
    expect(built.pii.phones).toBeGreaterThan(built.rows_loaded);
  });
});
