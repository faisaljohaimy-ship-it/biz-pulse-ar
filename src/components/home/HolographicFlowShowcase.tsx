/**
 * HolographicFlowShowcase — a cinematic, holographic-orbital frame that
 * hosts the two flagship live flow diagrams (Holographic Command Tree +
 * NEXIOS Agentic Flow Canvas). Adds orbital rings, rotating conic halo,
 * digital scanlines, data-packet streaks and corner brackets so every
 * empty area around the graphs feels alive. Respects prefers-reduced-motion
 * and the `data-nx-frozen` freeze contract. Bilingual + RTL safe.
 */
import { RefreshCw, GitBranch, Radio } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { AgentHierarchyGraph } from "@/components/executive/AgentHierarchyGraph";
import { AgenticFlowCanvas } from "@/components/home/AgenticFlowCanvas";
import { useFreezeOffscreen } from "@/hooks/use-freeze-offscreen";

type Agent = { id: string; name: string; state: string };

function OrbitalFrame({
  children,
  accent,
  label,
  icon: Icon,
  action,
}: {
  children: React.ReactNode;
  accent: string;
  label: string;
  icon: typeof Radio;
  action?: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl">
      {/* Rotating conic halo (border effect) */}
      <span
        aria-hidden
        className="hfx-halo pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[140%] -translate-x-1/2 -translate-y-1/2"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, ${accent} 70deg, transparent 170deg, ${accent}80 260deg, transparent 340deg)`,
          opacity: 0.55,
        }}
      />
      {/* Glass body creates a 1.5px gradient border */}
      <div
        className="relative m-[1.5px] overflow-hidden rounded-[calc(1.5rem-1.5px)] bg-[#04101c]/92 backdrop-blur-xl"
        style={{ boxShadow: `0 30px 90px -40px ${accent}66, inset 0 0 60px ${accent}12` }}
      >
        {/* Radial accent glow */}
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 end-[-8%] h-64 w-64 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${accent}55, transparent 70%)`, opacity: 0.6 }}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-24 start-[-8%] h-64 w-64 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${accent}33, transparent 70%)`, opacity: 0.6 }}
        />

        {/* Digital grid backdrop */}
        <span
          aria-hidden
          className="hfx-grid pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage: `linear-gradient(${accent}22 1px, transparent 1px), linear-gradient(90deg, ${accent}22 1px, transparent 1px)`,
            backgroundSize: "34px 34px",
            maskImage: "radial-gradient(ellipse at center, black 55%, transparent 85%)",
          }}
        />

        {/* Orbital rings */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 400 400"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`hfx-orb-${label}`} x1="0%" x2="100%">
              <stop offset="0%" stopColor={accent} stopOpacity="0" />
              <stop offset="50%" stopColor={accent} stopOpacity="0.55" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>
          <g className="hfx-orbit-a">
            <ellipse cx="200" cy="200" rx="190" ry="120" fill="none" stroke={`url(#hfx-orb-${label})`} strokeWidth="0.6" />
          </g>
          <g className="hfx-orbit-b">
            <ellipse cx="200" cy="200" rx="150" ry="80" fill="none" stroke={`url(#hfx-orb-${label})`} strokeWidth="0.5" />
          </g>
          <g className="hfx-orbit-c">
            <ellipse cx="200" cy="200" rx="110" ry="55" fill="none" stroke={`url(#hfx-orb-${label})`} strokeWidth="0.4" />
          </g>
        </svg>

        {/* Data-packet streaks */}
        <span
          aria-hidden
          className="hfx-sweep pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, boxShadow: `0 0 12px ${accent}` }}
        />
        <span
          aria-hidden
          className="hfx-sweep-b pointer-events-none absolute inset-y-0 end-0 w-px"
          style={{ background: `linear-gradient(180deg, transparent, ${accent}, transparent)`, boxShadow: `0 0 12px ${accent}` }}
        />

        {/* Corner brackets */}
        {[
          "top-3 start-3 border-t-2 border-s-2",
          "top-3 end-3 border-t-2 border-e-2",
          "bottom-3 start-3 border-b-2 border-s-2",
          "bottom-3 end-3 border-b-2 border-e-2",
        ].map((cls) => (
          <span
            key={cls}
            aria-hidden
            className={`pointer-events-none absolute h-4 w-4 rounded-sm ${cls}`}
            style={{ borderColor: `${accent}88` }}
          />
        ))}

        {/* Header */}
        <div className="relative flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border"
              style={{ borderColor: `${accent}66`, background: `${accent}1A`, color: accent, boxShadow: `0 0 22px ${accent}55` }}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div
              className="truncate text-[11px] font-bold uppercase tracking-[0.28em]"
              style={{ color: accent }}
            >
              {label}
            </div>
          </div>
          {action}
        </div>

        {/* Content */}
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

export function HolographicFlowShowcase({
  ar,
  agents,
}: {
  ar: boolean;
  agents: Agent[];
}) {
  const { locale: _locale } = useI18n();
  const ref = useFreezeOffscreen<HTMLElement>();

  return (
    <section
      ref={ref}
      data-nx-frozen="false"
      dir={ar ? "rtl" : "ltr"}
      aria-label={ar ? "التدفقات الهولوغرامية" : "Holographic Flows"}
      className="relative z-10 mx-auto mt-8 w-full max-w-7xl px-4 sm:mt-12 sm:px-6"
    >
      {/* Section header */}
      <div className="mb-4 flex items-center gap-3 sm:mb-6">
        <span className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#3AE8FF]/85">
          {ar ? "التدفقات الحية · مدارات الذكاء" : "Live Flows · Intelligence Orbits"}
        </span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#3AE8FF]/40 to-transparent" />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-2">
        {/* Holographic Command Tree */}
        <OrbitalFrame
          accent="#3AE8FF"
          label={ar ? "شجرة القيادة الهولوغرامية" : "Holographic Command Tree"}
          icon={GitBranch}
          action={
            <button
              type="button"
              onClick={() => {
                // Re-mount the graph by dispatching a custom event; the graph
                // component already handles a soft-refresh internally.
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("nx:agent-graph:refresh"));
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#3AE8FF]/40 bg-[#3AE8FF]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#3AE8FF] transition-colors hover:bg-[#3AE8FF]/20"
            >
              <RefreshCw className="h-3 w-3" />
              {ar ? "إعادة عرض" : "Replay"}
            </button>
          }
        >
          <div className="min-h-[360px] p-3 sm:min-h-[420px] sm:p-5">
            <AgentHierarchyGraph agents={agents as never} runs={[]} ar={ar} />
          </div>

        </OrbitalFrame>

        {/* Agentic Flow Canvas */}
        <OrbitalFrame
          accent="#34D399"
          label={ar ? "NEXIOS · مدار الوكلاء" : "NEXIOS · Agentic Orbit"}
          icon={Radio}
          action={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#34D399]/40 bg-[#34D399]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#34D399]">
              {ar ? "محاكاة مرجعية" : "Reference Sim"}
            </span>
          }
        >
          <div className="min-h-[360px] p-3 sm:min-h-[420px] sm:p-5">
            <AgenticFlowCanvas ar={ar} />
          </div>

        </OrbitalFrame>
      </div>

      <style>{`
        .hfx-halo { animation: hfx-spin 14s linear infinite; }
        .hfx-grid { animation: hfx-grid-shift 22s linear infinite; }
        .hfx-orbit-a { transform-origin: 200px 200px; animation: hfx-spin 24s linear infinite; }
        .hfx-orbit-b { transform-origin: 200px 200px; animation: hfx-spin-rev 18s linear infinite; }
        .hfx-orbit-c { transform-origin: 200px 200px; animation: hfx-spin 12s linear infinite; }
        .hfx-sweep { animation: hfx-sweep-x 4.2s ease-in-out infinite; }
        .hfx-sweep-b { animation: hfx-sweep-y 5.6s ease-in-out infinite; }
        @keyframes hfx-spin { to { transform: rotate(360deg); } }
        @keyframes hfx-spin-rev { to { transform: rotate(-360deg); } }
        @keyframes hfx-grid-shift { to { background-position: 34px 34px, 34px 34px; } }
        @keyframes hfx-sweep-x { 0%,100% { opacity: 0.15; transform: translateY(0); } 50% { opacity: 1; transform: translateY(280px); } }
        @keyframes hfx-sweep-y { 0%,100% { opacity: 0.15; transform: translateX(0); } 50% { opacity: 1; transform: translateX(-280px); } }
        [data-nx-frozen="true"] .hfx-halo,
        [data-nx-frozen="true"] .hfx-grid,
        [data-nx-frozen="true"] .hfx-orbit-a,
        [data-nx-frozen="true"] .hfx-orbit-b,
        [data-nx-frozen="true"] .hfx-orbit-c,
        [data-nx-frozen="true"] .hfx-sweep,
        [data-nx-frozen="true"] .hfx-sweep-b { animation-play-state: paused !important; }
        @media (prefers-reduced-motion: reduce) {
          .hfx-halo, .hfx-grid, .hfx-orbit-a, .hfx-orbit-b, .hfx-orbit-c, .hfx-sweep, .hfx-sweep-b { animation: none !important; }
        }
      `}</style>
    </section>
  );
}

export default HolographicFlowShowcase;
