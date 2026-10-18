/**
 * بديل صفحة الصيانة حين لا تجيب القاعدة — قرار المالك ٢٠٢٦/١٠/١٨.
 *
 * عرضت `/sec/maintenance` على الإنتاج «تعذّر تحميل مؤشرات الصيانة الآن» لأن قاعدة Lovable
 * Cloud لا تجيب (504 على `select now()`). فسُئل المالك (AskUserQuestion) واختار بنصّه
 * «Real-file fallback (Recommended)»: أوامر تصدير SAP PM الحقيقية الـ249 المضمَّنة في
 * المستودع (`maintenance-report.data.json`، المعتمدة إنتاجيةً ٢٠٢٦/٠٩/٠٢) بلا هوية أشخاص،
 * موسومةً بتاريخ التصدير، وتعود القاعدة الحية تلقائيًّا متى أجابت. وهو ينسخ في هذه الصفحة
 * وحدها قاعدة ٢٠٢٦/١٠/٠٦ «العطل ⇐ خطأ بإعادة محاولة» — والخطأ باقٍ حيث لا بديل (أدناه).
 *
 * ## ما هو، وما ليس هو
 * - **ليس محاكاة:** صفوف التصدير نفسها التي استُوردت إلى `maint_orders` — لا صفّ مؤلَّف ولا
 *   رقم مقدَّر. ولا `resilient()` ولا وسم محاكاة.
 * - **ليس القاعدة:** 249 أمرًا من أكثر من ألفين، بلا سجلّ CM ولا ما تغيّر في التطبيق بعد
 *   الاستيراد. لذا `source: "export"` وشارةٌ وسطرٌ يقولان ذلك، ولا يُقدَّم على أنه حيّ.
 *
 * ## مرآة القاعدة لا تقدير
 * الحقول المحسوبة تتبع تعريفاتها في `maint_orders_v` و`maint_kpis()` و`maint_analytics()`
 * (`20261006190000_maint_orders_sap_public.sql`) — والحارس يقارنها. والتاريخ المرجعي **تاريخ
 * التصدير لا اليوم**: لقطةٌ تُقرأ في لحظتها، فلا يُعدّ أمرٌ متأخرًا مئات الأيام لمجرّد أن
 * القاعدة لم تُجب. والحالة على الخريطة المصحَّحة في `sap-export-rules.ts` (`sapStatus`):
 * PLAN في هذا التصدير هي الأوامر الوقائية الـ13 المغلقة في SAP بلا إنجاز وعليها علامة حذف
 * ⇐ «ملغاة» لا «مفتوحة» (الملف المضمَّن سبق التصحيح فسمّاها `open`).
 *
 * ## ما لا يحمله التصدير — لا يُخترع (المادة ٢٧)
 * تاريخ الإنجاز الفعلي (فالتأخير والالتزام بالموعد `null`)، والإسناد (لا عمود موكَّل:
 * فلا «بلا فني» ولا «أوامري» — نتيجتهما فارغة ومؤشرهما صفر لا يُعرض)، والمدينة، والغرامات،
 * وحالة نظام SAP. والكلفة الصفرية في الملف المضمَّن لا تميّز «صفرًا مسجَّلًا» من «فارغ» ⇐
 * `null` «غير مسجّلة»، ولا يتغيّر بها مجموع.
 *
 * ## الهوية والنافذة — يفشل مغلقًا
 * العضوية لا تُتحقّق بلا القاعدة ⇐ كل قارئ غيرُ عضو: لا ملاحظات ولا منشئ ولا فني
 * (`viewer_is_member: false`). ونافذة القراءة العامة نفسها (`maint_public_read_open()`): بعد
 * `2027-04-06 00:00+03` لا يُخدَم البديل لأحد — يعيد `null` فيرفع المعالج خطأه العربي، كما
 * يعود العرض فارغًا لغير العضو.
 *
 * وحدةُ خادمٍ تُستورد ديناميكيًّا داخل المعالجات (نمط `maintenance-report.real.server.ts`)
 * فلا يبلغ الملف حزمة العميل.
 */
