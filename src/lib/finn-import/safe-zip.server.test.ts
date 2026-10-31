// @vitest-environment node
/**
 * فاحص أرشيف xlsx الصارم: يقبل ملفات Excel الحقيقية الشكل (ومنها `printerSettings1.bin` الذي كان يُنذَر
 * خطأً)، ويرفض الهجمات التي قاسها التدقيق السابق وما حولها. كل هجوم هنا **مبنيّ بايتًا ببايت** وقت
 * التشغيل (لا ملفات في المستودع). البراهين المقابلة (تضعيف الحارس عمدًا ⇒ يحمرّ) في
 * `guards.mutation.server.test.ts`.
 */
import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
  FINN_ZIP_LIMITS,
  forEachXmlAttr,
  inspectXlsxZip,
  scanXmlTags,
  type ZipRejectReason,
} from "./safe-zip.server";
import {
  PRINTER_SETTINGS_ENTRY,
  asSpecs,
  buildFakeCentralHeaderXlsx,
  buildOverlappingXlsx,
  buildZip,
  concat,
  legacyScanNames,
  makeXlsx,
  readZipEntries,
  rewriteXlsx,
  utf8,
  type Bytes,
  type ZipEntrySpec,
} from "./fixtures.test-support";

const base = (): Bytes =>
  makeXlsx([
    {
      name: "Data",
      rows: [
        ["a", "b"],
        ["1", "2"],
      ],
    },
  ]);

/** أضف مداخل إلى xlsx سليم (أو بدّل مدخلًا بالاسم نفسه). */
const withExtra = (extra: ZipEntrySpec[], drop: string[] = []): Bytes =>
  rewriteXlsx(base(), (entries) => [
    ...asSpecs(entries).filter(
      (s) => !drop.includes(s.name) && !extra.some((e) => e.name === s.name),
    ),
    ...extra,
  ]);

async function expectReject(
  bytes: Bytes,
  error: "malformed" | "unsafe" | "too_large",
  reason: ZipRejectReason,
) {
  const r = await inspectXlsxZip(bytes);
  expect(r.ok).toBe(false);
  if (!r.ok) {
    expect({ error: r.error, reason: r.reason }).toEqual({ error, reason });
  }
}

describe("inspectXlsxZip — يقبل الملفات الحقيقية الشكل", () => {
  it("يقبل مصنّف XLSX.write ويعيد أرشيفًا نظيفًا مخزَّنًا", async () => {
    const r = await inspectXlsxZip(base());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.parts.has("xl/workbook.xml")).toBe(true);
    expect(r.parts.has("[Content_Types].xml")).toBe(true);
    // النظيف: كل مداخله مخزَّنة (طريقة 0) ولا واصفات، ويُقبل من الفاحص نفسه ثانيةً.
    const again = await inspectXlsxZip(r.safeBytes);
    expect(again.ok).toBe(true);
    if (again.ok) expect(again.entries.every((e) => e.method === 0)).toBe(true);
    expect(
      readZipEntries(r.safeBytes)
        .map((e) => e.name)
        .sort(),
    ).toEqual([...r.parts.keys()].sort());
  });

  it("يقبل ملفًا فيه xl/printerSettings/printerSettings1.bin (كما يكتبه Excel) ولا يمرّره", async () => {
    const bytes = withExtra([PRINTER_SETTINGS_ENTRY]);
    const r = await inspectXlsxZip(bytes);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.entries.some((e) => e.name === "xl/printerSettings/printerSettings1.bin")).toBe(true);
    // لا يُقرأ ولا يُمرَّر للقارئ.
    expect(r.parts.has("xl/printerSettings/printerSettings1.bin")).toBe(false);
    expect(readZipEntries(r.safeBytes).some((e) => e.name.endsWith(".bin"))).toBe(false);
  });

  it("يقبل مدخلات بواصف بيانات (أسلوب Java/POI: الأحجام المحلية أصفار)", async () => {
    const bytes = rewriteXlsx(base(), (entries) =>
      asSpecs(entries).map((s) => ({ ...s, descriptor: true })),
    );
    const r = await inspectXlsxZip(bytes);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.parts.get("xl/workbook.xml")!.length).toBeGreaterThan(0);
  });

  it("يقبل مدخلات مخزَّنة بلا ضغط وأسماء مجلدات", async () => {
    const bytes = rewriteXlsx(base(), (entries) => [
      { name: "xl/", data: "", method: 0 },
      ...asSpecs(entries).map((s) => ({ ...s, method: 0 })),
    ]);
    expect((await inspectXlsxZip(bytes)).ok).toBe(true);
  });

  it("يتجاهل (لا يفكّ ولا يمرّر) الوسائط والرسوم ويحتفظ بالجداول", async () => {
    const bytes = withExtra([
      { name: "xl/media/image1.png", data: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 1, 2]) },
      { name: "xl/drawings/drawing1.xml", data: "<xdr/>" },
    ]);
    const r = await inspectXlsxZip(bytes);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.parts.has("xl/media/image1.png")).toBe(false);
    expect(r.parts.has("xl/drawings/drawing1.xml")).toBe(false);
    expect(r.parts.has("xl/worksheets/sheet1.xml")).toBe(true);
  });
});

