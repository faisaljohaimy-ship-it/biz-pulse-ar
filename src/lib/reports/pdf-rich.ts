/**
 * خط تصدير PDF المفصَّل — غلاف + فهرس محتويات + أقسام مرتّبة تحوي
 * نصًّا وجداول ورسومًا بيانية وصورًا وشبكات مؤشرات وتنبيهات.
 *
 * ── لماذا pdf-lib لا jsPDF ──────────────────────────────────────────────
 * العربية في PDF ليست مسألة خطٍّ فقط: الحروف تحتاج **تشكيلًا سياقيًّا**
 * (أشكال العرض FE70–FEFF) و**عكسًا اتجاهيًّا**. المعالجة المعتمدة في هذا
 * المستودع هي `layoutArabicLine` في `./arabic-text`، وعقدها صريح في
 * ترويسة ذلك الملف: تُعيد المقاطع بترتيب **بصري**، بينما يبقى **محتوى**
 * المقطع العربي بترتيب **منطقي** لأن fontkit (عبر `@pdf-lib/fontkit`)
 * يطبّق عكسه الاتجاهي على كل مقطع RTL يستلمه. أي محرّك لا يعكس — وjsPDF
 * منها — سيرسم ذلك المحتوى المنطقي كما هو فيخرج النص **مقلوبًا**.
 *
 * فلا يوجد هنا حلٌّ ثانٍ للعربية: هذا الملف يستعمل نفس المحرّك ونفس
 * الدالة المعتمدة (pdf-lib + fontkit + `layoutArabicLine`) كما في
 * `daily-ops-pdf.ts` و`bi-pdf.ts` حرفيًّا. استعمال jsPDF كان سيوجب كتابة
 * معالجة عربية موازية — وهو المحظور بعينه.
 *
 * ── فصل التخطيط عن الرسم ────────────────────────────────────────────────
 * `planReport()` منطق خالص: يأخذ دالة قياس ويُخرج خطّة صفحات وعناصر
 * بمواضع مطلقة. `renderReportPdf()` يمشي على الخطّة ويرسمها. الفائدة أن
 * الترتيب والانكسار و«لم يُقَس» وشارة المحاكاة تُختبر بلا بايتات PDF.
 *
 * ── المادة ٢٧ ───────────────────────────────────────────────────────────
 * كل خلية غير مقيسة (null/undefined/فراغ/NaN) تُطبع «لم يُقَس». الصفر
 * قيمةٌ مقيسة ويبقى صفرًا؛ الفراغ ليس بديلًا عن الغياب.
 */
import { PRODUCT_BRAND } from "@/lib/domain";
import { layoutArabicLine, type ArabicSegment } from "./arabic-text";
import type { DailyOpsFonts } from "./daily-ops-pdf";

/* ═══════════════════════════════ النموذج ═══════════════════════════════
 * نسخة محلّية مطابقة لما يكتبه وكيل `report-model.ts` — تحتاج توحيدًا
 * لاحقًا (انظر التقرير). أُبقيت هنا كي لا يتوقف هذا الخط على ملف لم يصل.
 */

/** خلية تقرير: رقم أو نص أو غياب صريح. الغياب ⇐ «لم يُقَس». */
export type ReportCell =
  | string
  | number
  | null
  | undefined
  | { value: number | string | null | undefined; digits?: number; unit?: string };

export type ReportTone = "info" | "success" | "warning" | "danger";

export type ProseBlock = { kind: "prose"; text: string | string[] };

export type ReportColumn = {
  header: string;
  key: string;
  /** وزن نسبي لعرض العمود (يُطبَّع تلقائيًّا). */
  weight?: number;
  /** خانات عشرية ثابتة للأعمدة الرقمية. */
  digits?: number;
  unit?: string;
  align?: "right" | "left";
};

export type TableBlock = {
  kind: "table";
  title?: string;
  columns: ReportColumn[];
  rows: Array<Record<string, ReportCell>>;
  note?: string;
};

export type ChartBlock = {
  kind: "chart";
  title?: string;
  /** معرّف عنصر DOM يُلتقط بـ html2canvas بدقّة مضاعفة. */
  elementId: string;
  caption?: string;
  /** أقصى ارتفاع بالنقاط (افتراضي 240). */
  maxHeight?: number;
};

export type FigureBlock = {
  kind: "figure";
  title?: string;
  /** data: URL — png أو jpeg. */
  src: string;
  caption?: string;
  /** عرض/ارتفاع؛ الافتراضي 16/9 حين لا تُعرف أبعاد الصورة. */
  aspect?: number;
  maxHeight?: number;
  /** صورة فوتوغرافية ⇐ تُعاد ترميزًا JPEG بجودة 0.85 حين يتوفّر canvas. */
  photographic?: boolean;
};

export type KpiGridBlock = {
  kind: "kpi-grid";
  items: Array<{ label: string; value: ReportCell; digits?: number; unit?: string }>;
};

export type CalloutBlock = {
  kind: "callout";
  tone: ReportTone;
  title?: string;
  text: string;
};

export type ReportBlock =
  | ProseBlock
  | TableBlock
  | ChartBlock
  | FigureBlock
  | KpiGridBlock
  | CalloutBlock;

