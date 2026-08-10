import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  UNMEASURED_AR,
  ReportRenderError,
  captureChartFromDom,
  formatFixed,
  formatReportCell,
  imageRef,
  pickImageFormat,
  planReport,
  renderReportPdf,
  reportLineSegments,
  resolveReportImages,
  type ChartBlock,
  type LayoutPlan,
  type MeasureFn,
  type PlannedItem,
  type ReportDocument,
  type ResolvedImage,
} from "./pdf-rich";

/** قياس صناعي: عرضٌ خطّي بطول النص — يجعل التخطيط حتميًّا في الاختبار. */
const measure: MeasureFn = (text, size, bold) => text.length * size * (bold ? 0.58 : 0.5);

/** PNG شفافة 1×1 — أصغر حمولة صالحة تقبلها pdf-lib. */
const PNG_1x1 =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk" +
  "+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const textItems = (plan: LayoutPlan) =>
  plan.pages.map((p) =>
    p.items.filter((i): i is Extract<PlannedItem, { type: "text" }> => i.type === "text"),
  );

const chartImage = (ref: string): ResolvedImage => ({
  ref,
  dataUrl: PNG_1x1,
  format: "png",
  pixelWidth: 1200,
  pixelHeight: 600,
});

function sampleDoc(overrides: Partial<ReportDocument> = {}): ReportDocument {
  return {
    title: "التقرير التنفيذي للأمن الصناعي",
    subtitle: "ملخّص الأداء ومؤشرات الامتثال",
    org: "إدارة الأمن الصناعي",
    dateKey: "2026-08-09",
    isSimulation: true,
    sections: [
      {
        title: "الملخّص التنفيذي",
        blocks: [
          { kind: "prose", text: "أداء الفترة ضمن الحدود المعتمدة مع ملاحظتين على التصاريح." },
          {
            kind: "kpi-grid",
            items: [
              { label: "البلاغات", value: 42 },
              { label: "أوامر العمل", value: 17 },
              { label: "أداء SLA", value: null, unit: "%" },
            ],
          },
          {
            kind: "callout",
            tone: "warning",
            title: "تصاريح متأخرة",
            text: "ثلاثة تصاريح تجاوزت المهلة.",
          },
        ],
      },
      {
        title: "المؤشرات التفصيلية",
        blocks: [
          {
            kind: "table",
            title: "توزيع البلاغات",
            columns: [
              { header: "الإدارة", key: "dept", weight: 2 },
              { header: "العدد", key: "count" },
              { header: "الاستجابة", key: "resp", digits: 1, unit: "د" },
            ],
            rows: [
              { dept: "التشغيل", count: 12, resp: 8.25 },
              { dept: "الصيانة", count: 0, resp: null },
            ],
          },
          {
            kind: "chart",
            title: "الاتجاه الزمني",
            elementId: "chart-trend",
            caption: "آخر 14 يومًا",
          },
        ],
      },
      {
        title: "المرفقات",
        blocks: [
          { kind: "figure", title: "موقع الحادثة", src: PNG_1x1, photographic: true, aspect: 1.5 },
        ],
      },
    ],
    ...overrides,
  };
}

/* ═════════════ المادة ٢٧ — «لم يُقَس» لا صفرًا ولا فراغًا ═════════════ */

