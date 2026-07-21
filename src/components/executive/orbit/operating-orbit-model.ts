/**
 * Operating Orbit — the pure, testable model behind the home hero
 * (constitution arts. 8, 13, 14, 21). No React, no DOM: types, the embedded
 * reference simulation, severity mapping, the four-layer / orbit specs, and
 * `shapeOrbitData()` which folds the live agent-ops overview + reference sims
 * into ONE source for both the "Living Orbit" and "System Architecture" tabs.
 *
 * Kept model-only so the contract test can pin the invariants that matter —
 * a single human-approval gate, a bounded animated-element budget, the exact
 * severity palette — without rendering anything.
 */
import type { AgentOpsOverview } from "@/lib/exec.functions";

/* ── Severity (shared with the holographic command tree) ─────────────────── */
export type Sev = "critical" | "high" | "medium" | "healthy" | "idle";
export const SEV_RGB: Record<Sev, string> = {
  critical: "248, 113, 113", // red — failed
  high: "251, 191, 36", // amber — queued
  medium: "34, 211, 238", // cyan — running
  healthy: "16, 185, 129", // emerald — ready / succeeded
  idle: "100, 140, 190", // slate — idle / disabled
};
export const SEV_AR: Record<Sev, string> = {
  critical: "حرج",
  high: "عالٍ",
  medium: "قيد التشغيل",
  healthy: "سليم",
  idle: "خامل",
};

/** HARD CEILING on simultaneously-animated SVG elements per visible tab.
 *  The production once crashed under animation weight; every view is designed
 *  and asserted to stay at or below this. */
export const ANIMATED_ELEMENT_BUDGET = 24;

export const stateToSev = (s?: string | null): Sev =>
  s === "failed"
    ? "critical"
    : s === "queued"
      ? "high"
      : s === "running"
        ? "medium"
        : s === "ready" || s === "succeeded" || s === "idle"
          ? "healthy"
          : "idle";

/* ── Shaped view model ───────────────────────────────────────────────────── */
export type OrbitAgent = { id: string; name: string; sev: Sev; stateAr: string; goal: string };
export type OrbitSource = { id: string; name: string; status: "connected" | "syncing" | "idle" };
export type OrbitAutomation = { id: string; name: string; runsToday: number; lastAr: string };

export type OrbitData = {
  agents: OrbitAgent[]; // ≤ 8, the intelligence ring
  sources: OrbitSource[]; // integration_connectors reference
  automations: OrbitAutomation[]; // running automations reference
  pendingApprovals: number; // approval_pipeline reference
  system: { agentsActive: number; automationsRunning: number; runsToday: number };
  isSimulation: boolean;
};

const stateAr = (s?: string | null): string =>
  ({
    running: "قيد التشغيل",
    queued: "في الطابور",
    ready: "جاهز",
    idle: "خامل",
    failed: "متعثّر",
    succeeded: "منجز",
    disabled: "معطّل",
  })[s ?? ""] ?? "خامل";

/* ── Embedded reference simulation (badged is_simulation) ────────────────── */
/** Enterprise source connectors — Layer 1 of the architecture board. */
export const REFERENCE_SOURCES: readonly OrbitSource[] = [
  { id: "sap", name: "SAP", status: "connected" },
  { id: "powerbi", name: "Power BI", status: "connected" },
  { id: "m365", name: "Microsoft 365", status: "syncing" },
  { id: "nafath", name: "نفاذ", status: "connected" },
  { id: "zatca", name: "ZATCA", status: "connected" },
  { id: "field", name: "المدخلات الميدانية", status: "syncing" },
];

/** Running automations — Layer 3 of the architecture board. */
export const REFERENCE_AUTOMATIONS: readonly OrbitAutomation[] = [
  { id: "compliance", name: "مراقبة الامتثال", runsToday: 42, lastAr: "قبل 3 دقائق" },
  { id: "permits", name: "دورة التصاريح", runsToday: 28, lastAr: "قبل 8 دقائق" },
  { id: "reports", name: "توليد التقارير", runsToday: 11, lastAr: "قبل 21 دقيقة" },
  { id: "sla", name: "رصد اتفاقيات الخدمة", runsToday: 64, lastAr: "قبل دقيقة" },
  { id: "proactive", name: "التنبيه الاستباقي", runsToday: 37, lastAr: "قبل 5 دقائق" },
];

