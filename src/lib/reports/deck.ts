/**
 * تحويل التقرير إلى **عرض شرائح HTML قائم بذاته**: ملف واحد، أنماط
 * مضمّنة، بلا سطر جافاسكربت وبلا طلب شبكة واحد.
 *
 * ــ لماذا HTML ولا مكتبة pptx ــ
 * قرار واعٍ لا نقص. أصغر مولّد pptx يضيف مئات الكيلوبايتات إلى حزمة
 * متبقّيها ٣٢٠ كيلوبايت، فيقتل ميزانية الأداء لأجل صيغةٍ نهايتها العملية
 * أن تُفتح ثم تُطبع. والملف الواحد يُفتح في أي متصفّح على أي جهاز، ويصير
 * PDF بخطوة واحدة (طباعة ← حفظ كـPDF) بمقاس 16:9 مضبوط في `@page`،
 * ويُرسل بالبريد بلا تبعية ولا تطبيق. المقابل المفقود: لا يُحرَّر في
 * PowerPoint. وهذا ما اشتُري به بقاء الميزانية.
 *
 * ــ ولماذا بلا جافاسكربت ــ
 * العرض يُفتح من قرص أو من مرفق بريد، وكثير من العارضات تمنع السكربت في
 * `file://` أو في المعاينة داخل البريد. شرائح تتصفّح بالتمرير تعمل في كل
 * تلك الحالات؛ شرائح تحتاج مستمع لوحة مفاتيح لا تعمل في بعضها.
 *
 * ــ الرسوم ــ
 * كل رسم صورة مضمَّنة `data:` URI. إن جاءت الكتلة بصورة جاهزة استُعملت،
 * وإلّا رُسم المخطّط SVG هنا وسُلسل إلى `data:image/svg+xml`. وأي عنوان
 * صورة لا يبدأ بـ`data:image/` **يُسقط** ويُستبدل بسطر يشرح السبب: العرض
 * بلا شبكة، فالعنوان الخارجي يعطي مربّعًا مكسورًا أمام الحضور.
 */
import {
  ALL_REGIONS_AR,
  UNMEASURED_AR,
  isUnmeasured,
  periodLabelAr,
  simulationLabelAr,
  type CalloutTone,
  type ChartBlock,
  type ReportBlock,
  type ReportCellValue,
  type ReportDocument,
  type ReportImage,
  type ReportSection,
  type TableBlock,
} from "./report-document.types";

export type DeckOptions = {
  /** أقصى عدد صفوف جدول في شريحة واحدة قبل الانتقال إلى «تابع». */
  maxTableRowsPerSlide?: number;
  /** ميزانية ازدحام الشريحة؛ الرفع يزحم، والخفض يُكثر الشرائح. */
  slideBudget?: number;
};

const DEFAULTS = { maxTableRowsPerSlide: 9, slideBudget: 9 } as const;

/** «تابع» — لاحقة الشريحة المُكمِّلة لقسمها. */
const CONTINUED_AR = "تابع";

const TONE_AR: Record<CalloutTone, string> = {
  info: "إفادة",
  success: "سليم",
  warning: "تحذير",
  danger: "خطر",
};

/**
 * الشكل يتبع عرف لوحات السلامة: مثمّن = خطر · مثلث = تحذير · دائرة =
 * سليم. اللون وحده لا يكفي (WCAG 2.2 §1.4.1) — والأحمر/الكهرماني بالذات
 * هو الزوج الذي يطمسه عمى الألوان الأحمر-الأخضر، على شريحة وظيفتها
 * الإنذار.
 */
const TONE_GLYPH: Record<CalloutTone, string> = {
  info: "<svg viewBox='0 0 24 24' aria-hidden='true'><rect x='4' y='4' width='16' height='16' rx='4'/></svg>",
  success: "<svg viewBox='0 0 24 24' aria-hidden='true'><circle cx='12' cy='12' r='8'/></svg>",
  warning: "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M12 3 L22 20 L2 20 Z'/></svg>",
  danger:
    "<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M8 2 H16 L22 8 V16 L16 22 H8 L2 16 V8 Z'/></svg>",
};

