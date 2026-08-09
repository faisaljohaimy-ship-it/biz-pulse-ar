/**
 * أسماء الشاشات — المرجع الوحيد لاسم كل مسار.
 *
 * WHY THIS EXISTS
 * The review raised two items that are the same defect seen from two sides:
 *   ٢٢ «توحيد اسم المركز بين الصفحة الرئيسية وصفحة مركز القيادة الذكي»
 *   ٣٨ «توحيد المسميات الى غرفة العمليات»
 *
 * The repo had drifted into both failure modes at once:
 *   · ONE route under THREE names — `/sec` was «الأمن الصناعي» in the module
 *     registry, «غرفة العمليات» in the app shell, and «مركز العمليات» on the
 *     dashboard tiles.
 *   · ONE name over TWO routes — «غرفة العمليات» pointed at both `/sec` and
 *     `/situation-room`, and «مركز القيادة» at both `/mission-control` and
 *
 * The second is the worse one. A name that resolves to two destinations makes
 * the navigation unlearnable: the operator clicks the words they remember and
 * lands somewhere else, and no amount of visual polish repairs that.
 *
 * MODULES stays the navigation LIST (order, icons, what is reachable). This
 * module is the naming AUTHORITY, derived from it so the two can never
 * disagree, plus the screens that are reachable without sitting in the main
 * nav. Every surface that prints a screen's name reads it from here instead of
 * re-typing a string literal — drift becomes impossible rather than merely
 * discouraged.
 */
import { MODULES } from "./modules";

export interface ScreenName {
  readonly ar: string;
  readonly en: string;
}

/**
 * Screens reachable outside the main module list — the command palette, the
 * preview rail, the executive map hotspots. They still need canonical names
 * because they still collide.
 *
 * `/mission-control` is a screen of its own, and the
 * names say which is which: مركز القيادة التنفيذي is the executive command
 * center (the KPI/approval/agent-council surface, per its own file header),
 * while مركز القيادة is the live mission-control stream listed in MODULES.
 */
const EXTRA_SCREEN_NAMES: Readonly<Record<string, ScreenName>> = {
  "/": { ar: "الرئيسية", en: "Home" },
  // Its own heading said «غرفة العمليات» while the command palette called it
  // «جسر تنفيذي» — a THIRD route claiming /situation-room's name.
  "/sec/exec": { ar: "اللوحة التنفيذية", en: "Executive Dashboard" },
  "/sec/incidents": { ar: "البلاغات", en: "Incidents" },
  "/sec/kpi": { ar: "مؤشرات الأداء", en: "Live KPIs" },
  "/exec": { ar: "محرك التنفيذ", en: "Execution Engine" },
  "/operations": { ar: "سجل التشغيل", en: "Operations Log" },
  "/finn": { ar: "سَدِيد", en: "SADEED" },
};

function buildScreenNames(): Readonly<Record<string, ScreenName>> {
  const out: Record<string, ScreenName> = { ...EXTRA_SCREEN_NAMES };
  for (const m of MODULES) {
    // MODULES wins on overlap: it is what the operator actually sees in the
    // sidebar, so a divergent extra entry would be the wrong one.
    out[m.to] = { ar: m.ar, en: m.en };
  }
  return out;
}

/** Canonical name per route. Keys are router paths. */
export const SCREEN_NAMES: Readonly<Record<string, ScreenName>> = buildScreenNames();

/**
 * The canonical Arabic name for a route.
 *
 * Throws on an unknown route rather than falling back to the path. A silent
 * fallback would render a raw URL in the sidebar and read as a styling bug,
 * which is exactly the kind of failure that survives review for months; a
 * throw fails the build's type-check-adjacent tests instead.
 */
export function screenNameAr(route: string): string {
  const name = SCREEN_NAMES[route];
  if (!name) throw new Error(`screenNameAr: no canonical name for route "${route}"`);
  return name.ar;
}

/** The canonical English name for a route. See `screenNameAr`. */
export function screenNameEn(route: string): string {
  const name = SCREEN_NAMES[route];
  if (!name) throw new Error(`screenNameEn: no canonical name for route "${route}"`);
  return name.en;
}

/** Convenience for bilingual call sites: `screenName("/sec", isArabic)`. */
export function screenName(route: string, ar: boolean): string {
  return ar ? screenNameAr(route) : screenNameEn(route);
}