export type ReportSection = { id?: string; title: string; blocks: ReportBlock[] };

export type ReportDocument = {
  title: string;
  subtitle?: string;
  org?: string;
  /** YYYY-MM-DD */
  dateKey?: string;
  author?: string;
  /** بيانات محاكاة ⇐ شارة على كل صفحة، بلا خيار إلغاء. */
  isSimulation: boolean;
  sections: ReportSection[];
};

/* ═══════════════════════════ ثوابت وأخطاء ═══════════════════════════ */

/** المادة ٢٧: نصّ الغياب الموحّد. لا صفر ولا فراغ. */
export const UNMEASURED_AR = "لم يُقَس";

export type ReportRenderErrorCode =
  | "no-dom"
  | "chart-element-missing"
  | "chart-capture-failed"
  | "unsupported-image"
  | "fonts-missing";

/**
 * خطأ صريح مفهوم بالعربية. القاعدة: عند تعذّر التقاط رسم بياني **يُرمى
 * الخطأ** ولا يُسلَّم PDF ناقص صامت.
 */
export class ReportRenderError extends Error {
  readonly code: ReportRenderErrorCode;
  constructor(code: ReportRenderErrorCode, message: string) {
    super(message);
    this.name = "ReportRenderError";
    this.code = code;
  }
}

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 44;
const FOOTER_LIMIT = 70;

/* ═══════════════════════════ تنسيق الخلايا ═══════════════════════════ */