describe("inspectXlsxZip — الهجمات المقيسة في التدقيق", () => {
  it("رأس مركزي مزوَّر يخفي vbaProject.bin: يخدع الماسح القديم ويُرفض هنا", async () => {
    const { bytes, hiddenName } = buildFakeCentralHeaderXlsx(base());
    // البرهان على أن الهجوم حقيقي: الماسح القديم لا يرى مدخل الماكرو إطلاقًا.
    const legacyNames = legacyScanNames(bytes);
    expect(legacyNames.some((n) => n.includes("vbaproject"))).toBe(false);
    expect(legacyNames.length).toBeGreaterThan(0);
    // الفاحص الجديد يقرأ الدليل الحقيقي تتابعيًّا من نهاية الأرشيف فيجد الماكرو.
    expect(
      readZipEntries(bytes).some((e) => e.name === hiddenName),
      "الملف المبنيّ يحوي مدخل الماكرو فعلًا",
    ).toBe(true);
    await expectReject(bytes, "unsafe", "forbidden_part");
  });

  it("حجم محلي كاذب (٦٥ كيلوبايت ⇒ ١ غيغابايت): الرأس المحلي ≠ المركزي ⇒ مرفوض", async () => {
    const bytes = rewriteXlsx(base(), (entries) =>
      asSpecs(entries).map((s) =>
        s.name === "xl/worksheets/sheet1.xml" ? { ...s, localUsz: 1024 * 1024 * 1024 } : s,
      ),
    );
    expect(bytes.length).toBeLessThan(65 * 1024);
    await expectReject(bytes, "malformed", "local_size_mismatch");
  });

  it("حجم محلي كاذب غير صفري رغم علَم واصف البيانات ⇒ مرفوض أيضًا", async () => {
    const bytes = rewriteXlsx(base(), (entries) =>
      asSpecs(entries).map((s) =>
        s.name === "xl/worksheets/sheet1.xml"
          ? { ...s, descriptor: true, localUsz: 1024 * 1024 * 1024 }
          : s,
      ),
    );
    await expectReject(bytes, "malformed", "local_size_mismatch");
  });

  it("حجم مضغوط محلي كاذب ⇒ مرفوض", async () => {
    const bytes = rewriteXlsx(base(), (entries) =>
      asSpecs(entries).map((s) => (s.name === "xl/workbook.xml" ? { ...s, localCsz: 7 } : s)),
    );
    await expectReject(bytes, "malformed", "local_size_mismatch");
  });

  it("قنبلة deflate بواصف بيانات كاذب (المعلن ١٠٠٠ بايت والحقيقي ٣ ميغابايت) ⇒ يُلغى الفك", async () => {
    const bomb = new Uint8Array(deflateRawSync(new Uint8Array(3 * 1024 * 1024)));
    const bytes = withExtra([
      {
        name: "xl/worksheets/sheet2.xml",
        rawCompressed: bomb,
        descriptor: true,
        declaredUsz: 1000,
      },
    ]);
    expect(bytes.length).toBeLessThan(64 * 1024);
    await expectReject(bytes, "unsafe", "inflate_overflow");
  });

  it("مدخل أقصر من المعلن (واصف كاذب) ⇒ مرفوض", async () => {
    const bytes = withExtra([
      {
        name: "xl/worksheets/sheet2.xml",
        data: "x".repeat(100),
        descriptor: true,
        declaredUsz: 5000,
      },
    ]);
    await expectReject(bytes, "unsafe", "inflate_size_mismatch");
  });

  it("تيار deflate تالف ⇒ مرفوض بلا رمي", async () => {
    const bytes = withExtra([
      {
        name: "xl/worksheets/sheet2.xml",
        rawCompressed: new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff]),
        descriptor: true,
        declaredUsz: 50,
        declaredCsz: 5,
      },
    ]);
    const r = await inspectXlsxZip(bytes);
    expect(r.ok).toBe(false);
  });

  it("نسبة ضغط معلنة ١٠٠٠:١ على مدخلٍ كبير ⇒ قنبلة", async () => {
    const small = new Uint8Array(deflateRawSync(utf8("x")));
    const declared = 30 * 1024 * 1024;
    const bytes = withExtra([
      {
        name: "xl/worksheets/sheet2.xml",
        rawCompressed: small,
        declaredUsz: declared,
        localUsz: declared,
      },
    ]);
    await expectReject(bytes, "unsafe", "ratio");
  });

  it("مدخل معلنٌ فوق السقف ⇒ too_large", async () => {
    const declared = FINN_ZIP_LIMITS.maxEntryBytes + 1;
    const bytes = withExtra([
      {
        name: "xl/worksheets/sheet2.xml",
        rawCompressed: new Uint8Array(1024 * 1024),
        declaredUsz: declared,
        localUsz: declared,
      },
    ]);
    await expectReject(bytes, "too_large", "size_cap");
  });

  it("مجموع الأحجام المعلنة فوق السقف ⇒ too_large", async () => {
    const each = 30 * 1024 * 1024;
    const filler = new Uint8Array(200 * 1024);
    const bytes = withExtra(
      [1, 2, 3].map((i) => ({
        name: `xl/worksheets/big${i}.xml`,
        rawCompressed: filler,
        declaredUsz: each,
        localUsz: each,
      })),
    );
    await expectReject(bytes, "too_large", "size_cap");
  });

  it("عدد المداخل فوق السقف ⇒ too_large", async () => {
    const pads: ZipEntrySpec[] = Array.from({ length: FINN_ZIP_LIMITS.maxEntries + 1 }, (_, i) => ({
      name: `xl/pad/p${i}.xml`,
      data: "",
      method: 0,
    }));
    await expectReject(withExtra(pads), "too_large", "entry_count");
  });

  it("مدخلان متداخلان (رأسٌ مدفون داخل بيانات مدخل آخر) ⇒ مرفوض", async () => {
    await expectReject(buildOverlappingXlsx(base()), "unsafe", "entries_overlap");
  });
});

