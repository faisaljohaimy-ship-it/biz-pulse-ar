/**
 * تجميع «تقرير الدوريات حسب المنطقة» لأداة `sec_patrol_report_by_region` (٢٠٢٦/١١/٠٣).
 *
 * ## لماذا
 *
 * سؤال «أعطني تقرير الدوريات في كل منطقة» لا تجيبه أي طبقة حتمية (قِيس بالمطابقات الحقيقية:
 * `matchFastRecall` و`matchInstantDataAnswer` و`matchZeroCostAnswer` كلها `null`)، فيذهب إلى
 * النموذج. والنموذج نفسه لا طريق مباشرًا له إلى البيانات: المنطقة ليست على `sec_patrols`
 * (أعمدته: id · ref · site_id · team · route · status · checkpoints_* · started_at …) بل على
 * `sec_circles.region` عبر `sec_patrols.site_id → sec_sites.circle_id`، ولا اللقطة ولا
 * `sec_list_patrols` يختاران هذا الوصل. فكان يدور بأدواتٍ متكرّرة أو يتحوّط. الآن: استعلام
 * واحد، وتجميع هنا في الكود.
 *
 * ## الصدق العددي (المادة ٢٧)
 *
 * - منطقةٌ غير معروفة (لا موقع للدورية، أو لا دائرة للموقع، أو قيمة خارج المناطق الأربع في
 *   `regions.ts`) تُسمّى «غير محددة» — لا تُنسب إلى منطقةٍ مختلقة.
 * - `avg_checkpoint_pct` متوسط نسبة إنجاز نقاط التفتيش لكل دوريةٍ **تحدّد نقاطًا** (`total > 0`)؛
 *   حين لا توجد دوريةٌ كذلك فهو `null` لا صفر. (الصفر قيمة: «لم يُنجَز شيء».)
 * - الصفوف المقتطعة: يُطلب سقف+1 صفًّا؛ إن جاء أكثر من السقف اقتُطع إلى السقف (الأحدث أولًا)
 *   ويُعلَن `truncated: true` مع ملاحظة عربية — فلا تُقرأ أرقامٌ جزئية كأنها كاملة.
 * - تُذكر المناطق التي ظهرت في البيانات وحدها؛ فما لم يظهر لا يُقال عنه صفر.
 * - **الفراغ ليس نفيًا للوجود.** قِيس على الإنتاج (٢٠٢٦/١١/٠٣) أن `sec_patrols` و`sec_sites`
 *   و`sec_circles` محكومة بسياسة select permissive لـ**المدير وحده** إضافةً إلى سياسة
 *   `tenant_isolation` التقييدية، أي أن **غير المدير لا يرى صفًّا** (وكذلك `sec_list_patrols`).
 *   فحين لا تصل صفوف (`patrols_considered = 0`) تعود ملاحظة صادقة «لا دوريات ظاهرة بصلاحياتك
 *   الحالية — قد تكون محجوبة بالصلاحيات لا معدومة»، بلا مناطق ولا أصفار مختلَقة: لا يُقرأ
 *   الفراغ «٠ دورية في كل منطقة». (RLS هو الحاكم؛ الأداة لا تغيّر العزل.)
 */
import { REGIONS, type RegionId } from "@/lib/regions";

/** سقف الصفوف المقروءة للتقرير الواحد. */
export const PATROL_REPORT_ROW_LIMIT = 500;

/**
 * ملاحظة الفراغ: لا صفوف وصلت من القاعدة. تحت RLS يعني ذلك «لا ظاهر لهذا المستدعي»، لا «لا شيء
 * في الواقع» — فلا تُنسب إلى المناطق أصفار ولا يُنفى وجود الدوريات.
 */
export const NO_VISIBLE_PATROLS_NOTE_AR =
  "لا دوريات ظاهرة بصلاحياتك الحالية — قد تكون محجوبة بالصلاحيات لا معدومة.";

/** اسم المنطقة غير المعروفة في التقرير. */
export const UNSPECIFIED_REGION_AR = "غير محددة";

