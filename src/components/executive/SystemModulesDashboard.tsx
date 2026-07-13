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
import { useI18n } from "@/lib/i18n";
import { MODULES } from "@/lib/nav/modules";

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
        {MODULES.map((m, i) => {
          const Icon = m.icon;
          const label = ar ? m.ar : m.en;
          return (
            <li key={m.to} className="w-[38%] shrink-0 snap-start sm:w-auto">
              <Link
                to={m.to as "/"}
                aria-label={label}
                style={{ animationDelay: `${-((i % 4) * 3)}s` }}
                className="nx-sector-pulse group flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-center transition hover:-translate-y-0.5 hover:border-[#3AE8FF]/60 hover:bg-[#3AE8FF]/[0.1] hover:shadow-[0_0_32px_rgba(58,232,255,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3AE8FF]/60"
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