describe("formatReportCell — المادة ٢٧", () => {
  it("يطبع «لم يُقَس» لكل صور الغياب", () => {
    expect(formatReportCell(null)).toBe(UNMEASURED_AR);
    expect(formatReportCell(undefined)).toBe(UNMEASURED_AR);
    expect(formatReportCell("")).toBe(UNMEASURED_AR);
    expect(formatReportCell("   ")).toBe(UNMEASURED_AR);
    expect(formatReportCell(Number.NaN)).toBe(UNMEASURED_AR);
    expect(formatReportCell(Number.POSITIVE_INFINITY)).toBe(UNMEASURED_AR);
    expect(formatReportCell({ value: null, digits: 2, unit: "%" })).toBe(UNMEASURED_AR);
  });

  it("لا يستبدل الصفر بالغياب — الصفر قيمة مقيسة", () => {
    expect(formatReportCell(0)).toBe("0");
    expect(formatReportCell(0, { digits: 2 })).toBe("0.00");
    expect(formatReportCell(0, { unit: "%" })).toBe("0%");
    expect(formatReportCell(0)).not.toBe(UNMEASURED_AR);
  });

  it("لا يعيد نصًّا فارغًا مهما كان المدخل", () => {
    const inputs = [null, undefined, "", "  ", Number.NaN, 0, -0, 12.5, "نص"];
    for (const input of inputs) {
      expect(formatReportCell(input as never).length).toBeGreaterThan(0);
    }
  });

  it("يثبّت الخانات العشرية ويجمّع الآلاف", () => {
    expect(formatFixed(1234.5, 2)).toBe("1,234.50");
    expect(formatFixed(1234.5, 0)).toBe("1,235");
    expect(formatFixed(7, 3)).toBe("7.000");
    expect(formatFixed(-1234.5, 1)).toBe("-1,234.5");
    expect(formatFixed(-0.001, 2)).toBe("0.00"); // لا «‎-0.00»
    expect(formatFixed(1234567, 0)).toBe("1,234,567");
  });

  it("يلحق الوحدة: % بلا فراغ وغيرها بفراغ", () => {
    expect(formatReportCell(96.5, { digits: 1, unit: "%" })).toBe("96.5%");
    expect(formatReportCell(8, { unit: "د" })).toBe("8 د");
  });

  it("الخلية غير المقيسة في الجدول تُطبع «لم يُقَس» بلون مخفّف لا فراغ", () => {
    const doc = sampleDoc({ isSimulation: false });
    const plan = planReport(doc, { measure });
    const all = textItems(plan).flat();
    const unmeasured = all.filter((i) => i.text === UNMEASURED_AR);
    // خليّة SLA في شبكة المؤشرات + خليّة الاستجابة في الجدول.
    expect(unmeasured.length).toBe(2);
    expect(unmeasured.every((i) => i.tone === "muted" || i.tone === "cyan")).toBe(true);
    // ولا خليّة صفرية تحوّلت إلى غياب: «0» موجود كما هو.
    expect(all.some((i) => i.text === "0")).toBe(true);
  });
});

/* ═════════════════ العربية — المعالجة المعتمدة وحدها ═════════════════ */

describe("المعالجة العربية — تمرّ من layoutArabicLine حصرًا", () => {
  it("يشكّل الحروف إلى أشكال العرض ويرتّب المقاطع بصريًّا", () => {
    const segs = reportLineSegments("تقرير SEC-18 اليومي");
    expect(segs.some((s) => /[\uFE70-\uFEFF]/.test(s.text))).toBe(true);
    expect(segs.find((s) => !s.ar)?.text).toContain("SEC-18");
    // اتجاه أساسي RTL: أول كلمة منطقية تُوضع آخِرًا (أقصى اليمين).
    expect(segs[segs.length - 1]!.ar).toBe(true);
  });

  it("لا يعكس محتوى المقطع العربي مسبقًا (fontkit يملك العكس)", () => {
    // «نور» منطقيًّا يبدأ بـ ن ابتدائية FEE7؛ المعكوس مسبقًا يبدأ بـ FEAD.
    const segs = reportLineSegments("نور");
    expect(segs[0]!.text.codePointAt(0)).toBe(0xfee7);
  });

  it("النصوص المخطّطة تُحفظ بترتيبها المنطقي (التشكيل يقع عند الرسم)", () => {
    const plan = planReport(sampleDoc(), { measure });
    const titles = textItems(plan)
      .flat()
      .map((i) => i.text);
    expect(titles).toContain("الملخّص التنفيذي");
    // لا أشكال عرض مسرّبة إلى الخطّة — لا معالجة مزدوجة.
    expect(titles.some((t) => /[\uFE70-\uFEFF]/.test(t))).toBe(false);
  });
});