const SERIES_COLORS = ["#10B981", "#22D3EE", "#F5A524", "#A78BFA", "#F472B6", "#60A5FA"] as const;

/* ────────────────────────────── أدوات نصّية ─────────────────────────── */

/** تهريب HTML. يُطبَّق على **كل** نصّ قادم من المستند بلا استثناء. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * هل العنوان صورة مضمَّنة؟ العرض يُفتح بلا شبكة، فما ليس `data:image/`
 * لا يُعرض أصلًا — والقبول الصامت لعنوان خارجي يعني مربّعًا مكسورًا على
 * الشاشة أثناء العرض التنفيذي.
 */
export function isEmbeddedImage(uri: string): boolean {
  return /^data:image\/[a-z0-9.+-]+[;,]/i.test(uri.trim());
}

/** تسلسل SVG إلى `data:` URI بترميز نسبة مئوية — أسلم من base64 مع العربية. */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function formatNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

/** نصّ الخليّة في الشريحة. الغياب يُكتب «لم يُقَس» ولا يُصفَّر. */
export function formatDeckValue(value: ReportCellValue): string {
  if (isUnmeasured(value)) return UNMEASURED_AR;
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "boolean") return value ? "نعم" : "لا";
  const text = String(value).trim();
  return text === "" ? UNMEASURED_AR : text;
}

/** الأرقام تُعزل اتّجاهيًّا كي لا تنقلب `12.5%` داخل فقرة عربية. */
function num(text: string): string {
  return `<span class="num" dir="ltr">${escapeHtml(text)}</span>`;
}

function valueCellHtml(value: ReportCellValue): string {
  const text = formatDeckValue(value);
  if (text === UNMEASURED_AR) return `<span class="nm">${escapeHtml(text)}</span>`;
  return typeof value === "number" ? num(text) : escapeHtml(text);
}

/* ────────────────────────────── رسم المخطّطات ───────────────────────── */

const CHART_W = 880;
const CHART_H = 420;
const PAD = { top: 46, right: 74, bottom: 54, left: 28 };

function svgText(
  text: string,
  x: number,
  y: number,
  opts: { size?: number; fill?: string; anchor?: string; weight?: number } = {},
): string {
  const { size = 13, fill = "#8CA0B8", anchor = "middle", weight = 400 } = opts;
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}">${escapeHtml(text)}</text>`;
}

function chartFrame(inner: string): string {
  /* الخطوط تُعلن داخل الـSVG نفسه: صورة `<img>` لا ترث أنماط الصفحة. */
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CHART_W} ${CHART_H}" width="${CHART_W}" height="${CHART_H}" direction="rtl" xml:lang="ar" role="img"><style>text{font-family:"IBM Plex Sans Arabic","Tajawal","Cairo","Noto Naskh Arabic","Segoe UI",sans-serif}</style><rect width="${CHART_W}" height="${CHART_H}" fill="#0B1A2E" rx="14"/>${inner}</svg>`;
}

function legendSvg(names: string[]): string {
  let x = CHART_W - 18;
  const parts: string[] = [];
  names.forEach((name, i) => {
    const color = SERIES_COLORS[i % SERIES_COLORS.length];
    const label = name.trim() || `سلسلة ${i + 1}`;
    const width = label.length * 8 + 26;
    x -= width;
    parts.push(
      `<rect x="${x + width - 14}" y="14" width="10" height="10" rx="2" fill="${color}"/>`,
    );
    parts.push(svgText(label, x + width - 20, 23, { size: 12, fill: "#EAF2FA", anchor: "end" }));
  });
  return parts.join("");
}

function finiteValues(block: ChartBlock): number[] {
  const out: number[] = [];
  for (const series of block.series) {
    for (const value of series.values) {
      if (!isUnmeasured(value) && typeof value === "number") out.push(value);
    }
  }
  return out;
}

function unmeasuredCount(block: ChartBlock): number {
  let count = 0;
  for (const series of block.series) {
    for (let i = 0; i < block.categories.length; i++) {
      if (isUnmeasured(series.values[i])) count++;
    }
  }
  return count;
}

