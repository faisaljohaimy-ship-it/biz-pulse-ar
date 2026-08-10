/**
 * نموذج مستند التقرير — **تعريف مؤقّت محلّي بانتظار التوحيد.**
 *
 * ⚠️ TODO(unify): النموذج الرسمي يُكتب الآن في `src/lib/reports/report-model.ts`
 * على يد وكيل آخر. هذا الملف يعرّف النوع نفسه محلّيًّا حتى لا يتوقّف بناء
 * العارض على ذلك الملف، والوصف مطابق للعقد المتّفق عليه:
 *
 *   ReportDocument{ titleAr, titleEn, periodAr, periodEn, regionId, isSimulation, sections[] }
 *   ReportSection { titleAr, titleEn, blocks[] }
 *   ReportBlock   = prose | table | chart | figure | kpi-grid | callout
 *
 * عند التوحيد: احذف هذا الملف واستورد الأنواع من `@/lib/reports/report-model`.
 * لا يستورد العارض شيئًا من `report-model.ts` اليوم — نقطة التوحيد الوحيدة
 * هي هذا الملف.
 *
 * المنطقة تُشتقّ من `RegionId` في `src/lib/regions.ts` — المرجع الجغرافي
 * الوحيد؛ لا قائمة مناطق ثانية هنا ولا في العارض.
 */
import type { RegionId } from "@/lib/regions";

/** نغمة دلالية. «خطر» أحمر مثمّن · «تحذير» كهرماني مثلّث — لا يُوحَّدان. */
export type ReportTone = "info" | "success" | "warning" | "danger";

/** محاذاة عمود الجدول. الافتراضي `start` (يمين في RTL). */
export type ReportAlign = "start" | "center" | "end";

/** فقرات نصّية. العربية أساس، والإنجليزية مرافقة اختيارية. */
export interface ReportProseBlock {
  kind: "prose";
  titleAr?: string;
  titleEn?: string;
  paragraphsAr: string[];
  paragraphsEn?: string[];
}

export interface ReportTableColumn {
  key: string;
  labelAr: string;
  labelEn: string;
  align?: ReportAlign;
}

export type ReportTableCell = string | number;

/** جدول مفصَّل — له `<caption>` إلزامي وترويسة أعمدة موصوفة. */
export interface ReportTableBlock {
  kind: "table";
  captionAr: string;
  captionEn: string;
  columns: ReportTableColumn[];
  rows: Record<string, ReportTableCell>[];
  footnoteAr?: string;
  footnoteEn?: string;
}

export type ReportChartKind = "bar" | "line" | "donut";

export interface ReportChartPoint {
  labelAr: string;
  labelEn: string;
  value: number;
}

/**
 * رسم بياني. يُرسم SVG مضمّنًا (لا مكتبة رسم تعتمد على قياس الحاوية):
 * الرسم المعتمد على `ResizeObserver` لا يظهر عند أوّل رسم ولا في الطباعة،
 * وهذا يخالف شرط «مفتوح بمجرّد النظر».
 */
export interface ReportChartBlock {
  kind: "chart";
  chart: ReportChartKind;
  titleAr: string;
  titleEn: string;
  unitAr?: string;
  unitEn?: string;
  points: ReportChartPoint[];
}

/** صورة مدعِّمة — تُحمَّل فورًا (`eager`)، لا كسولًا. */
export interface ReportFigureBlock {
  kind: "figure";
  src: string;
  altAr: string;
  altEn?: string;
  captionAr: string;
  captionEn: string;
  creditAr?: string;
}

export interface ReportKpiItem {
  labelAr: string;
  labelEn: string;
  value: string | number;
  unitAr?: string;
  tone?: ReportTone;
  deltaAr?: string;
}

export interface ReportKpiGridBlock {
  kind: "kpi-grid";
  titleAr?: string;
  titleEn?: string;
  items: ReportKpiItem[];
}

export interface ReportCalloutBlock {
  kind: "callout";
  tone: ReportTone;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn?: string;
}

export type ReportBlock =
  | ReportProseBlock
  | ReportTableBlock
  | ReportChartBlock
  | ReportFigureBlock
  | ReportKpiGridBlock
  | ReportCalloutBlock;

export interface ReportSection {
  titleAr: string;
  titleEn: string;
  blocks: ReportBlock[];
}

export interface ReportDocument {
  titleAr: string;
  titleEn: string;
  periodAr: string;
  periodEn: string;
  regionId: RegionId;
  /** كل بيانات العرض محاكاة مرجعية — والشارة تظهر على الشاشة وفي الورق معًا. */
  isSimulation: boolean;
  sections: ReportSection[];
}