/** رقم بخانات عشرية ثابتة وفواصل آلاف — لمحاذاة الأعمدة الرقمية. */
export function formatFixed(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return UNMEASURED_AR;
  const fixed = value.toFixed(digits);
  const negative = fixed.startsWith("-");
  const body = negative ? fixed.slice(1) : fixed;
  const [intPart, fracPart] = body.split(".");
  const grouped = (intPart ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = negative && Number(body) !== 0 ? "-" : "";
  return `${sign}${grouped}${fracPart ? `.${fracPart}` : ""}`;
}

const withUnit = (text: string, unit?: string) =>
  !unit ? text : unit === "%" ? `${text}%` : `${text} ${unit}`;

/**
 * المادة ٢٧ مطبَّقة: null/undefined/نص فارغ/NaN ⇐ «لم يُقَس».
 * الصفر قيمة مقيسة فيبقى «0»، ولا تُترك خلية فارغة أبدًا.
 */
export function formatReportCell(
  cell: ReportCell,
  options: { digits?: number; unit?: string } = {},
): string {
  if (cell === null || cell === undefined) return UNMEASURED_AR;
  if (typeof cell === "object") {
    if (cell.value === null || cell.value === undefined) return UNMEASURED_AR;
    return formatReportCell(cell.value, {
      digits: cell.digits ?? options.digits,
      unit: cell.unit ?? options.unit,
    });
  }
  if (typeof cell === "number") {
    if (!Number.isFinite(cell)) return UNMEASURED_AR;
    return withUnit(formatFixed(cell, options.digits ?? 0), options.unit);
  }
  const text = cell.trim();
  if (text.length === 0) return UNMEASURED_AR;
  return withUnit(text, options.unit);
}

/**
 * المقاطع الجاهزة للرسم — إعادة تصدير للمعالجة المعتمدة وحدها. أي رسم
 * لنصّ في هذا الملف يمرّ من هنا؛ لا مسار ثانٍ للعربية.
 */
export function reportLineSegments(text: string): ArabicSegment[] {
  return layoutArabicLine(text);
}

/* ═══════════════════════════ خطّة التخطيط ═══════════════════════════ */

export type PlanTone =
  | "ink"
  | "muted"
  | "emerald"
  | "cyan"
  | "danger"
  | "warning"
  | "success"
  | "panel"
  | "navy"
  | "white";

export type PlannedItem =
  | {
      type: "text";
      text: string;
      /** الحافة اليمنى للنص (كل النصوص تُثبَّت يمينًا ثم تُقاس يسارًا). */
      rightX: number;
      y: number;
      size: number;
      bold: boolean;
      tone: PlanTone;
      opacity?: number;
      /** دوران بالدرجات (شارة المحاكاة القُطرية). */
      rotate?: number;
    }
  | {
      type: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
      tone: PlanTone;
      opacity?: number;
      borderTone?: PlanTone;
      borderWidth?: number;
    }
  | { type: "shape"; path: string; x: number; y: number; scale: number; tone: PlanTone }
  | { type: "image"; ref: string; x: number; y: number; width: number; height: number };

export type PlannedPage = { index: number; items: PlannedItem[] };

export type BlockPlacement = {
  sectionIndex: number;
  blockIndex: number;
  kind: ReportBlock["kind"];
  /** رقم الصفحة (يبدأ من 1). */
  page: number;
  y: number;
};

export type OutlineEntry = { title: string; page: number };

export type LayoutPlan = {
  pages: PlannedPage[];
  outline: OutlineEntry[];
  placements: BlockPlacement[];
  pageWidth: number;
  pageHeight: number;
};

export type MeasureFn = (text: string, size: number, bold: boolean) => number;

export type ResolvedImage = {
  ref: string;
  dataUrl: string;
  format: "png" | "jpeg";
  pixelWidth: number;
  pixelHeight: number;
};

export type PlanContext = {
  measure: MeasureFn;
  images?: Map<string, ResolvedImage>;
  pageWidth?: number;
  pageHeight?: number;
  margin?: number;
};

/** أشكال التنبيه — العرف: مثمّن خطر · مثلث تحذير · دائرة سليم · معيّن معلومة. */
const CALLOUT_SHAPE: Record<ReportTone, string> = {
  danger: "M8 1 L16 1 L23 8 L23 16 L16 23 L8 23 L1 16 L1 8 Z",
  warning: "M12 2 L23 21 L1 21 Z",
  success:
    "M12 2 C17.5 2 22 6.5 22 12 C22 17.5 17.5 22 12 22 C6.5 22 2 17.5 2 12 C2 6.5 6.5 2 12 2 Z",
  info: "M12 2 L22 12 L12 22 L2 12 Z",
};

const CALLOUT_TONE: Record<ReportTone, PlanTone> = {
  danger: "danger",
  warning: "warning",
  success: "success",
  info: "cyan",
};

/** شارة الحالة النصّية — الفرق لا يقوم على اللون وحده (WCAG 2.2 §1.4.1). */
const CALLOUT_BADGE: Record<ReportTone, string> = {
  danger: "خطر",
  warning: "تحذير",
  success: "سليم",
  info: "معلومة",
};

const HEX_MARK = "M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z";

function wrapText(
  text: string,
  maxWidth: number,
  size: number,
  bold: boolean,
  measure: MeasureFn,
): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || measure(candidate, size, bold) <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * يبني خطّة الصفحات كاملة: غلاف ← فهرس محتويات ← الأقسام بالترتيب،
 * وشارة المحاكاة والتذييل على كل صفحة.
 */
export function planReport(doc: ReportDocument, ctx: PlanContext): LayoutPlan {
  const W = ctx.pageWidth ?? A4[0];
  const H = ctx.pageHeight ?? A4[1];
  const margin = ctx.margin ?? MARGIN;
  const contentW = W - margin * 2;
  const rightEdge = W - margin;
  const measure = ctx.measure;
  const images = ctx.images ?? new Map<string, ResolvedImage>();
  const topOfBody = H - (doc.isSimulation ? 92 : 74);

  const pages: PlannedPage[] = [];
  const placements: BlockPlacement[] = [];
  const outline: OutlineEntry[] = [];

  const newPage = (): PlannedPage => {
    const page: PlannedPage = { index: pages.length, items: [] };
    pages.push(page);
    return page;
  };

  /* ── الغلاف ── */
  const cover = newPage();
  cover.items.push({
    type: "shape",
    path: HEX_MARK,
    x: margin,
    y: H - 96,
    scale: 1.6,
    tone: "emerald",
  });
  const brandWidth = measure(PRODUCT_BRAND.arPlain, 26, true);
  cover.items.push({
    type: "text",
    text: PRODUCT_BRAND.arPlain,
    rightX: margin + 46 + brandWidth,
    y: H - 122,
    size: 26,
    bold: true,
    tone: "emerald",
  });
  let coverY = H - 250;
  for (const line of wrapText(doc.title, contentW, 30, true, measure)) {
    cover.items.push({
      type: "text",
      text: line,
      rightX: rightEdge,
      y: coverY,
      size: 30,
      bold: true,
      tone: "ink",
    });
    coverY -= 40;
  }
  if (doc.subtitle) {
    coverY -= 6;
    for (const line of wrapText(doc.subtitle, contentW, 14, false, measure)) {
      cover.items.push({
        type: "text",
        text: line,
        rightX: rightEdge,
        y: coverY,
        size: 14,
        bold: false,
        tone: "cyan",
      });
      coverY -= 20;
    }
  }
  coverY -= 10;
  cover.items.push({
    type: "rect",
    x: margin,
    y: coverY,
    width: contentW,
    height: 0.8,
    tone: "emerald",
    opacity: 0.7,
  });
  coverY -= 24;
  for (const meta of [doc.org, doc.dateKey, doc.author].filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  )) {
    cover.items.push({
      type: "text",
      text: meta,
      rightX: rightEdge,
      y: coverY,
      size: 11,
      bold: false,
      tone: "muted",
    });
    coverY -= 18;
  }

  /* ── حجز صفحات الفهرس (تُملأ بعد معرفة أرقام الصفحات) ── */
  const tocLineH = 20;
  const tocFirstTop = topOfBody - 46;
  const linesPerTocPage = Math.max(1, Math.floor((tocFirstTop - FOOTER_LIMIT) / tocLineH));
  const tocPageCount = Math.max(1, Math.ceil(doc.sections.length / linesPerTocPage));
  const tocPages: PlannedPage[] = [];
  for (let i = 0; i < tocPageCount; i += 1) tocPages.push(newPage());

  /* ── متن التقرير ── */
  let page = newPage();
  let y = topOfBody;

  const breakPage = () => {
    page = newPage();
    y = topOfBody;
  };
  const ensure = (need: number) => {
    if (y - need < FOOTER_LIMIT) breakPage();
  };
  const text = (
    value: string,
    rightX: number,
    size: number,
    tone: PlanTone,
    bold = false,
    yy = y,
  ) => {
    page.items.push({ type: "text", text: value, rightX, y: yy, size, bold, tone });
  };

  doc.sections.forEach((section, sectionIndex) => {
    ensure(70);
    if (sectionIndex > 0 && y < topOfBody - 1) {
      // قسم جديد يبدأ بمسافة تنفّس واضحة.
      y -= 10;
      ensure(70);
    }
    outline.push({ title: section.title, page: page.index + 1 });
    page.items.push({
      type: "shape",
      path: "M6 0 L12 6 L6 12 L0 6 Z",
      x: rightEdge + 2,
      y: y + 10,
      scale: 0.8,
      tone: "emerald",
    });
    text(section.title, rightEdge - 14, 16, "emerald", true);
    y -= 10;
    page.items.push({
      type: "rect",
      x: margin,
      y,
      width: contentW,
      height: 0.7,
      tone: "cyan",
      opacity: 0.35,
    });
    y -= 22;

    section.blocks.forEach((block, blockIndex) => {
      const record = () =>
        placements.push({
          sectionIndex,
          blockIndex,
          kind: block.kind,
          page: page.index + 1,
          y,
        });

      switch (block.kind) {
        case "prose": {
          const paragraphs = Array.isArray(block.text) ? block.text : [block.text];
          ensure(24);
          record();
          for (const paragraph of paragraphs) {
            for (const line of wrapText(paragraph, contentW, 10.5, false, measure)) {
              ensure(16);
              text(line, rightEdge, 10.5, "ink");
              y -= 16;
            }
            y -= 6;
          }
          y -= 6;
          break;
        }

        case "kpi-grid": {
          const perRow = Math.min(4, Math.max(1, block.items.length));
          const tileH = 62;
          const gap = 12;
          const tileW = (contentW - (perRow - 1) * gap) / perRow;
          ensure(tileH + 16);
          record();
          const rowTop = y;
          block.items.forEach((item, i) => {
            const col = i % perRow;
            const row = Math.floor(i / perRow);
            const tileY = rowTop - row * (tileH + gap);
            if (col === 0 && row > 0) {
              // صفوف لاحقة: تأكّد من المساحة قبل رسمها.
              ensure(tileH + gap);
            }
            // RTL: أول بطاقة على اليمين.
            const x = rightEdge - (col + 1) * tileW - col * gap;
            page.items.push({
              type: "rect",
              x,
              y: tileY - tileH,
              width: tileW,
              height: tileH,
              tone: "panel",
              opacity: 0.9,
              borderTone: "emerald",
              borderWidth: 0.8,
            });
            const value = formatReportCell(item.value, { digits: item.digits, unit: item.unit });
            const valueWidth = measure(value, 18, true);
            page.items.push({
              type: "text",
              text: value,
              rightX: x + tileW / 2 + valueWidth / 2,
              y: tileY - 32,
              size: 18,
              bold: true,
              tone: "cyan",
            });
            page.items.push({
              type: "text",
              text: item.label,
              rightX: x + tileW - 8,
              y: tileY - 52,
              size: 9,
              bold: false,
              tone: "muted",
            });
          });
          const rows = Math.ceil(block.items.length / perRow);
          y = rowTop - rows * (tileH + gap) - 6;
          break;
        }

        case "callout": {
          const lines = wrapText(block.text, contentW - 46, 10, false, measure);
          const boxH = 26 + lines.length * 14;
          ensure(boxH + 12);
          record();
          const tone = CALLOUT_TONE[block.tone];
          page.items.push({
            type: "rect",
            x: margin,
            y: y - boxH + 12,
            width: contentW,
            height: boxH,
            tone,
            opacity: 0.12,
            borderTone: tone,
            borderWidth: 1,
          });
          page.items.push({
            type: "shape",
            path: CALLOUT_SHAPE[block.tone],
            x: rightEdge - 26,
            y: y + 8,
            scale: 0.62,
            tone,
          });
          const badge = CALLOUT_BADGE[block.tone];
          const heading = block.title ? `${badge} — ${block.title}` : badge;
          text(heading, rightEdge - 32, 11, tone, true);
          y -= 16;
          for (const line of lines) {
            text(line, rightEdge - 32, 10, "ink");
            y -= 14;
          }
          y -= 16;
          break;
        }

        case "chart":
        case "figure": {
          const ref = imageRef(block.kind, sectionIndex, blockIndex);
          const image = images.get(ref);
          const aspect =
            image && image.pixelHeight > 0
              ? image.pixelWidth / image.pixelHeight
              : ((block as FigureBlock).aspect ?? 16 / 9);
          const maxHeight = block.maxHeight ?? 240;
          const safeAspect = aspect > 0 ? aspect : 16 / 9;
          // النسبة تُصان: عند بلوغ سقف الارتفاع يُقلَّص العرض بدل التمطيط.
          const drawH = Math.min(maxHeight, contentW / safeAspect);
          const drawW = drawH * safeAspect;
          const imageX = rightEdge - drawW;
          const titleH = block.title ? 20 : 0;
          const captionH = block.caption ? 16 : 0;
          ensure(drawH + titleH + captionH + 14);
          record();
          if (block.title) {
            text(block.title, rightEdge, 11.5, "ink", true);
            y -= titleH;
          }
          page.items.push({
            type: "rect",
            x: imageX - 2,
            y: y - drawH - 2,
            width: drawW + 4,
            height: drawH + 4,
            tone: "cyan",
            opacity: 0.08,
          });
          if (image) {
            page.items.push({
              type: "image",
              ref,
              x: imageX,
              y: y - drawH,
              width: drawW,
              height: drawH,
            });
          }
          y -= drawH + 6;
          if (block.caption) {
            text(block.caption, rightEdge, 8.5, "muted");
            y -= captionH;
          }
          y -= 10;
          break;
        }

        case "table": {
          const cols = block.columns;
          const totalWeight = cols.reduce((s, c) => s + (c.weight ?? 1), 0) || 1;
          // RTL: العمود الأول يبدأ من الحافة اليمنى ويمشي يسارًا.
          const bounds: Array<{ right: number; left: number }> = [];
          let acc = rightEdge;
          for (const col of cols) {
            const cw = (contentW * (col.weight ?? 1)) / totalWeight;
            bounds.push({ right: acc, left: acc - cw });
            acc -= cw;
          }
          const rowH = 14;
          ensure(58);
          record();
          if (block.title) {
            text(block.title, rightEdge, 12, "emerald", true);
            y -= 18;
          }
          const drawHeader = () => {
            cols.forEach((col, c) => {
              text(col.header, bounds[c]!.right - 3, 8.5, "cyan", true);
            });
            y -= 7;
            page.items.push({
              type: "rect",
              x: margin,
              y,
              width: contentW,
              height: 0.7,
              tone: "emerald",
            });
            y -= 12;
          };
          drawHeader();
          block.rows.forEach((row, r) => {
            if (y - rowH < FOOTER_LIMIT) {
              breakPage();
              // الترويسة تتكرّر على كل صفحة يمتدّ إليها الجدول.
              drawHeader();
            }
            if (r % 2 === 1) {
              page.items.push({
                type: "rect",
                x: margin,
                y: y - 3.5,
                width: contentW,
                height: rowH - 1,
                tone: "panel",
                opacity: 0.5,
              });
            }
            cols.forEach((col, c) => {
              const value = formatReportCell(row[col.key], {
                digits: col.digits,
                unit: col.unit,
              });
              const unmeasured = value === UNMEASURED_AR;
              const b = bounds[c]!;
              const rightX =
                col.align === "left" ? b.left + measure(value, 8, false) + 3 : b.right - 3;
              page.items.push({
                type: "text",
                text: value,
                rightX,
                y,
                size: 8,
                bold: false,
                tone: unmeasured ? "muted" : "ink",
              });
            });
            y -= rowH;
          });
          y -= 6;
          if (block.note) {
            ensure(16);
            text(block.note, rightEdge, 8, "muted");
            y -= 14;
          }
          y -= 6;
          break;
        }
      }
    });
  });

  /* ── ملء الفهرس بعد استقرار أرقام الصفحات ── */
  tocPages.forEach((tocPage, i) => {
    let ty = topOfBody;
    tocPage.items.push({
      type: "text",
      text: i === 0 ? "المحتويات" : "المحتويات (تتمّة)",
      rightX: rightEdge,
      y: ty,
      size: 18,
      bold: true,
      tone: "emerald",
    });
    ty -= 12;
    tocPage.items.push({
      type: "rect",
      x: margin,
      y: ty,
      width: contentW,
      height: 0.7,
      tone: "cyan",
      opacity: 0.35,
    });
    ty -= 24;
    const slice = outline.slice(i * linesPerTocPage, (i + 1) * linesPerTocPage);
    for (const entry of slice) {
      tocPage.items.push({
        type: "text",
        text: entry.title,
        rightX: rightEdge,
        y: ty,
        size: 11,
        bold: false,
        tone: "ink",
      });
      const num = String(entry.page);
      tocPage.items.push({
        type: "text",
        text: num,
        rightX: margin + measure(num, 11, false),
        y: ty,
        size: 11,
        bold: false,
        tone: "cyan",
      });
      tocPage.items.push({
        type: "rect",
        x: margin + 26,
        y: ty + 3,
        width: contentW - 26 - measure(entry.title, 11, false) - 8,
        height: 0.4,
        tone: "muted",
        opacity: 0.35,
      });
      ty -= tocLineH;
    }
  });

  /* ── تذييل + شارة المحاكاة على كل صفحة ── */
  const total = pages.length;
  const simText = "بيانات محاكاة مرجعية — is_simulation = true";
  pages.forEach((p, i) => {
    p.items.push({ type: "rect", x: 0, y: H - 6, width: W, height: 6, tone: "emerald" });
    p.items.push({
      type: "rect",
      x: 0,
      y: 30,
      width: W,
      height: 0.5,
      tone: "emerald",
      opacity: 0.6,
    });
    p.items.push({
      type: "text",
      text: `${PRODUCT_BRAND.arPlain} — ${doc.title}`,
      rightX: rightEdge,
      y: 18,
      size: 7.5,
      bold: false,
      tone: "muted",
    });
    const pageLabel = `${i + 1} / ${total}`;
    p.items.push({
      type: "text",
      text: pageLabel,
      rightX: margin + measure(pageLabel, 7.5, false),
      y: 18,
      size: 7.5,
      bold: false,
      tone: "muted",
    });
    if (doc.isSimulation) {
      // شريط ترويسة + علامة مائية قُطرية — لا خيار يلغيهما.
      p.items.push({
        type: "rect",
        x: 0,
        y: H - 28,
        width: W,
        height: 20,
        tone: "warning",
        opacity: 0.16,
      });
      p.items.push({
        type: "text",
        text: simText,
        rightX: rightEdge,
        y: H - 22,
        size: 8,
        bold: true,
        tone: "warning",
      });
      p.items.push({
        type: "text",
        text: "محاكاة",
        rightX: W / 2 + 150,
        y: H / 2 - 120,
        size: 72,
        bold: true,
        tone: "warning",
        opacity: 0.1,
        rotate: 45,
      });
    }
  });

  return { pages, outline, placements, pageWidth: W, pageHeight: H };
}