function unmeasuredNote(block: ChartBlock): string {
  const missing = unmeasuredCount(block);
  if (missing === 0) return "";
  /* الفجوة تُعلَن ولا تُرسم صفرًا — رسمها صفرًا يقلب «لم نقس» إلى «لا شيء». */
  return svgText(
    `${missing} قيمة ${UNMEASURED_AR} — حُذفت ولم تُرسم صفرًا`,
    CHART_W - 18,
    CHART_H - 12,
    {
      size: 12,
      fill: "#F5A524",
      anchor: "end",
    },
  );
}

function emptyChartSvg(message: string): string {
  return chartFrame(
    svgText(message, CHART_W / 2, CHART_H / 2, { size: 20, fill: "#8CA0B8", weight: 600 }),
  );
}

/** محور القيم على اليمين — موضعه في المخطّطات العربية. */
function valueAxis(max: number): { grid: string; y: (v: number) => number } {
  const plotTop = PAD.top;
  const plotBottom = CHART_H - PAD.bottom;
  const y = (v: number) => plotBottom - (v / max) * (plotBottom - plotTop);
  const lines: string[] = [];
  for (let step = 0; step <= 4; step++) {
    const value = (max / 4) * step;
    const gy = y(value);
    lines.push(
      `<line x1="${PAD.left}" y1="${gy}" x2="${CHART_W - PAD.right}" y2="${gy}" stroke="#22D3EE" stroke-opacity="0.14"/>`,
    );
    lines.push(
      svgText(formatNumber(value), CHART_W - PAD.right + 10, gy + 4, { size: 11, anchor: "start" }),
    );
  }
  return { grid: lines.join(""), y };
}

/** إحداثي فئة، محسوبًا **من اليمين** — العرض عربي والفئة الأولى يمينًا. */
function bandCenter(index: number, count: number): number {
  const width = (CHART_W - PAD.left - PAD.right) / Math.max(1, count);
  return CHART_W - PAD.right - (index + 0.5) * width;
}

function barChartSvg(block: ChartBlock): string {
  const values = finiteValues(block);
  if (values.length === 0) return emptyChartSvg(UNMEASURED_AR);
  const max = Math.max(...values, 0) || 1;
  const { grid, y } = valueAxis(max);
  const count = block.categories.length;
  const band = (CHART_W - PAD.left - PAD.right) / Math.max(1, count);
  const barW = Math.max(4, (band - 14) / Math.max(1, block.series.length));
  const bars: string[] = [];
  block.categories.forEach((category, i) => {
    const center = bandCenter(i, count);
    block.series.forEach((series, s) => {
      const value = series.values[i];
      if (isUnmeasured(value) || typeof value !== "number") return;
      const height = Math.max(1, y(0) - y(value));
      const x = center + (block.series.length * barW) / 2 - (s + 1) * barW;
      bars.push(
        `<rect x="${x.toFixed(1)}" y="${y(value).toFixed(1)}" width="${(barW - 2).toFixed(1)}" height="${height.toFixed(1)}" fill="${SERIES_COLORS[s % SERIES_COLORS.length]}" rx="2"/>`,
      );
    });
    bars.push(svgText(category, center, CHART_H - PAD.bottom + 20, { size: 11 }));
  });
  return chartFrame(
    grid + bars.join("") + legendSvg(block.series.map((s) => s.name)) + unmeasuredNote(block),
  );
}

