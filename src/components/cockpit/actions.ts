/**
 * Cockpit action registry — the interaction contract of the executive
 * cockpit (package 02-contracts/action-registry.json, adapted to the
 * repo's real routes). Law: every interactive control inside the cockpit
 * carries a `data-action` attribute whose id exists here; the dev-mode
 * audit (auditCockpitActions) and the test suite both enforce it.
 *
 * Navigation targets were adapted to routes that actually exist in
 * src/routes/ — the contract's abstract paths (/sectors, /command-bridge,
 * /shell, /dashboards …) have no route files, so each maps to the nearest
 * real module. regions.ts stays the only geographic source (4 regions).
 */

export type CockpitSurface =
  | "navigation"
  | "architecture"
  | "runtime-flow"
  | "kpi"
  | "map"
  | "finn"
  | "quick-actions"
  | "capability"
  | "event-stream"
  | "utility"
  | "experience"
  | "overlay";

export interface CockpitAction {
  readonly id: string;
  readonly surface: CockpitSurface;
  readonly labelAr: string;
  readonly effect: string;
  /** Real route for navigate effects (adapted from the contract). */
  readonly target?: string;
  /** Server-side permission scope (display writes are simulation-gated). */
  readonly permission?: string;
}

const ACTIONS = [
  // ── Navigation (targets = real route files) ────────────────────────────
  {
    id: "nav.menu.toggle",
    surface: "navigation",
    labelAr: "فتح أو إغلاق القائمة",
    effect: "toggle-navigation",
  },
  {
    id: "nav.home",
    surface: "navigation",
    labelAr: "الرئيسية",
    effect: "navigate",
    target: "/nx-cockpit",
    permission: "cockpit.view",
  },
  {
    id: "nav.sectors",
    surface: "navigation",
    labelAr: "القطاعات",
    effect: "navigate",
    target: "/departments",
    permission: "sectors.view",
  },
  {
    id: "nav.commandBridge",
    surface: "navigation",
    labelAr: "جسر القيادة",
    effect: "navigate",
    target: "/bridge",
    permission: "command.view",
  },
  {
    id: "nav.indicators",
    surface: "navigation",
    labelAr: "المؤشرات",
    effect: "navigate",
    target: "/analytics",
    permission: "indicators.view",
  },
  {
    id: "nav.intelligence",
    surface: "navigation",
    labelAr: "الذكاء التنفيذي",
    effect: "navigate",
    target: "/intelligence",
    permission: "intelligence.view",
  },
  {
    id: "nav.agents",
    surface: "navigation",
    labelAr: "الوكلاء",
    effect: "navigate",
    target: "/agents",
    permission: "agents.view",
  },
  {
    id: "nav.operations",
    surface: "navigation",
    labelAr: "التشغيل",
    effect: "navigate",
    target: "/operations",
    permission: "operations.view",
  },
  {
    id: "nav.risks",
    surface: "navigation",
    labelAr: "المخاطر",
    effect: "navigate",
    target: "/risk",
    permission: "risk.view",
  },
  {
    id: "nav.governance",
    surface: "navigation",
    labelAr: "الحوكمة",
    effect: "navigate",
    target: "/governance",
    permission: "governance.view",
  },
  {
    id: "nav.knowledge",
    surface: "navigation",
    labelAr: "المعرفة",
    effect: "navigate",
    target: "/knowledge",
    permission: "knowledge.view",
  },
  {
    id: "nav.integrations",
    surface: "navigation",
    labelAr: "التكاملات",
    effect: "navigate",
    target: "/integrations",
    permission: "integrations.view",
  },
  {
    id: "nav.reports",
    surface: "navigation",
    labelAr: "التقارير",
    effect: "navigate",
    target: "/sec/reports",
    permission: "reports.view",
  },
  {
    id: "nav.settings",
    surface: "navigation",
    labelAr: "الإعدادات",
    effect: "navigate",
    target: "/settings",
    permission: "settings.view",
  },

  // ── Architecture layers 01..05 ─────────────────────────────────────────
  {
    id: "architecture.shell.inspect",
    surface: "architecture",
    labelAr: "فحص القشرة التنفيذية",
    effect: "open-detail",
    permission: "observability.view",
  },
  {
    id: "architecture.intelligence.inspect",
    surface: "architecture",
    labelAr: "فحص الذكاء التنفيذي",
    effect: "open-detail",
    permission: "observability.view",
  },
  {
    id: "architecture.platform.inspect",
    surface: "architecture",
    labelAr: "فحص منصة التشغيل",
    effect: "open-detail",
    permission: "observability.view",
  },
  {
    id: "architecture.agents.inspect",
    surface: "architecture",
    labelAr: "فحص تشغيل الوكلاء",
    effect: "open-detail",
    permission: "observability.view",
  },
  {
    id: "architecture.output.inspect",
    surface: "architecture",
    labelAr: "فحص بوابة الإخراج",
    effect: "open-detail",
    permission: "observability.view",
  },

  // ── Runtime data flow stages ───────────────────────────────────────────
  {
    id: "flow.request.inspect",
    surface: "runtime-flow",
    labelAr: "تفاصيل الطلب",
    effect: "open-detail",
    permission: "traces.view",
  },
  {
    id: "flow.analysis.inspect",
    surface: "runtime-flow",
    labelAr: "تفاصيل التحليل",
    effect: "open-detail",
    permission: "traces.view",
  },
  {
    id: "flow.retrieval.inspect",
    surface: "runtime-flow",
    labelAr: "تفاصيل الاسترجاع",
    effect: "open-detail",
    permission: "traces.view",
  },
  {
    id: "flow.recommendation.inspect",
    surface: "runtime-flow",
    labelAr: "تفاصيل التوصية",
    effect: "open-detail",
    permission: "traces.view",
  },
  {
    id: "flow.approval.inspect",
    surface: "runtime-flow",
    labelAr: "تفاصيل الموافقة",
    effect: "open-detail",
    permission: "traces.view",
  },
  {
    id: "flow.execution.inspect",
    surface: "runtime-flow",
    labelAr: "تفاصيل التنفيذ",
    effect: "open-detail",
    permission: "traces.view",
  },
  {
    id: "flow.result.inspect",
    surface: "runtime-flow",
    labelAr: "تفاصيل النتيجة",
    effect: "open-detail",
    permission: "traces.view",
  },

  // ── KPI cards ──────────────────────────────────────────────────────────
  {
    id: "kpi.systemHealth.open",
    surface: "kpi",
    labelAr: "تفاصيل صحة النظام",
    effect: "open-detail",
    permission: "cockpit.view",
  },
  {
    id: "kpi.overallProgress.open",
    surface: "kpi",
    labelAr: "تفاصيل الإنجاز العام",
    effect: "open-detail",
    permission: "cockpit.view",
  },
  {
    id: "kpi.smartDecisions.open",
    surface: "kpi",
    labelAr: "تفاصيل القرارات الذكية",
    effect: "open-detail",
    permission: "decisions.view",
  },
  {
    id: "kpi.criticalAlerts.open",
    surface: "kpi",
    labelAr: "تفاصيل التنبيهات الحرجة",
    effect: "open-detail",
    permission: "alerts.view",
  },
  {
    id: "kpi.financialImpact.open",
    surface: "kpi",
    labelAr: "تفاصيل التأثير المالي",
    effect: "open-detail",
    permission: "finance.view",
  },

  // ── Strategic map ──────────────────────────────────────────────────────
  {
    id: "map.region.select",
    surface: "map",
    labelAr: "اختيار منطقة",
    effect: "select-region",
    permission: "cockpit.view",
  },
  {
    id: "map.mode.3d",
    surface: "map",
    labelAr: "عرض ثلاثي الأبعاد",
    effect: "set-map-mode",
    target: "3d",
    permission: "cockpit.view",
  },
  {
    id: "map.mode.layers",
    surface: "map",
    labelAr: "طبقات البيانات",
    effect: "set-map-mode",
    target: "layers",
    permission: "cockpit.view",
  },
  {
    id: "map.mode.heat",
    surface: "map",
    labelAr: "خريطة حرارية",
    effect: "set-map-mode",
    target: "heat",
    permission: "cockpit.view",
  },
  {
    id: "map.mode.live",
    surface: "map",
    labelAr: "تتبع مباشر",
    effect: "set-map-mode",
    target: "live",
    permission: "cockpit.view",
  },
  {
    id: "map.fullscreen",
    surface: "map",
    labelAr: "ملء الشاشة",
    effect: "toggle-fullscreen",
    permission: "cockpit.view",
  },

  // ── FINN ───────────────────────────────────────────────────────────────
  {
    id: "finn.chat.open",
    surface: "finn",
    labelAr: "فتح محادثة FINN",
    effect: "open-finn-chat",
    permission: "finn.use",
  },
  {
    id: "finn.chat.send",
    surface: "finn",
    labelAr: "إرسال رسالة إلى FINN",
    effect: "open-finn-chat",
    permission: "finn.use",
  },
  {
    id: "toast.dismiss",
    surface: "overlay",
    labelAr: "إغلاق الإشعار المنبثق",
    effect: "close-drawer",
    permission: "cockpit.view",
  },
  {
    id: "finn.voice.toggle",
    surface: "finn",
    labelAr: "بدء أو إيقاف التحدث مع FINN",
    effect: "toggle-voice",
    permission: "finn.voice",
  },
  {
    id: "finn.recommendation.open",
    surface: "finn",
    labelAr: "عرض القرار بالتفصيل",
    effect: "open-detail",
    permission: "decisions.view",
  },

  // ── Quick actions ──────────────────────────────────────────────────────
  {
    id: "quick.initiative.create",
    surface: "quick-actions",
    labelAr: "إنشاء مبادرة جديدة",
    effect: "open-workflow",
    target: "initiative-create",
    permission: "initiatives.create",
  },
  {
    id: "quick.sectorReport.create",
    surface: "quick-actions",
    labelAr: "تقرير أداء القطاعات",
    effect: "open-workflow",
    target: "sector-report",
    permission: "reports.create",
  },
  {
    id: "quick.riskAnalysis.open",
    surface: "quick-actions",
    labelAr: "تحليل المخاطر",
    effect: "open-workflow",
    target: "risk-analysis",
    permission: "risk.analyze",
  },
  {
    id: "quick.decisions.review",
    surface: "quick-actions",
    labelAr: "مراجعة القرارات المعلقة",
    effect: "open-workflow",
    target: "decision-review",
    permission: "decisions.review",
  },

  // ── Capability grid (targets = real route files) ───────────────────────
  {
    id: "capability.shell.open",
    surface: "capability",
    labelAr: "عرض مكونات القشرة",
    effect: "navigate",
    target: "/runtime-hub",
    permission: "shell.view",
  },
  {
    id: "capability.agents.open",
    surface: "capability",
    labelAr: "عرض شبكة الوكلاء",
    effect: "navigate",
    target: "/agents",
    permission: "agents.view",
  },
  {
    id: "capability.rag.open",
    surface: "capability",
    labelAr: "استعلام المعرفة",
    effect: "navigate",
    target: "/knowledge",
    permission: "knowledge.query",
  },
  {
    id: "capability.integrations.open",
    surface: "capability",
    labelAr: "إدارة التكاملات",
    effect: "navigate",
    target: "/integrations",
    permission: "integrations.view",
  },
  {
    id: "capability.performance.open",
    surface: "capability",
    labelAr: "عرض الأداء الاستراتيجي",
    effect: "navigate",
    target: "/portfolio",
    permission: "portfolio.view",
  },
  {
    id: "capability.risk.open",
    surface: "capability",
    labelAr: "عرض المخاطر والامتثال",
    effect: "navigate",
    target: "/risk",
    permission: "risk.view",
  },

  // ── Live event stream ──────────────────────────────────────────────────
  {
    id: "events.pause.toggle",
    surface: "event-stream",
    labelAr: "إيقاف أو استئناف الأحداث",
    effect: "toggle-event-stream",
    permission: "events.view",
  },
  {
    id: "events.previous",
    surface: "event-stream",
    labelAr: "الحدث السابق",
    effect: "focus-previous-event",
    permission: "events.view",
  },
  {
    id: "events.next",
    surface: "event-stream",
    labelAr: "الحدث التالي",
    effect: "focus-next-event",
    permission: "events.view",
  },
  {
    id: "events.dismiss",
    surface: "event-stream",
    labelAr: "إخفاء الحدث",
    effect: "dismiss-event",
    permission: "events.dismiss",
  },
  {
    id: "events.open",
    surface: "event-stream",
    labelAr: "فتح تفاصيل الحدث",
    effect: "open-detail",
    permission: "events.view",
  },

  // ── Utility ────────────────────────────────────────────────────────────
  {
    id: "appearance.toggle",
    surface: "utility",
    labelAr: "تبديل التباين الداكن",
    effect: "toggle-appearance",
  },
  {
    id: "search.open",
    surface: "utility",
    labelAr: "فتح البحث",
    effect: "open-search",
    permission: "search.use",
  },
  {
    id: "dashboards.open",
    surface: "utility",
    labelAr: "فتح لوحات المعلومات",
    effect: "navigate",
    target: "/dashboard",
    permission: "dashboards.view",
  },
  {
    id: "notifications.open",
    surface: "utility",
    labelAr: "فتح الإشعارات",
    effect: "open-notifications",
    permission: "notifications.view",
  },
  {
    id: "settings.open",
    surface: "utility",
    labelAr: "فتح الإعدادات",
    effect: "navigate",
    target: "/settings",
    permission: "settings.view",
  },
  { id: "user.menu", surface: "utility", labelAr: "فتح قائمة المستخدم", effect: "open-user-menu" },

  // ── Experience levels ──────────────────────────────────────────────────
  {
    id: "level.executive",
    surface: "experience",
    labelAr: "المستوى التنفيذي",
    effect: "set-experience-level",
    target: "executive",
    permission: "cockpit.view",
  },
  {
    id: "level.operational",
    surface: "experience",
    labelAr: "المستوى التشغيلي",
    effect: "set-experience-level",
    target: "operational",
    permission: "operations.view",
  },
  {
    id: "level.technical",
    surface: "experience",
    labelAr: "المستوى التقني",
    effect: "set-experience-level",
    target: "technical",
    permission: "observability.view",
  },

  // ── Overlays ───────────────────────────────────────────────────────────
  { id: "overlay.close", surface: "overlay", labelAr: "إغلاق النافذة", effect: "close-overlay" },
  {
    id: "overlay.confirm",
    surface: "overlay",
    labelAr: "تأكيد الإجراء",
    effect: "confirm-overlay",
  },
  {
    id: "snapshot.retry",
    surface: "utility",
    labelAr: "إعادة تحميل اللقطة",
    effect: "retry-snapshot",
    permission: "cockpit.view",
  },
] as const satisfies readonly CockpitAction[];