export const REFERENCE_PENDING_APPROVALS = 3;

/** Reference agents used only when the overview itself is unavailable — the
 *  overview is `resilient()` and normally supplies its own fleet simulation. */
const REFERENCE_AGENTS: readonly OrbitAgent[] = [
  {
    id: "commander",
    name: "القائد",
    sev: "high",
    stateAr: "في الطابور",
    goal: "تنسيق المهام التنفيذية",
  },
  {
    id: "analyst",
    name: "المحلل",
    sev: "medium",
    stateAr: "قيد التشغيل",
    goal: "تحليل المؤشرات والمخاطر",
  },
  { id: "auditor", name: "المدقّق", sev: "healthy", stateAr: "جاهز", goal: "تدقيق الامتثال" },
  { id: "intel", name: "الذكاء", sev: "healthy", stateAr: "جاهز", goal: "الاستطلاع والرصد" },
  {
    id: "permits",
    name: "التصاريح",
    sev: "medium",
    stateAr: "قيد التشغيل",
    goal: "دورة تصاريح العمل",
  },
  { id: "reporter", name: "المُقرِّر", sev: "healthy", stateAr: "جاهز", goal: "توليد التقارير" },
  { id: "safety", name: "السلامة", sev: "healthy", stateAr: "جاهز", goal: "رصد السلامة والحريق" },
  { id: "messenger", name: "المراسل", sev: "idle", stateAr: "خامل", goal: "الإبلاغ والإشعار" },
];

/**
 * Fold the live overview + reference sims into one view model. Agents come
 * from the overview (itself resilient → never empty); sources / automations /
 * pending approvals are the badged reference until their live client feeds
 * exist. `overview === null` (fetch not yet in / failed) keeps everything on
 * the reference so the hero renders instantly and never blanks.
 */
export function shapeOrbitData(overview: AgentOpsOverview | null): OrbitData {
  const agents: OrbitAgent[] =
    overview && overview.agents.length
      ? overview.agents.slice(0, 8).map((a) => ({
          id: a.id,
          name: (a.name || "وكيل").split(/\s+/)[0],
          sev: stateToSev(a.state),
          stateAr: stateAr(a.state),
          goal: a.goal || "—",
        }))
      : REFERENCE_AGENTS.map((a) => ({ ...a }));

  const agentsActive = overview
    ? overview.system.agents_running + overview.system.queue_length
    : agents.filter((a) => a.sev === "medium" || a.sev === "high").length;
  const runsToday = overview?.system.runs_today ?? 182;

  return {
    agents,
    sources: REFERENCE_SOURCES.map((s) => ({ ...s })),
    automations: REFERENCE_AUTOMATIONS.map((a) => ({ ...a })),
    pendingApprovals: REFERENCE_PENDING_APPROVALS,
    system: {
      agentsActive,
      automationsRunning: REFERENCE_AUTOMATIONS.length,
      runsToday,
    },
    // Home is an open showcase; the reference sims are always in play, so the
    // simulation badge stays visible (doctrine: is_simulation ⇒ badged).
    isSimulation: true,
  };
}

/* ── Static walkthrough (Article 21 — understood in 3s, demo-ready) ──────── */
export type WalkStep = { key: string; titleAr: string; bodyAr: string };
export const WALKTHROUGH: readonly WalkStep[] = [
  {
    key: "sources",
    titleAr: "المصادر",
    bodyAr: "أنظمة المنشأة والميدان تغذّي النظام ببياناتها الحية.",
  },
  {
    key: "intelligence",
    titleAr: "الذكاء",
    bodyAr: "آريا تستقبل وتوزّع، والوكلاء ينفّذون ويجهّزون.",
  },
  {
    key: "automations",
    titleAr: "الأتمتة",
    bodyAr: "أتمتة الامتثال والتصاريح والتقارير تعمل بلا توقف.",
  },
  {
    key: "gate",
    titleAr: "الاعتماد البشري",
    bodyAr: "كل ما يمسّ الواقع يقف عند اعتماد صاحب الصلاحية.",
  },
];

/** The four permanent phase labels (orbit arcs / board layers). Order is the
 *  data-flow order; the gate is always last and terminal. */
export const PHASES = WALKTHROUGH.map((w) => ({ key: w.key, labelAr: w.titleAr }));