/** مفتاح الصورة المرتبط بكتلة رسم/صورة. */
export function imageRef(kind: "chart" | "figure", sectionIndex: number, blockIndex: number) {
  return `${kind}:${sectionIndex}.${blockIndex}`;
}

/* ═════════════════════ التقاط الرسوم من DOM ═════════════════════ */

export type ChartCapture = (
  block: ChartBlock,
  ref: string,
) => Promise<Omit<ResolvedImage, "ref"> | null>;

export type RenderReportOptions = {
  /** خطوط IBM Plex Sans Arabic (regular + bold). تُجلب من /fonts حين تُترك. */
  fonts?: DailyOpsFonts;
  /** مصدر الـDOM — `null` يعني «لا متصفح» (تصدير من الخادم). */
  getDocument?: () => Document | null;
  /** بديل الالتقاط (للاختبار). */
  captureChart?: ChartCapture;
  /** جودة إعادة ترميز الصور الفوتوغرافية. */
  jpegQuality?: number;
};

const dataUrlFormat = (src: string): "png" | "jpeg" => {
  if (/^data:image\/png[;,]/i.test(src)) return "png";
  if (/^data:image\/jpe?g[;,]/i.test(src)) return "jpeg";
  throw new ReportRenderError(
    "unsupported-image",
    "تعذّر إدراج الصورة: الصيغ المدعومة هي PNG وJPEG فقط (data: URL).",
  );
};

