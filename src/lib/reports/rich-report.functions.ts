/**
 * `buildRichReport` — مستند تقرير تنفيذي غنيّ من البيانات الحقيقية.
 *
 * ## ماذا يفعل هذا الملف
 *
 * يقرأ نافذة زمنية من جداول `sec_*` و`hcis_*` الفعلية ويؤلّف منها
 * `ReportDocument` كاملًا: أقسامًا (بلاغات · تصاريح · صيانة · مؤشرات ·
 * امتثال)، وفي كل قسم مؤشراتٌ وجداولُ وسلاسلُ رسوم. لا يرسم ولا ينشر ولا
 * يكتب صفًّا — يبني المستند وحده، فمن أراد PDF أو XLSX أو صفحة بناها فوقه.
 *
 * ## الثوابت الثلاثة التي تحكم كل سطر هنا
 *
 * ① **قراءة عرض ⇒ `optionalSupabaseAuth`.** شاشة التقارير يفتحها زائر،
 *    فلا `requireSupabaseAuth` هنا ولا رسالة مصادقة تصل إليه أبدًا.
 *    سياسات RLS للـ`anon` هي ما يقرّر ما يُرى.
 *
 * ② **`resilient()` إلزامي.** كل نطاق (بلاغات · أوامر عمل · تصاريح ·
 *    دوريات ومواقع · امتثال) يُسابق مهلة ٤ ثوانٍ: فشلٌ أو مهلةٌ أو نتيجة
 *    فارغة ⇐ محاكاة مرجعية موسومة `is_simulation=true` فورًا. لا شاشة
 *    تحميل أبدية ولا جدول فارغ. وصفوف القاعدة الحيّة تفوز متى وصلت،
 *    ونطاقًا نطاقًا: قد تكون البلاغات حيّة والامتثال مرجعيًّا في المستند
 *    نفسه — و`source` يقولها في كل قسم بدل أن يُعمَّم حكم واحد على الكل.
 *
 * ③ **المادة ٢٧ — ما لم يُقَس يعود `null`.** لا نسبة بمقامٍ صفري، ولا
 *    متوسط فوق قائمة فارغة، ولا «١٠٠٪» تُمنَح لغياب القياس. الفرق الذي
 *    يُصان: **صفرٌ مقيس يبقى صفرًا** (يومٌ بلا بلاغ قياسٌ صحيح قيمته صفر)،
 *    والغياب وحده هو الذي يُقرأ «لم يُقَس». ولذلك `null` تسري إلى نقاط
 *    الرسم أيضًا: نقطة زمن استجابة بلا عيّنة ثقبٌ في الخط لا هبوطٌ إلى
 *    الصفر.
 *
 * ## قيدٌ في المخطّط يُقال ولا يُلتفّ عليه
 *
 * `regionId` **لا يُقيّد الجداول التشغيلية**: لا `sec_incidents` ولا
 * `sec_work_orders` ولا `sec_permits` تحمل عمود منطقة (المنطقة موجودة على
 * `hcis_compliance_status.region_code` و`hcis_findings.region` وحدهما).
 * فالتقييد الجغرافي يقع على قسم الامتثال فقط، وكل قسم يحمل
 * `region_scoped` يصرّح بذلك — بدل أن يُوهم عنوان التقرير أن أرقام
 * التشغيل مصفّاة بالمنطقة وهي ليست كذلك.
 *
 * ## النموذج
 *
 * `ReportDocument` معرَّف هنا محلّيًّا ريثما يستقر
 * `src/lib/reports/report-model.ts` (يكتبه وكيل آخر). **يحتاج توحيدًا:**
 * حين يصل النموذج المشترك تُحذف التعريفات أدناه ويُستورد منه، ولا يبقى
 * تعريفان لشكلٍ واحد.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { optionalSupabaseAuth } from "@/integrations/supabase/optional-auth-middleware";
import { REGIONS, DEFAULT_REGION_ID, getRegion, type RegionId } from "@/lib/regions";
import { GOLDEN_ANCHORS } from "@/lib/rag/evaluation";

/* ══════════════════════════════════════════════════════════════════════
   النموذج المحلّي — يُوحَّد لاحقًا مع `report-model.ts`
   ══════════════════════════════════════════════════════════════════════ */

/** مصدر البيانات: صفوف القاعدة الحيّة، أو المحاكاة المرجعية. */
export type ReportSource = "database" | "reference";

export type MetricUnit = "count" | "percent" | "minutes" | "sar";

/** نغمة العرض. `neutral` هي نغمة غير المقيس — لا `healthy` أبدًا. */
export type MetricTone = "healthy" | "warning" | "danger" | "neutral";

export type ReportMetric = {
  key: string;
  label_ar: string;
  label_en: string;
  /** المادة ٢٧: `null` = لم يُقَس. صفرٌ مقيس يبقى صفرًا. */
  value: number | null;
  unit: MetricUnit;
  tone: MetricTone;
  /** سياق اختياري (المقام الذي حُسبت منه النسبة مثلًا). */
  hint_ar?: string;
};

export type ReportColumn = {
  key: string;
  label_ar: string;
  align: "start" | "end";
};

export type ReportCell = string | number | null;

export type ReportTable = {
  key: string;
  title_ar: string;
  columns: ReportColumn[];
  rows: Array<Record<string, ReportCell>>;
  /** عدد الصفوف قبل الاقتطاع — الجدول يعرض `rows` ويصرّح بالباقي. */
  total_rows: number;
  truncated: boolean;
};

export type ReportSeriesKind = "bar" | "line" | "donut";

export type ReportSeries = {
  key: string;
  title_ar: string;
  kind: ReportSeriesKind;
  x_label_ar: string;
  /** تعريف السلاسل المرسومة داخل النقاط. */
  series: Array<{ key: string; label_ar: string }>;
  /** `null` في قيمة = لم يُقَس عند تلك النقطة (ثقب لا صفر). */
  points: Array<{ x: string; values: Record<string, number | null> }>;
};

export type ReportSectionKey = "kpis" | "incidents" | "permits" | "maintenance" | "compliance";

export type ReportSection = {
  key: ReportSectionKey;
  title_ar: string;
  title_en: string;
  summary_ar: string;
  source: ReportSource;
  /** هل صُفِّي هذا القسم بالمنطقة فعلًا (انظر قيد المخطّط أعلاه). */
  region_scoped: boolean;
  metrics: ReportMetric[];
  tables: ReportTable[];
  charts: ReportSeries[];
};