function lineChartSvg(block: ChartBlock): string {
  const values = finiteValues(block);
  if (values.length === 0) return emptyChartSvg(UNMEASURED_AR);
  const max = Math.max(...values, 0) || 1;
  const { grid, y } = valueAxis(max);
  const count = block.categories.length;
  const paths: string[] = [];
  block.series.forEach((series, s) => {
    const color = SERIES_COLORS[s % SERIES_COLORS.length];
    /* كل فجوة تقطع الخط ولا تُجسَر: الجسر يرسم قيمة لم تُقَس. */
    let segment: string[] = [];
    const flush = () => {
      if (segment.length > 1) {
        paths.push(
          `<polyline points="${segment.join(" ")}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>`,
        );
      } else if (segment.length === 1) {
        const [px, py] = segment[0].split(",");
        paths.push(`<circle cx="${px}" cy="${py}" r="3.5" fill="${color}"/>`);
      }
      segment = [];
    };
    block.categories.forEach((_, i) => {
      const value = series.values[i];
      if (isUnmeasured(value) || typeof value !== "number") {
        flush();
        return;
      }
      segment.push(`${bandCenter(i, count).toFixed(1)},${y(value).toFixed(1)}`);
    });
    flush();
  });
  const labels = block.categories.map((category, i) =>
    svgText(category, bandCenter(i, count), CHART_H - PAD.bottom + 20, { size: 11 }),
  );
  return chartFrame(
    grid +
      paths.join("") +
      labels.join("") +
      legendSvg(block.series.map((s) => s.name)) +
      unmeasuredNote(block),
  );
}

function pieChartSvg(block: ChartBlock): string {
  const series = block.series[0];
  if (!series) return emptyChartSvg(UNMEASURED_AR);
  const slices = block.categories
    .map((category, i) => ({ category, value: series.values[i] }))
    .filter(
      (s): s is { category: string; value: number } =>
        !isUnmeasured(s.value) && typeof s.value === "number" && s.value > 0,
    );
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) return emptyChartSvg(UNMEASURED_AR);
  const cx = CHART_W / 2 + 90;
  const cy = CHART_H / 2 + 6;
  const r = 130;
  let angle = -Math.PI / 2;
  const parts: string[] = [];
  slices.forEach((slice, i) => {
    const sweep = (slice.value / total) * Math.PI * 2;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    parts.push(
      `<path d="M ${cx} ${cy} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z" fill="${SERIES_COLORS[i % SERIES_COLORS.length]}" stroke="#0B1A2E" stroke-width="2"/>`,
    );
  });
  slices.forEach((slice, i) => {
    const ly = 70 + i * 26;
    parts.push(
      `<rect x="${PAD.left + 14}" y="${ly - 10}" width="12" height="12" rx="3" fill="${SERIES_COLORS[i % SERIES_COLORS.length]}"/>`,
    );
    const share = Math.round((slice.value / total) * 1000) / 10;
    parts.push(
      svgText(`${slice.category} — ${share}%`, PAD.left + 34, ly, {
        size: 13,
        fill: "#EAF2FA",
        anchor: "start",
      }),
    );
  });
  return chartFrame(parts.join("") + unmeasuredNote(block));
}

/** يُنتج صورة المخطّط: الجاهزة إن صحّت، وإلّا SVG مرسوم هنا. */
export function chartImageUri(block: ChartBlock): string {
  if (block.image && isEmbeddedImage(block.image.dataUri)) return block.image.dataUri;
  switch (block.chartType) {
    case "pie":
      return svgToDataUri(pieChartSvg(block));
    case "line":
      return svgToDataUri(lineChartSvg(block));
    case "bar":
    default:
      return svgToDataUri(barChartSvg(block));
  }
}

/* ────────────────────────────── تقسيم الشرائح ───────────────────────── */

type DeckSlide = { sectionTitle: string; continued: boolean; blocks: ReportBlock[] };

function blockWeight(block: ReportBlock): number {
  switch (block.kind) {
    case "prose":
      return 0.6 + block.paragraphs.length * 0.9;
    case "table":
      return 1.2 + block.rows.length * 0.55;
    case "chart":
    case "figure":
      return 5;
    case "kpi-grid":
      return 1 + Math.ceil(block.items.length / 4) * 1.6;
    case "callout":
      return 1.6;
    default:
      return 1;
  }
}

/** جدول أطول من سعة الشريحة يُقطَّع، ويُعاد رأسه في كل قطعة. */
function splitTable(block: TableBlock, maxRows: number): TableBlock[] {
  if (block.rows.length <= maxRows) return [block];
  const chunks: TableBlock[] = [];
  for (let i = 0; i < block.rows.length; i += maxRows) {
    const isFirst = i === 0;
    const base = block.title?.trim();
    chunks.push({
      ...block,
      title: isFirst ? block.title : base ? `${base} (${CONTINUED_AR})` : undefined,
      rows: block.rows.slice(i, i + maxRows),
      footnote: i + maxRows >= block.rows.length ? block.footnote : undefined,
    });
  }
  return chunks;
}