/* ═══════════════════ ترتيب الأقسام والكتل والفهرس ═══════════════════ */

describe("planReport — الترتيب والفهرس وترقيم الصفحات", () => {
  it("يحفظ ترتيب الأقسام والكتل كما ورد في المستند", () => {
    const doc = sampleDoc();
    const plan = planReport(doc, { measure });
    const expected = doc.sections.flatMap((s, si) =>
      s.blocks.map((b, bi) => `${si}.${bi}:${b.kind}`),
    );
    const actual = plan.placements.map((p) => `${p.sectionIndex}.${p.blockIndex}:${p.kind}`);
    expect(actual).toEqual(expected);
  });

  it("الكتل تتقدّم في المستند: الصفحة ثم الإحداثي لا يرتدّان للخلف", () => {
    const plan = planReport(sampleDoc(), { measure });
    for (let i = 1; i < plan.placements.length; i += 1) {
      const prev = plan.placements[i - 1]!;
      const cur = plan.placements[i]!;
      expect(cur.page).toBeGreaterThanOrEqual(prev.page);
      if (cur.page === prev.page) expect(cur.y).toBeLessThanOrEqual(prev.y);
    }
  });

  it("يبني فهرسًا بمدخل لكل قسم وبأرقام صفحات بعد الغلاف والفهرس", () => {
    const doc = sampleDoc();
    const plan = planReport(doc, { measure });
    expect(plan.outline.map((e) => e.title)).toEqual(doc.sections.map((s) => s.title));
    for (const entry of plan.outline) {
      expect(entry.page).toBeGreaterThanOrEqual(3); // غلاف(1) + فهرس(2) على الأقل
      expect(entry.page).toBeLessThanOrEqual(plan.pages.length);
    }
    // الفهرس نفسه مرسوم: عنوانه وأرقامه موجودة على الصفحة الثانية.
    const toc = textItems(plan)[1]!.map((i) => i.text);
    expect(toc).toContain("المحتويات");
    for (const entry of plan.outline) expect(toc).toContain(entry.title);
    for (const entry of plan.outline) expect(toc).toContain(String(entry.page));
  });

  it("يرقّم كل صفحة بصيغة «الحالية / الإجمالي»", () => {
    const plan = planReport(sampleDoc(), { measure });
    plan.pages.forEach((p, i) => {
      const labels = p.items
        .filter((it): it is Extract<PlannedItem, { type: "text" }> => it.type === "text")
        .map((it) => it.text);
      expect(labels).toContain(`${i + 1} / ${plan.pages.length}`);
    });
  });

  it("يلفّ النصّ الطويل ضمن عرض العمود بدل أن يفيض", () => {
    const long = "كلمة ".repeat(200).trim();
    const plan = planReport(
      {
        title: "ت",
        isSimulation: false,
        sections: [{ title: "قسم", blocks: [{ kind: "prose", text: long }] }],
      },
      { measure },
    );
    const contentW = plan.pageWidth - 44 * 2;
    const proseLines = textItems(plan)
      .flat()
      .filter((i) => i.size === 10.5);
    expect(proseLines.length).toBeGreaterThan(5);
    for (const line of proseLines) {
      expect(measure(line.text, 10.5, false)).toBeLessThanOrEqual(contentW);
    }
  });
});

/* ═══════════════════════ الجداول والانكسار ═══════════════════════ */

