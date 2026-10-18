/**
 * البلاغات الحقيقية — تصدير «تقرير البلاغات» (EventReport، ٢٠٢٦/٠٨/٢٧).
 *
 * أمر المالك ٢٠٢٦/٠٨/٢٧: «إزالة المحاكاة واستبدالها بتطبيق الملفات
 * الحقيقية الحية» — نطاق البلاغات حصرًا. المجموعة 3,427 بلاغًا فعليًّا في
 * `event-report.data.json` (2026-05-01 → 2026-07-28).
 *
 * ## الحقيقة الصارمة (المادة ٢٧)
 *
 * المصدر يحمل: المرجع، التصنيف الفرعي (العنوان)، الفئة «الأحداث الأمنية»،
 * الحالة (open/closed فقط)، تاريخ البلاغ، المنشئ، المدينة، المنطقة.
 * **ولا يحمل**: شدة، أولوية، أزمنة استجابة، سببًا جذريًّا، ولا أي حقل
 * ذكاء — فكلها `null` هنا وتُعرض «لم يُقَس»/«غير مصنف»، واختلاقها ممنوع.
 *
 * ## الخريطة الموثقة (JSON → OmsIncidentRow)
 *
 * - `category` ← `category_ar` («الأحداث الأمنية»): صفحة `/sec/incidents`
 *   تعرض العمود نصًّا حرًّا (`{i.category}`)، فالعربية من الملف هي القيمة.
 * - `owner` ← `creator`: أقرب حقل لعمود «المنشئ» في الملف الحقيقي —
 *   والصفحة سمّت عمودها «المنشئ» تبعًا لذلك (لا «الموكَّل»).
 * - `city` / `region_id` من الملف كما هما (معرّفات regions.ts).
 * - severity/priority/resolved_at/response_minutes/root_cause/ai_* ← null؛
 *   aria_auto_analyzed/escalated ← false؛ corrective_actions/attachments
 *   ← فارغة (لا شيء منها في المصدر).
 *
 * ## لماذا `Object.freeze`
 *
 * الصفوف الحقيقية **لا تُوسم محاكاة**: `markSimulation` (الذي يمرّ عليه
 * كل بديل `resilient`) يتخطى الكائنات المجمّدة (`Object.isFrozen`)، فيبقى
 * `is_simulation` غائبًا عنها — وتذييلات التصدير المحروسة تصف الحقيقة
 * تلقائيًّا. والتجميد يحمي المرجع الثابت من أي تعديل عرضي.
 *
 * ## لماذا `?raw`
 *
 * الاستيراد `?raw` (نص خام ثم `JSON.parse`) يُبقي 1.2MB خارج تحليل tsc
 * (لا استدلال نوع على 3,427 صفًّا) وداخل حزمة الخادم وحدها — هذه الوحدة
 * لا تُستورد إلا ديناميكيًّا داخل معالجات دوال الخادم (نمط
 * showcase-simulation نفسه)، فلا يبلغ الملف حزمة العميل.
 */
import rawEventReport from "./event-report.data.json?raw";
import type { OmsIncidentRow } from "./showcase-simulation.server";
import type { SecIncident } from "@/lib/sec.functions";
import type { ExecKpiSources, ExecDrillSources } from "@/lib/sec-exec-kpis.functions";

/** صف المصدر كما في التصدير المطبَّع — لا حقول ذكاء ولا شدة ولا أولوية. */
export type EventReportSourceRow = {
  id: string;
  ref: string;
  title_ar: string;
  category_ar: string;
  status: "open" | "closed";
  reported_at: string;
  creator: string;
  city: string;
  region_id: string;
};

const SOURCE_ROWS: EventReportSourceRow[] = JSON.parse(rawEventReport) as EventReportSourceRow[];

/**
 * المجموعة الحقيقية كاملة بترتيب الأحدث أولًا — نفس ترتيب استعلام القاعدة
 * (`order("reported_at", { ascending: false })`). كل صف مجمّد.
 */