describe("inspectXlsxZip — الأسماء والبنية", () => {
  const evil = (name: string) => withExtra([{ name, data: "<x/>" }]);

  it.each([
    ["تسلّل ..", "../../evil.xml"],
    ["تسلّل داخل المسار", "xl/../../evil.xml"],
    ["شرطة مائلة عكسية", "xl\\worksheets\\sheet9.xml"],
    ["مسار مطلق", "/etc/passwd.xml"],
    ["حرف قرص", "C:/Windows/evil.xml"],
    ["مقطع فارغ", "xl//evil.xml"],
    ["محرف تحكّم", "xl/evil\u0007.xml"],
    ["بايت NUL", "xl/evil\u0000.xml"],
  ])("اسم غير آمن: %s", async (_label, name) => {
    await expectReject(evil(name), "unsafe", "unsafe_name");
  });

  it("اسم أطول من ٢٥٥ بايتًا ⇒ مرفوض", async () => {
    await expectReject(evil(`xl/${"a".repeat(300)}.xml`), "malformed", "bad_name");
  });

  it("مدخلان بالاسم نفسه ⇒ مرفوض", async () => {
    const bytes = rewriteXlsx(base(), (entries) => [
      ...asSpecs(entries),
      { name: "xl/workbook.xml", data: "<workbook/>" },
    ]);
    await expectReject(bytes, "unsafe", "duplicate_entry");
  });

  it("مدخلان يختلفان بالحالة فقط ⇒ مكرَّر", async () => {
    await expectReject(
      withExtra([{ name: "XL/Workbook.XML", data: "<workbook/>" }]),
      "unsafe",
      "duplicate_entry",
    );
  });

  it("علَم التشفير (مركزي ومحلي) ⇒ مرفوض", async () => {
    const bytes = rewriteXlsx(base(), (entries) =>
      asSpecs(entries).map((s) => (s.name === "xl/workbook.xml" ? { ...s, flags: 0x0001 } : s)),
    );
    await expectReject(bytes, "unsafe", "encrypted");
  });

  it("[Content_Types].xml مفقود ⇒ مرفوض", async () => {
    await expectReject(
      withExtra([], ["[Content_Types].xml"]),
      "malformed",
      "required_part_missing",
    );
  });

  it("xl/workbook.xml مفقود (مستند Word أو غيره بامتداد xlsx) ⇒ مرفوض", async () => {
    await expectReject(withExtra([], ["xl/workbook.xml"]), "malformed", "required_part_missing");
  });

  it("طريقة ضغط غير مدعومة ⇒ مرفوض", async () => {
    const bytes = withExtra([{ name: "xl/worksheets/sheet2.xml", data: "x", method: 9 }]);
    await expectReject(bytes, "malformed", "unsupported_method");
  });

  it("اسم الرأس المحلي ≠ المركزي ⇒ مرفوض", async () => {
    const bytes = withExtra([
      { name: "xl/worksheets/sheet2.xml", data: "<x/>", localName: "xl/worksheets/shEEt2.xml" },
    ]);
    await expectReject(bytes, "malformed", "local_name_mismatch");
  });

  it("علامة ZIP64 (حجم 0xFFFFFFFF) ⇒ too_large", async () => {
    const bytes = withExtra([
      { name: "xl/worksheets/sheet2.xml", data: "<x/>", declaredCsz: 0xffffffff },
    ]);
    await expectReject(bytes, "too_large", "zip64");
  });

  it("بايتات زائدة بعد نهاية الدليل ⇒ مرفوض", async () => {
    const built = buildZip(asSpecs(readZipEntries(base())), { trailing: utf8("JUNKJUNKJUNK") });
    await expectReject(built.bytes, "malformed", "eocd_inconsistent");
  });

  it("توقيع EOCD ثانٍ مدفون في تعليق الأرشيف (التباس عمدي) ⇒ مرفوض", async () => {
    const fakeEocd = concat([0x50, 0x4b, 0x05, 0x06], new Array(18).fill(0), utf8("tail"));
    const built = buildZip(asSpecs(readZipEntries(base())), { comment: fakeEocd });
    await expectReject(built.bytes, "malformed", "eocd_inconsistent");
  });

  it("ليس zip أصلًا / مبتور ⇒ مرفوض", async () => {
    await expectReject(utf8("hello,world\n1,2\n"), "malformed", "not_zip");
    const cut = base().slice(0, base().length - 10);
    const r = await inspectXlsxZip(cut);
    expect(r.ok).toBe(false);
  });
});

