/**
 * محاكاة مرجعية لصفحة الصيانة — للزائر وعند تعذّر القاعدة.
 *
 * **اصطناعية بالكامل** (قرار المالك ٢٠٢٦/١٠/٠٦: البيانات الحقيقية خلف الدخول):
 * لا موقع حقيقي ولا اسم ولا رقم أمر SAP ولا ملاحظة من الملف — مواقع مُرقّمة
 * («موقع مرجعي ٣»)، وبنية مطابقة لما تعيده القاعدة، وكل صفّ موسوم. والمؤشرات
 * تُحسب من الصفوف نفسها فلا تناقضها.
 */
import {
  STAGES,
  progressOf,
  type HoldReason,
  type OrderStatus,
  type Stage,
  type SystemCode,
} from "@/lib/maintenance/cm-log-rules";
import type {
  MaintAnalytics,
  MaintKpis,
  MaintOrder,
  MaintSummary,
} from "@/lib/maintenance/maint-types";

const CITIES = ["JEDDAH", "MAKKAH", "TABUK", "MADINAH", "TAIF"] as const;
const PARTS: Record<SystemCode, string[]> = {
  CCTV: ["Outdoor Fixed Camera", "PTZ Camera", "Media Converter", "Network Video Recorder"],
  GATE: ["Arm Barrier", "Sliding Gate", "Road Blocker", "swing Gate"],
  ACS: ["Card Reader", "Elecatric Door Lock", "Turnstile"],
  VISIT: ["Site Visit"],
};
const SYSTEMS: SystemCode[] = ["CCTV", "CCTV", "GATE", "CCTV", "ACS", "GATE", "CCTV", "VISIT"];
const HOLDS: HoldReason[] = [
  "spare_parts",
  "power",
  "civil_cabling",
  "approval",
  "access",
  "it_support",
];