/** صيغة الإدراج: الرسوم البيانية PNG (خطوط حادّة)، الصور الفوتوغرافية JPEG. */
export function pickImageFormat(
  src: string,
  photographic = false,
): { format: "png" | "jpeg"; reencode: boolean } {
  const current = dataUrlFormat(src);
  if (photographic && current === "png") return { format: "jpeg", reencode: true };
  return { format: current, reencode: false };
}

const defaultGetDocument = () => (typeof document === "undefined" ? null : document);

/**
 * يلتقط عنصر DOM بـhtml2canvas بدقّة مضاعفة (scale: 2).
 * بلا DOM ⇐ خطأ صريح — لا PDF ناقص صامت.
 */
export async function captureChartFromDom(
  block: ChartBlock,
  options: RenderReportOptions = {},
): Promise<Omit<ResolvedImage, "ref">> {
  const getDoc = options.getDocument ?? defaultGetDocument;
  const dom = getDoc();
  if (!dom) {
    throw new ReportRenderError(
      "no-dom",
      `تعذّر إنشاء التقرير: الرسم البياني «${block.title ?? block.elementId}» يُلتقط من الشاشة، ` +
        "وهذا يتطلّب تشغيل التصدير داخل المتصفّح. التصدير من الخادم غير مدعوم لهذا التقرير.",
    );
  }
  const element = dom.getElementById(block.elementId);
  if (!element) {
    throw new ReportRenderError(
      "chart-element-missing",
      `تعذّر إنشاء التقرير: لم يُعثر على الرسم البياني «${block.elementId}» على الشاشة. ` +
        "افتح الصفحة التي تعرض الرسم ثم أعد التصدير.",
    );
  }
  try {
    const { default: html2canvas } = await import("html2canvas");
    const canvas = await html2canvas(element, {
      scale: 2, // دقّة مضاعفة — الخطوط والنصوص تبقى حادّة عند الطباعة
      backgroundColor: null,
      logging: false,
      useCORS: true,
    });
    // PNG للرسوم: مساحات مصمتة وخطوط حادّة، وJPEG يشوّهها بهالات.
    return {
      dataUrl: canvas.toDataURL("image/png"),
      format: "png",
      pixelWidth: canvas.width,
      pixelHeight: canvas.height,
    };
  } catch (error) {
    if (error instanceof ReportRenderError) throw error;
    throw new ReportRenderError(
      "chart-capture-failed",
      `تعذّر التقاط الرسم البياني «${block.elementId}». أعد المحاولة بعد اكتمال عرض الصفحة.`,
    );
  }
}