export type ReportDocument = {
  schema_version: 1;
  generated_at: string;
  period: { from: string; to: string; from_iso: string; to_iso: string; days: number };
  region: { id: RegionId; label_ar: string; label_en: string };
  scope: RichReportScope;
  /** `database` إن كانت كل الأقسام حيّة، `reference` إن كانت كلها محاكاة. */
  source: ReportSource | "mixed";
  /** يصير `true` متى استُعمل أي مصدر مرجعي — شارة المحاكاة تُرفع عندها. */
  is_simulation: boolean;
  title_ar: string;
  subtitle_ar: string;
  headline_metrics: ReportMetric[];
  sections: ReportSection[];
  /** مفاتيح المؤشرات التي لم تُقَس — تُقرأ «لم يُقَس» في كل سطح. */
  unmeasured: string[];
};

/* ══════════════════════════════════════════════════════════════════════
   المدخلات
   ══════════════════════════════════════════════════════════════════════ */

export const RICH_REPORT_SCOPES = [
  "full",
  "kpis",
  "incidents",
  "permits",
  "maintenance",
  "compliance",
] as const;
export type RichReportScope = (typeof RICH_REPORT_SCOPES)[number];

/** أقسام كل نطاق. `full` يجمعها بالترتيب التنفيذي. */
const SCOPE_SECTIONS: Record<RichReportScope, readonly ReportSectionKey[]> = {
  full: ["kpis", "incidents", "permits", "maintenance", "compliance"],
  kpis: ["kpis"],
  incidents: ["kpis", "incidents"],
  permits: ["kpis", "permits"],
  maintenance: ["kpis", "maintenance"],
  compliance: ["kpis", "compliance"],
};

const REGION_IDS = REGIONS.map((r) => r.id) as [RegionId, ...RegionId[]];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
/** أقصى نافذة يقبلها التقرير — سنة، فوقها يُقتطع الطرف الأقدم. */
const MAX_DAYS = 366;
/** أقصى صفوف تُعرض في جدول واحد؛ العدد الكامل يبقى في `total_rows`. */
const TABLE_LIMIT = 50;
/** أقصى صفوف تُقرأ من القاعدة لكل نطاق. */
const FETCH_LIMIT = 1000;

export const RichReportInputSchema = z.object({
  periodFrom: z.string().regex(DATE_RE).optional(),
  periodTo: z.string().regex(DATE_RE).optional(),
  regionId: z.enum(REGION_IDS).optional(),
  scope: z.enum(RICH_REPORT_SCOPES).optional(),
});

export type RichReportInput = z.infer<typeof RichReportInputSchema>;

export type NormalizedPeriod = {
  from: string;
  to: string;
  fromIso: string;
  toIso: string;
  days: number;
};

export type RichReportParams = {
  period: NormalizedPeriod;
  regionId: RegionId;
  scope: RichReportScope;
};

/**
 * يُطبّع المدخلات: افتراضٌ ٣٠ يومًا منتهية اليوم، وتبديلٌ صامت للطرفين
 * المقلوبين (لا شاشة خطأ لزائرٍ أخطأ في ترتيب تاريخين)، وقصٌّ عند السقف.
 */
export function normalizeParams(input: RichReportInput, now = Date.now()): RichReportParams {
  const today = new Date(now).toISOString().slice(0, 10);
  let from = input.periodFrom ?? new Date(now - 29 * DAY_MS).toISOString().slice(0, 10);
  let to = input.periodTo ?? today;
  if (from > to) [from, to] = [to, from];

  const toMs = Date.parse(`${to}T00:00:00.000Z`);
  let fromMs = Date.parse(`${from}T00:00:00.000Z`);
  if (toMs - fromMs > (MAX_DAYS - 1) * DAY_MS) {
    fromMs = toMs - (MAX_DAYS - 1) * DAY_MS;
    from = new Date(fromMs).toISOString().slice(0, 10);
  }
  const days = Math.round((toMs - fromMs) / DAY_MS) + 1;

  return {
    period: {
      from,
      to,
      fromIso: new Date(fromMs).toISOString(),
      // النافذة نصف مفتوحة [from, to+1) حتى يدخل يوم النهاية كاملًا.
      toIso: new Date(toMs + DAY_MS).toISOString(),
      days,
    },
    regionId: input.regionId ?? DEFAULT_REGION_ID,
    scope: input.scope ?? "full",
  };
}

/* ══════════════════════════════════════════════════════════════════════
   حساب صادق (المادة ٢٧)
   ══════════════════════════════════════════════════════════════════════ */

/**
 * نسبة مئوية، أو `null` إن كان المقام صفرًا.
 *
 * هذا بالضبط موضع العطل الذي تكرّر في المشروع: `total ? x / total : 100`
 * يمنح درجةً كاملة لغياب القياس، و`: 0` يُعلن انهيارًا لم يقع. كلاهما
 * ادّعاء قياس، والصواب أن يعود الغياب غيابًا.
 */
export function ratioPct(part: number, whole: number): number | null {
  if (!Number.isFinite(whole) || whole <= 0) return null;
  return Math.round((part / whole) * 100);
}

/** متوسط المقيس وحده؛ قائمة بلا عيّنة ⇒ `null` لا صفر. */
export function avgMeasured(values: ReadonlyArray<number | null | undefined>): number | null {
  const measured = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (measured.length === 0) return null;
  return Math.round(measured.reduce((s, v) => s + v, 0) / measured.length);
}

/**
 * نغمة مؤشّر تصاعدي (كلما ارتفع كان أفضل).
 * غير المقيس `neutral` دائمًا — لا يُمنح خُضرة لغياب.
 */
function toneHigherIsBetter(v: number | null, warnBelow: number, dangerBelow: number): MetricTone {
  if (v === null) return "neutral";
  if (v < dangerBelow) return "danger";
  if (v < warnBelow) return "warning";
  return "healthy";
}

/** نغمة مؤشّر تنازلي (كلما ارتفع كان أسوأ). */
function toneLowerIsBetter(v: number | null, warnAbove: number, dangerAbove: number): MetricTone {
  if (v === null) return "neutral";
  if (v > dangerAbove) return "danger";
  if (v > warnAbove) return "warning";
  return "healthy";
}

const metric = (
  key: string,
  label_ar: string,
  label_en: string,
  value: number | null,
  unit: MetricUnit,
  tone: MetricTone = "neutral",
  hint_ar?: string,
): ReportMetric => ({ key, label_ar, label_en, value, unit, tone, hint_ar });

/* ══════════════════════════════════════════════════════════════════════
   صفوف القاعدة — بأسماء الأعمدة الفعلية من `types.ts` لا بأسماء مخترعة
   ══════════════════════════════════════════════════════════════════════ */

export type IncidentRow = {
  id: string;
  ref: string;
  title_ar: string;
  title_en: string | null;
  category: string;
  severity: string;
  status: string;
  priority: string;
  owner: string | null;
  site_id: string | null;
  reported_at: string;
  resolved_at: string | null;
  response_minutes: number | null;
  escalated: boolean;
  ai_risk_score: number | null;
};

