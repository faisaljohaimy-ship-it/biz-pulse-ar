/**
 * SystemModulesDashboard — a horizontal, responsive dashboard of the system's
 * main modules as activated icon tiles. Every tile links to a REAL existing
 * route (constitution art. 6: no dead/placeholder icons).
 *
 * Layout: a clean horizontal scroll with snap on mobile (tiles keep a stable
 * width, no crop/stretch), flowing into a wrapped multi-column grid on larger
 * screens. Full RTL, ≥44px touch targets, works on phone/laptop/desktop.
 */
import { Link } from "@tanstack/react-router";
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
} from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface ModuleTile {
  readonly to: string;
  readonly ar: string;
  readonly en: string;
  readonly icon: typeof Shield;
}

// Every `to` verified to exist under src/routes/_authenticated.
const MODULES: readonly ModuleTile[] = [
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

export function SystemModulesDashboard() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      aria-label={ar ? "لوحة وحدات النظام" : "System modules dashboard"}
      className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-tight text-white sm:text-base">
          {ar ? "وحدات النظام" : "System Modules"}
        </h2>
        <span className="text-[10px] uppercase tracking-[0.24em] text-[#3AE8FF]/70">
          {ar ? "لوحة تنفيذية" : "Executive Dashboard"}
        </span>
      </div>

      {/* Horizontal scroll on mobile (snap, stable tile width, no crop);
          wraps into a responsive grid from sm upward. */}
      <ul
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6"
        style={{ scrollbarWidth: "thin" }}
      >
        {MODULES.map((m) => {
          const Icon = m.icon;
          const label = ar ? m.ar : m.en;
          return (
            <li key={m.to} className="w-[38%] shrink-0 snap-start sm:w-auto">
              <Link
                to={m.to as "/"}
                aria-label={label}
                className="group flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border border-[#00D4FF]/25 bg-[#00D4FF]/[0.05] p-3 text-center shadow-[0_0_20px_rgba(0,212,255,0.12)] transition hover:-translate-y-0.5 hover:border-[#3AE8FF]/60 hover:bg-[#3AE8FF]/[0.1] hover:shadow-[0_0_32px_rgba(58,232,255,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]/60"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#00D4FF]/15 text-[#3AE8FF] shadow-[0_0_16px_rgba(0,212,255,0.4)] transition group-hover:bg-[#3AE8FF]/25">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="line-clamp-2 text-[11px] font-medium leading-tight text-white/85">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default SystemModulesDashboard;
