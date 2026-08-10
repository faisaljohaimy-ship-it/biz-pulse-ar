/**
 * تصدير التقرير إلى مصنّف Excel — ورقة لكل قسم، وجداول التقرير **صفوفًا
 * حقيقية** لا صورة، وسلاسل كل رسم في ورقة بيانات مستقلّة يستطيع المستخدم
 * إعادة رسمها بنفسه.
 *
 * ــ ثلاثة قرارات تُقرأ قبل التعديل ــ
 *
 * ① **`xlsx` تُستورد ديناميكيًّا.** الميزانية ٩٫٦٨ من ١٠ ميغابايت
 *    والمتبقّي ٣٢٠ كيلوبايت، و`xlsx` وحدها تتجاوزه. الاستيراد داخل الدالة
 *    يُبقيها في قطعة منفصلة لا تُحمَّل إلّا عند الضغط على «تصدير» — وهو
 *    النمط نفسه في `bi-pdf.ts` مع `pdf-lib`.
 *
 * ② **التخطيط منفصل عن التسلسل.** `planReportWorkbook` دالة خالصة تُنتج
 *    صفوف كل ورقة وعروض أعمدتها بلا أي تبعية، و`buildReportXlsx` تُسلسلها.
 *    الفائدة ليست تجميلية: حارس المادة ٢٧ يفحص الخلايا نفسها، لا بايتات
 *    مضغوطة يصعب استنطاقها.
 *
 * ③ **RTL على مستوى المصنّف، وهذا ما يصل الملف فعلًا.** نصّ المهمّة يطلب
 *    `Views: [{RTL: true}]` «على كل ورقة»، وقارئ كاتب `@e965/xlsx@0.20.3`
 *    يجد أن `!views` على مستوى الورقة **لا وجود له في مسار الكتابة أصلًا**
 *    (`grep '!views' xlsx.mjs` = صفر)، وأن `write_ws_xml_sheetviews` يقرأ
 *    `wb.Workbook.Views[0].RTL` ثم يكتب `rightToLeft="1"` **داخل كل ورقة
 *    على حدة**. فالمطلوب يتحقّق حرفيًّا في الملف الناتج من مفتاحٍ واحد،
 *    ويثبته الاختبار بعدّ `rightToLeft="1"` في البايتات = عدد الأوراق —
 *    لا بقراءة الحقل الذي كتبناه بأنفسنا.
 */
import {
  ALL_REGIONS_AR,
  UNMEASURED_AR,
  isUnmeasured,
  periodLabelAr,
  simulationLabelAr,
  type ChartBlock,
  type ReportBlock,
  type ReportCellValue,
  type ReportDocument,
  type ReportSection,
} from "./report-document.types";

/**
 * خليّة مخطَّطة. **لا `null` ولا `undefined` ولا نصّ فارغ** — هذا هو
 * الثابت الذي يقوم عليه صدق المصنّف، ويحرسه اختبار صريح.
 */
export type SheetCell = string | number | boolean;

export type SheetPlan = {
  /** اسم الورقة بعد التنقية والتفريد (≤ ٣١ محرفًا). */
  name: string;
  /** صفوف الورقة؛ الصف الفارغ `[]` فاصل بنيوي لا خليّة فارغة. */
  rows: SheetCell[][];
  /** عرض كل عمود بوحدة `wch`. */
  colWidths: number[];
};

const ABOUT_SHEET_AR = "عن هذا التقرير";

/** «لا ينطبق» — تسمية حقلٍ لا محلّ له، وهي غير «لم يُقَس» بالمعنى. */
const NOT_APPLICABLE_AR = "—";

const TONE_AR: Record<string, string> = {
  info: "إفادة",
  success: "سليم",
  warning: "تحذير",
  danger: "خطر",
};

const CHART_TYPE_AR: Record<ChartBlock["chartType"], string> = {
  bar: "أعمدة",
  line: "خطّي",
  pie: "قطاعات",
};

/* ────────────────────────────── أسماء الأوراق ───────────────────────── */

/**
 * Excel يرفض `[ ] : * ? / \` في اسم الورقة، ويقطع ما جاوز ٣١ محرفًا،
 * ويرفض التكرار — وأيٌّ من الثلاثة يُفشل فتح الملف لا مجرّد يُشوّه اسمًا.
 * والقطع يقع **قبل** التفريد كي لا تتساوى ورقتان بعد القطع.
 */