export type WorkOrderRow = {
  id: string;
  ref: string;
  title_ar: string;
  kind: string;
  priority: string;
  status: string;
  asset_kind: string;
  contractor: string | null;
  site_id: string | null;
  opened_at: string;
  due_at: string | null;
  closed_at: string | null;
};

export type PermitRow = {
  id: string;
  ref: string;
  work_type: string;
  contractor: string;
  risk_level: string;
  status: string;
  site_id: string | null;
  starts_at: string;
  ends_at: string;
  approved_at: string | null;
};

export type PatrolRow = {
  id: string;
  status: string;
  checkpoints_done: number;
  checkpoints_total: number;
  started_at: string | null;
};

export type SiteRow = { id: string; code: string; name_ar: string; status: string };

export type ComplianceRow = {
  directive_code: string;
  status: string;
  priority: string;
  region_code: string;
  notes_ar: string | null;
  updated_at: string;
};

export type FindingRow = {
  id: string;
  title_ar: string;
  region: string;
  severity: string;
  status: string;
  target_date: string | null;
  owner: string | null;
};

export type DirectiveRow = { code: string; name_ar: string; category: string };

type Sourced<T> = { rows: T; source: ReportSource };

export type RichReportSources = {
  incidents: Sourced<IncidentRow[]>;
  workOrders: Sourced<WorkOrderRow[]>;
  permits: Sourced<PermitRow[]>;
  ops: Sourced<{ patrols: PatrolRow[]; sites: SiteRow[] }>;
  compliance: Sourced<{
    statuses: ComplianceRow[];
    findings: FindingRow[];
    directives: DirectiveRow[];
  }>;
};

/* ══════════════════════════════════════════════════════════════════════
   عميل القاعدة — واجهة بنيوية يرضيها عميل Supabase الحقيقي والمُصطنع
   ══════════════════════════════════════════════════════════════════════ */

export type QueryResult = { data: unknown[] | null; error?: { message: string } | null };

export interface QueryChain extends PromiseLike<QueryResult> {
  select(cols: string): QueryChain;
  eq(col: string, value: string): QueryChain;
  gte(col: string, value: string): QueryChain;
  lt(col: string, value: string): QueryChain;
  order(col: string, opts?: { ascending?: boolean }): QueryChain;
  limit(n: number): QueryChain;
}

export interface ReportDb {
  from(table: string): QueryChain;
}

async function readRows<T>(chain: QueryChain): Promise<T[]> {
  const res = await chain;
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? []) as T[];
}

/* ══════════════════════════════════════════════════════════════════════
   المحاكاة المرجعية — «بيانات لا تفرغ»
   ══════════════════════════════════════════════════════════════════════ */

/**
 * مواقع مرجعية بمعرّفات المحاكاة نفسها التي تستعملها
 * `buildOmsSimulation` (`sim-s1..4`) حتى يجد الجدول اسم موقعه.
 */
const REFERENCE_SITES: SiteRow[] = [
  { id: "sim-s1", code: "WST-01", name_ar: "محطة التحويل الغربية", status: "operational" },
  { id: "sim-s2", code: "CTR-01", name_ar: "مبنى القيادة المركزي", status: "operational" },
  { id: "sim-s3", code: "EST-02", name_ar: "محطة الضخ الشرقية", status: "operational" },
  { id: "sim-s4", code: "STH-01", name_ar: "مستودع الجنوب اللوجستي", status: "maintenance" },
];

/** يوزّع `count` طابعًا زمنيًّا بانتظام داخل النافذة (حتميّ، بلا عشوائية). */
function spreadInPeriod(period: NormalizedPeriod, index: number, count: number): string {
  const start = Date.parse(period.fromIso);
  const end = Date.parse(period.toIso);
  const span = Math.max(1, end - start - 1);
  const step = span / Math.max(1, count);
  return new Date(start + Math.floor(step * (index + 0.5))).toISOString();
}

/**
 * محاكاة التشغيل المرجعية: تُبنى من `buildOmsSimulation` (المتن نفسه الذي
 * تعرضه غرفة العمليات، فلا تتناقض شاشتان) ثم **يُعاد ختم أوقاتها داخل
 * النافذة المطلوبة** — وإلّا خرجت صفوفٌ عن مدى التقرير الذي وُلدت لأجله.
 */
async function buildOpsReference(period: NormalizedPeriod) {
  const { buildOmsSimulation } = await import("@/lib/exec/showcase-simulation.server");
  const sim = buildOmsSimulation(Date.parse(period.toIso));

  const incidents: IncidentRow[] = sim.incidents.map((r, i) => {
    const reported = spreadInPeriod(period, i, sim.incidents.length);
    return {
      id: r.id,
      ref: r.ref,
      title_ar: r.title_ar,
      title_en: r.title_en,
      category: r.category,
      severity: r.severity,
      status: r.status,
      priority: r.priority,
      owner: r.owner,
      site_id: r.site_id,
      reported_at: reported,
      resolved_at: r.resolved_at
        ? new Date(Date.parse(reported) + (r.response_minutes ?? 30) * 60_000).toISOString()
        : null,
      response_minutes: r.response_minutes,
      escalated: r.escalated,
      ai_risk_score: r.ai_risk_score,
    };
  });

  const workOrders: WorkOrderRow[] = sim.work_orders.map((r, i) => {
    const opened = spreadInPeriod(period, i, sim.work_orders.length);
    return {
      id: r.id,
      ref: r.ref,
      title_ar: r.title_ar,
      kind: r.kind,
      priority: r.priority,
      status: r.status,
      asset_kind: r.asset_kind,
      contractor: r.contractor,
      site_id: r.site_id,
      opened_at: opened,
      due_at: r.due_at ? new Date(Date.parse(opened) + 3 * DAY_MS).toISOString() : null,
      closed_at: r.closed_at ? new Date(Date.parse(opened) + 2 * DAY_MS).toISOString() : null,
    };
  });

  const permits: PermitRow[] = sim.permits.map((r, i) => {
    const starts = spreadInPeriod(period, i, sim.permits.length);
    return {
      id: r.id,
      ref: r.ref,
      work_type: r.work_type,
      contractor: r.contractor,
      risk_level: r.risk_level,
      status: r.status,
      site_id: r.site_id,
      starts_at: starts,
      ends_at: new Date(Date.parse(starts) + 8 * 3_600_000).toISOString(),
      approved_at: r.approved_at ? starts : null,
    };
  });

  return { incidents, workOrders, permits };
}

/** دوريات ومواقع مرجعية — مصدر «إنجاز الدوريات» حين لا صفّ حيًّا. */
async function buildOpsSupportReference(period: NormalizedPeriod) {
  const { buildExecKpiSourcesSimulation } = await import("@/lib/exec/showcase-simulation.server");
  const src = buildExecKpiSourcesSimulation();
  const patrols: PatrolRow[] = src.patrols.map((p, i) => ({
    id: `sim-pat-${i + 1}`,
    status: p.status,
    checkpoints_done: p.checkpoints_done,
    checkpoints_total: p.checkpoints_total,
    started_at: spreadInPeriod(period, i, src.patrols.length),
  }));
  return { patrols, sites: REFERENCE_SITES.map((s) => ({ ...s })) };
}