describe("الجداول — محاذاة يمينًا وترويسة متكرّرة", () => {
  const bigTableDoc = (rows: number): ReportDocument => ({
    title: "جدول طويل",
    isSimulation: false,
    sections: [
      {
        title: "قسم الجدول",
        blocks: [
          {
            kind: "table",
            title: "سجل مطوّل",
            columns: [
              { header: "المرجع", key: "ref" },
              { header: "القيمة", key: "value", digits: 2 },
            ],
            rows: Array.from({ length: rows }, (_, i) => ({ ref: `REF-${i}`, value: i })),
          },
        ],
      },
    ],
  });

  it("يكرّر ترويسة الجدول على كل صفحة يمتدّ إليها", () => {
    const plan = planReport(bigTableDoc(300), { measure });
    const pagesWithRows = new Set<number>();
    const pagesWithHeader = new Set<number>();
    plan.pages.forEach((p, i) => {
      for (const item of p.items) {
        if (item.type !== "text") continue;
        if (/^REF-\d+$/.test(item.text)) pagesWithRows.add(i);
        if (item.text === "المرجع") pagesWithHeader.add(i);
      }
    });
    expect(pagesWithRows.size).toBeGreaterThan(2); // فعلًا انكسر
    for (const p of pagesWithRows) expect(pagesWithHeader.has(p)).toBe(true);
  });

  it("لا يرسم صفًّا تحت خطّ التذييل", () => {
    const plan = planReport(bigTableDoc(300), { measure });
    const rowCells = textItems(plan)
      .flat()
      .filter((i) => /^REF-\d+$/.test(i.text));
    expect(rowCells.length).toBe(300);
    for (const cell of rowCells) expect(cell.y).toBeGreaterThanOrEqual(56);
  });

  it("يحاذي الأعمدة يمينًا بترتيب RTL: العمود الأول عند الحافة اليمنى", () => {
    const plan = planReport(bigTableDoc(2), { measure });
    const all = textItems(plan).flat();
    const first = all.find((i) => i.text === "المرجع")!;
    const second = all.find((i) => i.text === "القيمة")!;
    expect(first.rightX).toBeGreaterThan(second.rightX);
    expect(first.rightX).toBeLessThanOrEqual(plan.pageWidth - 44);
    // خلايا الصف تشترك مع ترويستها في نفس الحافة اليمنى.
    const cell = all.find((i) => i.text === "REF-0")!;
    expect(cell.rightX).toBeCloseTo(first.rightX, 5);
  });

  it("الأرقام بخانات ثابتة داخل العمود", () => {
    const plan = planReport(bigTableDoc(3), { measure });
    const values = textItems(plan)
      .flat()
      .filter((i) => /^\d+\.\d+$/.test(i.text))
      .map((i) => i.text);
    expect(values.slice(0, 3)).toEqual(["0.00", "1.00", "2.00"]);
  });
});

/* ═══════════════════════ شارة المحاكاة ═══════════════════════ */

describe("شارة المحاكاة — على كل صفحة، بلا خيار إلغاء", () => {
  const isWatermark = (item: PlannedItem) =>
    item.type === "text" && item.text === "محاكاة" && item.rotate === 45;
  const isStrip = (item: PlannedItem) =>
    item.type === "text" && item.text.includes("is_simulation = true");

  it("تُطبع على كل صفحة بلا استثناء (بما فيها الغلاف والفهرس)", () => {
    const plan = planReport(sampleDoc({ isSimulation: true }), { measure });
    expect(plan.pages.length).toBeGreaterThan(2);
    for (const page of plan.pages) {
      expect(page.items.some(isWatermark)).toBe(true);
      expect(page.items.some(isStrip)).toBe(true);
    }
  });

  it("لا تظهر حين البيانات حيّة", () => {
    const plan = planReport(sampleDoc({ isSimulation: false }), { measure });
    for (const page of plan.pages) {
      expect(page.items.some(isWatermark)).toBe(false);
      expect(page.items.some(isStrip)).toBe(false);
    }
  });

  it("لا يُسقطها أي مدخل في سياق التخطيط", () => {
    const doc = sampleDoc({ isSimulation: true });
    const contexts = [
      { measure },
      { measure, pageWidth: 400, pageHeight: 600 },
      { measure, margin: 10 },
      { measure, images: new Map<string, ResolvedImage>() },
    ];
    for (const ctx of contexts) {
      const plan = planReport(doc, ctx);
      expect(plan.pages.every((p) => p.items.some(isWatermark))).toBe(true);
    }
  });
});

/* ═══════════════════ التنبيهات — فرقٌ لا يقوم على اللون ═══════════════════ */