/**
 * يعيد ترميز صورة فوتوغرافية إلى JPEG بجودة 0.85 حين يتوفّر canvas عامل.
 *
 * الضغط تحسينٌ لا شرط: يُفحص سياق الرسم **قبل** تحميل الصورة (في بيئات
 * بلا canvas — jsdom مثلًا — يعود `getContext` بـnull فنخرج فورًا)، ويُقيَّد
 * التحميل بمهلة لأن `onload` قد لا يُطلق أبدًا فيعلّق التصدير.
 */
async function reencodeToJpeg(
  src: string,
  quality: number,
  getDoc: () => Document | null,
  timeoutMs = 3000,
): Promise<{ dataUrl: string; format: "png" | "jpeg" }> {
  const asIs = () => ({ dataUrl: src, format: dataUrlFormat(src) });
  const dom = getDoc();
  if (!dom || typeof Image === "undefined") return asIs();
  try {
    const canvas = dom.createElement("canvas");
    const c2d = canvas.getContext("2d");
    if (!c2d) return asIs();
    const img = await new Promise<HTMLImageElement | null>((resolveImage) => {
      const el = new Image();
      const timer = setTimeout(() => resolveImage(null), timeoutMs);
      el.onload = () => {
        clearTimeout(timer);
        resolveImage(el);
      };
      el.onerror = () => {
        clearTimeout(timer);
        resolveImage(null);
      };
      el.src = src;
    });
    if (!img) return asIs();
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    c2d.drawImage(img, 0, 0);
    return { dataUrl: canvas.toDataURL("image/jpeg", quality), format: "jpeg" };
  } catch {
    return asIs();
  }
}