describe("inspectXlsxZip — الأجزاء النشِطة والخارجية", () => {
  it.each([
    ["ماكرو vbaProject.bin", "xl/vbaProject.bin"],
    ["ارتباط خارجي", "xl/externalLinks/externalLink1.xml"],
    ["تضمين OLE", "xl/embeddings/oleObject1.bin"],
    ["عنصر ActiveX", "xl/activeX/activeX1.xml"],
    ["ورقة ماكرو", "xl/macrosheets/sheet1.xml"],
    ["خصائص عناصر تحكم", "xl/ctrlProps/ctrlProp1.xml"],
    ["واجهة مخصّصة", "customUI/customUI.xml"],
    ["ملف bin آخر خارج printerSettings", "xl/customProperty1.bin"],
    ["bin بنهاية مموّهة", "xl/other.bin."],
    ["تنفيذي", "xl/tools/setup.exe"],
    ["سكربت", "xl/tools/run.js"],
  ])("%s ⇒ مرفوض", async (_label, name) => {
    await expectReject(withExtra([{ name, data: "x" }]), "unsafe", "forbidden_part");
  });

  it("اسم ماكرو بحالة أحرف مختلفة ⇒ مرفوض", async () => {
    await expectReject(
      withExtra([{ name: "XL/VBAPROJECT.BIN", data: "x" }]),
      "unsafe",
      "forbidden_part",
    );
  });

  it("نوع محتوى macroEnabled (xlsm بامتداد xlsx) ⇒ مرفوض", async () => {
    const bytes = rewriteXlsx(base(), (entries) =>
      asSpecs(entries).map((s) =>
        s.name === "[Content_Types].xml"
          ? {
              ...s,
              data: new TextDecoder()
                .decode(s.data as Bytes)
                .replace(
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml",
                  "application/vnd.ms-excel.sheet.macroEnabled.main+xml",
                ),
            }
          : s,
      ),
    );
    expect(
      new TextDecoder().decode(
        readZipEntries(bytes).find((e) => e.name === "[Content_Types].xml")!.data,
      ),
    ).toContain("macroEnabled");
    await expectReject(bytes, "unsafe", "active_content_type");
  });

  it("علاقة من نوع externalLink في workbook.xml.rels ⇒ مرفوض", async () => {
    const bytes = rewriteXlsx(base(), (entries) =>
      asSpecs(entries).map((s) =>
        s.name === "xl/_rels/workbook.xml.rels"
          ? {
              ...s,
              data: new TextDecoder()
                .decode(s.data as Bytes)
                .replace(
                  "</Relationships>",
                  '<Relationship Id="rId99" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/externalLink" Target="externalLinks/externalLink1.xml"/></Relationships>',
                ),
            }
          : s,
      ),
    );
    await expectReject(bytes, "unsafe", "active_relationship");
  });

  it("رابط تشعبي عادي في العلاقات لا يُرفض", async () => {
    const bytes = rewriteXlsx(base(), (entries) =>
      asSpecs(entries).map((s) =>
        s.name === "xl/_rels/workbook.xml.rels"
          ? {
              ...s,
              data: new TextDecoder()
                .decode(s.data as Bytes)
                .replace(
                  "</Relationships>",
                  '<Relationship Id="rId98" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com/externalLink" TargetMode="External"/></Relationships>',
                ),
            }
          : s,
      ),
    );
    expect((await inspectXlsxZip(bytes)).ok).toBe(true);
  });
});