function sanitizeSheetName(raw: string): string {
  const cleaned = raw
    .replace(/[[\]:*?/\\]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^'+|'+$/g, "")
    .trim();
  return cleaned.slice(0, 31).trim() || "ورقة";
}

function makeNameAllocator(): (raw: string) => string {
  const taken = new Set<string>();
  return (raw: string) => {
    const base = sanitizeSheetName(raw);
    if (!taken.has(base)) {
      taken.add(base);
      return base;
    }
    for (let n = 2; n < 1000; n++) {
      const suffix = `~${n}`;
      const candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
      if (!taken.has(candidate)) {
        taken.add(candidate);
        return candidate;
      }
    }
    /* عمليًّا لا يُبلَغ: ٩٩٨ ورقة بالاسم نفسه. */
    const fallback = `ورقة ${taken.size + 1}`;
    taken.add(fallback);
    return fallback;
  };
}

/* ────────────────────────────── الخلايا ─────────────────────────────── */

const NUMERIC_TEXT = /^-?\d+(?:[.,]\d+)?$/;

/**
 * تحويل قيمة التقرير إلى خليّة.
 *
 * ثلاثة مداخل تنتهي كلّها إلى «لم يُقَس»: `null`/`undefined`، والعدد غير
 * المنتهي (`NaN` من قسمة على صفر)، **والنصّ الفارغ**. الثالث هو الأخطر
 * لأنّه يمرّ من كل فحص نوعي: `""` تصل `aoa_to_sheet` فتصير خليّة بلا قيمة،
 * وتلك تُحسب صفرًا في `AVERAGE` — فيهبط المتوسط بمقدار ما لم يُقَس أصلًا.
 */
export function toSheetCell(value: ReportCellValue, numeric = false): SheetCell {
  if (isUnmeasured(value)) return UNMEASURED_AR;
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  const text = String(value).trim();
  if (text === "") return UNMEASURED_AR;
  /* عمود أُعلن رقميًّا: يُكتب رقمًا كي تعمل عليه دوال Excel، لا نصًّا
     يبدو رقمًا ويُفشل كل `SUM`. والتحويل يقع على المطابقة التامّة وحدها. */
  if (numeric && NUMERIC_TEXT.test(text)) {
    const parsed = Number(text.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return text;
}

/* ─────────────────────────── عروض الأعمدة ───────────────────────────── */

const ARABIC_LETTER = /[؀-ۿݐ-ݿ]/;

/**
 * عرض الخليّة بوحدة `wch` (عدد المحارف). المحرف العربي أعرض من اللاتيني
 * في خطوط Excel الافتراضية، فيُحسب بمعامل ١٫١٥ — وإلّا انقطعت العناوين
 * العربية خلف حدّ العمود وظهر التقرير مبتورًا.
 */
function cellWidth(cell: SheetCell): number {
  const text = typeof cell === "number" ? String(cell) : String(cell);
  let width = 0;
  for (const ch of text) width += ARABIC_LETTER.test(ch) ? 1.15 : 1;
  return width;
}

function computeColWidths(rows: SheetCell[][]): number[] {
  const widest: number[] = [];
  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      widest[c] = Math.max(widest[c] ?? 0, cellWidth(row[c]));
    }
  }
  return widest.map((w) => Math.min(52, Math.max(12, Math.round(w) + 3)));
}

/* ────────────────────────────── الأوراق ─────────────────────────────── */