import {
  MAINTENANCE_REPORT_DATE,
  MAINTENANCE_REPORT_ROWS,
  type MaintenanceReportSourceRow,
} from "@/lib/exec/maintenance-report.real.server";
import { STAGE_PCT, type OrderStatus, type Stage, type SystemCode } from "./cm-log-rules";
import type {
  KeyCount,
  MaintAnalytics,
  MaintKpis,
  MaintOrder,
  MaintPage,
  MaintSummary,
} from "./maint-types";
import { plannerRegion, sapFacilityName, sapSystem } from "./sap-export-rules";

/** نهاية نافذة القراءة العامة — `maint_public_read_open()` حرفًا. */
export const PUBLIC_READ_CLOSES_AT = Date.parse("2027-04-06T00:00:00+03:00");

const DAY_MS = 86_400_000;
/** `a - b` بالأيام لتاريخين `YYYY-MM-DD` — طرح `date` في Postgres. */
const daysBetween = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / DAY_MS);

/** الحالة والمرحلة — `sapStatus` المصحَّحة على ما حفظه الملف المضمَّن. */
function statusOf(s: MaintenanceReportSourceRow["status"]): { status: OrderStatus; stage: Stage } {
  if (s === "closed") return { status: "completed", stage: "closed" };
  if (s === "in_progress") return { status: "open", stage: "on_site" };
  return { status: "cancelled", stage: "registered" };
}

/** `maint_stage_pct(stage, status)` حرفًا. */
function stagePct(stage: Stage, status: OrderStatus): number | null {
  if (status === "cancelled") return null;
  if (status === "completed") return 100;
  return STAGE_PCT[stage];
}

const isActive = (o: MaintOrder) => o.status === "open" || o.status === "on_hold";

/**
 * صفّ التصدير ⇐ صفّ `maint_orders_v` كما يراه غير العضو. يُبنى حقلًا حقلًا: ما لم يُسمَّ
 * هنا لا يعبر — فلا تمرّ هويةٌ ولو أُضيف حقلها إلى تصديرٍ لاحق.
 */
export function exportOrder(r: MaintenanceReportSourceRow, asOf: string): MaintOrder {
  const { status, stage } = statusOf(r.status);
  const active = status === "open" || status === "on_hold";
  const at = `${r.opened_at}T00:00:00Z`;
  return {
    id: r.id,
    ref: r.ref,
    source: "sap",
    city: null,
    site: sapFacilityName(r.system_desc),
    system: sapSystem(r.system_desc),
    // أقرب حقلٍ مقيس لـ«المكوّن»: وصف المعدّة (الكائن الفني) حين وُجد.
    component: r.equipment_desc,
    description: r.title,
    priority: r.priority,
    status,
    stage,
    stage_basis: "import_evidence",
    hold_reason: null,
    progress_pct: stagePct(stage, status),
    requested_at: r.opened_at,
    due_at: r.due_at,
    completed_at: null,
    delay_days: null,
    overdue_days: active && r.due_at ? Math.max(0, daysBetween(asOf, r.due_at)) : null,
    age_days: active ? daysBetween(asOf, r.opened_at) : null,
    sap_wo: r.ref,
    po: null,
    boq_item: null,
    qty: null,
    service_cost: null,
    maintenance_cost: r.actual_cost_sar > 0 ? r.actual_cost_sar : null,
    spares_cost: null,
    delay_penalty: null,
    notes: null,
    created_by: null,
    created_by_name: null,
    created_by_staff: null,
    assigned_to: null,
    assigned_to_name: null,
    assigned_to_staff: null,
    is_assigned: false,
    created_at: at,
    updated_at: at,
    kind: r.kind,
    region: plannerRegion(r.area_code),
    functional_location: r.asset_code,
    equipment: r.equipment,
    planner_group: r.area_code,
    plan_generated: false,
    sla_text: r.priority_window,
    sap_system_status: null,
    notification: null,
    maintenance_plan: null,
    maintenance_cycle: r.cycle_text,
    planned_cost: r.planned_cost_sar > 0 ? r.planned_cost_sar : null,
    viewer_is_member: false,
  };
}

