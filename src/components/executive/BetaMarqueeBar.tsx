/**
 * BetaMarqueeBar — cinematic beta-version marquee, locale-aware.
 *
 * The LIVE clock chip is embedded on the start side of the same bar so
 * there is a single unified header strip (no translucent ghost row).
 */

import { useI18n } from "@/lib/i18n";
import { LiveClock } from "@/components/LiveClock";

const MESSAGE_AR = "منصة إنجاز الأعمال التنفيذية ✦ NEXIOS AI";
const MESSAGE_EN = "Executive Business Execution Platform ✦ NEXIOS AI";

interface BetaMarqueeBarProps {
  readonly showClock?: boolean;
}

export function BetaMarqueeBar({ showClock = true }: BetaMarqueeBarProps) {
  const { locale } = useI18n();
  const message = locale === "ar" ? MESSAGE_AR : MESSAGE_EN;
  // Three copies keep the -33.33% translateX loop seamless.
  const strip = [message, message, message];

  return (
    <div
      dir="ltr"
      role="status"
      aria-label="Beta preview banner"
      className="pointer-events-none sticky top-0 z-[100] w-full overflow-hidden border-b border-[#3AE8FF]/30 bg-gradient-to-r from-[#02101e] via-[#04243c] to-[#02101e] shadow-[0_4px_24px_-8px_rgba(0,212,255,0.4)] backdrop-blur-xl"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
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
          background:
            "linear-gradient(90deg, transparent 0%, rgba(58,232,255,0.18) 50%, transparent 100%)",
          animation: "beta-marquee-shine 6s ease-in-out infinite",
        }}
      />

      <div
        className={`relative grid h-9 items-center gap-3 sm:h-10 ${
          showClock ? "grid-cols-[auto_1fr]" : "grid-cols-1"
        }`}
      >
        {showClock && (
          <div className="pointer-events-auto ps-2 sm:ps-3">
            <LiveClock className="!border-transparent !bg-transparent !px-0 !py-0 !shadow-none" />
          </div>
        )}

        <div className="relative h-full overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 start-0 z-10 w-16 bg-gradient-to-r from-[#02101e] to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 end-0 z-10 w-16 bg-gradient-to-l from-[#02101e] to-transparent"
          />
          <div className="beta-marquee-track flex h-full w-max items-center gap-12 whitespace-nowrap pe-6 ps-6 text-[12px] font-semibold tracking-wide text-white/90 sm:text-[13px]">
            {strip.map((msg, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-3 text-white/90 drop-shadow-[0_0_6px_rgba(58,232,255,0.45)]"
              >
                <span className="text-[#3AE8FF]/80" suppressHydrationWarning>
                  {msg}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
