/**
 * SystemModulesDashboard — a horizontal, responsive dashboard of the system's
 * main modules as activated icon tiles. Every tile links to a REAL existing
 * route (constitution art. 6: no dead/placeholder icons).
 *
 * Layout: a clean horizontal scroll with snap on mobile (tiles keep a stable
 * width, no crop/stretch), flowing into a wrapped multi-column grid on larger
 * screens. Full RTL, ≥44px touch targets, works on phone/laptop/desktop.
 */
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { MODULES } from "@/lib/nav/modules";
import { getModuleBadges } from "@/lib/exec/module-badges.functions";
import { HoloModuleCard } from "./HoloModuleCard";

export function SystemModulesDashboard() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  // Live badges — tiles breathe before they're opened. Resilient source:
  // reference figures fill in whenever the database is silent.
  const fetchBadges = useServerFn(getModuleBadges);
  const badgesQ = useQuery({
    queryKey: ["module-badges"],
    queryFn: () => fetchBadges(),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  const b = badgesQ.data;
  const badgeFor = (to: string): string | null => {
    if (!b) return null;
    if (to === "/hcis") return `${b.hcis_pct}%`;
    if (to === "/ptw") return ar ? `${b.permits_active} نشط` : `${b.permits_active} active`;
    if (to === "/executive-reports" || to === "/sec/reports")
      return ar ? `${b.reports_count} تقارير` : `${b.reports_count} reports`;
    return null;
  };

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
        {MODULES.map((m, i) => (
          <li key={m.to} className="w-[38%] shrink-0 snap-start sm:w-auto">
            <HoloModuleCard module={m} index={i} ar={ar} badge={badgeFor(m.to)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default SystemModulesDashboard;