/** يجمع كل صور المستند (رسوم ملتقَطة + صور معطاة) قبل التخطيط. */
export async function resolveReportImages(
  doc: ReportDocument,
  options: RenderReportOptions = {},
): Promise<Map<string, ResolvedImage>> {
  const out = new Map<string, ResolvedImage>();
  const getDoc = options.getDocument ?? defaultGetDocument;
  const quality = options.jpegQuality ?? 0.85;
  for (const [sectionIndex, section] of doc.sections.entries()) {
    for (const [blockIndex, block] of section.blocks.entries()) {
      if (block.kind === "chart") {
        const ref = imageRef("chart", sectionIndex, blockIndex);
        const captured = options.captureChart
          ? await options.captureChart(block, ref)
          : await captureChartFromDom(block, options);
        if (!captured) {
          throw new ReportRenderError(
            "chart-capture-failed",
            `تعذّر التقاط الرسم البياني «${block.elementId}». أعد المحاولة بعد اكتمال عرض الصفحة.`,
          );
        }
        out.set(ref, { ref, ...captured });
      } else if (block.kind === "figure") {
        const ref = imageRef("figure", sectionIndex, blockIndex);
        const decision = pickImageFormat(block.src, block.photographic);
        const encoded = decision.reencode
          ? await reencodeToJpeg(block.src, quality, getDoc)
          : { dataUrl: block.src, format: decision.format };
        const aspect = block.aspect ?? 16 / 9;
        out.set(ref, {
          ref,
          dataUrl: encoded.dataUrl,
          format: encoded.format,
          pixelWidth: Math.round(1000 * aspect),
          pixelHeight: 1000,
        });
      }
    }
  }
  return out;
}

/* ═════════════════════════════ الرسم ═════════════════════════════ */

const TONE_RGB: Record<PlanTone, [number, number, number]> = {
  navy: [0.02, 0.043, 0.086],
  panel: [0.043, 0.102, 0.18],
  emerald: [0.063, 0.725, 0.506],
  cyan: [0.133, 0.827, 0.933],
  ink: [0.92, 0.95, 0.98],
  muted: [0.55, 0.63, 0.73],
  danger: [0.96, 0.45, 0.45],
  warning: [0.98, 0.75, 0.24],
  success: [0.063, 0.725, 0.506],
  white: [1, 1, 1],
};

async function resolveFonts(options: RenderReportOptions): Promise<DailyOpsFonts> {
  if (options.fonts) return options.fonts;
  if (typeof fetch !== "function") {
    throw new ReportRenderError(
      "fonts-missing",
      "تعذّر تحميل الخط العربي المطلوب لإنشاء التقرير. أعد المحاولة، وإن تكرّر الأمر فأبلغ الدعم.",
    );
  }
  try {
    const [regular, bold] = await Promise.all([
      fetch("/fonts/nexios-arabic.ttf").then((r) => r.arrayBuffer()),
      fetch("/fonts/nexios-arabic-bold.ttf")
        .then((r) => r.arrayBuffer())
        .catch(() => undefined),
    ]);
    return { regular, bold };
  } catch {
    throw new ReportRenderError(
      "fonts-missing",
      "تعذّر تحميل الخط العربي المطلوب لإنشاء التقرير. أعد المحاولة، وإن تكرّر الأمر فأبلغ الدعم.",
    );
  }
}