describe("التنبيهات — خطر/تحذير يفترقان في الشكل والشارة والنص", () => {
  const build = (tone: "danger" | "warning") =>
    planReport(
      {
        title: "ت",
        isSimulation: false,
        sections: [{ title: "ق", blocks: [{ kind: "callout", tone, text: "نص" }] }],
      },
      { measure },
    );

  it("لكل نبرة شكلها وشارتها ولونها", () => {
    const danger = build("danger");
    const warning = build("warning");
    const shapeOf = (plan: LayoutPlan) =>
      plan.pages.flatMap((p) => p.items).find((i) => i.type === "shape" && i.scale === 0.62);
    const dShape = shapeOf(danger);
    const wShape = shapeOf(warning);
    expect(dShape).toBeDefined();
    expect(wShape).toBeDefined();
    // شكل مختلف (مثمّن مقابل مثلث) ولون مختلف.
    expect((dShape as { path: string }).path).not.toBe((wShape as { path: string }).path);
    expect((dShape as { tone: string }).tone).not.toBe((wShape as { tone: string }).tone);
    // شارة نصّية مختلفة — اللون وحده لا يكفي (WCAG 2.2 §1.4.1).
    const texts = (plan: LayoutPlan) =>
      textItems(plan)
        .flat()
        .map((i) => i.text);
    expect(texts(danger)).toContain("خطر");
    expect(texts(warning)).toContain("تحذير");
  });
});

/* ═══════════════════ الرسوم البيانية والصور ═══════════════════ */

describe("الرسوم البيانية — التقاط من DOM أو خطأ صريح", () => {
  const chartBlock: ChartBlock = { kind: "chart", elementId: "chart-trend", title: "الاتجاه" };

  /** ينفّذ الالتقاط ويعيد الخطأ المرمي — ويفشل إن لم يُرمَ خطأ أصلًا. */
  const captureError = async (options: Parameters<typeof captureChartFromDom>[1]) => {
    try {
      await captureChartFromDom(chartBlock, options);
    } catch (error) {
      expect(error).toBeInstanceOf(ReportRenderError);
      return error as ReportRenderError;
    }
    throw new Error("توقّعنا خطأً صريحًا ولم يقع");
  };

  it("بلا DOM (تصدير من الخادم) يرمي خطأً عربيًّا صريحًا لا PDF ناقصًا", async () => {
    await expect(
      captureChartFromDom(chartBlock, { getDocument: () => null }),
    ).rejects.toMatchObject({ name: "ReportRenderError", code: "no-dom" });
    const error = await captureError({ getDocument: () => null });
    expect(error.message).toContain("المتصفّح");
    expect(error.message).not.toMatch(/undefined|null|Error|document/i);
  });

  it("عنصر مفقود على الصفحة يرمي خطأً يسمّي المعرّف", async () => {
    const error = await captureError({ getDocument: () => document });
    expect(error.code).toBe("chart-element-missing");
    expect(error.message).toContain("chart-trend");
  });

  it("فشل الالتقاط يُوقف التصدير كلّه — لا PDF صامت ناقص", async () => {
    const doc = sampleDoc();
    await expect(renderReportPdf(doc, { getDocument: () => null })).rejects.toBeInstanceOf(
      ReportRenderError,
    );
  });

  it("يحترم نسبة أبعاد اللقطة عند الإدراج ولا يتجاوز الارتفاع الأقصى", () => {
    const ref = imageRef("chart", 1, 1);
    const images = new Map<string, ResolvedImage>([[ref, chartImage(ref)]]);
    const plan = planReport(sampleDoc({ isSimulation: false }), { measure, images });
    const image = plan.pages
      .flatMap((p) => p.items)
      .find((i) => i.type === "image" && i.ref === ref);
    expect(image).toBeDefined();
    const { width, height, x } = image as { width: number; height: number; x: number };
    // 1200×600 ⇒ نسبة 2 محفوظة، والارتفاع مقصوص عند سقف 240 بتقليص العرض
    // لا بتمطيط الصورة.
    expect(width / height).toBeCloseTo(2, 5);
    expect(height).toBeLessThanOrEqual(240);
    expect(width).toBeLessThanOrEqual(plan.pageWidth - 44 * 2);
    // RTL: الصورة مثبّتة على الحافة اليمنى للمحتوى.
    expect(x + width).toBeCloseTo(plan.pageWidth - 44, 5);
  });

  it("لا يدرج صورة لكتلة لم تُلتقط (لا مستطيل فارغ يُسمّى رسمًا)", () => {
    const plan = planReport(sampleDoc({ isSimulation: false }), { measure });
    expect(plan.pages.flatMap((p) => p.items).some((i) => i.type === "image")).toBe(false);
  });

  it("يختار PNG للرسوم وJPEG لإعادة ترميز الصور الفوتوغرافية", () => {
    expect(pickImageFormat(PNG_1x1)).toEqual({ format: "png", reencode: false });
    expect(pickImageFormat(PNG_1x1, true)).toEqual({ format: "jpeg", reencode: true });
    expect(pickImageFormat("data:image/jpeg;base64,AAAA", true)).toEqual({
      format: "jpeg",
      reencode: false,
    });
    expect(() => pickImageFormat("data:image/webp;base64,AAAA")).toThrow(ReportRenderError);
  });

  it("يجمع صور المستند تحت مفاتيح مستقرّة", async () => {
    const images = await resolveReportImages(sampleDoc(), {
      captureChart: async (_block, ref) => chartImage(ref),
    });
    expect([...images.keys()].sort()).toEqual(["chart:1.1", "figure:2.0"]);
    expect(images.get("chart:1.1")!.format).toBe("png");
  });
});