export type CockpitActionId = (typeof ACTIONS)[number]["id"];

export const COCKPIT_ACTIONS: ReadonlyMap<string, CockpitAction> = new Map(
  ACTIONS.map((a) => [a.id, a]),
);

export function getCockpitAction(id: CockpitActionId): CockpitAction {
  const action = COCKPIT_ACTIONS.get(id);
  if (!action) throw new Error(`إجراء غير مسجل في سجل القمرة: ${id}`);
  return action;
}

// ── Internal analytics (no PII, no free text — action ids only) ──────────

export interface CockpitActionEvent {
  readonly actionId: string;
  /** Monotonic-ish client timestamp; never sent to an external provider. */
  readonly at: number;
}

const analyticsBuffer: CockpitActionEvent[] = [];
const ANALYTICS_CAP = 200;

/** Record an interaction for the in-app analytics ring buffer + DOM event. */
export function emitCockpitAction(actionId: CockpitActionId): void {
  const event: CockpitActionEvent = { actionId, at: Date.now() };
  analyticsBuffer.push(event);
  if (analyticsBuffer.length > ANALYTICS_CAP) analyticsBuffer.shift();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("nexios:cockpit-action", { detail: event }));
  }
}

export function readCockpitAnalytics(): readonly CockpitActionEvent[] {
  return analyticsBuffer;
}

// ── Dev-mode dead-control audit ──────────────────────────────────────────

/**
 * Scan the cockpit root for interactive controls that carry no registered
 * action id. Returns the offending descriptors (empty = clean). Runs in
 * dev effect + in the test suite; production pays nothing.
 */
export function auditCockpitActions(root: ParentNode): string[] {
  const offenders: string[] = [];
  const controls = root.querySelectorAll<HTMLElement>("button, a[href]");
  controls.forEach((el) => {
    // Fallback surfaces (error states) audit-exempt by explicit marker.
    if (el.closest("[data-audit-exempt]")) return;
    const id = el.getAttribute("data-action");
    if (!id) {
      offenders.push(
        `بلا data-action: <${el.tagName.toLowerCase()}> "${el.textContent?.trim().slice(0, 40) ?? ""}"`,
      );
    } else if (!COCKPIT_ACTIONS.has(id)) {
      offenders.push(`data-action غير مسجل: ${id}`);
    }
  });
  return offenders;
}