function buildAboutSheet(doc: ReportDocument, sectionSheetNames: string[]): SheetPlan {
  const { header } = doc;
  const rows: SheetCell[][] = [[ABOUT_SHEET_AR], [], ["العنوان", header.title]];
  if (header.subtitle?.trim()) rows.push(["الوصف", header.subtitle.trim()]);
  if (header.scopeAr?.trim()) rows.push(["النطاق", header.scopeAr.trim()]);
  rows.push(
    ["الفترة", periodLabelAr(header.period)],
    ["من", toSheetCell(header.period.fromIso)],
    ["إلى", toSheetCell(header.period.toIso)],
    /* المنطقة الغائبة ليست قياسًا غائبًا — التقرير حينها على مستوى المملكة. */
    ["المنطقة", header.region ? header.region.labelAr : ALL_REGIONS_AR],
    ["معرّف المنطقة", header.region ? header.region.id : ALL_REGIONS_AR],
    ["تاريخ الإصدار", toSheetCell(header.generatedAtIso)],
    /* وسم المحاكاة صريح، لا مستنتَجًا من غياب سطر. */
    ["وسم البيانات", simulationLabelAr(header.isSimulation)],
    [],
    ["ملاحظة", `الخليّة المكتوب فيها «${UNMEASURED_AR}» لم تُقَس — وليست صفرًا.`],
    /* لا خليّة فارغة تُستعمل إزاحةً: الفراغ نفسه هو ما يحرسه هذا الملف. */
    ["تحذير", "استبعدها قبل أي متوسط أو رسم؛ الخليّة الفارغة تُحسب صفرًا وهذه لا."],
    [],
    ["الأقسام", "الورقة"],
  );
  doc.sections.forEach((section, i) => {
    rows.push([section.title, sectionSheetNames[i] ?? NOT_APPLICABLE_AR]);
  });
  return { name: ABOUT_SHEET_AR, rows, colWidths: computeColWidths(rows) };
}

/** صفوف كتلة واحدة داخل ورقة قسمها. */
function blockRows(block: ReportBlock, chartSheetName: string | null): SheetCell[][] {
  switch (block.kind) {
    case "prose": {
      const rows: SheetCell[][] = [];
      if (block.title?.trim()) rows.push([block.title.trim()]);
      for (const p of block.paragraphs) {
        const cell = toSheetCell(p);
        if (cell !== UNMEASURED_AR) rows.push([cell]);
      }
      return rows;
    }
    case "kpi-grid": {
      const rows: SheetCell[][] = [[block.title?.trim() || "المؤشرات"]];
      rows.push(["المؤشر", "القيمة", "الوحدة", "التغيّر %"]);
      for (const item of block.items) {
        rows.push([
          toSheetCell(item.label),
          toSheetCell(item.value),
          item.unit?.trim() ? item.unit.trim() : NOT_APPLICABLE_AR,
          toSheetCell(item.deltaPct),
        ]);
      }
      return rows;
    }
    case "table": {
      const rows: SheetCell[][] = [];
      if (block.title?.trim()) rows.push([block.title.trim()]);
      rows.push(block.columns.map((col) => toSheetCell(col.label)));
      for (const row of block.rows) {
        rows.push(block.columns.map((col) => toSheetCell(row[col.key], col.numeric)));
      }
      if (block.footnote?.trim()) rows.push([block.footnote.trim()]);
      return rows;
    }
    case "chart": {
      const rows: SheetCell[][] = [[block.title?.trim() || "رسم بياني"]];
      rows.push(["نوع الرسم", CHART_TYPE_AR[block.chartType]]);
      rows.push(["الوحدة", block.unit?.trim() ? block.unit.trim() : NOT_APPLICABLE_AR]);
      /* الرسم لا يُنسخ صورةً إلى الجدول — تُعطى بياناته كي يُعاد رسمه. */
      rows.push(["سلاسل البيانات في ورقة", chartSheetName ?? NOT_APPLICABLE_AR]);
      return rows;
    }
    case "figure": {
      const rows: SheetCell[][] = [[block.title?.trim() || "صورة"]];
      if (block.caption?.trim()) rows.push([block.caption.trim()]);
      if (block.image.alt?.trim()) rows.push(["الوصف البديل", block.image.alt.trim()]);
      rows.push(["ملاحظة", "صورة مضمّنة — تظهر في عرض الشرائح، ولا تُنقل إلى الجدول."]);
      return rows;
    }
    case "callout": {
      const rows: SheetCell[][] = [
        [TONE_AR[block.tone] ?? block.tone, block.title?.trim() || NOT_APPLICABLE_AR],
      ];
      rows.push([toSheetCell(block.body)]);
      return rows;
    }
    default: {
      /* اتّحادٌ مُستنفَد: إضافة نوع كتلة جديد تُوقف الترجمة هنا. */
      const exhaustive: never = block;
      return [[String(exhaustive)]];
    }
  }
}

function buildSectionSheet(
  section: ReportSection,
  name: string,
  chartNames: Map<ChartBlock, string>,
): SheetPlan {
  const rows: SheetCell[][] = [[section.title]];
  if (section.summary?.trim()) rows.push([section.summary.trim()]);
  rows.push([]);
  for (const block of section.blocks) {
    const chartName = block.kind === "chart" ? (chartNames.get(block) ?? null) : null;
    for (const row of blockRows(block, chartName)) rows.push(row);
    rows.push([]);
  }
  return { name, rows, colWidths: computeColWidths(rows) };
}

