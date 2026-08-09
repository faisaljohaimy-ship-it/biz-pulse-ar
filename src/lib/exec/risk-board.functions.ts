/**
 * سجل المخاطر على الصفحة الرئيسية — مصدر مرن واحد لبطاقات المؤشرات
 * المجمّعة وللجدول التفصيلي معًا (قرار المالك ٢٠٢٦/٠٨/٠٩ · البند ١٢ب،
 * والاختيار «الاثنان معًا»).
 *
 * **لماذا دالّة واحدة لا اثنتان.** لو قُرئت البطاقات من مصدر والجدول من
 * آخر لأمكن أن يقول العدّاد «٣ مخاطر عالية» بينما الجدول تحته يعرض
 * أربعًا — والرأس لا يجوز أن يناقض لوحته. فالعدّ يُشتقّ في العميل من
 * الصفوف نفسها المعروضة، لا من حقل عدّ مستقل.
 *
 * **المادة ٢٧ — الصدق العددي.** المصدر (`sim_risks`) لا يحمل عمود منطقة:
 * الإسناد الجغرافي يُقرأ من `metadata.region` متى وُجد وطابق معرّفًا من
 * `regions.ts`، وإلا فـ`null` — ويُعرض «لم يُقَس». لا تخمين منطقة من نصّ
 * العنوان، ولا إسناد افتراضي إلى المنطقة الحالية.
 *
 * **«بيانات لا تفرغ».** القراءة تحت `optionalSupabaseAuth` (لا Unauthorized
 * لزائر أبدًا) وتمرّ بـ`resilient`: مهلة أو فشل أو نتيجة فارغة ⇒ المحاكاة
 * المرجعية موسومةً `is_simulation=true`، وصفوف القاعدة الحيّة تفوز متى وصلت.
 */
import { createServerFn } from "@tanstack/react-start";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";
import { REGIONS, type RegionId } from "@/lib/regions";
import type {
  RiskBoard,
  RiskRecommendation,
  RiskRow,
  RiskSeverity,
} from "@/lib/exec/showcase-simulation.server";

export type { RiskBoard, RiskRecommendation, RiskRow, RiskSeverity };

const REGION_IDS = new Set<string>(REGIONS.map((r) => r.id));

/** لا يقبل إلا معرّفًا معروفًا في `regions.ts`؛ ما عداه غياب لا تخمين. */
function toRegionId(value: unknown): RegionId | null {
  return typeof value === "string" && REGION_IDS.has(value) ? (value as RegionId) : null;
}

/**
 * السُّلّم ثلاثيّ ليطابق نغمات `STAT_TONES` واحدةً بواحدة (أحمر/مثمّن ·
 * كهرماني/مثلث · أخضر/دائرة). `critical` تُطوى على `high`: كلتاهما تُقرأ
 * «عالية» ويبقى لها الشكل نفسه — أهون من نغمة رابعة بلا شكل يميّزها.
 */
function toSeverity(priority: unknown, score: unknown): RiskSeverity {
  const p = typeof priority === "string" ? priority.toLowerCase() : "";
  if (p === "critical" || p === "high" || p === "حرج" || p === "عالٍ") return "high";
  if (p === "medium" || p === "متوسط") return "medium";
  if (p === "low" || p === "منخفض") return "low";
  const s = typeof score === "number" ? score : 0;
  return s >= 15 ? "high" : s >= 8 ? "medium" : "low";
}

const STATUS_AR: Record<string, string> = {
  open: "مفتوحة",
  active: "مفتوحة",
  mitigating: "قيد المعالجة",
  in_progress: "قيد المعالجة",
  monitored: "تحت المراقبة",
  monitoring: "تحت المراقبة",
  mitigated: "مُخفَّفة",
  accepted: "مقبولة",
  closed: "مغلقة",
  resolved: "مغلقة",
};

const SEVERITY_AR: Record<RiskSeverity, string> = {
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};

const SEVERITY_RANK: Record<RiskSeverity, number> = { high: 0, medium: 1, low: 2 };

type SimRiskRow = {
  id: string;
  ref: string | null;
  title: string | null;
  status: string | null;
  priority: string | null;
  score: number | null;
  mitigation: string | null;
  metadata: Record<string, unknown> | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchRiskBoardLive(supabase: { from: (t: string) => any }): Promise<RiskBoard> {
  const res = await supabase
    .from("sim_risks")
    .select("id,ref,title,status,priority,score,mitigation,metadata")
    .order("score", { ascending: false })
    .limit(40);

  const raw = (res.data ?? []) as SimRiskRow[];

  const rows: RiskRow[] = raw.map((r, i) => ({
    id: r.id,
    ref: r.ref ?? `R-${i + 1}`,
    title_ar: r.title ?? "—",
    region_id: toRegionId(r.metadata?.region ?? r.metadata?.region_id),
    severity: toSeverity(r.priority, r.score),
    status_ar: STATUS_AR[(r.status ?? "").toLowerCase()] ?? r.status ?? "—",
  }));

  /**
   * التوصية تُبنى من المعالجة المسجَّلة في الصف نفسه — لا تُؤلَّف. صفٌّ بلا
   * معالجة مكتوبة لا يُنتج توصية، لأن اختراع إجراءٍ لم يكتبه أحد أسوأ من
   * قسمٍ أقصر. والسبب يُصاغ من الحقول المقيسة وحدها.
   */
  const recommendations: RiskRecommendation[] = raw
    .map((r, i) => ({ r, row: rows[i]! }))
    .filter(({ r }) => typeof r.mitigation === "string" && r.mitigation.trim().length > 0)
    .sort((a, b) => SEVERITY_RANK[a.row.severity] - SEVERITY_RANK[b.row.severity])
    .slice(0, 4)
    .map(({ r, row }) => ({
      id: `rec-${row.id}`,
      title_ar: row.title_ar,
      why_ar: `الشدّة ${SEVERITY_AR[row.severity]} · الحالة ${row.status_ar} · المرجع ${row.ref}`,
      action_ar: r.mitigation!.trim(),
      severity: row.severity,
    }));

  return {
    source: "database",
    // الشارة تتبع الصفوف لا الناقل (المادة ٦). و`sim_risks` جدول العرض
    // المبذور بعينه — لا عمود `is_simulation` فيه لأن الجدول كلّه محاكاة،
    // فالصفوف الواصلة منه تبقى موسومة محاكاةً ولو وصلت عبر القاعدة الحيّة.
    // (لو استُبدل المصدر يومًا بسجلّ مخاطر حقيقي، هنا يُقرأ وسمه لا هنا يُفترض.)
    simulation: true,
    rows,
    recommendations,
  };
}

export const getRiskBoard = createServerFn({ method: "GET" })
  .middleware([optionalSupabaseAuth])
  .handler(async ({ context }): Promise<RiskBoard> => {
    const { buildRiskBoardSimulation, resilient } =
      await import("@/lib/exec/showcase-simulation.server");
    return resilient(
      "risk-board",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => fetchRiskBoardLive(context.supabase as { from: (t: string) => any }),
      (b) => b.rows.length === 0,
      () => buildRiskBoardSimulation(Date.now()),
    );
  });