// ═══ كل قاعدةٍ بمعزل عن شقيقاتها ═════════════════════════════════════════
// تدقيق ٢٠٢٦/١٠/٣١ (التحمير): قواعد كثيرة كانت تُكسى بقاعدةٍ شقيقة تعطي الحكم نفسه على الملفات الحالية،
// فحذفُ إحداها كان يمرّ. هنا لكل قاعدةٍ ملفٌّ لا يردّه إلا هي، وتُقارَن `reason` بالضبط (لا «رُفض» فقط).
describe("inspectXlsxZip — كل قاعدةٍ بمعزل عن شقيقاتها", () => {
  /** كتابة little-endian في أرشيف مبنيّ: [الموضع، العرض بالبايت، القيمة]. */
  const patch = (bytes: Bytes, edits: Array<[number, 2 | 4, number]>): Bytes => {
    const out = bytes.slice();
    for (const [o, size, v] of edits) {
      out[o] = v & 0xff;
      out[o + 1] = (v >>> 8) & 0xff;
      if (size === 4) {
        out[o + 2] = (v >>> 16) & 0xff;
        out[o + 3] = (v >>> 24) & 0xff;
      }
    }
    return out;
  };
  /** أرشيف سليم مبنيّ بمواضع رؤوسه، ومدخل `xl/workbook.xml` هدفًا للتعديل. */
  const built = () => {
    const specs = asSpecs(readZipEntries(base()));
    const zip = buildZip(specs);
    const w = specs.findIndex((s) => s.name === "xl/workbook.xml");
    expect(w).toBeGreaterThanOrEqual(0);
    return {
      ...zip,
      count: specs.length,
      central: zip.centralOffsets[w],
      local: zip.localOffsets[w],
    };
  };

  /** بايتات شبه عشوائية (xorshift) لا تنضغط: نسبة الضغط ≈ 1. */
  const incompressible = (length: number): Bytes => {
    const out = new Uint8Array(length);
    let x = 0x9e3779b9;
    for (let i = 0; i < length; i++) {
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      out[i] = x & 0xff;
    }
    return out;
  };

  it("نسبة ضغط المدخل الواحد وحدها: ميغابايت أصفار بنحو كيلوبايت مضغوطًا ⇒ ratio، ومثله عشوائيًّا يُقبل", async () => {
    const zeros = withExtra([{ name: "xl/worksheets/sheet2.xml", data: new Uint8Array(1 << 20) }]);
    // المجموع الكلي دون ٨ ميغابايت فلا تتدخّل قاعدة المجموع: المدخل وحده هو المردود.
    await expectReject(zeros, "unsafe", "ratio");
    const noise = withExtra([{ name: "xl/worksheets/sheet2.xml", data: incompressible(1 << 20) }]);
    expect((await inspectXlsxZip(noise)).ok).toBe(true);
  });

  it("نسبة المجموع وحدها: عشرون مدخلًا بحجم ٥٠٠ كيلوبايت (دون عتبة المدخل) ⇒ ratio، ومثلها عشوائيةً تُقبل", async () => {
    const each = 500 * 1024; // دون ratioFloorBytes فلا تحكم قاعدة المدخل
    expect(each).toBeLessThan(FINN_ZIP_LIMITS.ratioFloorBytes);
    const zeros = withExtra(
      Array.from({ length: 20 }, (_, i) => ({
        name: `xl/worksheets/big${i}.xml`,
        data: new Uint8Array(each),
      })),
    );
    await expectReject(zeros, "unsafe", "ratio");
    const noise = withExtra(
      Array.from({ length: 20 }, (_, i) => ({
        name: `xl/worksheets/big${i}.xml`,
        data: incompressible(each),
      })),
    );
    expect((await inspectXlsxZip(noise)).ok).toBe(true);
  });

  it.each([
    ["xl/embeddings/embedded.xlsx", "تضمين مصنّف (بلا .bin)"],
    ["xl/embeddings/embedded.docx", "تضمين مستند (بلا .bin)"],
    ["xl/vbaProject.xml", "اسم يحوي vbaproject بلا .bin"],
    ["xl/vbaData.xml", "اسم يحوي vbadata بلا .bin"],
  ])("جزء محظور بقاعدة الاسم وحدها (لا .bin): %s ⇒ forbidden_part — %s", async (name) => {
    await expectReject(withExtra([{ name, data: "<x/>" }]), "unsafe", "forbidden_part");
  });

  it.each([
    [
      "علَم التشفير في الدليل المركزي وحده",
      (b: ReturnType<typeof built>) => [[b.central + 8, 2, 1]],
    ],
    ["علَم التشفير في الرأس المحلي وحده", (b: ReturnType<typeof built>) => [[b.local + 6, 2, 1]]],
    [
      "بتّ التشفير القوي 0x40 في المركزي وحده",
      (b: ReturnType<typeof built>) => [[b.central + 8, 2, 0x40]],
    ],
    [
      "بتّ الترويسة المقنَّعة 0x2000 في المحلي وحده",
      (b: ReturnType<typeof built>) => [[b.local + 6, 2, 0x2000]],
    ],
  ] as Array<[string, (b: ReturnType<typeof built>) => Array<[number, 2 | 4, number]>]>)(
    "%s ⇒ encrypted",
    async (_label, edits) => {
      const b = built();
      await expectReject(patch(b.bytes, edits(b)), "unsafe", "encrypted");
    },
  );

  it("طريقة الرأس المحلي ≠ المركزي ⇒ local_method_mismatch", async () => {
    const b = built();
    // المركزي deflate (8) والمحلي يعلن «مخزَّن» (0).
    await expectReject(patch(b.bytes, [[b.local + 8, 2, 0]]), "malformed", "local_method_mismatch");
  });

  it("مدخل مخزَّن حجمه المضغوط ≠ الأصلي في الرأسين معًا ⇒ local_size_mismatch (قاعدة المركزي وحدها)", async () => {
    // الرأسان متطابقان فلا تردّه مقارنة المحلي بالمركزي؛ ويبقى حدّ البيانات ليتكلّم لو غابت القاعدة.
    const bytes = withExtra([
      {
        name: "xl/worksheets/sheet2.xml",
        data: "x".repeat(50),
        method: 0,
        declaredCsz: 60,
        localCsz: 60,
      },
    ]);
    await expectReject(bytes, "malformed", "local_size_mismatch");
  });

  it.each([
    ["الحجم المضغوط المحلي صفر بلا علَم الواصف", 18],
    ["الحجم الأصلي المحلي صفر بلا علَم الواصف", 22],
  ])("%s ⇒ local_size_mismatch (لا تساهل بلا واصف)", async (_label, field) => {
    const b = built();
    expect(b.bytes[b.local + 6] & 0x08, "المدخل بلا علَم واصف").toBe(0);
    await expectReject(
      patch(b.bytes, [[b.local + field, 4, 0]]),
      "malformed",
      "local_size_mismatch",
    );
  });

  it("حجم الدليل المركزي في EOCD يكذب والتتابع يبلغ نهايته سليمًا ⇒ cd_bounds (قاعدة التجاور وحدها)", async () => {
    const b = built();
    const cdSize = b.eocdOffset - b.cdOffset;
    for (const lie of [cdSize + 4, cdSize - 4]) {
      await expectReject(patch(b.bytes, [[b.eocdOffset + 12, 4, lie]]), "malformed", "cd_bounds");
    }
  });

  it("عدد مداخل EOCD أقلّ من الفعلي (مدخلٌ مركزي زائد مخفيّ) ⇒ cd_bounds (قاعدة بلوغ النهاية وحدها)", async () => {
    const b = built();
    const fewer = b.count - 1;
    await expectReject(
      patch(b.bytes, [
        [b.eocdOffset + 8, 2, fewer],
        [b.eocdOffset + 10, 2, fewer],
      ]),
      "malformed",
      "cd_bounds",
    );
  });

  it.each([
    ["عدد المداخل 0xFFFF في EOCD", "eocd-count"],
    ["حجم الدليل 0xFFFFFFFF في EOCD", "eocd-size"],
    ["موضع الدليل 0xFFFFFFFF في EOCD", "eocd-offset"],
    ["الحجم المضغوط 0xFFFFFFFF في المركزي", "central-csz"],
    ["الحجم الأصلي 0xFFFFFFFF في المركزي", "central-usz"],
    ["موضع الرأس المحلي 0xFFFFFFFF في المركزي", "central-offset"],
    ["الحجم المضغوط 0xFFFFFFFF في المحلي", "local-csz"],
    ["الحجم الأصلي 0xFFFFFFFF في المحلي", "local-usz"],
  ])("علامة ZIP64: %s ⇒ too_large/zip64", async (_label, which) => {
    const b = built();
    const edits: Record<string, Array<[number, 2 | 4, number]>> = {
      "eocd-count": [
        [b.eocdOffset + 8, 2, 0xffff],
        [b.eocdOffset + 10, 2, 0xffff],
      ],
      "eocd-size": [[b.eocdOffset + 12, 4, 0xffffffff]],
      "eocd-offset": [[b.eocdOffset + 16, 4, 0xffffffff]],
      "central-csz": [[b.central + 20, 4, 0xffffffff]],
      "central-usz": [[b.central + 24, 4, 0xffffffff]],
      "central-offset": [[b.central + 42, 4, 0xffffffff]],
      "local-csz": [[b.local + 18, 4, 0xffffffff]],
      "local-usz": [[b.local + 22, 4, 0xffffffff]],
    };
    await expectReject(patch(b.bytes, edits[which]), "too_large", "zip64");
  });
});

