/**
 * ExecutiveCommandDashboard — the poster command console on the homepage.
 *
 * A single region-themed executive console that mirrors the NEXIOS AI OS
 * poster: a HUD header (live clock · wordmark · region identity), a left
 * intelligence column (KPIs → initiatives → quick modules → summary), a
 * central activity/map stage, and a right ARIA assistant panel.
 *
 * Everything re-tints live on region switch (via `--nx-region-rgb` +
 * `REGION_ACCENT_HEX`). Every figure is drawn from the deterministic
 * `regionSim` fixtures and badged «محاكاة». Fully RTL, responsive, a11y-safe.
 *
 * Built in stages — Stage 1 ships the header, region identity, KPI row,
 * central activity ring and the ARIA teaser. Later stages enrich the
 * initiatives list, quick-module row, summary bar, the glowing region map
 * and the full ARIA panel.
 */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { useRegion } from "@/lib/region-context";
import { REGION_ACCENT_HEX } from "@/lib/regions";
import { regionSim } from "@/lib/sec/region-sim-data";
import { ActivityRing } from "./ActivityRing";
import { CommandHeader } from "./CommandHeader";
import { KpiRow } from "./KpiRow";
import { AriaPanel } from "./AriaPanel";
import { InitiativesList } from "./InitiativesList";
import { QuickModules } from "./QuickModules";
import { SummaryBar } from "./SummaryBar";

export function ExecutiveCommandDashboard() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const { region } = useRegion();
  const accent = REGION_ACCENT_HEX[region.id];
  const counts = regionSim(region.id).counts;

  // Client-only mount flag so SSR and first paint agree (clock, etc.).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      aria-label={ar ? "لوحة القيادة التنفيذية" : "Executive command console"}
      className="relative z-10 mx-auto w-full max-w-[1400px] px-3 sm:px-5"
      style={{ ["--acc" as string]: accent }}
    >
      <div className="nx-cmd-surface nx-living-border relative overflow-hidden rounded-[26px] p-3 sm:p-5">
        {/* region ambient wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(60% 55% at 50% 0%, ${accent}1f, transparent 68%)`,
          }}
        />

        <div className="relative">
          <CommandHeader ar={ar} accent={accent} mounted={mounted} />

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.55fr_1.35fr_0.95fr]">
            {/* ── Left · intelligence column ─────────────────────────── */}
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-black tracking-tight text-white sm:text-xl">
                  {ar ? region.labelAr : region.labelEn}
                </h2>
                <p className="mt-0.5 text-[11px] text-white/55">
                  {ar
                    ? "مركز القيادة التنفيذي · إدارة وتشغيل ذكي"
                    : "Executive command center · smart operations"}
                </p>
              </div>
              <KpiRow ar={ar} accent={accent} counts={counts} />
              <InitiativesList ar={ar} accent={accent} counts={counts} />
              <QuickModules ar={ar} accent={accent} />
            </div>

            {/* ── Center · activity stage ────────────────────────────── */}
            <div className="flex items-center justify-center">
              <ActivityRing
                ar={ar}
                accent={accent}
                value={counts.readiness}
                label={ar ? "النشاط" : "Activity"}
                regionLabel={ar ? region.shortAr : region.shortEn}
              />
            </div>

            {/* ── Right · ARIA panel ─────────────────────────────────── */}
            <AriaPanel ar={ar} accent={accent} />
          </div>

          {/* ── Full-width overall performance summary ─────────────── */}
          <div className="mt-4">
            <SummaryBar ar={ar} accent={accent} counts={counts} />
          </div>

          {/* footer hint — quick jump to the full modules grid */}
          <div className="mt-4 flex items-center justify-center">
            <Link
              to="/os"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--acc)]/40 bg-[color:var(--acc)]/10 px-4 py-1.5 text-[11px] font-semibold text-[color:var(--acc)] transition hover:bg-[color:var(--acc)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--acc)]/60"
            >
              {ar ? "دخول نظام التشغيل التنفيذي" : "Enter the executive OS"}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ExecutiveCommandDashboard;
