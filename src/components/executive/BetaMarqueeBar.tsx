/**
 * BetaMarqueeBar — cinematic beta-version marquee, locale-aware.
 */

import { useI18n } from "@/lib/i18n";

const MESSAGES_AR = [
  "نسخة تنفيذية",
  "منصة إنجاز الأعمال التنفيذية",
  "رؤية 2030 · NEXIOS",
];
const MESSAGES_EN = [
  "Executive Preview",
  "Executive Delivery Platform",
  "Vision 2030 · NEXIOS",
];

export function BetaMarqueeBar() {
  const { locale } = useI18n();
  const MESSAGES = locale === "ar" ? MESSAGES_AR : MESSAGES_EN;
  const strip = [...MESSAGES, ...MESSAGES, ...MESSAGES];

  return (
    <div
      dir="ltr"
      role="status"
      aria-label="Beta preview banner"
      className="sticky top-0 z-[100] w-full overflow-hidden border-b border-[#3AE8FF]/30 bg-gradient-to-r from-[#02101e] via-[#04243c] to-[#02101e] backdrop-blur-xl shadow-[0_4px_24px_-8px_rgba(0,212,255,0.4)]"
    >
      <style>{`
        @keyframes beta-marquee-scroll { from { transform: translateX(0); } to { transform: translateX(-33.3333%); } }
        @keyframes beta-marquee-shine { 0%,100% { opacity: 0.25; } 50% { opacity: 0.55; } }
        .beta-marquee-track { animation: beta-marquee-scroll 38s linear infinite; will-change: transform; }
        .beta-marquee-track:hover { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .beta-marquee-track { animation: none; } }
      `}</style>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(58,232,255,0.18) 50%, transparent 100%)",
          animation: "beta-marquee-shine 6s ease-in-out infinite",
        }}
      />

      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#02101e] to-transparent" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#02101e] to-transparent" />

      <div className="relative flex items-center py-2">
        <div className="beta-marquee-track flex w-max items-center gap-12 whitespace-nowrap px-6 text-[12px] font-semibold tracking-wide text-white/90 sm:text-[13px]">
          {strip.map((msg, i) => (
            <span key={i} className="inline-flex items-center gap-3 text-white/90 drop-shadow-[0_0_6px_rgba(58,232,255,0.45)]">
              <span className="text-[#3AE8FF]/80">{msg}</span>
            </span>
          ))}
        </div>

      </div>
    </div>
  );
}
