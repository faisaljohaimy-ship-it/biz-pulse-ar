/**
 * FinnHolographicPortal — the executive-grade holographic entry to FINN.
 *
 * Replaces the small FinnPersonaCard as the center of the homepage command
 * view. FINN sits large, centred, and clearly framed by a layered
 * holographic field (halo + rotating rings + scanlines + grid + pulse),
 * with a primary CTA into /finn and a secondary voice CTA into
 * /finn?mode=voice.
 *
 * Performance (Constitution Art. 13): every animation targets ONLY
 * transform + opacity, uses reasonable durations (6–10s), and freezes
 * under prefers-reduced-motion and when the host is data-nx-frozen.
 *
 * Accessibility: real <Link> elements, ≥44px targets, aria-labels,
 * decorative layers marked aria-hidden. The portrait uses object-contain
 * so the helmet + face are never cropped.
 */
import { Link } from "@tanstack/react-router";
import { Mic, ArrowLeft, ArrowRight } from "lucide-react";
import { BRAND_ASSISTANT } from "@/lib/domain";

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
      className="finn-portal relative flex h-full min-h-[420px] flex-col items-center overflow-hidden rounded-3xl border border-cyan-300/25 bg-[rgba(3,15,27,0.84)] p-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl sm:min-h-[520px] sm:p-8"
    >
      {/* Full-bleed FINN portrait as card background */}
      <img
        src={BRAND_ASSISTANT.portrait}
        alt={ar ? BRAND_ASSISTANT.nameAr : BRAND_ASSISTANT.nameEn}
        aria-hidden
        draggable={false}
        loading="eager"
        decoding="async"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-top"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, black 78%, rgba(0,0,0,0.55) 92%, transparent 100%)",
          maskImage:
            "linear-gradient(to bottom, black 0%, black 78%, rgba(0,0,0,0.55) 92%, transparent 100%)",
        }}
      />
      {/* Holographic tint + vignette over portrait */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 0%, rgba(34,211,238,0.28), rgba(3,11,24,0.55) 55%, rgba(2,7,15,0.9) 100%)",
        }}
      />
      {/* Digital grid overlay across the whole card */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-25"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(103,232,249,0.10) 0 1px, transparent 1px 16px), repeating-linear-gradient(90deg, rgba(103,232,249,0.08) 0 1px, transparent 1px 16px)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 55%, transparent 90%)",
          maskImage: "radial-gradient(ellipse at center, black 55%, transparent 90%)",
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

      {/* Header */}
      <header className="relative z-10 flex w-full flex-col items-center">
        <div className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-300/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          NEXIOS AI · Executive Intelligence OS
        </div>
        <h2 className="mt-1 text-3xl font-black tracking-wider text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] sm:text-4xl">
          FINN
        </h2>
        <p className="mt-1 text-center text-xs text-white/85 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:text-sm">
          {ar
            ? "المساعد التنفيذي الذكي — الأمن الصناعي"
            : "Executive AI Assistant — Industrial Security"}
        </p>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3 py-1 text-[11px] text-white backdrop-blur-md">
          <span className={`finn-live h-2 w-2 rounded-full ${label.dot}`} aria-hidden />
          <span>{ar ? label.ar : label.en}</span>
        </div>
      </header>

      {/* Decorative holographic rings, floating over the portrait */}
      <div className="relative z-10 mt-4 flex w-full flex-1 items-center justify-center sm:mt-6">
        <div className="relative aspect-square w-full max-w-[430px]">
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
            className="finn-ring-outer pointer-events-none absolute inset-[6%] rounded-full border border-cyan-300/40"
            style={{
              boxShadow: "0 0 40px rgba(34,211,238,0.22), inset 0 0 30px rgba(34,211,238,0.14)",
            }}
          />
          <span
            aria-hidden
            className="finn-ring-inner pointer-events-none absolute inset-[16%] rounded-full border border-dashed border-cyan-200/30"
          />
          <span
            aria-hidden
            className="finn-pulse pointer-events-none absolute inset-[4%] rounded-full border border-cyan-300/45"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="relative z-10 mt-4 flex w-full flex-col gap-2 sm:mt-6 sm:flex-row sm:justify-center">
        <Link
          to="/finn"
          aria-label={ar ? "الدخول إلى FINN" : "Enter FINN"}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/50 bg-cyan-400/15 px-5 py-3 text-sm font-bold text-white shadow-[0_0_28px_rgba(34,211,238,0.35)] transition hover:bg-cyan-400/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 active:scale-[0.98] sm:w-auto"
        >
          <span>{ar ? "الدخول إلى FINN" : "Enter FINN"}</span>
          <Arrow className="h-4 w-4" aria-hidden />
        </Link>
        <Link
          to="/finn"
          search={{ mode: "voice" } as never}
          aria-label={ar ? "تحدث الآن مع FINN" : "Talk to FINN now"}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 active:scale-[0.98] sm:w-auto"
        >
          <Mic className="h-4 w-4" aria-hidden />
          <span>{ar ? "تحدث الآن" : "Talk now"}</span>
        </Link>
      </div>

      <style>{`
        @keyframes finnHaloBreathe { 0%,100%{opacity:.55;transform:scale(1)} 50%{opacity:.95;transform:scale(1.04)} }
        @keyframes finnRotate { to { transform: rotate(360deg) } }
        @keyframes finnRotateRev { to { transform: rotate(-360deg) } }
        @keyframes finnScan { 0%{transform:translateY(-20%)} 100%{transform:translateY(1200%)} }
        @keyframes finnPulseRing { 0%{opacity:.55;transform:scale(1)} 100%{opacity:0;transform:scale(1.15)} }
        @keyframes finnLive { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.55;transform:scale(.82)} }
        .finn-halo { animation: finnHaloBreathe 6s ease-in-out infinite; will-change: transform,opacity; }
        .finn-ring-outer { animation: finnRotate 22s linear infinite; will-change: transform; }
        .finn-ring-inner { animation: finnRotateRev 30s linear infinite; will-change: transform; }
        .finn-scan > span { animation: finnScan 7s linear infinite; will-change: transform; }
        .finn-pulse { animation: finnPulseRing 4.5s ease-out infinite; will-change: transform,opacity; }
        .finn-live { animation: finnLive 1.8s ease-in-out infinite; will-change: transform,opacity; }
        @media (prefers-reduced-motion: reduce) {
          .finn-halo,.finn-ring-outer,.finn-ring-inner,.finn-scan > span,.finn-pulse,.finn-live { animation: none !important; }
        }
        [data-nx-frozen="true"] .finn-halo,
        [data-nx-frozen="true"] .finn-ring-outer,
        [data-nx-frozen="true"] .finn-ring-inner,
        [data-nx-frozen="true"] .finn-scan > span,
        [data-nx-frozen="true"] .finn-pulse,
        [data-nx-frozen="true"] .finn-live { animation-play-state: paused !important; }
      `}</style>
    </section>
  );
}

export default FinnHolographicPortal;
