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
import { hajjPlatformUrl } from "@/config/platforms";
import {
  Activity,
  BarChart3,
  Bot,
  Boxes,
  BrainCircuit,
  Building2,
  ClipboardCheck,
  FileCheck,
  FileText,
  Gauge,
  GraduationCap,
  ShieldCheck,
  LineChart,
  Map as MapIcon,
  Moon,
  PieChart,
  Radar,
  Shield,
  ShieldAlert,
  Siren,
  Sparkles,
  Telescope,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export interface ModuleEntry {
  readonly to: string;
  readonly ar: string;
  readonly en: string;
  readonly icon: LucideIcon;
  /** External sister platform: icons open it directly in a new tab. */
  readonly external?: boolean;
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
  { to: "/bi", ar: "لوحات التحليل", en: "BI Dashboards", icon: PieChart },
  { to: "/governance", ar: "الحوكمة", en: "Governance", icon: ClipboardCheck },
  { to: "/risk", ar: "المخاطر", en: "Risk", icon: ShieldAlert },
  { to: "/sec/maintenance", ar: "الصيانة", en: "Maintenance", icon: Wrench },
  { to: "/sec/permits", ar: "التصاريح", en: "Permits", icon: FileText },
  { to: "/hcis", ar: "الامتثال HCIS", en: "HCIS Compliance", icon: ShieldCheck },
  { to: "/ptw", ar: "تصاريح العمل الرقمية", en: "Digital PTW", icon: FileCheck },
  { to: "/urgent-ops", ar: "العاجل", en: "Urgent Ops", icon: Siren },
  { to: "/boardroom", ar: "قاعة المجلس", en: "Boardroom", icon: Building2 },
  { to: "/hajj", ar: "منصة نُسك الحج", en: "Hajj Platform", icon: Moon, external: true },
  { to: "/aria", ar: "آريا التنفيذية", en: "ARIA Engine", icon: Sparkles },
  { to: "/aria-analytics", ar: "تحليلات آريا", en: "ARIA Analytics", icon: LineChart },
  { to: "/intelligence", ar: "الذكاء والتطوّر", en: "Intelligence", icon: BrainCircuit },
  { to: "/observability", ar: "الرصد والتكاليف", en: "Observability", icon: Telescope },
  { to: "/learn", ar: "التعلّم", en: "Learn", icon: GraduationCap },
];

/**
 * One-line purpose per module route (constitution art. 21: every icon can
 * explain itself). Single source — consumed by the module-grid tooltip and
 * the /guide system map alike, so a tile and its guide entry never drift.
 */
export const MODULE_PURPOSE: Record<string, { ar: string; en: string }> = {
  "/sec": {
    ar: "المظلة التشغيلية للأمن الصناعي — المواقع والبلاغات والحوادث.",
    en: "The industrial-security umbrella — sites, incidents, alerts.",
  },
  "/mission-control": {
    ar: "مركز القيادة الموحّد لكل المناطق في شاشة واحدة.",
    en: "One unified command center across every region.",
  },
  "/situation-room": {
    ar: "غرفة العمليات الحيّة — المتابعة اللحظية والتصعيد.",
    en: "The live operations room — real-time watch and escalation.",
  },
  "/executive-map": {
    ar: "الخريطة الجغرافية التنفيذية للأصول والمناطق.",
    en: "The executive geographic map of assets and regions.",
  },
  "/agents": {
    ar: "تشغيل ومراقبة الوكلاء الأذكياء تحت قيادة آريا.",
    en: "Run and monitor the AI agent fleet under ARIA.",
  },
  "/digital-twin": {
    ar: "التوأم الرقمي — مطابقة الميدان بالنموذج الرقمي.",
    en: "The digital twin — reconcile field state with the model.",
  },
  "/executive-reports": {
    ar: "توليد التقارير التنفيذية بصيغة PDF عربية.",
    en: "Generate executive reports as Arabic PDFs.",
  },
  "/analytics": {
    ar: "الإحصائيات التشغيلية والاتجاهات الزمنية.",
    en: "Operational statistics and time-series trends.",
  },
  "/bi": {
    ar: "لوحات تحليلية تفاعلية بنمط Power BI مع تصدير.",
    en: "Interactive Power BI-style dashboards with export.",
  },
  "/governance": {
    ar: "الحوكمة والسياسات ومسارات الاعتماد.",
    en: "Governance, policies and approval pipelines.",
  },
  "/risk": {
    ar: "سجل المخاطر وتقييم الأثر والتخفيف.",
    en: "The risk register — impact assessment and mitigation.",
  },
  "/sec/maintenance": {
    ar: "أوامر الصيانة الوقائية والتصحيحية.",
    en: "Preventive and corrective maintenance orders.",
  },
  "/sec/permits": {
    ar: "إدارة تصاريح العمل السارية والمنتهية.",
    en: "Manage active and expired work permits.",
  },
  "/hcis": {
    ar: "مصفوفة الامتثال للهيئة العليا للأمن الصناعي.",
    en: "The HCIS compliance matrix.",
  },
  "/ptw": {
    ar: "تصاريح العمل الرقمية بدورة حياة كاملة وQR.",
    en: "Digital permits-to-work with full lifecycle and QR.",
  },
  "/urgent-ops": {
    ar: "الأعمال العاجلة واتفاقيات الخدمة (SLA).",
    en: "Urgent operations and service-level agreements.",
  },
  "/boardroom": {
    ar: "قاعة المجلس — العرض التنفيذي للقيادة.",
    en: "The boardroom — the executive briefing for leadership.",
  },
  "/hajj": {
    ar: "منصة نُسك للحج — تُفتح خارجيًا في نافذة جديدة.",
    en: "The Nusuk Hajj platform — opens externally in a new tab.",
  },
  "/aria": {
    ar: "آريا التنفيذية — المساعد الذكي الصوتي والنصي.",
    en: "ARIA Executive — the voice and text AI assistant.",
  },
  "/aria-analytics": {
    ar: "تحليلات أداء آريا واستخدامها.",
    en: "ARIA performance and usage analytics.",
  },
  "/intelligence": {
    ar: "منظومة الذكاء ذاتية التطور تحت اعتماد بشري.",
    en: "The self-evolving intelligence organization, human-approved.",
  },
  "/observability": {
    ar: "الرصد التقني والتكاليف وصحة المنظومة.",
    en: "Technical observability, costs and system health.",
  },
  "/learn": {
    ar: "مركز التعلّم — مسارات ودروس واختبارات.",
    en: "The learning center — tracks, lessons and quizzes.",
  },
};

/** Localized one-line purpose for a route, or undefined if not a module. */
export function modulePurpose(to: string, ar: boolean): string | undefined {
  const p = MODULE_PURPOSE[to];
  return p ? (ar ? p.ar : p.en) : undefined;
}

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

/**
 * Resolved external URL for an external module (currently only Nusuk),
 * or null → consumers fall back to the internal route. Single source:
 * src/config/platforms.ts.
 */
export function moduleExternalUrl(entry: ModuleEntry): string | null {
  if (!entry.external) return null;
  return hajjPlatformUrl();
}