/* ═══════════════════ التكامل — ملف PDF حقيقي ═══════════════════ */

describe("renderReportPdf — إخراج فعلي", () => {
  const fontsPromise = Promise.all([
    readFile(resolve(process.cwd(), "public/fonts/nexios-arabic.ttf")),
    readFile(resolve(process.cwd(), "public/fonts/nexios-arabic-bold.ttf")),
  ]);

  it("ينتج Blob من نوع application/pdf يبدأ بـ%PDF- وينتهي بـ%%EOF", async () => {
    const [regular, bold] = await fontsPromise;
    const blob = await renderReportPdf(sampleDoc(), {
      fonts: { regular, bold },
      captureChart: async (_b, ref) => chartImage(ref),
    });
    expect(blob.type).toBe("application/pdf");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(10_000);
    expect(new TextDecoder("latin1").decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(new TextDecoder("latin1").decode(bytes.slice(-32))).toContain("%%EOF");
  });

  it("يرسم العربية بالخط العربي لا بـHelvetica (وإلا لفشل الترميز أصلًا)", async () => {
    // pdf-lib يرمي «WinAnsi cannot encode» لو مرّ حرفٌ عربي على Helvetica،
    // فنجاح التوليد بمستندٍ عربيّ بالكامل هو الإثبات التنفيذي للتوجيه.
    const [regular, bold] = await fontsPromise;
    const arabicOnly: ReportDocument = {
      title: "تقرير عربي بالكامل",
      isSimulation: true,
      sections: [
        {
          title: "قسم عربي",
          blocks: [
            { kind: "prose", text: "جملة عربية طويلة نسبيًّا للتأكد من اللفّ والرسم معًا." },
            { kind: "callout", tone: "danger", title: "إنذار", text: "نصّ إنذار عربي." },
          ],
        },
      ],
    };
    await expect(renderReportPdf(arabicOnly, { fonts: { regular, bold } })).resolves.toBeInstanceOf(
      Blob,
    );
  });

  it("لا يضخّم الملف: تقرير بثلاثة أقسام يبقى دون 400 كيلوبايت", async () => {
    const [regular, bold] = await fontsPromise;
    const blob = await renderReportPdf(sampleDoc(), {
      fonts: { regular, bold },
      captureChart: async (_b, ref) => chartImage(ref),
    });
    expect(blob.size).toBeLessThan(400_000);
  });
});