/** `round(x, 1)` على نسبةٍ مقامها قد يكون صفرًا ⇐ `null` (المادة ٢٧). */
function rate(num: number, den: number): number | null {
  return den === 0 ? null : Math.round((1000 * num) / den) / 10;
}

/** `sum(x)` في SQL: `null` حين لا قيمة مسجّلة أصلًا — لا صفر بديلًا عن الغياب. */
function sumOrNull(xs: Array<number | null>): number | null {
  const v = xs.filter((x): x is number => x !== null);
  return v.length ? v.reduce((a, b) => a + b, 0) : null;
}

/** `maint_kpis()` على الصفوف المعطاة. */
export function exportKpis(rows: readonly MaintOrder[], publicReadOpen: boolean): MaintKpis {
  const count = (f: (o: MaintOrder) => boolean) => rows.filter(f).length;
  const completed = count((o) => o.status === "completed");
  const cancelled = count((o) => o.status === "cancelled");
  const delays = rows.map((o) => o.delay_days).filter((d): d is number => d !== null);
  const late = delays.filter((d) => d > 0);
  const progress = rows
    .filter(isActive)
    .map((o) => o.progress_pct)
    .filter((p): p is number => p !== null);
  const preventive = count((o) => o.kind === "preventive" && o.status !== "cancelled");
  const preventiveDone = count((o) => o.kind === "preventive" && o.status === "completed");
  const requested = rows.map((o) => o.requested_at).filter((d): d is string => d !== null);
  requested.sort();
  return {
    total: rows.length,
    open: count((o) => o.status === "open"),
    on_hold: count((o) => o.status === "on_hold"),
    completed,
    cancelled,
    overdue: count((o) => (o.overdue_days ?? 0) > 0),
    completion_rate: rate(completed, rows.length - cancelled),
    on_time_rate: rate(delays.filter((d) => d === 0).length, delays.length),
    on_time_basis: delays.length,
    avg_delay_late: late.length
      ? Math.round((10 * late.reduce((a, b) => a + b, 0)) / late.length) / 10
      : null,
    avg_progress_active: progress.length
      ? Math.round(progress.reduce((a, b) => a + b, 0) / progress.length)
      : null,
    maintenance_cost: sumOrNull(
      rows.filter((o) => o.status === "completed").map((o) => o.maintenance_cost),
    ),
    spares_cost: sumOrNull(rows.filter((o) => o.status === "completed").map((o) => o.spares_cost)),
    penalties: sumOrNull(rows.map((o) => o.delay_penalty)),
    sap_pending: count(
      (o) => o.source === "cm_log" && o.sap_wo === null && o.status === "completed",
    ),
    // الإسناد غير مقيس في التصدير (لا عمود موكَّل) — صفرٌ لا يُعرض، لا «بلا فني» مختلَق.
    unassigned_active: 0,
    preventive_total: preventive,
    preventive_done: preventiveDone,
    pm_compliance: rate(preventiveDone, preventive),
    first_request: requested[0] ?? null,
    last_request: requested[requested.length - 1] ?? null,
    viewer_is_member: false,
    public_read_open: publicReadOpen,
  };
}

/** تجميعٌ بمفتاحٍ قد يكون `null` (`group by` يحفظ مجموعة NULL). */
function groupBy<K>(rows: readonly MaintOrder[], key: (o: MaintOrder) => K): Map<K, MaintOrder[]> {
  const m = new Map<K, MaintOrder[]>();
  for (const o of rows) {
    const k = key(o);
    const g = m.get(k);
    if (g) g.push(o);
    else m.set(k, [o]);
  }
  return m;
}

