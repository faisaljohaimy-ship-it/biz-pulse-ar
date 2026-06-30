/**
 * BetaMarqueeBar — cinematic beta-version marquee.
 *
 * Sits at the very top of every page (above app shells). Sticky so it's
 * always visible during scroll. Pure presentation, no client state.
 *
 * Three short bilingual messages cycle horizontally in an infinite,
 * professionally paced marquee with subtle neon glow.
 */
const MESSAGES = [
  "✦ نسخة تجريبية قابلة للتعديل",
  "✦ Beta Preview · Live Iteration",
  "✦ منصة إنجاز الأعمال التنفيذية — قيد التطوير المستمر",
];

export function BetaMarqueeBar() {
  // Duplicate the strip so the loop is seamless
  const strip = [...MESSAGES, ...MESSAGES, ...MESSAGES];

  return (
    <div
      dir="ltr"
      role="status"
      aria-label="Beta preview banner"
      className="sticky top-0 z-[100] w-full overflow-hidden border-b border-[#3AE8FF]/30 bg-gradient-to-r from-[#02101e] via-[#04243c] to-[#02101e] backdrop-blur-xl shadow-[0_4px_24px_-8px_rgba(0,212,255,0.4)]"
    >
      <style>{`
        @keyframes beta-marquee-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-33.3333%); }
        }
        @keyframes beta-marquee-shine {
          0%, 100% { opacity: 0.25; }
          50%      { opacity: 0.55; }
        }
        .beta-marquee-track { animation: beta-marquee-scroll 38s linear infinite; will-change: transform; }
        .beta-marquee-track:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .beta-marquee-track { animation: none; } }
      `}</style>

      {/* Cinematic shine sweep */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(58,232,255,0.18) 50%, transparent 100%)",
          animation: "beta-marquee-shine 6s ease-in-out infinite",
        }}
      />

      {/* Edge fade masks */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#02101e] to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#02101e] to-transparent" />

      <div className="relative flex items-center py-2">
        {/* Static BETA badge (LTR-anchored left) */}
        <div className="absolute left-3 z-20 hidden items-center gap-1.5 rounded-full border border-[#3AE8FF]/50 bg-[#3AE8FF]/10 px-2.5 py-0.5 sm:flex">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3AE8FF] shadow-[0_0_6px_#3AE8FF]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#3AE8FF]">BETA</span>
        </div>

        <div className="beta-marquee-track flex w-max items-center gap-12 whitespace-nowrap px-6 text-[12px] font-semibold tracking-wide text-white/90 sm:text-[13px]">
          {strip.map((msg, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-3 text-white/90 drop-shadow-[0_0_6px_rgba(58,232,255,0.45)]"
            >
              <span className="text-[#3AE8FF]/80">{msg}</span>
              <span aria-hidden className="text-[#3AE8FF]/40">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
