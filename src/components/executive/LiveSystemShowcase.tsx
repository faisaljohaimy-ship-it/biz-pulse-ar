import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Maximize2, Minimize2, Radio, Expand, Moon } from "lucide-react";
import { useI18n } from "@/lib/i18n";


// Embed the internal /hajj-prime route only — no external lovable.app URL may
// appear anywhere in the homepage HTML (MASTER RECONCILIATION item 5).
const LIVE_URL = "/hajj-prime";
const INTERNAL_URL = "/hajj-prime";

/**
 * LiveSystemShowcase — compact, right-aligned (RTL) Hajj night-mode window.
 *
 * Engineering directives:
 *  • Permanent dark mode (forced via URL params + `color-scheme: dark` + dark backdrop).
 *  • Right-anchored on wide screens (sits to the right side of the hero, beside the Hajj icon column).
 *  • Compact footprint (max-w ~ 520px) yet visually complete: chrome, telemetry, glow.
 *  • No layout shift on small screens — gracefully recenters.
 */
export function LiveSystemShowcase() {
  const [expanded, setExpanded] = useState(false);
  const { locale } = useI18n();
  const ar = locale === "ar";

  return (
    <section
      dir={ar ? "rtl" : "ltr"}
      className="relative z-10 mx-auto mt-8 w-full max-w-7xl px-4 sm:mt-12 sm:px-6"
      aria-label={ar ? "نافذة نظام الحج المباشرة" : "Live Hajj system window"}
    >

      {/* Right-aligned flex wrapper so the window sits on the right side (RTL = visual right). */}
      <div className="flex w-full justify-center lg:justify-start">
        {/* Ambient halo behind the small window only */}
        <div className="pointer-events-none absolute -z-10 hidden h-[320px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(0,212,255,0.28),transparent_65%)] blur-3xl lg:block" />

        <div
          className={`group relative overflow-hidden rounded-2xl border border-[#3AE8FF]/35 bg-gradient-to-b from-[#02101e] via-[#04111f] to-[#02101e] shadow-[0_0_50px_-10px_rgba(0,212,255,0.55),inset_0_0_40px_rgba(0,212,255,0.08)] backdrop-blur-xl transition-all duration-500 ${
            expanded ? "w-full max-w-3xl" : "w-full max-w-[520px]"
          }`}
          style={{ colorScheme: "dark" }}
        >
          {/* Conic animated border */}
          <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-50 [background:conic-gradient(from_0deg,transparent_0deg,rgba(0,212,255,0.45)_60deg,transparent_120deg,transparent_240deg,rgba(58,232,255,0.45)_300deg,transparent_360deg)] [animation:spin_22s_linear_infinite] [mask:linear-gradient(#000,#000)_content-box,linear-gradient(#000,#000)] [mask-composite:exclude] p-[1px]" />

          {/* Title bar — macOS chrome */}
          <div dir="ltr" className="relative flex items-center justify-between gap-2 border-b border-white/10 bg-black/40 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] shadow-[0_0_6px_rgba(255,95,87,0.7)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e] shadow-[0_0_6px_rgba(254,188,46,0.7)]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840] shadow-[0_0_6px_rgba(40,200,64,0.7)]" />
            </div>

            <div className="flex flex-1 items-center justify-center">
              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] text-white/70">
                <Moon className="h-2.5 w-2.5 text-[#3AE8FF]" />
                <span>{ar ? "منصة نُسك الحج" : "Hajj Nexus Platform"}</span>
                <Radio className="h-2.5 w-2.5 animate-pulse text-emerald-400" />
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="rounded-md border border-white/10 bg-white/5 p-1 text-white/70 transition hover:bg-white/10 hover:text-white"
                aria-label={expanded ? (ar ? "تصغير" : "Minimize") : (ar ? "تكبير" : "Maximize")}
              >
                {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
              </button>
              <Link
                to={INTERNAL_URL}
                className="inline-flex items-center gap-1 rounded-md border border-[#3AE8FF]/40 bg-[#3AE8FF]/10 px-1.5 py-1 text-[10px] font-semibold text-white transition hover:bg-[#3AE8FF]/20"
                aria-label={ar ? "فتح كامل" : "Open full screen"}
              >
                <Expand className="h-2.5 w-2.5" />
              </Link>

            </div>
          </div>

          {/* Live iframe stage — locked dark surface */}
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#02101e]">
            <div className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,transparent_0%,transparent_92%,rgba(0,212,255,0.08)_100%)]" />
            <div className="pointer-events-none absolute inset-0 z-10 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.022)_0px,rgba(255,255,255,0.022)_1px,transparent_1px,transparent_3px)] mix-blend-overlay" />
            <div className="pointer-events-none absolute inset-0 z-10 shadow-[inset_0_0_100px_rgba(2,16,30,0.9)]" />

            <iframe
              src={LIVE_URL}
              title="NEXUS AI OS — Hajj Prime (Night Mode)"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              style={{ colorScheme: "dark", backgroundColor: "#02101e" }}
              className="absolute left-1/2 top-1/2 h-[200%] w-[200%] -translate-x-1/2 -translate-y-1/2 origin-center scale-[0.5] border-0"
            />
          </div>

          {/* Footer telemetry strip */}
          <div dir="ltr" className="relative flex items-center justify-between gap-2 border-t border-white/10 bg-black/40 px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] text-white/55">
            <div className="flex items-center gap-1.5">
              <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
              <span>LIVE · {ar ? "بث مباشر" : "Streaming"}</span>
            </div>

            <div className="hidden sm:block">TLS 1.3</div>
            <div>UPTIME 99.97%</div>
          </div>
        </div>
      </div>
    </section>
  );
}
