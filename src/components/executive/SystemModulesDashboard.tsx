/**
 * SystemModulesDashboard — a horizontal, responsive dashboard of the system's
 * main modules as activated icon tiles. Every tile links to a REAL existing
 * route (constitution art. 6: no dead/placeholder icons).
 *
 * Layout: a clean horizontal scroll with snap on mobile (tiles keep a stable
 * width, no crop/stretch), flowing into a wrapped multi-column grid on larger
 * screens. Full RTL, ≥44px touch targets, works on phone/laptop/desktop.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useI18n } from "@/lib/i18n";
import { MODULES, modulePurpose, type ModuleEntry } from "@/lib/nav/modules";
import { getModuleBadges } from "@/lib/exec/module-badges.functions";
import { HoloModuleCard } from "./HoloModuleCard";

export function SystemModulesDashboard() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  // Long-press on any tile surfaces its one-line purpose here (art. 21) —
  // one shared card, so a hold explains the module before you open it.
  const [info, setInfo] = useState<ModuleEntry | null>(null);

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
  // Constitution art. 6: reference figures carry a VISIBLE simulation mark —
  // a degree ring suffixed to the number + an explanatory tooltip.
  const simMark = b?.source === "reference" ? "°" : "";
  const simTitle =
    b?.source === "reference"
      ? ar
        ? "محاكاة مرجعية — is_simulation = true"
        : "Reference simulation — is_simulation = true"
      : undefined;
  const badgeFor = (to: string): { text: string; title?: string } | null => {
    if (!b) return null;
    if (to === "/hcis") return { text: `${b.hcis_pct}%${simMark}`, title: simTitle };
    if (to === "/ptw")
      return {
        text: ar ? `${b.permits_active} نشط${simMark}` : `${b.permits_active} active${simMark}`,
        title: simTitle,
      };
    if (to === "/executive-reports" || to === "/sec/reports")
      return {
        text: ar ? `${b.reports_count} تقارير${simMark}` : `${b.reports_count} reports${simMark}`,
        title: simTitle,
      };
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
            <HoloModuleCard
              module={m}
              index={i}
              ar={ar}
              badge={badgeFor(m.to)}
              onLongPress={setInfo}
            />
          </li>
        ))}
      </ul>

      {/* Long-press purpose card (touch). Desktop reveals the same line via
          the tile's native title tooltip on hover. */}
      {info && (
        <div
          role="dialog"
          aria-label={ar ? info.ar : info.en}
          className="fixed inset-x-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[110] mx-auto max-w-md rounded-2xl border border-[rgba(var(--holo-glow),0.4)] bg-[#061A2E]/95 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur"
          onClick={() => setInfo(null)}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <info.icon className="h-5 w-5 text-[#3AE8FF]" aria-hidden />
              <span className="text-sm font-bold text-white">{ar ? info.ar : info.en}</span>
            </div>
            <button
              type="button"
              onClick={() => setInfo(null)}
              className="flex h-11 w-11 items-center justify-center rounded-full text-white/60 hover:text-white"
              aria-label={ar ? "إغلاق" : "Close"}
            >
              ✕
            </button>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-white/70">{modulePurpose(info.to, ar)}</p>
        </div>
      )}
    </section>
  );
}

export default SystemModulesDashboard;
