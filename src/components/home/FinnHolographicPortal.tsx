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
import { FinnLiveHologram } from "./FinnLiveHologram";

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
      className="finn-portal relative flex h-full min-h-[520px] flex-col overflow-hidden rounded-3xl border border-cyan-300/25 bg-[#04101c] shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.04)] sm:min-h-[620px]"
    >
      {/* Uniform dark background */}
      <span aria-hidden className="pointer-events-none absolute inset-0 z-0 bg-[#04101c]" />


      {/* Portrait — face-first, fully visible, centred */}
      {/* Live holographic FINN — WebGL scene, not a static image */}
      <FinnLiveHologram
        state={state === "offline" ? "offline" : state}
        ariaLabel={
          ar
            ? `${BRAND_ASSISTANT.nameAr}، المساعد التنفيذي الذكي للأمن الصناعي، ${label.ar}`
            : `${BRAND_ASSISTANT.nameEn}, executive industrial security AI assistant, ${label.en}`
        }
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
