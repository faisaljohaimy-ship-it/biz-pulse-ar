/**
 * FinnHolographicPortal — the executive-grade holographic entry to FINN.
 *
 * Layout:
 *  - Face-first portrait background (object-contain-top) so the guard's
 *    face is always fully visible.
 *  - "FINN" title floats directly above the head.
 *  - Holographic ring is centred around the face; the mic "Talk now"
 *    button lives INSIDE that ring as the primary CTA.
 *  - Remaining copy + status + secondary CTA sit at the bottom.
 */
import { Link } from "@tanstack/react-router";
import { Mic, ArrowLeft, ArrowRight } from "lucide-react";
import { BRAND_ASSISTANT } from "@/lib/domain";
import finnDarkPortrait from "@/assets/finn-dark-portrait.png.asset.json";

export type FinnVisualState = "idle" | "listening" | "thinking" | "speaking" | "offline";

export interface FinnHolographicPortalProps {
  ar: boolean;
  state?: FinnVisualState;
}

const STATE_LABEL: Record<FinnVisualState, { ar: string; en: string; dot: string }> = {
  idle: { ar: "جاهز للمساعدة", en: "Ready to assist", dot: "bg-emerald-400" },
  listening: { ar: "يستمع إليك", en: "Listening", dot: "bg-cyan-300" },
  thinking: { ar: "يحلل طلبك", en: "Thinking", dot: "bg-sky-300" },
  speaking: { ar: "يتحدث الآن", en: "Speaking", dot: "bg-emerald-300" },
  offline: { ar: "غير متصل — أدخل نصياً", en: "Offline — text input", dot: "bg-amber-400" },
};