export function paginateSection(section: ReportSection, options: DeckOptions = {}): DeckSlide[] {
  const maxRows = options.maxTableRowsPerSlide ?? DEFAULTS.maxTableRowsPerSlide;
  const budget = options.slideBudget ?? DEFAULTS.slideBudget;
  const expanded: ReportBlock[] = [];
  for (const block of section.blocks) {
    if (block.kind === "table") expanded.push(...splitTable(block, maxRows));
    else expanded.push(block);
  }

  const slides: DeckSlide[] = [];
  let current: ReportBlock[] = [];
  let weight = 0;
  for (const block of expanded) {
    const w = blockWeight(block);
    if (current.length > 0 && weight + w > budget) {
      slides.push({ sectionTitle: section.title, continued: slides.length > 0, blocks: current });
      current = [];
      weight = 0;
    }
    current.push(block);
    weight += w;
  }
  /* قسم بلا كتل يبقى شريحة: حذفه يُخفي غياب محتواه بدل أن يُظهره. */
  slides.push({ sectionTitle: section.title, continued: slides.length > 0, blocks: current });
  return slides;
}

/* ────────────────────────────── ترميز الكتل ─────────────────────────── */

function imageHtml(image: ReportImage, className: string): string {
  if (!isEmbeddedImage(image.dataUri)) {
    return `<p class="dropped">صورة خارجية أُسقطت — هذا العرض يُفتح بلا شبكة، فلا يُحمَّل عنوان بعيد.</p>`;
  }
  const alt = escapeHtml(image.alt?.trim() || "رسم بياني");
  return `<img class="${className}" src="${escapeHtml(image.dataUri)}" alt="${alt}" />`;
}

function tableHtml(block: TableBlock): string {
  const head = block.columns.map((col) => `<th scope="col">${escapeHtml(col.label)}</th>`).join("");
  const body = block.rows
    .map(
      (row) =>
        `<tr>${block.columns.map((col) => `<td>${valueCellHtml(row[col.key])}</td>`).join("")}</tr>`,
    )
    .join("");
  const caption = block.title?.trim() ? `<caption>${escapeHtml(block.title.trim())}</caption>` : "";
  const note = block.footnote?.trim()
    ? `<p class="note">${escapeHtml(block.footnote.trim())}</p>`
    : "";
  return `<div class="block"><table>${caption}<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>${note}</div>`;
}