/**
 * امتثال مرجعي — يُبنى على **رموز التوجيهات وأسمائها الحقيقية** من مرساة
 * البذرة (`GOLDEN_ANCHORS`, وهي `name_ar` حرفيًّا من
 * `hcis_directives`)، لا على توجيهات مؤلَّفة. الحالات موزَّعة حتميًّا
 * بموضع الرمز، فلا يتبدّل التقرير بين نداءين.
 */
function buildComplianceReference(regionId: RegionId, period: NormalizedPeriod) {
  const anchors = GOLDEN_ANCHORS.filter(
    (a) => a.code.startsWith("SEC-") || a.code.startsWith("SAF-"),
  );
  const STATUSES = ["compliant", "compliant", "partial", "compliant", "non_compliant"];
  const PRIORITIES = ["high", "medium", "medium", "low", "critical"];

  const directives: DirectiveRow[] = anchors.map((a) => ({
    code: a.code,
    name_ar: a.probeAr,
    category: a.code.startsWith("SAF") ? "safety" : "security",
  }));

  const statuses: ComplianceRow[] = anchors.map((a, i) => ({
    directive_code: a.code,
    status: STATUSES[i % STATUSES.length]!,
    priority: PRIORITIES[i % PRIORITIES.length]!,
    region_code: regionId,
    notes_ar: null,
    updated_at: spreadInPeriod(period, i, anchors.length),
  }));

  const openIdx = statuses
    .map((s, i) => (s.status === "compliant" ? -1 : i))
    .filter((i) => i >= 0)
    .slice(0, 6);
  const findings: FindingRow[] = openIdx.map((i, n) => ({
    id: `sim-find-${n + 1}`,
    title_ar: `فجوة مرجعية على ${anchors[i]!.probeAr}`,
    region: regionId,
    severity: n % 3 === 0 ? "high" : n % 3 === 1 ? "medium" : "low",
    status: n % 4 === 0 ? "overdue" : "open",
    target_date: new Date(Date.parse(period.toIso) + (n + 1) * 7 * DAY_MS)
      .toISOString()
      .slice(0, 10),
    owner: null,
  }));

  return { statuses, findings, directives };
}

/* ══════════════════════════════════════════════════════════════════════
   القراءة — نطاقًا نطاقًا، كلٌّ تحت `resilient()`
   ══════════════════════════════════════════════════════════════════════ */

/**
 * كل نداء `resilient` مستقلّ عمدًا: نطاقٌ حيٌّ لا يُجرّ إلى المحاكاة لأن
 * نطاقًا آخر تعثّر، ونطاقٌ متعثّر لا يُفرِّغ القسم الخاص به.
 */
export async function fetchRichReportSources(
  db: ReportDb,
  params: RichReportParams,
): Promise<RichReportSources> {
  const { resilient, markSimulation } = await import("@/lib/exec/showcase-simulation.server");
  const { period, regionId } = params;

  const incidents = await resilient<Sourced<IncidentRow[]>>(
    "rich-report/incidents",
    async () => ({
      rows: await readRows<IncidentRow>(
        db
          .from("sec_incidents")
          .select(
            "id,ref,title_ar,title_en,category,severity,status,priority,owner,site_id,reported_at,resolved_at,response_minutes,escalated,ai_risk_score",
          )
          .gte("reported_at", period.fromIso)
          .lt("reported_at", period.toIso)
          .order("reported_at", { ascending: false })
          .limit(FETCH_LIMIT),
      ),
      source: "database",
    }),
    (v) => v.rows.length === 0,
    async () => ({
      rows: markSimulation((await buildOpsReference(period)).incidents),
      source: "reference",
    }),
  );

  const workOrders = await resilient<Sourced<WorkOrderRow[]>>(
    "rich-report/work-orders",
    async () => ({
      rows: await readRows<WorkOrderRow>(
        db
          .from("sec_work_orders")
          .select(
            "id,ref,title_ar,kind,priority,status,asset_kind,contractor,site_id,opened_at,due_at,closed_at",
          )
          .gte("opened_at", period.fromIso)
          .lt("opened_at", period.toIso)
          .order("opened_at", { ascending: false })
          .limit(FETCH_LIMIT),
      ),
      source: "database",
    }),
    (v) => v.rows.length === 0,
    async () => ({
      rows: markSimulation((await buildOpsReference(period)).workOrders),
      source: "reference",
    }),
  );

  const permits = await resilient<Sourced<PermitRow[]>>(
    "rich-report/permits",
    async () => ({
      rows: await readRows<PermitRow>(
        db
          .from("sec_permits")
          .select(
            "id,ref,work_type,contractor,risk_level,status,site_id,starts_at,ends_at,approved_at",
          )
          .gte("starts_at", period.fromIso)
          .lt("starts_at", period.toIso)
          .order("starts_at", { ascending: false })
          .limit(FETCH_LIMIT),
      ),
      source: "database",
    }),
    (v) => v.rows.length === 0,
    async () => ({
      rows: markSimulation((await buildOpsReference(period)).permits),
      source: "reference",
    }),
  );

  const ops = await resilient<Sourced<{ patrols: PatrolRow[]; sites: SiteRow[] }>>(
    "rich-report/ops-support",
    async () => {
      const [patrols, sites] = await Promise.all([
        readRows<PatrolRow>(
          db
            .from("sec_patrols")
            .select("id,status,checkpoints_done,checkpoints_total,started_at")
            .gte("started_at", period.fromIso)
            .lt("started_at", period.toIso)
            .limit(FETCH_LIMIT),
        ),
        readRows<SiteRow>(db.from("sec_sites").select("id,code,name_ar,status").limit(FETCH_LIMIT)),
      ]);
      return { rows: { patrols, sites }, source: "database" as const };
    },
    // المواقع وحدها لا تكفي: الدوريات هي مصدر المؤشّر، وغيابها إفراغٌ فعليّ.
    (v) => v.rows.patrols.length === 0,
    async () => ({
      rows: markSimulation(await buildOpsSupportReference(period)),
      source: "reference",
    }),
  );

  const compliance = await resilient<
    Sourced<{ statuses: ComplianceRow[]; findings: FindingRow[]; directives: DirectiveRow[] }>
  >(
    "rich-report/compliance",
    async () => {
      const [statuses, findings, directives] = await Promise.all([
        readRows<ComplianceRow>(
          db
            .from("hcis_compliance_status")
            .select("directive_code,status,priority,region_code,notes_ar,updated_at")
            .eq("region_code", regionId)
            .limit(FETCH_LIMIT),
        ),
        readRows<FindingRow>(
          db
            .from("hcis_findings")
            .select("id,title_ar,region,severity,status,target_date,owner")
            .eq("region", regionId)
            .order("target_date", { ascending: true })
            .limit(FETCH_LIMIT),
        ),
        readRows<DirectiveRow>(
          db.from("hcis_directives").select("code,name_ar,category").limit(FETCH_LIMIT),
        ),
      ]);
      return { rows: { statuses, findings, directives }, source: "database" as const };
    },
    (v) => v.rows.statuses.length === 0,
    () => ({
      rows: markSimulation(buildComplianceReference(regionId, period)),
      source: "reference" as const,
    }),
  );

  return { incidents, workOrders, permits, ops, compliance };
}