/**
 * ورقة بيانات رسم: عمود الفئات ثم عمود لكل سلسلة — الشكل الذي يبتلعه
 * «إدراج ← رسم» في Excel مباشرة.
 */
function buildChartSheet(block: ChartBlock, name: string, sectionTitle: string): SheetPlan {
  const rows: SheetCell[][] = [
    [block.title?.trim() || "رسم بياني"],
    ["القسم", sectionTitle],
    ["نوع الرسم", CHART_TYPE_AR[block.chartType]],
    ["الوحدة", block.unit?.trim() ? block.unit.trim() : NOT_APPLICABLE_AR],
    [],
    ["الفئة", ...block.series.map((s) => toSheetCell(s.name))],
  ];
  block.categories.forEach((category, i) => {
    rows.push([
      toSheetCell(category),
      ...block.series.map((series) => toSheetCell(series.values[i])),
    ]);
  });
  const unmeasured = block.series.reduce(
    (total, series) =>
      total + block.categories.filter((_, i) => isUnmeasured(series.values[i])).length,
    0,
  );
  rows.push([]);
  rows.push([
    "تنبيه",
    unmeasured > 0
      ? `${unmeasured} خليّة «${UNMEASURED_AR}» — احذف صفوفها قبل الرسم، فـExcel يرسم النصّ صفرًا.`
      : `كل القيم مقيسة. ما يُكتب «${UNMEASURED_AR}» لاحقًا يُستبعد قبل الرسم.`,
  ]);
  return { name, rows, colWidths: computeColWidths(rows) };
}

/* ────────────────────────────── التخطيط ─────────────────────────────── */

/**
 * يُنتج خطّة المصنّف كاملة: «عن هذا التقرير» أولًا، ثم ورقة لكل قسم،
 * ثم أوراق بيانات الرسوم. دالة خالصة بلا أي تبعية — وهي سطح الاختبار.
 */
export function planReportWorkbook(doc: ReportDocument): SheetPlan[] {
  const allocate = makeNameAllocator();
  /* «عن هذا التقرير» يُحجز أولًا كي لا يسرقه قسمٌ يحمل الاسم نفسه. */
  allocate(ABOUT_SHEET_AR);

  const sectionNames = doc.sections.map((section) => allocate(section.title));

  const chartNames = new Map<ChartBlock, string>();
  const chartSheets: SheetPlan[] = [];
  doc.sections.forEach((section, si) => {
    let index = 0;
    for (const block of section.blocks) {
      if (block.kind !== "chart") continue;
      index++;
      const label = block.title?.trim() || `رسم ${index}`;
      const name = allocate(`بيانات · ${label}`);
      chartNames.set(block, name);
      chartSheets.push(buildChartSheet(block, name, doc.sections[si].title));
    }
  });

  const sectionSheets = doc.sections.map((section, i) =>
    buildSectionSheet(section, sectionNames[i], chartNames),
  );

  return [buildAboutSheet(doc, sectionNames), ...sectionSheets, ...chartSheets];
}

/* ────────────────────────────── التسلسل ─────────────────────────────── */

/**
 * يبني ملف `.xlsx`. `xlsx` تُستورد هنا ديناميكيًّا — لا في أعلى الوحدة —
 * كي لا تدخل القطعة الأولى من الحزمة.
 */
export async function buildReportXlsx(doc: ReportDocument): Promise<Uint8Array> {
  const XLSX = await import("xlsx");
  const plans = planReportWorkbook(doc);
  const wb = XLSX.utils.book_new();

  for (const plan of plans) {
    const ws = XLSX.utils.aoa_to_sheet(plan.rows);
    ws["!cols"] = plan.colWidths.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(wb, ws, plan.name);
  }

  /* بعد الإلحاق لا قبله: `book_append_sheet` يلمس `wb.Workbook`، فالضبط
     المسبق يُمحى بصمت. وهذا المفتاح هو ما يُخرج `rightToLeft="1"` في كل
     ورقة من أوراق الملف (`write_ws_xml_sheetviews`). */
  wb.Workbook = { ...(wb.Workbook ?? {}), Views: [{ RTL: true }] };

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new Uint8Array(buf);
}