function blockHtml(block: ReportBlock): string {
  switch (block.kind) {
    case "prose": {
      const title = block.title?.trim() ? `<h3>${escapeHtml(block.title.trim())}</h3>` : "";
      const paragraphs = block.paragraphs
        .filter((p) => p.trim() !== "")
        .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
        .join("");
      return `<div class="block prose">${title}${paragraphs}</div>`;
    }
    case "kpi-grid": {
      const title = block.title?.trim() ? `<h3>${escapeHtml(block.title.trim())}</h3>` : "";
      const cards = block.items
        .map((item) => {
          const missing = isUnmeasured(item.value) || String(item.value).trim() === "";
          const value = formatDeckValue(item.value);
          const unit =
            !missing && item.unit?.trim()
              ? `<span class="kpi-unit">${escapeHtml(item.unit.trim())}</span>`
              : "";
          const delta = isUnmeasured(item.deltaPct)
            ? `<span class="kpi-delta nm">${escapeHtml(UNMEASURED_AR)}</span>`
            : `<span class="kpi-delta">${num(`${(item.deltaPct as number) > 0 ? "+" : ""}${formatNumber(item.deltaPct as number)}%`)}</span>`;
          return `<div class="kpi"><span class="kpi-label">${escapeHtml(item.label)}</span><span class="kpi-value${missing ? " nm" : ""}">${missing ? escapeHtml(value) : num(value)}${unit}</span>${delta}</div>`;
        })
        .join("");
      return `<div class="block">${title}<div class="kpi-grid">${cards}</div></div>`;
    }
    case "table":
      return tableHtml(block);
    case "chart": {
      const title = block.title?.trim() ? `<h3>${escapeHtml(block.title.trim())}</h3>` : "";
      const unit = block.unit?.trim()
        ? `<p class="note">الوحدة: ${escapeHtml(block.unit.trim())}</p>`
        : "";
      const alt = escapeHtml(block.image?.alt?.trim() || block.title?.trim() || "رسم بياني");
      const uri = chartImageUri(block);
      return `<div class="block chart">${title}<img class="chart-img" src="${escapeHtml(uri)}" alt="${alt}" />${unit}</div>`;
    }
    case "figure": {
      const title = block.title?.trim() ? `<h3>${escapeHtml(block.title.trim())}</h3>` : "";
      const caption = block.caption?.trim()
        ? `<p class="note">${escapeHtml(block.caption.trim())}</p>`
        : "";
      return `<div class="block chart">${title}${imageHtml(block.image, "chart-img")}${caption}</div>`;
    }
    case "callout": {
      const title = block.title?.trim()
        ? `<strong>${escapeHtml(block.title.trim())}</strong>`
        : `<strong>${escapeHtml(TONE_AR[block.tone])}</strong>`;
      return `<div class="block callout tone-${block.tone}"><span class="tone-mark" aria-hidden="true">${TONE_GLYPH[block.tone]}</span><span class="tone-name">${escapeHtml(TONE_AR[block.tone])}</span><div class="callout-body">${title}<p>${escapeHtml(block.body)}</p></div></div>`;
    }
    default:
      return "";
  }
}

/* ────────────────────────────── الشرائح ─────────────────────────────── */

function badgeHtml(isSimulation: boolean): string {
  const cls = isSimulation ? "badge sim" : "badge live";
  return `<span class="${cls}">${escapeHtml(simulationLabelAr(isSimulation))}</span>`;
}

function slideShell(
  doc: ReportDocument,
  index: number,
  total: number,
  label: string,
  inner: string,
  extraClass = "",
): string {
  return `<section class="slide${extraClass ? ` ${extraClass}` : ""}" aria-label="${escapeHtml(label)}">${inner}<footer class="slide-foot">${badgeHtml(doc.header.isSimulation)}<span class="foot-num">${num(`${index} / ${total}`)}</span></footer></section>`;
}