/* ══════════════════════════════════════════════════════════════════════
   التأليف — دالة خالصة، تُختبر بلا قاعدة ولا شبكة
   ══════════════════════════════════════════════════════════════════════ */

const OPEN_INCIDENT = (s: string) => s !== "resolved" && s !== "closed";
const CLOSED_WO = (s: string) => s === "closed";
const DEAD_WO = (s: string) => s === "closed" || s === "cancelled";

const SEVERITY_AR: Record<string, string> = {
  critical: "حرِج",
  high: "عالٍ",
  medium: "متوسط",
  low: "منخفض",
};

const STATUS_AR: Record<string, string> = {
  open: "مفتوح",
  investigating: "قيد التحقيق",
  contained: "محتوى",
  in_progress: "قيد التنفيذ",
  resolved: "مُعالَج",
  closed: "مُغلَق",
  cancelled: "ملغى",
  active: "ساري",
  approved: "معتمد",
  pending: "بانتظار الاعتماد",
  expired: "منتهٍ",
  rejected: "مرفوض",
  compliant: "مطابق",
  partial: "مطابقة جزئية",
  non_compliant: "غير مطابق",
  not_assessed: "لم يُقيَّم",
  not_applicable: "لا ينطبق",
  overdue: "متأخر",
};

const ar = (map: Record<string, string>, key: string | null | undefined) =>
  key ? (map[key] ?? key) : "—";

const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : "—");
const minute = (iso: string | null | undefined) => (iso ? iso.slice(0, 16).replace("T", " ") : "—");

/** يقسّم النافذة إلى دِلاء متساوية — يومية للنوافذ القصيرة، أسبوعية فوقها. */
function buildBuckets(period: NormalizedPeriod): Array<{ key: string; from: number; to: number }> {
  const size = period.days <= 45 ? 1 : 7;
  const start = Date.parse(period.fromIso);
  const end = Date.parse(period.toIso);
  const out: Array<{ key: string; from: number; to: number }> = [];
  for (let t = start; t < end; t += size * DAY_MS) {
    out.push({
      key: new Date(t).toISOString().slice(0, 10),
      from: t,
      to: Math.min(end, t + size * DAY_MS),
    });
  }
  return out;
}

/** يوزّع صفوفًا على الدِلاء بحقل زمنٍ منها. */
function bucketize<T>(
  rows: T[],
  at: (row: T) => string | null,
  buckets: ReturnType<typeof buildBuckets>,
): T[][] {
  const out = buckets.map(() => [] as T[]);
  for (const row of rows) {
    const raw = at(row);
    if (!raw) continue;
    const t = Date.parse(raw);
    if (!Number.isFinite(t)) continue;
    const idx = buckets.findIndex((b) => t >= b.from && t < b.to);
    if (idx >= 0) out[idx]!.push(row);
  }
  return out;
}

