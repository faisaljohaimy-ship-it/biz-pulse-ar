import { useState } from "react";
import { ExternalLink, Maximize2, Minimize2, Radio } from "lucide-react";

const LIVE_URL = "https://hajj-nexus-prime.lovable.app/";

export function LiveSystemShowcase() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      dir="ltr"
      className="relative z-10 mx-auto mt-10 w-full max-w-7xl px-4 sm:mt-16 sm:px-6"
      aria-label="Live system showcase"
    >
      {/* Heading */}
      <div dir="rtl" className="mb-5 text-center sm:mb-7">
        <div className="text-[10px] uppercase tracking-[0.3em] text-[#3AE8FF]/70 sm:text-[11px]">
          Live Showcase · عرض حي
        </div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-3xl">
          النظام كاملاً · مشهد تنفيذي مباشر
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-xs text-white/55 sm:text-sm">
          نافذة احترافية تعرض منصة قيادة الأمن الصناعي بكل أجزائها في وقتها الحقيقي.
        </p>
      </div>

      {/* Cinematic ambient halos */}
      <div className="pointer-events-none absolute inset-x-0 top-20 -z-10 flex justify-center">
        <div className="h-[560px] w-[820px] max-w-full rounded-full bg-[radial-gradient(circle_at_center,rgba(0,212,255,0.35),transparent_60%)] blur-3xl" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-40 -z-10 flex justify-center">
        <div className="h-[380px] w-[620px] max-w-full rounded-full bg-[radial-gradient(circle_at_center,rgba(58,232,255,0.25),transparent_65%)] blur-2xl" />
      </div>

      {/* Outer chrome */}
      <div
        className={`group relative mx-auto overflow-hidden rounded-3xl border border-[#3AE8FF]/30 bg-gradient-to-b from-[#0a2740]/90 via-[#061A2E]/95 to-[#04111f]/95 shadow-[0_0_80px_rgba(0,212,255,0.35),inset_0_0_60px_rgba(0,212,255,0.08)] backdrop-blur-xl transition-all duration-500 ${
          expanded ? "max-w-[1400px]" : "max-w-6xl"
        }`}
      >
        {/* Animated border conic glow */}
        <div className="pointer-events-none absolute inset-0 rounded-3xl opacity-60 [background:conic-gradient(from_0deg,transparent_0deg,rgba(0,212,255,0.35)_60deg,transparent_120deg,transparent_240deg,rgba(58,232,255,0.35)_300deg,transparent_360deg)] [animation:spin_18s_linear_infinite] [mask:linear-gradient(#000,#000)_content-box,linear-gradient(#000,#000)] [mask-composite:exclude] p-[1px]" />

        {/* Title bar */}
        <div className="relative flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57] shadow-[0_0_8px_rgba(255,95,87,0.7)]" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e] shadow-[0_0_8px_rgba(254,188,46,0.7)]" />
            <span className="h-3 w-3 rounded-full bg-[#28c840] shadow-[0_0_8px_rgba(40,200,64,0.7)]" />
          </div>

          <div className="hidden flex-1 items-center justify-center sm:flex">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-1.5 text-[11px] text-white/70">
              <Radio className="h-3 w-3 animate-pulse text-[#3AE8FF]" />
              <span className="font-mono">hajj-nexus-prime.lovable.app</span>
              <span className="ml-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                LIVE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-md border border-white/10 bg-white/5 p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
            <a
              href={LIVE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-[#3AE8FF]/40 bg-[#3AE8FF]/10 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#3AE8FF]/20"
            >
              <ExternalLink className="h-3 w-3" />
              <span className="hidden sm:inline">Open</span>
            </a>
          </div>
        </div>

        {/* Live iframe stage */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#04111f]">
          {/* Scanline + vignette overlays */}
          <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,transparent_0%,transparent_92%,rgba(0,212,255,0.08)_100%)]" />
          <div className="pointer-events-none absolute inset-0 z-10 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.025)_0px,rgba(255,255,255,0.025)_1px,transparent_1px,transparent_3px)] mix-blend-overlay" />
          <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_120px_rgba(6,26,46,0.85)]" />

          <iframe
            src={LIVE_URL}
            title="NEXUS AI OS Live System"
            loading="lazy"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            className="absolute left-1/2 top-1/2 h-[180%] w-[180%] -translate-x-1/2 -translate-y-1/2 origin-center scale-[0.56] border-0 sm:h-[160%] sm:w-[160%] sm:scale-[0.62]"
          />
        </div>

        {/* Footer telemetry strip */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-white/[0.03] px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-white/50 sm:px-5 sm:text-[11px]">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span>Streaming · بث مباشر</span>
          </div>
          <div className="hidden sm:block">SECURE TUNNEL · TLS 1.3</div>
          <div>UPTIME 99.97%</div>
        </div>
      </div>
    </section>
  );
}