function coverHtml(doc: ReportDocument, total: number): string {
  const { header } = doc;
  const region = header.region ? header.region.labelAr : ALL_REGIONS_AR;
  const meta = [
    ["الفترة", periodLabelAr(header.period)],
    ["المنطقة", region],
    ["تاريخ الإصدار", header.generatedAtIso],
  ];
  if (header.scopeAr?.trim()) meta.push(["النطاق", header.scopeAr.trim()]);
  const inner = `<div class="cover-body">
<p class="wordmark">سَدِيد</p>
<h1>${escapeHtml(header.title)}</h1>
${header.subtitle?.trim() ? `<p class="cover-sub">${escapeHtml(header.subtitle.trim())}</p>` : ""}
<dl class="cover-meta">${meta.map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`).join("")}</dl>
</div>`;
  return slideShell(doc, 1, total, `غلاف — ${header.title}`, inner, "cover");
}

function sectionSlideHtml(
  doc: ReportDocument,
  slide: DeckSlide,
  index: number,
  total: number,
  summary: string | undefined,
): string {
  const title = slide.continued ? `${slide.sectionTitle} (${CONTINUED_AR})` : slide.sectionTitle;
  const sub =
    !slide.continued && summary?.trim()
      ? `<p class="slide-sub">${escapeHtml(summary.trim())}</p>`
      : "";
  const body =
    slide.blocks.length > 0
      ? slide.blocks.map(blockHtml).join("")
      : `<p class="dropped">لا محتوى في هذا القسم.</p>`;
  const inner = `<header class="slide-head"><h2>${escapeHtml(title)}</h2>${sub}</header><div class="slide-body">${body}</div>`;
  return slideShell(doc, index, total, title, inner);
}

/* ────────────────────────────── الأنماط ─────────────────────────────── */

/**
 * الخطوط محلّية حصرًا — لا `@font-face` ولا `@import`: العرض بلا شبكة،
 * وأي تحميل خارجي إمّا يفشل صامتًا أو يوقف الرسم حتى المهلة.
 */
const FONT_STACK =
  '"IBM Plex Sans Arabic","Tajawal","Cairo","Noto Naskh Arabic","Segoe UI",system-ui,-apple-system,sans-serif';

const STYLES = `
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:#01060F;color:#EAF2FA;font-family:${FONT_STACK};line-height:1.6}
.deck{display:flex;flex-direction:column;align-items:center;gap:24px;padding:24px 12px}
.slide{position:relative;width:1280px;height:720px;flex:0 0 auto;background:#050B16;border:1px solid rgba(34,211,238,.22);border-radius:18px;padding:44px 52px 64px;overflow:hidden;display:flex;flex-direction:column;
background-image:linear-gradient(180deg,rgba(16,185,129,.10),transparent 42%)}
.slide::before{content:"";position:absolute;inset:0 0 auto 0;height:5px;background:linear-gradient(90deg,#10B981,#22D3EE)}
.slide-head h2{margin:0;font-size:36px;font-weight:700;color:#EAF2FA}
.slide-sub{margin:6px 0 0;color:#8CA0B8;font-size:17px}
.slide-body{flex:1 1 auto;margin-top:20px;display:flex;flex-direction:column;gap:16px;overflow:hidden}
.slide-foot{position:absolute;inset:auto 52px 20px 52px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.foot-num{color:#8CA0B8;font-size:13px}
.badge{display:inline-flex;align-items:center;gap:8px;padding:5px 12px;border-radius:999px;font-size:13px;font-weight:600;border:1px solid}
.badge::before{content:"";width:8px;height:8px;border-radius:50%}
.badge.sim{color:#F5A524;border-color:rgba(245,165,36,.55);background:rgba(245,165,36,.10)}
.badge.sim::before{background:#F5A524}
.badge.live{color:#10B981;border-color:rgba(16,185,129,.55);background:rgba(16,185,129,.10)}
.badge.live::before{background:#10B981}
.cover{justify-content:center}
.cover-body{text-align:center;margin:auto;max-width:900px}
.wordmark{margin:0 0 18px;font-size:30px;font-weight:700;color:#10B981;letter-spacing:.02em}
.cover h1{margin:0;font-size:56px;line-height:1.25;font-weight:700}
.cover-sub{margin:14px 0 0;font-size:21px;color:#8CA0B8}
.cover-meta{margin:34px 0 0;display:flex;flex-wrap:wrap;justify-content:center;gap:14px}
.cover-meta div{border:1px solid rgba(34,211,238,.22);border-radius:12px;padding:10px 18px;background:rgba(11,26,46,.85);min-width:190px}
.cover-meta dt{font-size:12px;color:#8CA0B8;margin:0}
.cover-meta dd{margin:4px 0 0;font-size:16px;font-weight:600}
.block{background:rgba(11,26,46,.72);border:1px solid rgba(34,211,238,.16);border-radius:14px;padding:16px 20px}
.block h3{margin:0 0 10px;font-size:20px;font-weight:700;color:#22D3EE}
.prose p{margin:0 0 8px;font-size:17px}
.prose p:last-child{margin-bottom:0}
.note{margin:8px 0 0;font-size:13px;color:#8CA0B8}
.num{font-variant-numeric:tabular-nums;unicode-bidi:isolate}
.nm{color:#F5A524;font-weight:600}
table{width:100%;border-collapse:collapse;font-size:15px}
caption{caption-side:top;text-align:right;font-size:20px;font-weight:700;color:#22D3EE;padding-bottom:10px}
th,td{padding:7px 10px;text-align:right;border-bottom:1px solid rgba(34,211,238,.14)}
th{font-size:13px;color:#8CA0B8;font-weight:600;background:rgba(34,211,238,.07)}
tbody tr:nth-child(even){background:rgba(34,211,238,.04)}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.kpi{border:1px solid rgba(34,211,238,.2);border-radius:12px;padding:12px 14px;background:rgba(5,11,22,.7);display:flex;flex-direction:column;gap:4px}
.kpi-label{font-size:13px;color:#8CA0B8}
.kpi-value{font-size:30px;font-weight:700;color:#22D3EE}
.kpi-value.nm{font-size:20px}
.kpi-unit{font-size:14px;color:#8CA0B8;margin-inline-start:6px}
.kpi-delta{font-size:13px;color:#8CA0B8}
.chart{display:flex;flex-direction:column;align-items:center}
.chart-img{max-width:100%;max-height:420px;height:auto;border-radius:10px}
.dropped{margin:0;color:#8CA0B8;font-size:14px;font-style:italic}
.callout{display:flex;align-items:flex-start;gap:12px;border-inline-start-width:5px;border-inline-start-style:solid}
.callout .tone-mark{flex:0 0 auto;width:26px;height:26px;margin-top:2px}
.callout .tone-mark svg{width:26px;height:26px}
.callout .tone-name{font-size:13px;font-weight:700;padding:2px 10px;border-radius:999px;border:1px solid}
.callout-body{flex:1 1 auto}
.callout-body strong{display:block;font-size:17px;margin-bottom:2px}
.callout-body p{margin:0;font-size:15px;color:#C8D6E5}
.tone-info{border-color:rgba(34,211,238,.45);background:rgba(34,211,238,.09)}
.tone-info .tone-mark svg{fill:#22D3EE}
.tone-info .tone-name{color:#22D3EE;border-color:rgba(34,211,238,.5)}
.tone-info strong{color:#22D3EE}
.tone-success{border-color:rgba(16,185,129,.45);background:rgba(16,185,129,.09)}
.tone-success .tone-mark svg{fill:#10B981}
.tone-success .tone-name{color:#10B981;border-color:rgba(16,185,129,.5)}
.tone-success strong{color:#10B981}
.tone-warning{border-color:rgba(245,165,36,.55);background:rgba(245,165,36,.10)}
.tone-warning .tone-mark svg{fill:#F5A524}
.tone-warning .tone-name{color:#F5A524;border-color:rgba(245,165,36,.6)}
.tone-warning strong{color:#F5A524}
.tone-danger{border-color:rgba(242,107,107,.6);background:rgba(242,107,107,.12)}
.tone-danger .tone-mark svg{fill:#F26B6B}
.tone-danger .tone-name{color:#F26B6B;border-color:rgba(242,107,107,.65)}
.tone-danger strong{color:#F26B6B}
@page{size:13.333in 7.5in;margin:0}
@media print{
body{background:#050B16}
.deck{gap:0;padding:0}
.slide{width:100%;height:100vh;border:0;border-radius:0;break-after:page;page-break-after:always;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.slide:last-child{break-after:auto;page-break-after:auto}
}
@media screen and (max-width:1340px){
.slide{transform-origin:top center}
}
`;

/* ────────────────────────────── المخرج ──────────────────────────────── */

/**
 * يبني ملف العرض كاملًا. المخرج نصّ HTML واحد يُكتب إلى قرص أو يُنزَّل
 * كما هو؛ لا يعتمد على أي ملف مجاور.
 */
export function buildReportDeck(doc: ReportDocument, options: DeckOptions = {}): string {
  const slidePlans = doc.sections.flatMap((section) =>
    paginateSection(section, options).map((slide) => ({ slide, summary: section.summary })),
  );
  const total = slidePlans.length + 1;
  const slides = [
    coverHtml(doc, total),
    ...slidePlans.map((plan, i) => sectionSlideHtml(doc, plan.slide, i + 2, total, plan.summary)),
  ].join("\n");

  const title = `${doc.header.title} — عرض`;
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="generator" content="SADEED report deck" />
<meta name="color-scheme" content="dark" />
<title>${escapeHtml(title)}</title>
<style>${STYLES}</style>
</head>
<body>
<main class="deck">
${slides}
</main>
</body>
</html>
`;
}