/** صفّ الدورية كما يعيده الاستعلام المضمَّن (`site:sec_sites(circle:sec_circles(region))`). */
export type PatrolReportRow = {
  status?: unknown;
  checkpoints_total?: unknown;
  checkpoints_done?: unknown;
  site?: unknown;
};

type RegionPatrolSummary = {
  /** الاسم العربي المختصر للمنطقة (من `regions.ts`) أو «غير محددة». */
  region: string;
  region_id: RegionId | null;
  total: number;
  active: number;
  scheduled: number;
  completed: number;
  missed: number;
  /** حالاتٌ خارج الأربع المعروفة — كي يبقى `total` مساويًا لمجموع الأجزاء. */
  other: number;
  avg_checkpoint_pct: number | null;
};

type PatrolRegionReport = {
  ok: true;
  regions: RegionPatrolSummary[];
  patrols_considered: number;
  truncated: boolean;
  row_limit: number;
  note_ar: string | null;
  generated_at: string;
};

const REGION_IDS: ReadonlySet<string> = new Set(REGIONS.map((r) => r.id));

/** علاقة many-to-one تصل كائنًا، وقد تصل مصفوفةً من عنصر في بعض الإصدارات. */
function one(value: unknown): Record<string, unknown> | null {
  const v = Array.isArray(value) ? value[0] : value;
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function regionIdOf(row: PatrolReportRow): RegionId | null {
  const raw = one(one(row.site)?.circle)?.region;
  const id = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return REGION_IDS.has(id) ? (id as RegionId) : null;
}

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

type Accumulator = {
  summary: Omit<RegionPatrolSummary, "avg_checkpoint_pct">;
  pctSum: number;
  pctCount: number;
};

export function buildPatrolRegionReport(
  rows: readonly PatrolReportRow[],
  now: Date = new Date(),
  limit: number = PATROL_REPORT_ROW_LIMIT,
): PatrolRegionReport {
  const truncated = rows.length > limit;
  const considered = truncated ? rows.slice(0, limit) : rows;

  const groups = new Map<RegionId | "unspecified", Accumulator>();
  for (const row of considered) {
    const key = regionIdOf(row) ?? "unspecified";
    let group = groups.get(key);
    if (!group) {
      const region = key === "unspecified" ? null : REGIONS.find((r) => r.id === key);
      group = {
        summary: {
          region: region ? region.shortAr : UNSPECIFIED_REGION_AR,
          region_id: region ? region.id : null,
          total: 0,
          active: 0,
          scheduled: 0,
          completed: 0,
          missed: 0,
          other: 0,
        },
        pctSum: 0,
        pctCount: 0,
      };
      groups.set(key, group);
    }
    group.summary.total += 1;
    switch (row.status) {
      case "active":
      case "scheduled":
      case "completed":
      case "missed":
        group.summary[row.status] += 1;
        break;
      default:
        group.summary.other += 1;
    }
    const total = finite(row.checkpoints_total);
    const done = finite(row.checkpoints_done);
    if (total !== null && total > 0 && done !== null) {
      group.pctSum += Math.min(100, Math.max(0, (done / total) * 100));
      group.pctCount += 1;
    }
  }

  // ترتيب المناطق كما في `regions.ts`، و«غير محددة» أخيرًا.
  const order: Array<RegionId | "unspecified"> = [...REGIONS.map((r) => r.id), "unspecified"];
  const regions = order
    .map((key) => groups.get(key))
    .filter((g): g is Accumulator => g !== undefined)
    .map(({ summary, pctSum, pctCount }) => ({
      ...summary,
      avg_checkpoint_pct: pctCount > 0 ? Math.round((pctSum / pctCount) * 10) / 10 : null,
    }));

  return {
    ok: true,
    regions,
    patrols_considered: considered.length,
    truncated,
    row_limit: limit,
    note_ar: truncated
      ? `اقتُطع التقرير عند أحدث ${limit} دورية فالأرقام جزئية وليست كلية.`
      : considered.length === 0
        ? NO_VISIBLE_PATROLS_NOTE_AR
        : null,
    generated_at: now.toISOString(),
  };
}
