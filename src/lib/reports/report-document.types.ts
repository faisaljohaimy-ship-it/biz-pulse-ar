/**
 * نموذج التقرير — **نسخة محلّية مؤقّتة تحتاج توحيدًا**.
 *
 * وكيل آخر يكتب الآن `src/lib/reports/report-model.ts`. هذا الملف مرآة
 * مطابقة في الشكل (ترويسة + `sections[]`، و`blocks` اتّحاد سداسي) كُتبت
 * كي لا يتوقّف تصديرا الجدول والعرض على وصوله. **عند وصول النموذج
 * الرسمي: يُحذف هذا الملف ويُعاد توجيه المستوردَين إليه — ولا يُترك
 * تعريفان.** ما يجب أن يتطابق حرفيًّا عند التوحيد هو أسماء `kind` الستة
 * وموضع القيم القابلة للغياب (`null`)، فعليهما يقوم حارس المادة ٢٧.
 *
 * ــ لماذا ملف ثالث ولم تُوضع الأنواع داخل أحد التصديرين ــ
 * لو سكنت الأنواع في `xlsx-export.ts` لاستوردها `deck.ts` منه، فارتبط
 * عرض HTML القائم بذاته بوحدة تستدعي `xlsx` — وهي أثقل تبعية في هذا
 * المجلّد. الفصل يُبقي رسم العرض بلا أي تبعية على الإطلاق.
 */

/**
 * المادة ٢٧ — الصدق العددي. ما لم يُقَس يُكتب بهذا النصّ حرفيًّا: لا صفرًا
 * ولا خليّة فارغة. والفرق ليس تجميليًّا: الخليّة الفارغة تُحسب صفرًا في أي
 * `AVERAGE`، فيهبط المتوسط بمقدار ما لم يُقَس أصلًا.
 */
export const UNMEASURED_AR = "لم يُقَس";

/** حين لا تُحدَّد منطقة فالتقرير على مستوى المملكة — وهذا ليس غيابَ قياس. */
export const ALL_REGIONS_AR = "كل المناطق";

export type ReportPeriod = {
  /** ISO 8601 — بداية النافذة. */
  fromIso: string;
  /** ISO 8601 — نهايتها. */
  toIso: string;
  /** تسمية عربية جاهزة تتقدّم على الاشتقاق من التاريخين. */
  label?: string;
};

export type ReportRegion = {
  /** معرّف من `regions.ts` — المرجع الجغرافي الوحيد. */
  id: string;
  labelAr: string;
};

export type ReportHeader = {
  title: string;
  subtitle?: string;
  period: ReportPeriod;
  /** `null` = التقرير غير مقيّد بمنطقة. */
  region: ReportRegion | null;
  generatedAtIso: string;
  /** كل بيانات العرض محاكاة موسومة — والوسم يُكتب، لا يُفترض. */
  isSimulation: boolean;
  /** نطاق التقرير كما في `report-scope.ts` (نصّ عربي جاهز). */
  scopeAr?: string;
};

/**
 * صورة مضمَّنة. **`dataUri` وحدها مقبولة** — العرض يُفتح بلا شبكة، فأي
 * عنوان خارجي يعطي مربّعًا مكسورًا أمام الحضور.
 */
export type ReportImage = {
  dataUri: string;
  alt?: string;
  widthPx?: number;
  heightPx?: number;
};

/** `null` / `undefined` = لم يُقَس. وكذلك `NaN` و`Infinity` (قسمة على صفر). */
export type ReportCellValue = string | number | boolean | null | undefined;

export type ReportTableColumn = {
  key: string;
  label: string;
  /** عمود رقمي — يُكتب في الجدول كرقم لا كنصّ، فتعمل عليه دوال Excel. */
  numeric?: boolean;
};

export type ProseBlock = {
  kind: "prose";
  title?: string;
  paragraphs: string[];
};

export type TableBlock = {
  kind: "table";
  title?: string;
  columns: ReportTableColumn[];
  rows: Array<Record<string, ReportCellValue>>;
  footnote?: string;
};

export type ChartSeries = {
  name: string;
  /** طول المصفوفة يوازي `categories`؛ الفجوة `null` لا صفر. */
  values: Array<number | null | undefined>;
};

export type ChartBlock = {
  kind: "chart";
  title?: string;
  chartType: "bar" | "line" | "pie";
  categories: string[];
  series: ChartSeries[];
  unit?: string;
  /** صورة جاهزة؛ حين تغيب يُرسم المخطّط SVG داخل العرض. */
  image?: ReportImage;
};

export type FigureBlock = {
  kind: "figure";
  title?: string;
  image: ReportImage;
  caption?: string;
};

export type KpiItem = {
  label: string;
  value: number | string | null | undefined;
  unit?: string;
  /** تغيّر النسبة عن الفترة السابقة؛ `null` = لم يُقَس. */
  deltaPct?: number | null;
};

export type KpiGridBlock = {
  kind: "kpi-grid";
  title?: string;
  items: KpiItem[];
};

/**
 * `danger` أحمر و`warning` كهرماني — لا يُوحَّدان. واللون وحده لا يكفي
 * (WCAG 2.2 §1.4.1)، فلكلٍّ شكلٌ يتبع عرف لوحات السلامة: مثمّن = خطر ·
 * مثلث = تحذير · دائرة = سليم.
 */
export type CalloutTone = "info" | "success" | "warning" | "danger";

export type CalloutBlock = {
  kind: "callout";
  tone: CalloutTone;
  title?: string;
  body: string;
};

export type ReportBlock =
  | ProseBlock
  | TableBlock
  | ChartBlock
  | FigureBlock
  | KpiGridBlock
  | CalloutBlock;

export type ReportSection = {
  id: string;
  title: string;
  summary?: string;
  blocks: ReportBlock[];
};

export type ReportDocument = {
  header: ReportHeader;
  sections: ReportSection[];
};

/**
 * هل القيمة غائبة عن القياس؟
 *
 * `NaN` و`Infinity` محسوبان غيابًا عمدًا: كلاهما ناتج قسمة على صفر — أي
 * على «بلا عيّنة» — وكتابته كرقم في خليّة يجعل العمود كلّه `#VALUE!` أو،
 * أسوأ، رقمًا يقرأه القارئ على أنه قياس.
 */
export function isUnmeasured(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return !Number.isFinite(value);
  return false;
}

/** التسمية العربية للفترة: `label` إن وُجدت، وإلّا «من … إلى …». */
export function periodLabelAr(period: ReportPeriod): string {
  if (period.label && period.label.trim()) return period.label.trim();
  return `من ${period.fromIso} إلى ${period.toIso}`;
}

/** وسم مصدر البيانات — يُكتب صريحًا في الجدول وعلى كل شريحة. */
export function simulationLabelAr(isSimulation: boolean): string {
  return isSimulation ? "بيانات محاكاة مرجعية — is_simulation = true" : "بيانات تشغيل حيّة";
}
