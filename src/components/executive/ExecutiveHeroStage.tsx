import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { NexusRevealHero } from "@/components/cinematic/NexusRevealHero";
import { KpiTile, type KpiTone } from "./KpiTile";
import { getExecKpis } from "@/lib/sec.functions";
import { supabase } from "@/integrations/supabase/client";

/**
 * ExecutiveHeroStage — Wave 1 cinematic wrapper.
 *
 * Keeps the proven `NexusRevealHero` centerpiece (ARIA stage, magnetic CTA,
 * launch overlay) and layers on top:
 *   - Volumetric fog + mesh-gradient backdrop (CSS only, GPU transforms).
 *   - Deterministic 24-mote particle aura (SVG, paused under reduced-motion).
 *   - Floating glass KPI panels on the left/right rails bound to live
 *     `sec_*` data via `getExecKpis` (RLS-scoped; degrades to "—" when
 *     unauthenticated — no fabricated numbers).
 *
 * The hero remains the single source of the "Start Operation" CTA; this
 * wrapper only adds ambient + executive intelligence overlays.
 */
export interface ExecutiveHeroStageProps {
  onEnterOps?: () => void;
}

// Deterministic mote positions so SSR / hydration match and animation phase
// is consistent across reloads. Generated with a fixed seed (Math impl below).
const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d;
const MOTES = Array.from({ length: 24 }, (_, i) => {
  const a = i * 137.508 * (Math.PI / 180); // golden-angle scatter
  const r = 12 + ((i * 53) % 38); // radius %
  return {
    cx: round(50 + r * Math.cos(a)),
    cy: round(50 + r * Math.sin(a) * 0.62),
    delay: round((i * 0.31) % 6, 2),
    size: round(1.2 + ((i * 7) % 9) / 10, 2),
  };
});

export function ExecutiveHeroStage({ onEnterOps }: ExecutiveHeroStageProps) {
  const fetchKpis = useServerFn(getExecKpis);
  const [hasSession, setHasSession] = useState(false);
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => alive && setHasSession(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setHasSession(!!s));
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  const q = useQuery({
    queryKey: ["exec-kpis", "hero"],
    queryFn: async () => {
      try {
        return await fetchKpis();
      } catch {
        return null;
      }
    },
    refetchInterval: 15_000,
    retry: false,
    staleTime: 10_000,
    enabled: hasSession,
  });

  const k = q.data;
  const loading = q.isLoading || q.isError || !k;

  const left = useMemo(
    () => [
      {
        labelAr: "حوادث حرجة 24س",
        labelEn: "Critical (24h)",
        value: loading ? "—" : k!.incidents_critical,
        tone: ((k?.incidents_critical ?? 0) > 0 ? "rose" : "emerald") as KpiTone,
        hint: loading ? undefined : `إجمالي ${k!.incidents_total}`,
      },
      {
        labelAr: "MTTR (دقائق)",
        labelEn: "Mean Response",
        value: loading ? "—" : `${k!.mttr_minutes}m`,
        tone: ((k?.mttr_minutes ?? 0) > 15 ? "amber" : "cyan") as KpiTone,
      },
    ],
    [k, loading],
  );

  const right = useMemo(
    () => [
      {
        labelAr: "نسبة الإغلاق",
        labelEn: "Resolution Rate",
        value: loading ? "—" : `${k!.incidents_resolution_rate}%`,
        tone: ((k?.incidents_resolution_rate ?? 0) >= 90
          ? "emerald"
          : (k?.incidents_resolution_rate ?? 0) >= 70
            ? "amber"
            : "rose") as KpiTone,
      },
      {
        labelAr: "أوامر عمل مفتوحة",
        labelEn: "Open Work Orders",
        value: loading ? "—" : k!.wo_open,
        tone: "cyan" as KpiTone,
        hint: loading ? undefined : `مغلق ${k!.wo_closed}`,
      },
    ],
    [k, loading],
  );

  return (
    <section aria-label="ARIA executive stage" className="relative isolate">
      {/* Ambient mesh gradient + volumetric fog (decorative). */}
      <div aria-hidden className="executive-fog pointer-events-none absolute inset-0 -z-0" />

      {/* Particle aura — 24 motes, paused under prefers-reduced-motion. */}
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 -z-0 h-full w-full opacity-70 mix-blend-screen motion-reduce:hidden"
      >
        {MOTES.map((m, i) => (
          <circle
            key={i}
            cx={m.cx}
            cy={m.cy}
            r={m.size / 8}
            fill="url(#exec-mote)"
            className="executive-mote"
            style={{ animationDelay: `${m.delay}s` }}
          />
        ))}
        <defs>
          <radialGradient id="exec-mote">
            <stop offset="0%" stopColor="var(--nx-cyan-2)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--nx-cyan)" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      {/* Centerpiece hero — keeps the existing magnetic CTA + launch overlay. */}
      <div className="relative z-10">
        <NexusRevealHero onEnterOps={onEnterOps} />
      </div>

      {/* Floating glass KPI rails — hidden on mobile to keep CTA in focus. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 hidden h-full lg:block">
        <div className="mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <div
            className="pointer-events-auto flex w-56 flex-col gap-3"
            aria-label="Hero KPIs left rail"
          >
            {left.map((t, i) => (
              <KpiTile key={i} {...t} loading={loading} />
            ))}
          </div>
          <div
            className="pointer-events-auto flex w-56 flex-col gap-3"
            aria-label="Hero KPIs right rail"
          >
            {right.map((t, i) => (
              <KpiTile key={i} {...t} loading={loading} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default ExecutiveHeroStage;