export function FinnHolographicPortal({ ar, state = "idle" }: FinnHolographicPortalProps) {
  const Arrow = ar ? ArrowLeft : ArrowRight;
  const label = STATE_LABEL[state];

  return (
    <section
      aria-label={ar ? "بوابة FINN التنفيذية" : "FINN executive portal"}
      className="finn-portal relative flex h-full min-h-[520px] flex-col overflow-hidden rounded-3xl border border-cyan-300/30 bg-white/5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl sm:min-h-[620px]"
      style={{ backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(34,211,238,0.04) 60%, rgba(255,255,255,0.02))" }}
    >
      {/* Live digital board background — circuits, chips, data packets, code rain */}
      <span aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">

        {/* Circuit board SVG — traces, chips, nodes, animated data packets */}
        <svg
          className="absolute inset-0 h-full w-full opacity-70"
          viewBox="0 0 400 600"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="finnTrace" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(34,211,238,0.85)" />
              <stop offset="100%" stopColor="rgba(103,232,249,0.35)" />
            </linearGradient>
            <radialGradient id="finnNode" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(186,254,255,1)" />
              <stop offset="60%" stopColor="rgba(34,211,238,0.6)" />
              <stop offset="100%" stopColor="rgba(34,211,238,0)" />
            </radialGradient>
            <filter id="finnGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g stroke="url(#finnTrace)" strokeWidth="0.9" fill="none" filter="url(#finnGlow)" opacity="0.85">
            <path d="M0,80 L60,80 L80,100 L80,180 L120,220" />
            <path d="M0,140 L40,140 L60,160 L60,260 L100,300 L100,360" />
            <path d="M0,220 L50,220 L70,240 L70,320 L30,360 L30,440" />
            <path d="M0,320 L80,320 L110,350 L110,420 L60,470 L60,560" />
            <path d="M0,420 L40,420 L60,440 L60,520 L110,560 L200,560" />
            <path d="M400,60 L340,60 L320,80 L320,160 L280,200 L280,280" />
            <path d="M400,140 L360,140 L340,160 L340,240 L300,280 L300,360" />
            <path d="M400,240 L340,240 L320,260 L320,340 L370,380 L370,460" />
            <path d="M400,340 L360,340 L340,360 L340,440 L300,480 L300,560" />
            <path d="M400,440 L350,440 L330,460 L330,540 L250,570" />
            <path d="M120,10 L120,60 L160,90 L240,90 L280,60 L280,10" />
            <path d="M120,590 L120,540 L170,500 L230,500 L280,540 L280,590" />
          </g>

          <g fill="rgba(2,15,28,0.9)" stroke="rgba(103,232,249,0.75)" strokeWidth="0.8">
            <rect x="14" y="60" width="30" height="18" rx="2" />
            <rect x="14" y="300" width="34" height="22" rx="2" />
            <rect x="356" y="120" width="30" height="18" rx="2" />
            <rect x="352" y="420" width="34" height="22" rx="2" />
            <rect x="170" y="4" width="60" height="14" rx="2" />
            <rect x="170" y="582" width="60" height="14" rx="2" />
          </g>
          <g stroke="rgba(103,232,249,0.6)" strokeWidth="0.6">
            <path d="M18,60 L18,54 M24,60 L24,54 M30,60 L30,54 M36,60 L36,54 M42,60 L42,54" />
            <path d="M18,78 L18,84 M24,78 L24,84 M30,78 L30,84 M36,78 L36,84 M42,78 L42,84" />
            <path d="M360,120 L360,114 M366,120 L366,114 M372,120 L372,114 M378,120 L378,114 M384,120 L384,114" />
            <path d="M360,138 L360,144 M366,138 L366,144 M372,138 L372,144 M378,138 L378,144 M384,138 L384,144" />
          </g>

          <g fill="url(#finnNode)">
            <circle cx="80" cy="100" r="3.2" />
            <circle cx="120" cy="220" r="3.2" />
            <circle cx="100" cy="360" r="3.2" />
            <circle cx="60" cy="470" r="3.2" />
            <circle cx="320" cy="80" r="3.2" />
            <circle cx="280" cy="280" r="3.2" />
            <circle cx="370" cy="460" r="3.2" />
            <circle cx="300" cy="480" r="3.2" />
            <circle cx="200" cy="90" r="3.2" />
            <circle cx="200" cy="500" r="3.2" />
          </g>

          <g fill="rgba(186,254,255,1)" filter="url(#finnGlow)">
            <circle r="1.8"><animateMotion dur="4.2s" repeatCount="indefinite" path="M0,80 L60,80 L80,100 L80,180 L120,220" /></circle>
            <circle r="1.8"><animateMotion dur="5.6s" repeatCount="indefinite" path="M0,140 L40,140 L60,160 L60,260 L100,300 L100,360" /></circle>
            <circle r="1.8"><animateMotion dur="6.4s" repeatCount="indefinite" path="M0,320 L80,320 L110,350 L110,420 L60,470 L60,560" /></circle>
            <circle r="1.8"><animateMotion dur="5.2s" repeatCount="indefinite" path="M400,60 L340,60 L320,80 L320,160 L280,200 L280,280" /></circle>
            <circle r="1.8"><animateMotion dur="6s" repeatCount="indefinite" path="M400,240 L340,240 L320,260 L320,340 L370,380 L370,460" /></circle>
            <circle r="1.8"><animateMotion dur="4.8s" repeatCount="indefinite" path="M400,340 L360,340 L340,360 L340,440 L300,480 L300,560" /></circle>
            <circle r="1.8"><animateMotion dur="7s" repeatCount="indefinite" path="M120,10 L120,60 L160,90 L240,90 L280,60 L280,10" /></circle>
          </g>
        </svg>

        {/* Fine digital grid */}
        <span
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(103,232,249,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(103,232,249,0.18) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 90%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 90%)",
          }}
        />

        {/* Binary / hex code rain */}
        <span
          className="absolute inset-0 opacity-25 font-mono text-[10px] leading-[12px] text-cyan-200"
          style={{
            maskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)",
          }}
        >
          <span className="absolute left-[6%] top-0 whitespace-pre finn-rain-col" style={{ animationDuration: "9s" }}>
            {"01\n10\n11\n00\nA3\nF1\n7C\n0E\n01\n10\nB4\n2D\n01\n10\n11\n00\nA3\nF1\n7C\n0E"}
          </span>
          <span className="absolute left-[18%] top-0 whitespace-pre finn-rain-col" style={{ animationDuration: "11s", animationDelay: "-2s" }}>
            {"F2\n0A\n1B\n7C\n01\n10\n55\nAE\n01\n00\n11\n10\nD4\n3F\n01\n10\n11\n00\nB8\n21"}
          </span>
          <span className="absolute right-[16%] top-0 whitespace-pre finn-rain-col" style={{ animationDuration: "13s", animationDelay: "-4s" }}>
            {"9C\n01\n10\n11\n4E\nA1\n00\n11\n10\n01\n7B\n2E\n01\n10\nC3\n5F\n01\n10\n11\n00"}
          </span>
          <span className="absolute right-[6%] top-0 whitespace-pre finn-rain-col" style={{ animationDuration: "10s", animationDelay: "-6s" }}>
            {"01\n11\n00\n10\nAB\n3C\n7E\n01\n10\nF0\n2D\n01\n11\n00\n10\n8B\n4C\n01\n10\n11"}
          </span>
        </span>
      </span>



      {/* Portrait — dark, sharp, fully visible FINN */}
      <img
        src={finnDarkPortrait.url}
        alt={
          ar
            ? `${BRAND_ASSISTANT.nameAr}، المساعد التنفيذي الذكي للأمن الصناعي، ${label.ar}`
            : `${BRAND_ASSISTANT.nameEn}, executive industrial security AI assistant, ${label.en}`
        }
        loading="lazy"
        decoding="async"
        draggable={false}
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] mx-auto h-[92%] w-auto max-w-none object-contain object-bottom drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)]"
      />


      {/* Very light top vignette — keep headroom clear for the wordmark */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-32"
        style={{
          background:
            "linear-gradient(to bottom, rgba(2,7,15,0.55), rgba(2,7,15,0.15) 70%, transparent)",
        }}
      />
      {/* Subtle bottom vignette for footer legibility */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-48"
        style={{
          background:
            "linear-gradient(to top, rgba(2,7,15,0.9), rgba(2,7,15,0.4) 60%, transparent)",
        }}
      />
      {/* Full-card scanline */}
      <span aria-hidden className="finn-scan pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <span
          className="absolute inset-x-0 h-[6%] opacity-60"
          style={{
            background:
              "linear-gradient(to bottom, transparent, rgba(103,232,249,0.55), transparent)",
          }}
        />
      </span>

      {/* FINN wordmark — sits in the headroom above the head, compact size */}
      <div className="relative z-10 flex flex-col items-center px-4 pt-2 sm:pt-3">
        <h2
          className="text-2xl font-black leading-none tracking-[0.32em] text-white sm:text-3xl md:text-4xl"
          style={{
            textShadow:
              "0 2px 12px rgba(0,0,0,0.95), 0 0 20px rgba(34,211,238,0.7), 0 0 40px rgba(34,211,238,0.45)",
          }}
        >
          FINN
        </h2>


      </div>


      {/* Center — holographic ring around the face with mic CTA inside */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4">
        <div className="relative aspect-square w-full max-w-[360px] sm:max-w-[420px]">
          <span
            aria-hidden
            className="finn-halo pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(34,211,238,0.35), rgba(103,232,249,0.10) 55%, rgba(8,145,178,0) 78%)",
              filter: "blur(2px)",
            }}
          />
          <span
            aria-hidden
            className="finn-ring-outer pointer-events-none absolute inset-[4%] rounded-full border border-cyan-300/45"
            style={{
              boxShadow: "0 0 40px rgba(34,211,238,0.22), inset 0 0 30px rgba(34,211,238,0.14)",
            }}
          />
          <span
            aria-hidden
            className="finn-pulse pointer-events-none absolute inset-0 rounded-full border border-cyan-300/45"
          />


          {/* Mic "Talk now" CTA — sits inside the ring, over the face */}
          <Link
            to="/finn"
            search={{ mode: "voice" } as never}
            aria-label={ar ? "تحدث الآن مع FINN" : "Talk to FINN now"}
            className="group absolute left-1/2 top-1/2 z-20 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border border-cyan-300/70 bg-cyan-500/25 text-white shadow-[0_0_40px_rgba(34,211,238,0.55),inset_0_0_18px_rgba(34,211,238,0.35)] backdrop-blur-md transition hover:scale-105 hover:bg-cyan-400/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200 active:scale-95 sm:h-24 sm:w-24"
          >
            <Mic className="h-7 w-7 sm:h-8 sm:w-8" aria-hidden />
            <span className="text-[10px] font-bold tracking-wider sm:text-[11px]">
              {ar ? "تحدث الآن" : "TALK NOW"}
            </span>
          </Link>
        </div>
      </div>

      {/* Bottom — subtitle, status, secondary CTA */}
      <footer className="relative z-10 flex flex-col items-center gap-2 px-5 pb-5 sm:px-8 sm:pb-7">
        <p className="text-center text-xs text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] sm:text-sm">
          {ar
            ? "المساعد التنفيذي الذكي — الأمن الصناعي"
            : "Executive AI Assistant — Industrial Security"}
        </p>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[11px] text-white backdrop-blur-md">
          <span className={`finn-live h-2 w-2 rounded-full ${label.dot}`} aria-hidden />
          <span>{ar ? label.ar : label.en}</span>
        </div>
        <Link
          to="/finn"
          aria-label={ar ? "الدخول إلى FINN" : "Enter FINN"}
          className="mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-300/50 bg-cyan-400/15 px-6 py-3 text-sm font-bold text-white shadow-[0_0_28px_rgba(34,211,238,0.35)] transition hover:bg-cyan-400/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 active:scale-[0.98]"
        >
          <span>{ar ? "الدخول إلى FINN" : "Enter FINN"}</span>
          <Arrow className="h-4 w-4" aria-hidden />
        </Link>
      </footer>

      <style>{`
        @keyframes finnHaloBreathe { 0%,100%{opacity:.55;transform:scale(1)} 50%{opacity:.95;transform:scale(1.04)} }
        @keyframes finnRotate { to { transform: rotate(360deg) } }
        @keyframes finnScan { 0%{transform:translateY(-20%)} 100%{transform:translateY(1200%)} }
        @keyframes finnPulseRing { 0%{opacity:.55;transform:scale(1)} 100%{opacity:0;transform:scale(1.15)} }
        @keyframes finnLive { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.55;transform:scale(.82)} }
        @keyframes finnBgGrid { 0%{background-position:0 0,0 0} 100%{background-position:36px 36px,36px 36px} }
        @keyframes finnBgSweep { 0%{transform:translateX(-30%)} 100%{transform:translateX(30%)} }
        @keyframes finnBgHalo { to { transform: translate(-50%,-50%) rotate(360deg) } }
        @keyframes finnRain { 0%{transform:translateY(-40%)} 100%{transform:translateY(110%)} }
        .finn-rain-col { animation-name: finnRain; animation-timing-function: linear; animation-iteration-count: infinite; will-change: transform; }
        .finn-halo { animation: finnHaloBreathe 6s ease-in-out infinite; will-change: transform,opacity; }
        .finn-ring-outer { animation: finnRotate 22s linear infinite; will-change: transform; }
        .finn-scan > span { animation: finnScan 7s linear infinite; will-change: transform; }
        .finn-pulse { animation: finnPulseRing 4.5s ease-out infinite; will-change: transform,opacity; }
        .finn-live { animation: finnLive 1.8s ease-in-out infinite; will-change: transform,opacity; }
        .finn-bg-grid { animation: finnBgGrid 14s linear infinite; will-change: background-position; }
        .finn-bg-sweep { animation: finnBgSweep 9s ease-in-out infinite alternate; will-change: transform; }
        .finn-bg-halo { animation: finnBgHalo 40s linear infinite; will-change: transform; }
        @media (prefers-reduced-motion: reduce) {
          .finn-halo,.finn-ring-outer,.finn-scan > span,.finn-pulse,.finn-live,.finn-bg-grid,.finn-bg-sweep,.finn-bg-halo,.finn-rain-col { animation: none !important; }
        }
        [data-nx-frozen="true"] .finn-halo,
        [data-nx-frozen="true"] .finn-ring-outer,
        [data-nx-frozen="true"] .finn-scan > span,
        [data-nx-frozen="true"] .finn-pulse,
        [data-nx-frozen="true"] .finn-live,
        [data-nx-frozen="true"] .finn-bg-grid,
        [data-nx-frozen="true"] .finn-bg-sweep,
        [data-nx-frozen="true"] .finn-bg-halo,
        [data-nx-frozen="true"] .finn-rain-col { animation-play-state: paused !important; }

      `}</style>
    </section>
  );
}

export default FinnHolographicPortal;