function countBy<T>(rows: T[], key: (row: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const k = key(r);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

/**
 * وزن حالة الامتثال. `not_assessed` و`not_applicable` **تخرج من المقام**:
 * إدخالها يخفض النسبة بقياسٍ لم يقع، وإخراجها كلَّها قد يُفرغ المقام —
 * وعندها تعود `null` لا صفرًا ولا مئة.
 */
export function compliancePct(rows: ReadonlyArray<{ status: string }>): number | null {
  const scored = rows.filter((r) => r.status !== "not_applicable" && r.status !== "not_assessed");
  if (scored.length === 0) return null;
  const weight = (s: string) =>
    s === "compliant" ? 1 : s === "partial" || s === "in_progress" ? 0.5 : 0;
  return Math.round((scored.reduce((acc, r) => acc + weight(r.status), 0) / scored.length) * 100);
}

function siteName(sites: SiteRow[], id: string | null): string {
  if (!id) return "—";
  return sites.find((s) => s.id === id)?.name_ar ?? "—";
}

function table(
  key: string,
  title_ar: string,
  columns: ReportColumn[],
  all: Array<Record<string, ReportCell>>,
): ReportTable {
  return {
    key,
    title_ar,
    columns,
    rows: all.slice(0, TABLE_LIMIT),
    total_rows: all.length,
    truncated: all.length > TABLE_LIMIT,
  };
}

const col = (key: string, label_ar: string, align: "start" | "end" = "start"): ReportColumn => ({
  key,
  label_ar,
  align,
});

/** يبني مستند التقرير من مصادر مقروءة — خالصة: لا قاعدة ولا زمن خفيّ. */
export function composeRichReport(
  sources: RichReportSources,
  params: RichReportParams,
  generatedAt = new Date().toISOString(),
): ReportDocument {
  const { period, regionId, scope } = params;
  const region = getRegion(regionId);
  const incidents = sources.incidents.rows;
  const workOrders = sources.workOrders.rows;
  const permits = sources.permits.rows;
  const { patrols, sites } = sources.ops.rows;
  const { statuses, findings, directives } = sources.compliance.rows;

  const buckets = buildBuckets(period);

  /* ── مؤشرات محسوبة مرة واحدة، تُقتسم بين الرأس والأقسام ───────────── */
  const incOpen = incidents.filter((i) => OPEN_INCIDENT(i.status)).length;
  const incClosed = incidents.length - incOpen;
  const incCritical = incidents.filter(
    (i) => i.severity === "critical" && i.status !== "closed",
  ).length;
  const incEscalated = incidents.filter((i) => i.escalated).length;
  const resolutionRate = ratioPct(incClosed, incidents.length);
  const mttr = avgMeasured(incidents.map((i) => i.response_minutes));

  const woClosed = workOrders.filter((w) => CLOSED_WO(w.status)).length;
  const woOpen = workOrders.filter((w) => !DEAD_WO(w.status)).length;
  const nowMs = Date.parse(generatedAt);
  const woOverdue = workOrders.filter(
    (w) => !DEAD_WO(w.status) && w.due_at !== null && Date.parse(w.due_at) < nowMs,
  ).length;
  const woClosureRate = ratioPct(woClosed, workOrders.length);
  const woPreventive = workOrders.filter((w) => w.kind === "preventive").length;
  const preventiveShare = ratioPct(woPreventive, workOrders.length);

  const permitsApproved = permits.filter(
    (p) => p.approved_at !== null || p.status === "approved" || p.status === "active",
  ).length;
  const permitApprovalRate = ratioPct(permitsApproved, permits.length);
  const permitsHighRisk = permits.filter(
    (p) => p.risk_level === "high" || p.risk_level === "critical",
  ).length;
  const permitsActive = permits.filter(
    (p) => p.status === "active" || p.status === "approved",
  ).length;

  // الدوريات ذات مقامٍ صفري لا تُقاس أصلًا؛ وإن لم يبقَ منها شيء ⇒ `null`.
  const measurablePatrols = patrols.filter((p) => p.checkpoints_total > 0);
  const patrolCompletion = avgMeasured(
    measurablePatrols.map((p) => Math.round((p.checkpoints_done / p.checkpoints_total) * 100)),
  );

  const compliancePercent = compliancePct(statuses);
  const findingsOverdue = findings.filter((f) => f.status === "overdue").length;
  const findingsOpen = findings.filter((f) => f.status !== "resolved").length;

  /* ── مؤشّرات الرأس ─────────────────────────────────────────────────── */
  const headline_metrics: ReportMetric[] = [
    metric("incidents_total", "إجمالي البلاغات", "Total incidents", incidents.length, "count"),
    metric(
      "incidents_open",
      "بلاغات مفتوحة",
      "Open incidents",
      incOpen,
      "count",
      toneLowerIsBetter(incOpen, 5, 12),
    ),
    metric(
      "incidents_critical",
      "بلاغات حرِجة",
      "Critical incidents",
      incCritical,
      "count",
      toneLowerIsBetter(incCritical, 0, 2),
    ),
    metric(
      "incidents_resolution_rate",
      "نسبة الإغلاق",
      "Resolution rate",
      resolutionRate,
      "percent",
      toneHigherIsBetter(resolutionRate, 85, 60),
      `من ${incidents.length} بلاغًا في النافذة`,
    ),
    metric(
      "mttr_minutes",
      "متوسط زمن الاستجابة",
      "Mean time to respond",
      mttr,
      "minutes",
      toneLowerIsBetter(mttr, 45, 90),
      `عيّنة: ${incidents.filter((i) => i.response_minutes !== null).length} بلاغًا مسجَّل الزمن`,
    ),
    metric(
      "wo_closure_rate",
      "نسبة إنجاز أوامر العمل",
      "Work order closure rate",
      woClosureRate,
      "percent",
      toneHigherIsBetter(woClosureRate, 80, 55),
      `من ${workOrders.length} أمر عمل`,
    ),
    metric("permits_active", "تصاريح سارية", "Active permits", permitsActive, "count", "neutral"),
    metric(
      "patrol_completion",
      "إنجاز الدوريات",
      "Patrol completion",
      patrolCompletion,
      "percent",
      toneHigherIsBetter(patrolCompletion, 90, 70),
      `عيّنة: ${measurablePatrols.length} دورية بنقاط تفتيش`,
    ),
    metric(
      "compliance_pct",
      "نسبة الامتثال",
      "Compliance",
      compliancePercent,
      "percent",
      toneHigherIsBetter(compliancePercent, 90, 75),
      `من ${statuses.length} توجيهًا مسجَّلًا`,
    ),
  ];

  /* ── الأقسام ───────────────────────────────────────────────────────── */
  const wanted = new Set(SCOPE_SECTIONS[scope]);
  const sections: ReportSection[] = [];

  if (wanted.has("kpis")) {
    sections.push({
      key: "kpis",
      title_ar: "المؤشرات التنفيذية",
      title_en: "Executive indicators",
      summary_ar: `${period.days} يومًا من ${period.from} إلى ${period.to} — ${incidents.length} بلاغًا و${workOrders.length} أمر عمل و${permits.length} تصريحًا.`,
      source: sources.incidents.source,
      region_scoped: false,
      metrics: headline_metrics,
      tables: [],
      charts: [
        {
          key: "ops-volume",
          title_ar: "حجم التشغيل عبر النافذة",
          kind: "bar",
          x_label_ar: "التاريخ",
          series: [
            { key: "incidents", label_ar: "بلاغات" },
            { key: "work_orders", label_ar: "أوامر عمل" },
            { key: "permits", label_ar: "تصاريح" },
          ],
          points: (() => {
            const bi = bucketize(incidents, (r) => r.reported_at, buckets);
            const bw = bucketize(workOrders, (r) => r.opened_at, buckets);
            const bp = bucketize(permits, (r) => r.starts_at, buckets);
            return buckets.map((b, i) => ({
              x: b.key,
              // عدٌّ: الصفر هنا قياسٌ صحيح (يومٌ بلا بلاغ)، فلا يُحوَّل `null`.
              values: {
                incidents: bi[i]!.length,
                work_orders: bw[i]!.length,
                permits: bp[i]!.length,
              },
            }));
          })(),
        },
        {
          key: "mttr-trend",
          title_ar: "متوسط زمن الاستجابة (دقائق)",
          kind: "line",
          x_label_ar: "التاريخ",
          series: [{ key: "mttr", label_ar: "متوسط الاستجابة" }],
          // المادة ٢٧: دلوٌ بلا بلاغ مسجَّل الزمن يعود `null` — ثقبٌ في
          // الخط لا هبوطٌ إلى الصفر يُقرأ «استجابة فورية».
          points: bucketize(incidents, (r) => r.reported_at, buckets).map((rows, i) => ({
            x: buckets[i]!.key,
            values: { mttr: avgMeasured(rows.map((r) => r.response_minutes)) },
          })),
        },
      ],
    });
  }

  if (wanted.has("incidents")) {
    const sev = countBy(incidents, (i) => i.severity);
    sections.push({
      key: "incidents",
      title_ar: "البلاغات والحوادث",
      title_en: "Incidents",
      summary_ar:
        incidents.length === 0
          ? "لا بلاغات في النافذة."
          : `${incidents.length} بلاغًا، منها ${incOpen} مفتوح و${incCritical} حرِج و${incEscalated} مُصعَّد.`,
      source: sources.incidents.source,
      region_scoped: false,
      metrics: [
        metric("incidents_total", "إجمالي البلاغات", "Total", incidents.length, "count"),
        metric(
          "incidents_escalated",
          "بلاغات مُصعَّدة",
          "Escalated",
          incEscalated,
          "count",
          toneLowerIsBetter(incEscalated, 1, 4),
        ),
        metric(
          "incidents_resolution_rate",
          "نسبة الإغلاق",
          "Resolution rate",
          resolutionRate,
          "percent",
          toneHigherIsBetter(resolutionRate, 85, 60),
        ),
        metric(
          "mttr_minutes",
          "متوسط زمن الاستجابة",
          "MTTR",
          mttr,
          "minutes",
          toneLowerIsBetter(mttr, 45, 90),
        ),
        metric(
          "incidents_risk_avg",
          "متوسط درجة الخطر",
          "Avg risk score",
          avgMeasured(incidents.map((i) => i.ai_risk_score)),
          "count",
          "neutral",
        ),
      ],
      tables: [
        table(
          "incidents",
          "سجل البلاغات",
          [
            col("ref", "المرجع"),
            col("title", "الوصف"),
            col("severity", "الشدّة"),
            col("status", "الحالة"),
            col("site", "الموقع"),
            col("reported_at", "وقت البلاغ"),
            col("response_minutes", "الاستجابة (د)", "end"),
          ],
          incidents.map((i) => ({
            ref: i.ref,
            title: i.title_ar,
            severity: ar(SEVERITY_AR, i.severity),
            status: ar(STATUS_AR, i.status),
            site: siteName(sites, i.site_id),
            reported_at: minute(i.reported_at),
            // `null` يبقى `null` — السطح يقرؤه «لم يُقَس» لا صفر دقيقة.
            response_minutes: i.response_minutes,
          })),
        ),
      ],
      charts: [
        {
          key: "incident-severity",
          title_ar: "توزيع الشدّة",
          kind: "donut",
          x_label_ar: "الشدّة",
          series: [{ key: "count", label_ar: "عدد" }],
          points: (["critical", "high", "medium", "low"] as const).map((s) => ({
            x: SEVERITY_AR[s]!,
            values: { count: sev[s] ?? 0 },
          })),
        },
      ],
    });
  }

  if (wanted.has("permits")) {
    const risk = countBy(permits, (p) => p.risk_level);
    sections.push({
      key: "permits",
      title_ar: "تصاريح العمل",
      title_en: "Work permits",
      summary_ar:
        permits.length === 0
          ? "لا تصاريح في النافذة."
          : `${permits.length} تصريحًا، منها ${permitsActive} ساري و${permitsHighRisk} عالي الخطورة.`,
      source: sources.permits.source,
      region_scoped: false,
      metrics: [
        metric("permits_total", "إجمالي التصاريح", "Total permits", permits.length, "count"),
        metric("permits_active", "تصاريح سارية", "Active", permitsActive, "count", "neutral"),
        metric(
          "permits_high_risk",
          "تصاريح عالية الخطورة",
          "High risk",
          permitsHighRisk,
          "count",
          toneLowerIsBetter(permitsHighRisk, 3, 8),
        ),
        metric(
          "permit_approval_rate",
          "نسبة الاعتماد",
          "Approval rate",
          permitApprovalRate,
          "percent",
          toneHigherIsBetter(permitApprovalRate, 85, 60),
          `من ${permits.length} تصريحًا`,
        ),
      ],
      tables: [
        table(
          "permits",
          "سجل التصاريح",
          [
            col("ref", "المرجع"),
            col("work_type", "نوع العمل"),
            col("contractor", "المقاول"),
            col("risk_level", "الخطورة"),
            col("status", "الحالة"),
            col("starts_at", "البداية"),
            col("ends_at", "النهاية"),
          ],
          permits.map((p) => ({
            ref: p.ref,
            work_type: p.work_type,
            contractor: p.contractor,
            risk_level: ar(SEVERITY_AR, p.risk_level),
            status: ar(STATUS_AR, p.status),
            starts_at: minute(p.starts_at),
            ends_at: minute(p.ends_at),
          })),
        ),
      ],
      charts: [
        {
          key: "permit-risk",
          title_ar: "التصاريح حسب مستوى الخطورة",
          kind: "bar",
          x_label_ar: "الخطورة",
          series: [{ key: "count", label_ar: "عدد" }],
          points: (["critical", "high", "medium", "low"] as const).map((r) => ({
            x: SEVERITY_AR[r]!,
            values: { count: risk[r] ?? 0 },
          })),
        },
      ],
    });
  }

  if (wanted.has("maintenance")) {
    const byKind = countBy(workOrders, (w) => w.kind);
    sections.push({
      key: "maintenance",
      title_ar: "الصيانة وأوامر العمل",
      title_en: "Maintenance",
      summary_ar:
        workOrders.length === 0
          ? "لا أوامر عمل في النافذة."
          : `${workOrders.length} أمر عمل، منها ${woOpen} مفتوح و${woOverdue} متأخر عن استحقاقه.`,
      source: sources.workOrders.source,
      region_scoped: false,
      metrics: [
        metric("wo_total", "إجمالي أوامر العمل", "Total work orders", workOrders.length, "count"),
        metric(
          "wo_open",
          "أوامر مفتوحة",
          "Open",
          woOpen,
          "count",
          toneLowerIsBetter(woOpen, 15, 30),
        ),
        metric(
          "wo_overdue",
          "أوامر متأخرة",
          "Overdue",
          woOverdue,
          "count",
          toneLowerIsBetter(woOverdue, 0, 3),
        ),
        metric(
          "wo_closure_rate",
          "نسبة الإنجاز",
          "Closure rate",
          woClosureRate,
          "percent",
          toneHigherIsBetter(woClosureRate, 80, 55),
          `من ${workOrders.length} أمر عمل`,
        ),
        metric(
          "wo_preventive_share",
          "حصة الصيانة الوقائية",
          "Preventive share",
          preventiveShare,
          "percent",
          toneHigherIsBetter(preventiveShare, 60, 35),
        ),
      ],
      tables: [
        table(
          "work_orders",
          "سجل أوامر العمل",
          [
            col("ref", "المرجع"),
            col("title", "الوصف"),
            col("kind", "النوع"),
            col("priority", "الأولوية"),
            col("status", "الحالة"),
            col("opened_at", "الفتح"),
            col("due_at", "الاستحقاق"),
          ],
          workOrders.map((w) => ({
            ref: w.ref,
            title: w.title_ar,
            kind: w.kind === "preventive" ? "وقائية" : w.kind === "corrective" ? "تصحيحية" : w.kind,
            priority: ar(SEVERITY_AR, w.priority),
            status: ar(STATUS_AR, w.status),
            opened_at: day(w.opened_at),
            due_at: day(w.due_at),
          })),
        ),
      ],
      charts: [
        {
          key: "wo-kind",
          title_ar: "أوامر العمل حسب النوع",
          kind: "donut",
          x_label_ar: "النوع",
          series: [{ key: "count", label_ar: "عدد" }],
          points: [
            { x: "وقائية", values: { count: byKind.preventive ?? 0 } },
            { x: "تصحيحية", values: { count: byKind.corrective ?? 0 } },
          ],
        },
        {
          key: "wo-flow",
          title_ar: "الفتح مقابل الإغلاق",
          kind: "bar",
          x_label_ar: "التاريخ",
          series: [
            { key: "opened", label_ar: "مفتوحة" },
            { key: "closed", label_ar: "مُغلَقة" },
          ],
          points: (() => {
            const opened = bucketize(workOrders, (w) => w.opened_at, buckets);
            const closed = bucketize(workOrders, (w) => w.closed_at, buckets);
            return buckets.map((b, i) => ({
              x: b.key,
              values: { opened: opened[i]!.length, closed: closed[i]!.length },
            }));
          })(),
        },
      ],
    });
  }

  if (wanted.has("compliance")) {
    const nameByCode = new Map(directives.map((d) => [d.code, d.name_ar]));
    const statusMix = countBy(statuses, (s) => s.status);
    sections.push({
      key: "compliance",
      title_ar: "الامتثال التنظيمي",
      title_en: "Regulatory compliance",
      summary_ar:
        statuses.length === 0
          ? `لا سجل امتثال لـ${region.shortAr}.`
          : `${statuses.length} توجيهًا مسجَّلًا لـ${region.shortAr}، و${findingsOpen} ملاحظة مفتوحة منها ${findingsOverdue} متأخرة.`,
      source: sources.compliance.source,
      // القسم الوحيد الذي تُقيّده المنطقة فعلًا — المخطّط يحمل عمودها هنا.
      region_scoped: true,
      metrics: [
        metric(
          "compliance_pct",
          "نسبة الامتثال",
          "Compliance",
          compliancePercent,
          "percent",
          toneHigherIsBetter(compliancePercent, 90, 75),
          `المقام: التوجيهات المُقيَّمة وحدها (${statuses.filter((s) => s.status !== "not_assessed" && s.status !== "not_applicable").length})`,
        ),
        metric(
          "directives_total",
          "توجيهات مسجَّلة",
          "Directives tracked",
          statuses.length,
          "count",
        ),
        metric(
          "findings_open",
          "ملاحظات مفتوحة",
          "Open findings",
          findingsOpen,
          "count",
          toneLowerIsBetter(findingsOpen, 3, 8),
        ),
        metric(
          "findings_overdue",
          "ملاحظات متأخرة",
          "Overdue findings",
          findingsOverdue,
          "count",
          toneLowerIsBetter(findingsOverdue, 0, 2),
        ),
      ],
      tables: [
        table(
          "compliance_status",
          "حالة التوجيهات",
          [
            col("code", "الرمز"),
            col("name", "التوجيه"),
            col("status", "الحالة"),
            col("priority", "الأولوية"),
            col("updated_at", "آخر تحديث"),
          ],
          statuses.map((s) => ({
            code: s.directive_code,
            name: nameByCode.get(s.directive_code) ?? "—",
            status: ar(STATUS_AR, s.status),
            priority: ar(SEVERITY_AR, s.priority),
            updated_at: day(s.updated_at),
          })),
        ),
        table(
          "compliance_findings",
          "الملاحظات والفجوات",
          [
            col("title", "الملاحظة"),
            col("severity", "الشدّة"),
            col("status", "الحالة"),
            col("target_date", "تاريخ الاستحقاق"),
            col("owner", "المسؤول"),
          ],
          findings.map((f) => ({
            title: f.title_ar,
            severity: ar(SEVERITY_AR, f.severity),
            status: ar(STATUS_AR, f.status),
            target_date: day(f.target_date),
            owner: f.owner ?? "—",
          })),
        ),
      ],
      charts: [
        {
          key: "compliance-mix",
          title_ar: "توزيع حالات الامتثال",
          kind: "donut",
          x_label_ar: "الحالة",
          series: [{ key: "count", label_ar: "عدد" }],
          points: (
            ["compliant", "partial", "non_compliant", "not_assessed", "not_applicable"] as const
          ).map((s) => ({ x: STATUS_AR[s]!, values: { count: statusMix[s] ?? 0 } })),
        },
      ],
    });
  }

  /* ── المصدر الكلّي وشارة المحاكاة ──────────────────────────────────── */
  const usedSources = sections.map((s) => s.source);
  const anyReference = usedSources.includes("reference");
  const allReference = usedSources.length > 0 && usedSources.every((s) => s === "reference");
  const source: ReportDocument["source"] = allReference
    ? "reference"
    : anyReference
      ? "mixed"
      : "database";

  const unmeasured = [
    ...new Set(
      [...headline_metrics, ...sections.flatMap((s) => s.metrics)]
        .filter((m) => m.value === null)
        .map((m) => m.key),
    ),
  ];

  return {
    schema_version: 1,
    generated_at: generatedAt,
    // الداخل `camelCase` والسلك `snake_case` — والتحويل هنا لا في أحد
    // الطرفين: بقيّة الحمولة (`schema_version` · `label_ar` ·
    // `is_simulation`) على `snake_case`، فتوحيدُ الداخل عليه كان سيُلوّث
    // منطقًا داخليًّا بعُرفِ عقدٍ خارجيّ.
    period: {
      from: period.from,
      to: period.to,
      from_iso: period.fromIso,
      to_iso: period.toIso,
      days: period.days,
    },
    region: { id: region.id, label_ar: region.labelAr, label_en: region.labelEn },
    scope,
    source,
    is_simulation: anyReference,
    title_ar: `التقرير التنفيذي — ${region.shortAr}`,
    subtitle_ar: `${period.from} إلى ${period.to} · ${period.days} يومًا`,
    headline_metrics,
    sections,
    unmeasured,
  };
}

/** المسار الكامل: قراءة صامدة ثم تأليف. يُختبر بعميل مُصطنع بلا شبكة. */
export async function assembleRichReport(
  db: ReportDb,
  input: RichReportInput,
  now = Date.now(),
): Promise<ReportDocument> {
  const params = normalizeParams(input, now);
  const sources = await fetchRichReportSources(db, params);
  return composeRichReport(sources, params, new Date(now).toISOString());
}

/* ══════════════════════════════════════════════════════════════════════
   دالّة الخادم — قراءة عرض مفتوحة للزائر، بلا كتابة صفٍّ واحد
   ══════════════════════════════════════════════════════════════════════ */

/**
 * `optionalSupabaseAuth` لا `requireSupabaseAuth`: شاشة التقارير سطح عرض،
 * والزائر لا يُقابَل بـUnauthorized أبدًا. ولا كتابة هنا إطلاقًا — لا صفّ
 * سجلٍّ ولا رفع ملف — فلا يوجد سطح كتابةٍ مجهول تحت المسار الاختياري.
 * من أراد أرشفة المستند فليكتبه في دالّة منفصلة مشروطة بـ`userId`
 * (الحارس: `src/integrations/supabase/optional-auth-write.contract.test.ts`).
 */
export const buildRichReport = createServerFn({ method: "POST" })
  .middleware([optionalSupabaseAuth])
  .inputValidator((d: unknown) => RichReportInputSchema.parse(d ?? {}))
  .handler(async ({ data, context }): Promise<ReportDocument> => {
    return assembleRichReport(context.supabase as unknown as ReportDb, data);
  });