const byNDesc = <T extends { n: number }>(xs: T[]) => xs.sort((a, b) => b.n - a.n);
const doneN = (g: MaintOrder[]) => g.filter((o) => o.status === "completed").length;
const activeN = (g: MaintOrder[]) => g.filter(isActive).length;
const minText = (xs: string[]) => xs.reduce((a, b) => (b < a ? b : a));

/** `maint_analytics()` على الصفوف المعطاة (الملغى خارجها كما في SQL). */
export function exportAnalytics(all: readonly MaintOrder[]): MaintAnalytics {
  const o = all.filter((x) => x.status !== "cancelled");

  const by_system = byNDesc(
    [...groupBy(o, (x) => x.system)].map(([key, g]) => ({
      key,
      n: g.length,
      done: doneN(g),
      active: activeN(g),
    })),
  );
  const by_region = byNDesc(
    [...groupBy(o, (x) => x.region)].map(([key, g]) => ({
      key,
      n: g.length,
      done: doneN(g),
      active: activeN(g),
      preventive: g.filter((x) => x.kind === "preventive").length,
    })),
  );
  const by_kind = byNDesc(
    [...groupBy(o, (x) => x.kind)].map(([key, g]) => ({
      key,
      n: g.length,
      done: doneN(g),
      active: activeN(g),
    })),
  );
  const by_city = byNDesc(
    [
      ...groupBy(
        o.filter((x) => x.city !== null),
        (x) => x.city,
      ),
    ].map(([key, g]) => {
      const d = g.map((x) => x.delay_days).filter((v): v is number => v !== null);
      return {
        key,
        n: g.length,
        active: activeN(g),
        on_time: rate(d.filter((v) => v === 0).length, d.length),
      };
    }),
  );
  const by_hold_reason: KeyCount[] = byNDesc(
    [...groupBy(o.filter(isActive), (x) => x.hold_reason ?? "unclassified")].map(([key, g]) => ({
      key,
      n: g.length,
    })),
  );
  const monthly = [
    ...groupBy(
      o.filter((x) => x.requested_at !== null),
      (x) => (x.requested_at as string).slice(0, 7),
    ),
  ]
    .map(([month, g]) => ({ month, requested: g.length, completed: doneN(g) }))
    .sort((a, b) => a.month.localeCompare(b.month));
  const top_components = byNDesc(
    [
      ...groupBy(
        o.filter((x) => x.component !== null),
        (x) => `${x.component}\u0000${x.system ?? ""}`,
      ),
    ].map(([, g]) => ({
      key: g[0].component,
      system: g[0].system as SystemCode | null,
      n: g.length,
    })),
  ).slice(0, 10);
  const top_sites = byNDesc(
    [
      ...groupBy(
        o.filter((x) => x.site !== null),
        (x) => (x.site as string).toLowerCase(),
      ),
    ].map(([, g]) => ({
      key: minText(g.map((x) => x.site as string)),
      n: g.length,
      active: activeN(g),
    })),
  ).slice(0, 10);

  // تكرار العطل: نفس الموقع والمكوّن خلال ٣٠ يومًا من الطلب السابق (`lag` في SQL).
  const repeats = new Map<string, { site: string[]; component: string[]; n: number }>();
  const pairs = groupBy(
    o.filter((x) => x.site !== null && x.component !== null && x.requested_at !== null),
    (x) => `${(x.site as string).toLowerCase()}\u0000${(x.component as string).toLowerCase()}`,
  );
  for (const [k, g] of pairs) {
    const seq = [...g].sort((a, b) =>
      (a.requested_at as string).localeCompare(b.requested_at as string),
    );
    for (let i = 1; i < seq.length; i++) {
      if (daysBetween(seq[i].requested_at as string, seq[i - 1].requested_at as string) > 30)
        continue;
      const e = repeats.get(k) ?? { site: [], component: [], n: 0 };
      e.site.push(seq[i].site as string);
      e.component.push(seq[i].component as string);
      e.n += 1;
      repeats.set(k, e);
    }
  }
  const repeat_failures = byNDesc(
    [...repeats.values()].map((e) => ({
      site: minText(e.site),
      component: minText(e.component),
      n: e.n,
    })),
  ).slice(0, 10);

  return {
    by_system,
    by_region,
    by_kind,
    by_city,
    by_hold_reason,
    monthly,
    top_components,
    top_sites,
    repeat_failures,
  };
}