const DAY = 86400000;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export function buildMaintOrdersSimulation(now = Date.now()): MaintOrder[] {
  const out: MaintOrder[] = [];
  for (let i = 0; i < 40; i++) {
    const system = SYSTEMS[i % SYSTEMS.length];
    const parts = PARTS[system];
    const requested = now - (i * 9 + 3) * DAY;
    const due = requested + (i % 3) * DAY;
    // ١٢ نشطًا (٧ مفتوحة · ٥ موقوفة)، و٢ ملغيان، والباقي مُنجز.
    const status: OrderStatus =
      i < 7 ? "open" : i < 12 ? "on_hold" : i === 20 || i === 31 ? "cancelled" : "completed";
    const stage: Stage =
      status === "completed"
        ? "closed"
        : status === "on_hold"
          ? "awaiting_parts"
          : STAGES[Math.min(1 + (i % 6), 6)];
    const late = status === "completed" && i % 6 === 0 ? 4 + (i % 9) : 0;
    const completed = status === "completed" ? due + late * DAY : null;
    out.push({
      id: `sim-mo-${i + 1}`,
      ref: `SIM-${String(1000 + i)}`,
      source: "cm_log",
      city: CITIES[i % CITIES.length],
      site: `موقع مرجعي ${(i % 9) + 1}`,
      system,
      component: parts[i % parts.length],
      description: null,
      priority: i % 5 === 0 ? "high" : "medium",
      status,
      stage,
      stage_basis: "import_evidence",
      hold_reason: status === "on_hold" ? HOLDS[i % HOLDS.length] : null,
      progress_pct: progressOf(stage, status),
      requested_at: iso(requested),
      due_at: iso(due),
      completed_at: completed ? iso(completed) : null,
      delay_days: completed ? late : null,
      overdue_days:
        status === "open" || status === "on_hold"
          ? Math.max(0, Math.round((now - due) / DAY))
          : null,
      age_days:
        status === "open" || status === "on_hold" ? Math.round((now - requested) / DAY) : null,
      sap_wo: null,
      po: null,
      boq_item: null,
      qty: 1,
      service_cost: 1250,
      maintenance_cost: status === "completed" ? 1250 : null,
      spares_cost: status === "completed" && i % 7 === 0 ? 350 : 0,
      delay_penalty: late ? 125 : 0,
      notes: "ملاحظة مرجعية — بيانات محاكاة لا تخص موقعًا حقيقيًّا.",
      created_by: null,
      created_by_name: null,
      created_by_staff: null,
      assigned_to: null,
      assigned_to_name: null,
      assigned_to_staff: null,
      created_at: new Date(requested).toISOString(),
      updated_at: new Date(requested).toISOString(),
    });
  }
  return out;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const pct = (num: number, den: number) => (den > 0 ? round1((100 * num) / den) : null);
const sum = (xs: Array<number | null>) => xs.reduce<number>((a, b) => a + (b ?? 0), 0);

/** مؤشرات المحاكاة بالتعريف نفسه الذي في `maint_kpis()`. */
export function deriveMaintKpis(rows: MaintOrder[]): MaintKpis {
  const active = rows.filter((r) => r.status === "open" || r.status === "on_hold");
  const done = rows.filter((r) => r.status === "completed");
  const timed = rows.filter((r) => r.delay_days !== null);
  const late = timed.filter((r) => (r.delay_days ?? 0) > 0);
  const dates = rows
    .map((r) => r.requested_at)
    .filter((d): d is string => !!d)
    .sort();
  return {
    total: rows.length,
    open: rows.filter((r) => r.status === "open").length,
    on_hold: rows.filter((r) => r.status === "on_hold").length,
    completed: done.length,
    cancelled: rows.filter((r) => r.status === "cancelled").length,
    overdue: active.filter((r) => (r.overdue_days ?? 0) > 0).length,
    completion_rate: pct(done.length, rows.filter((r) => r.status !== "cancelled").length),
    on_time_rate: pct(timed.length - late.length, timed.length),
    on_time_basis: timed.length,
    avg_delay_late: late.length ? round1(sum(late.map((r) => r.delay_days)) / late.length) : null,
    avg_progress_active: active.length
      ? Math.round(sum(active.map((r) => r.progress_pct)) / active.length)
      : null,
    maintenance_cost: sum(done.map((r) => r.maintenance_cost)),
    spares_cost: sum(done.map((r) => r.spares_cost)),
    penalties: sum(rows.map((r) => r.delay_penalty)),
    sap_pending: done.filter((r) => !r.sap_wo).length,
    unassigned_active: active.filter((r) => !r.assigned_to).length,
    first_request: dates[0] ?? null,
    last_request: dates.at(-1) ?? null,
  };
}

function countBy<T>(rows: T[], key: (r: T) => string | null) {
  const m = new Map<string | null, T[]>();
  for (const r of rows) {
    const k = key(r);
    m.set(k, [...(m.get(k) ?? []), r]);
  }
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
}

/** تحليلات المحاكاة بالتعريف نفسه الذي في `maint_analytics()`. */
export function deriveMaintAnalytics(all: MaintOrder[]): MaintAnalytics {
  const rows = all.filter((r) => r.status !== "cancelled");
  const isActive = (r: MaintOrder) => r.status === "open" || r.status === "on_hold";
  return {
    by_system: countBy(rows, (r) => r.system).map(([key, rs]) => ({
      key,
      n: rs.length,
      done: rs.filter((r) => r.status === "completed").length,
      active: rs.filter(isActive).length,
    })),
    by_city: countBy(rows, (r) => r.city).map(([key, rs]) => {
      const timed = rs.filter((r) => r.delay_days !== null);
      return {
        key,
        n: rs.length,
        active: rs.filter(isActive).length,
        on_time: pct(timed.filter((r) => r.delay_days === 0).length, timed.length),
      };
    }),
    by_hold_reason: countBy(rows.filter(isActive), (r) => r.hold_reason ?? "unclassified").map(
      ([key, rs]) => ({ key, n: rs.length }),
    ),
    monthly: countBy(rows, (r) => r.requested_at?.slice(0, 7) ?? null)
      .filter(([k]) => k !== null)
      .map(([month, rs]) => ({
        month: month as string,
        requested: rs.length,
        completed: rs.filter((r) => r.status === "completed").length,
      }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    top_components: countBy(rows, (r) => r.component)
      .slice(0, 10)
      .map(([key, rs]) => ({ key, n: rs.length, system: rs[0].system })),
    top_sites: countBy(rows, (r) => r.site)
      .slice(0, 10)
      .map(([key, rs]) => ({ key, n: rs.length, active: rs.filter(isActive).length })),
    repeat_failures: [],
  };
}

export function buildMaintSummarySimulation(now = Date.now()): MaintSummary {
  const rows = buildMaintOrdersSimulation(now);
  return {
    source: "reference",
    kpis: deriveMaintKpis(rows),
    analytics: deriveMaintAnalytics(rows),
  };
}