/** سقف زمني فضفاض: الأصل ثوانٍ (٢–١٧ ث على هذه الحمولات) والمسح الخطّي أجزاء من المئة مللي ثانية. */
const FAST_MS = 1_000;

// ═══ ReDoS: مسح XML خطّي وسقف الأجزاء الصغيرة (تدقيق ٢٠٢٦/١٠/٣١) ═══════════
// الأصل: `<Override\b[^>]*>` على ٥٢ ألف تكرار لـ`<Override ` ⇒ ٩ ثوانٍ على حلقة الأحداث لملفٍّ من
// ألفي بايت. السقف الزمني فضفاض (١٥٠٠ م.ث) والأصل ثوانٍ؛ والتحقّق الأساسي نتيجةٌ وظيفية.
describe("inspectXlsxZip — ReDoS على أجزاء XML المعادية", () => {
  const LIMIT = FINN_ZIP_LIMITS.maxSmallPartBytes;

  const withPart = (name: string, transform: (xml: string) => string): Bytes =>
    rewriteXlsx(base(), (entries) =>
      asSpecs(entries).map((s) =>
        s.name === name ? { ...s, data: transform(new TextDecoder().decode(s.data as Bytes)) } : s,
      ),
    );

  async function timed(bytes: Bytes) {
    const started = performance.now();
    const result = await inspectXlsxZip(bytes);
    const elapsed = performance.now() - started;
    return { result, elapsed };
  }

  it("٥٢ ألف × '<Override ' في [Content_Types].xml (٥٢٠ كيلوبايت) ⇒ part_oversize فورًا", async () => {
    const hostile = withPart(
      "[Content_Types].xml",
      (xml) => `${xml}${"<Override ".repeat(52_000)}`,
    );
    const { result, elapsed } = await timed(hostile);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect({ error: result.error, reason: result.reason }).toEqual({
        error: "unsafe",
        reason: "part_oversize",
      });
    expect(elapsed, `${Math.round(elapsed)} م.ث`).toBeLessThan(FAST_MS);
  });

  it("٦٠ ألف × '<Relationship ' في workbook.xml.rels و٦٠ ألف × '<sheet ' في workbook.xml ⇒ part_oversize", async () => {
    const rels = withPart(
      "xl/_rels/workbook.xml.rels",
      (xml) => `${xml}${"<Relationship ".repeat(60_000)}`,
    );
    const wb = withPart("xl/workbook.xml", (xml) => `${xml}${"<sheet ".repeat(60_000)}`);
    for (const bytes of [rels, wb]) {
      const { result, elapsed } = await timed(bytes);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("part_oversize");
      expect(elapsed).toBeLessThan(FAST_MS);
    }
  });

  it("السقف حدٌّ لا تقريب: ما دون ٢٥٦ كيلوبايت يُقبل بالحجم، وما فوقه بايتًا واحدًا يُرفض", async () => {
    const exactly = withPart("[Content_Types].xml", (xml) => {
      const filler = LIMIT - new TextEncoder().encode(xml).length - "<!---->".length;
      return xml.replace("</Types>", `<!--${"x".repeat(filler)}--></Types>`);
    });
    const over = withPart("[Content_Types].xml", (xml) => {
      const filler = LIMIT + 1 - new TextEncoder().encode(xml).length - "<!---->".length;
      return xml.replace("</Types>", `<!--${"x".repeat(filler)}--></Types>`);
    });
    expect(readZipEntries(exactly).find((e) => e.name === "[Content_Types].xml")!.data.length).toBe(
      LIMIT,
    );
    expect((await inspectXlsxZip(exactly)).ok).toBe(true);
    await expectReject(over, "unsafe", "part_oversize");
  });

  it("ما دون السقف وعدائيّ الشكل (٢٤ ألف '<Override ' بلا إغلاق في الذيل) يُقبل في زمنٍ خطّي", async () => {
    // الذيل بلا «>» أبدًا: هذا ما يُفشل كل بدايةٍ في التعبير القديم (مع «>» لاحقة يبتلع أول تطابقٍ الجميع).
    const hostile = withPart(
      "[Content_Types].xml",
      (xml) => `${xml}${"<Override ".repeat(24_000)}`,
    );
    expect(
      readZipEntries(hostile).find((e) => e.name === "[Content_Types].xml")!.data.length,
    ).toBeLessThan(LIMIT);
    const { result, elapsed } = await timed(hostile);
    expect(result.ok, "ملف سليم المعنى يمرّ كما كان").toBe(true);
    expect(elapsed, `${Math.round(elapsed)} م.ث`).toBeLessThan(FAST_MS);
  });

  it("الأجزاء الأخرى لا تُسقَّف بهذا الحدّ (علاقات ورقةٍ كثيرة الروابط) ويبقى مسحها خطّيًّا", async () => {
    // قرار موثَّق: السقف على ما تمسحه وظيفتنا (CT/workbook/workbook.rels)؛ علاقات الأوراق تُفحص بتعبير
    // خطّي واحد (ACTIVE_RELATIONSHIP) وقد تكبر مشروعًا بآلاف الروابط التشعبية.
    const links = Array.from(
      { length: 3_000 },
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com/${i}" TargetMode="External"/>`,
    ).join("");
    const hostile = `<Relationships>${links}<!--Type='${"/".repeat(100_000)}--></Relationships>`;
    const bytes = withExtra([{ name: "xl/worksheets/_rels/sheet1.xml.rels", data: hostile }]);
    const { result, elapsed } = await timed(bytes);
    expect(new TextEncoder().encode(hostile).length).toBeGreaterThan(LIMIT);
    expect(result.ok).toBe(true);
    expect(elapsed).toBeLessThan(FAST_MS);
  });

  it("مدخل مكرَّر السمة ContentType: يُرفض إن كانت أيٌّ منها نشِطة، وبادئة x: وحالة الأحرف لا تُفلتان", async () => {
    const MACRO = "application/vnd.ms-excel.sheet.macroEnabled.main+xml";
    const cases = [
      `<Override PartName="/xl/workbook.xml" ContentType="application/xml" ContentType="${MACRO}"/>`,
      `<x:Override PartName="/xl/workbook.xml" ContentType="${MACRO}"/>`,
      `<OVERRIDE PartName="/xl/workbook.xml" CONTENTTYPE='${MACRO}'/>`,
      `<Override PartName="/xl/workbook.xml" ContentType = "${MACRO}"/>`,
    ];
    for (const extra of cases) {
      const bytes = withPart("[Content_Types].xml", (xml) =>
        xml.replace("</Types>", `${extra}</Types>`),
      );
      await expectReject(bytes, "unsafe", "active_content_type");
    }
    // وعنصرٌ عاديّ بنوعٍ بريء لا يُرفض.
    const fine = withPart("[Content_Types].xml", (xml) =>
      xml.replace(
        "</Types>",
        '<Override PartName="/docProps/x.xml" ContentType="application/xml"/></Types>',
      ),
    );
    expect((await inspectXlsxZip(fine)).ok).toBe(true);
  });
});