/** معاملات القائمة بعد التحقّق — مرآة `listInput` في `maint.functions.ts`. */
export interface ExportListQuery {
  tab: "active" | "history";
  q?: string;
  system?: SystemCode;
  kind?: "corrective" | "preventive";
  region?: "central" | "western" | "eastern" | "southern";
  city?: string;
  status?: OrderStatus;
  holdReason?: string;
  mine?: boolean;
  unassigned?: boolean;
  page: number;
  pageSize: number;
}

/** فلاتر `listMaintOrders` وترتيبه وصفحته على الصفوف المعطاة. */
export function exportList(
  rows: readonly MaintOrder[],
  d: ExportListQuery,
): { rows: MaintOrder[]; total: number } {
  // لا هوية ولا إسناد في التصدير ⇐ «أوامري» و«بلا فني» بلا نتيجة، لا كل الأوامر.
  if (d.mine || d.unassigned) return { rows: [], total: 0 };
  const t = d.q
    ? d.q
        .replace(/[,()*%]/g, " ")
        .trim()
        .toLowerCase()
    : "";
  const hit = rows.filter((o) => {
    if (d.tab === "active" ? !isActive(o) : d.status ? o.status !== d.status : false) return false;
    if (d.system && o.system !== d.system) return false;
    if (d.kind && o.kind !== d.kind) return false;
    if (d.region && o.region !== d.region) return false;
    if (d.city && o.city !== d.city) return false;
    if (d.holdReason) {
      if (d.holdReason === "unclassified" ? o.hold_reason !== null : o.hold_reason !== d.holdReason)
        return false;
    }
    if (t) {
      const fields = [o.ref, o.site, o.component, o.description, o.functional_location];
      if (!fields.some((f) => f?.toLowerCase().includes(t))) return false;
    }
    return true;
  });
  // `order by … desc nulls last` ثم المرجع لترتيبٍ ثابت.
  const sorted = [...hit].sort((a, b) => {
    if (d.tab === "active") {
      const x = a.overdue_days ?? -1;
      const y = b.overdue_days ?? -1;
      if (x !== y) return y - x;
    } else {
      const x = a.requested_at ?? "";
      const y = b.requested_at ?? "";
      if (x !== y) return y.localeCompare(x);
    }
    return a.ref.localeCompare(b.ref);
  });
  const from = d.page * d.pageSize;
  return { rows: sorted.slice(from, from + d.pageSize), total: sorted.length };
}

/** أوامر التصدير كما يراها غير العضو، أو `null` بعد نافذة القراءة العامة. */
function exportRows(now: number): MaintOrder[] | null {
  if (now >= PUBLIC_READ_CLOSES_AT) return null;
  return MAINTENANCE_REPORT_ROWS.map((r) => exportOrder(r, MAINTENANCE_REPORT_DATE));
}

/** صفحة القائمة من التصدير — `null` حين لا بديل (بعد النافذة). */
export function maintExportPage(d: ExportListQuery, now = Date.now()): MaintPage | null {
  const rows = exportRows(now);
  if (!rows) return null;
  return { source: "export", exportDate: MAINTENANCE_REPORT_DATE, ...exportList(rows, d) };
}

/** الملخّص من التصدير — `null` حين لا بديل (بعد النافذة). */
export function maintExportSummary(now = Date.now()): MaintSummary | null {
  const rows = exportRows(now);
  if (!rows) return null;
  return {
    source: "export",
    exportDate: MAINTENANCE_REPORT_DATE,
    kpis: exportKpis(rows, true),
    analytics: exportAnalytics(rows),
  };
}