/**
 * يبني التقرير كاملًا ويعيده Blob من نوع application/pdf.
 *
 * العربية تمرّ حصرًا عبر `layoutArabicLine`: المقاطع بترتيب بصري،
 * والمحتوى العربي منطقي لأن fontkit يعكسه، والأرقام/اللاتيني عبر
 * Helvetica فلا تمسّها إعادة الترتيب.
 */
export async function renderReportPdf(
  doc: ReportDocument,
  options: RenderReportOptions = {},
): Promise<Blob> {
  const fonts = await resolveFonts(options);
  // الصور أولًا: فشل الالتقاط يُوقف التصدير قبل بناء أي صفحة.
  const images = await resolveReportImages(doc, options);

  const [{ PDFDocument, rgb, StandardFonts, degrees }, fontkitModule] = await Promise.all([
    import("pdf-lib"),
    import("@pdf-lib/fontkit"),
  ]);
  const fontkit = (fontkitModule as { default?: unknown }).default ?? fontkitModule;
  const pdf = await PDFDocument.create();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf.registerFontkit(fontkit as any);

  // Buffers/عروض من عوالم أخرى ترفضها pdf-lib — تُطبَّع هنا (نفس نمط daily-ops).
  const normalize = (b: ArrayBuffer | Uint8Array) =>
    new Uint8Array(
      ArrayBuffer.isView(b) ? b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) : b,
    );
  const ar = await pdf.embedFont(normalize(fonts.regular), { subset: true });
  const arBold = fonts.bold ? await pdf.embedFont(normalize(fonts.bold), { subset: true }) : ar;
  const latin = await pdf.embedFont(StandardFonts.Helvetica);
  const latinBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const fontFor = (seg: ArabicSegment, bold: boolean) =>
    seg.ar ? (bold ? arBold : ar) : bold ? latinBold : latin;
  const segWidth = (seg: ArabicSegment, size: number, bold: boolean) =>
    fontFor(seg, bold).widthOfTextAtSize(seg.text, size);
  const measure: MeasureFn = (value, size, bold) =>
    reportLineSegments(value).reduce((sum, seg) => sum + segWidth(seg, size, bold), 0);

  const plan = planReport(doc, { measure, images });
  const color = (tone: PlanTone) => {
    const [r, g, b] = TONE_RGB[tone];
    return rgb(r, g, b);
  };

  const embedded = new Map<string, Awaited<ReturnType<typeof pdf.embedPng>>>();
  for (const image of images.values()) {
    embedded.set(
      image.ref,
      image.format === "jpeg"
        ? await pdf.embedJpg(image.dataUrl)
        : await pdf.embedPng(image.dataUrl),
    );
  }

  for (const planned of plan.pages) {
    const page = pdf.addPage([plan.pageWidth, plan.pageHeight]);
    // الخلفية الهولوغرافية — نفس هوية التقارير القائمة.
    page.drawRectangle({
      x: 0,
      y: 0,
      width: plan.pageWidth,
      height: plan.pageHeight,
      color: color("navy"),
    });
    for (let gy = plan.pageHeight - 40; gy > 60; gy -= 44) {
      page.drawRectangle({
        x: 0,
        y: gy,
        width: plan.pageWidth,
        height: 0.4,
        color: color("cyan"),
        opacity: 0.05,
      });
    }

    for (const item of planned.items) {
      if (item.type === "rect") {
        page.drawRectangle({
          x: item.x,
          y: item.y,
          width: Math.max(0, item.width),
          height: Math.max(0, item.height),
          color: color(item.tone),
          opacity: item.opacity ?? 1,
          ...(item.borderTone
            ? {
                borderColor: color(item.borderTone),
                borderWidth: item.borderWidth ?? 0.8,
              }
            : {}),
        });
        continue;
      }
      if (item.type === "shape") {
        page.drawSvgPath(item.path, {
          x: item.x,
          y: item.y,
          scale: item.scale,
          borderColor: color(item.tone),
          borderWidth: 1.1,
        });
        continue;
      }
      if (item.type === "image") {
        const img = embedded.get(item.ref);
        if (img) {
          page.drawImage(img, { x: item.x, y: item.y, width: item.width, height: item.height });
        }
        continue;
      }
      // نصّ: المقاطع بترتيب بصري، تُوضع يسارًا→يمينًا بدءًا من الحافة اليمنى.
      const segs = reportLineSegments(item.text);
      const totalWidth = segs.reduce((s, seg) => s + segWidth(seg, item.size, item.bold), 0);
      const theta = ((item.rotate ?? 0) * Math.PI) / 180;
      const dx = Math.cos(theta);
      const dy = Math.sin(theta);
      let x = item.rightX - totalWidth * dx;
      let yy = item.y - totalWidth * dy;
      for (const seg of segs) {
        page.drawText(seg.text, {
          x,
          y: yy,
          size: item.size,
          font: fontFor(seg, item.bold),
          color: color(item.tone),
          opacity: item.opacity ?? 1,
          ...(item.rotate ? { rotate: degrees(item.rotate) } : {}),
        });
        const w = segWidth(seg, item.size, item.bold);
        x += w * dx;
        yy += w * dy;
      }
    }
  }

  const bytes = await pdf.save();
  return new Blob([new Uint8Array(bytes).buffer], { type: "application/pdf" });
}