export const REAL_INCIDENTS: readonly OmsIncidentRow[] = Object.freeze(
  [...SOURCE_ROWS]
    .sort((a, b) => (a.reported_at < b.reported_at ? 1 : a.reported_at > b.reported_at ? -1 : 0))
    .map((r) =>
      Object.freeze({
        id: r.id,
        ref: r.ref,
        site_id: null,
        category: r.category_ar,
        title_ar: r.title_ar,
        title_en: null,
        severity: null,
        status: r.status,
        priority: null,
        owner: r.creator,
        assigned_to: null,
        reported_at: r.reported_at,
        resolved_at: null,
        response_minutes: null,
        root_cause: null,
        ai_summary: null,
        ai_risk_score: null,
        aria_auto_analyzed: false,
        escalated: false,
        corrective_actions: [],
        attachments: [] as never[],
        attachments_count: 0,
        executive_review: null,
        executive_reviewed_at: null,
        executive_reviewed_by: null,
        city: r.city,
        region_id: r.region_id,
      } satisfies OmsIncidentRow),
    ),
);

/** تاريخ اعتماد التصدير (أمر المالك ٢٠٢٦/٠٨/٢٧) — لا تاريخ استخراجه؛ يُوسم به كل جوابٍ يقرأ هذه اللقطة. */
export const EVENT_REPORT_DATE = "2026-08-27";

/** عدّادات محسوبة من الصفوف نفسها — لا أرقام مكتوبة يدويًّا. */
export const REAL_INCIDENT_COUNTS = Object.freeze({
  total: REAL_INCIDENTS.length,
  open: REAL_INCIDENTS.filter((i) => i.status === "open").length,
  closed: REAL_INCIDENTS.filter((i) => i.status === "closed").length,
});

/** معرّف صف من المجموعة الحقيقية (`evr-<ref>`) — ليس UUID وليس `sim-*`. */
export const isRealIncidentId = (id: string) => id.startsWith("evr-");

/** حلّ بلاغ حقيقي بمعرّفه — للدرج التفصيلي. */
export function findRealIncident(id: string): OmsIncidentRow | null {
  return REAL_INCIDENTS.find((i) => i.id === id) ?? null;
}

/**
 * أحدث الصفوف بشكل `SecIncident` لسطح `/sec` («آخر البلاغات» والخط
 * الزمني ومؤشرات النظرة العامة). السقف الافتراضي 200 مرآةُ سقف الاستعلام
 * الحي في `fetchSecOverview`.
 */
export const REAL_SEC_INCIDENTS: readonly SecIncident[] = Object.freeze(
  REAL_INCIDENTS.slice(0, 200).map((i) =>
    Object.freeze({
      id: i.id,
      ref: i.ref,
      site_id: null,
      category: i.category,
      title_ar: i.title_ar,
      title_en: null,
      severity: null,
      status: i.status,
      owner: i.owner,
      reported_at: i.reported_at,
      resolved_at: null,
      response_minutes: null,
      root_cause: null,
      ai_summary: null,
    } satisfies SecIncident),
  ),
);

/** مصدر مؤشرات اللوحة التنفيذية (`ExecKpiSources.incidents`) — كامل المجموعة. */
export const REAL_EXEC_KPI_INCIDENTS: ExecKpiSources["incidents"] = Object.freeze(
  REAL_INCIDENTS.map((i) =>
    Object.freeze({ severity: null, status: i.status, response_minutes: null }),
  ),
) as unknown as ExecKpiSources["incidents"];

/** صفوف drilldown البلاغات في `/sec/exec` — كامل المجموعة بهويتها الحقيقية. */
export const REAL_EXEC_DRILL_INCIDENTS: ExecDrillSources["incidents"] = Object.freeze(
  REAL_INCIDENTS.map((i) =>
    Object.freeze({
      id: i.id,
      ref: i.ref,
      title_ar: i.title_ar,
      severity: null,
      status: i.status,
      response_minutes: null,
    }),
  ),
) as unknown as ExecDrillSources["incidents"];
