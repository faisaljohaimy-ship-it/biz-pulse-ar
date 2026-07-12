/**
 * Canonical module registry — the SINGLE SOURCE OF TRUTH for the name and icon
 * of every top-level system module (constitution art. 13.5).
 *
 * Both the module dashboard (`SystemModulesDashboard`) and the app sidebar
 * (`app-shell`) resolve their labels/icons from here, so a module's identity is
 * literally defined once and can never drift between surfaces. Any route that
 * appears here is rendered with THIS name and THIS icon everywhere it shows.
 *
 * Every `to` is a REAL existing route under src/routes/_authenticated
 * (constitution art. 6: no dead/placeholder icons).
 */
import {
  Activity,
  BarChart3,
  Bot,
  Boxes,
  Building2,
  ClipboardCheck,
  FileText,
  Gauge,
  Map as MapIcon,
  Moon,
  Radar,
  Shield,
  ShieldAlert,
  Siren,
  Sparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface ModuleEntry {
  readonly to: string;
  readonly ar: string;
  readonly en: string;
  readonly icon: LucideIcon;
}

export const MODULES: readonly ModuleEntry[] = [
  { to: "/sec", ar: "الأمن الصناعي", en: "Industrial Security", icon: Shield },
  { to: "/mission-control", ar: "مركز القيادة", en: "Mission Control", icon: Gauge },
  { to: "/situation-room", ar: "غرفة العمليات", en: "Situation Room", icon: Radar },
  { to: "/executive-map", ar: "الخريطة التنفيذية", en: "Executive Map", icon: MapIcon },
  { to: "/agents", ar: "الوكلاء الأذكياء", en: "AI Agents", icon: Bot },
  { to: "/digital-twin", ar: "التوأم الرقمي", en: "Digital Twin", icon: Boxes },
  { to: "/executive-reports", ar: "التقارير التنفيذية", en: "Executive Reports", icon: BarChart3 },
  { to: "/analytics", ar: "الإحصائيات", en: "Analytics", icon: Activity },
  { to: "/governance", ar: "الحوكمة", en: "Governance", icon: ClipboardCheck },
  { to: "/risk", ar: "المخاطر", en: "Risk", icon: ShieldAlert },
  { to: "/sec/maintenance", ar: "الصيانة", en: "Maintenance", icon: Wrench },
  { to: "/sec/permits", ar: "التصاريح", en: "Permits", icon: FileText },
  { to: "/urgent-ops", ar: "العاجل", en: "Urgent Ops", icon: Siren },
  { to: "/boardroom", ar: "قاعة المجلس", en: "Boardroom", icon: Building2 },
  { to: "/hajj", ar: "منصة نُسك الحج", en: "Hajj Platform", icon: Moon },
  { to: "/aria", ar: "آريا التنفيذية", en: "ARIA Engine", icon: Sparkles },
];

const BY_ROUTE = new Map<string, ModuleEntry>(MODULES.map((m) => [m.to, m]));

/** Canonical entry for a route, or undefined if the route is not a top-level module. */
export function moduleByRoute(to: string): ModuleEntry | undefined {
  return BY_ROUTE.get(to);
}

/** Canonical localized label for a route, or `undefined` if not a module. */
export function moduleLabel(to: string, ar: boolean): string | undefined {
  const m = BY_ROUTE.get(to);
  return m ? (ar ? m.ar : m.en) : undefined;
}