describe("scanXmlTags / forEachXmlAttr — المسح الخطّي ودلالاته", () => {
  it("يطابق الاسم المحلي كاملًا (لا `<sheets>` ولا `<sheetPr>` عند طلب `sheet`) ويقبل البادئة", () => {
    const xml = '<sheets><sheet name="a"/><x:sheet name="b"/><sheetPr/><sheet-x/></sheets>';
    expect([...scanXmlTags(xml, "sheet")]).toEqual(['<sheet name="a"/>', '<x:sheet name="b"/>']);
  });

  it("حالة الأحرف: حسّاس افتراضيًّا، وبـ ignoreCase يعيد النص صغيرًا", () => {
    expect([...scanXmlTags('<OVERRIDE A="B"/>', "Override")]).toEqual([]);
    expect([...scanXmlTags('<OVERRIDE A="B"/>', "Override", true)]).toEqual(['<override a="b"/>']);
  });

  it("وسم بلا `>` لا يُنتج شيئًا، وأول `>` يُنهي الوسم كما كانت التعابير القديمة", () => {
    expect([...scanXmlTags("<sheet name='a'", "sheet")]).toEqual([]);
    expect([...scanXmlTags('<sheet <sheet a="1">x<sheet b="2">', "sheet")]).toEqual([
      '<sheet <sheet a="1">',
      '<sheet b="2">',
    ]);
  });

  it("السمات: اقتباس مفرد/مزدوج وفراغات حول = وتكرار وبادئة؛ وغير المغلقة تُترك", () => {
    const seen: Array<[string, string]> = [];
    forEachXmlAttr(`<a x = "1" y='2' x="3" 9z="4" f:g.h-i="5" open="no close ok='yes'>`, (n, v) =>
      seen.push([n, v]),
    );
    expect(seen).toEqual([
      ["x", "1"],
      ["y", "2"],
      ["x", "3"],
      ["z", "4"],
      ["f:g.h-i", "5"],
      ["ok", "yes"],
    ]);
  });

  it("زمن خطّي على المدخلات التي كانت تربيعية: ٦٠ ألف وسم ناقص و١٠٠ ألف حرف اسم سمة", () => {
    const started = performance.now();
    expect([...scanXmlTags("<Relationship ".repeat(60_000), "Relationship")]).toEqual([]);
    expect([...scanXmlTags(`${"<sheet ".repeat(60_000)}>`, "sheet")]).toHaveLength(1);
    expect([...scanXmlTags("<Override ".repeat(52_000), "Override", true)]).toEqual([]);
    const count = (tag: string) => {
      let n = 0;
      forEachXmlAttr(tag, () => (n += 1));
      return n;
    };
    expect(count(`<sheet ${"a".repeat(100_000)}/>`)).toBe(0); // جريان اسمٍ بلا «=»
    expect(count(`<sheet ${"a ".repeat(50_000)}/>`)).toBe(0); // أسماء متتالية بلا «=»
    expect(count(`<sheet a="${"b".repeat(100_000)}/>`)).toBe(0); // اقتباس لم يُغلق
    expect(count(`<sheet ${'a="x" '.repeat(20_000)}/>`)).toBe(20_000);
    const elapsed = performance.now() - started;
    expect(elapsed, `${Math.round(elapsed)} م.ث`).toBeLessThan(FAST_MS);
  });
});
