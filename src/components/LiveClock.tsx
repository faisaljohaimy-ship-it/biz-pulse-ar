/**
 * LiveClock — global live Gregorian clock strip.
 *
 * Single source of truth for the platform's date/time chip. Mounted once
 * from src/routes/__root.tsx so it appears on every route.
 *
 * Rules (per spec):
 *  • Gregorian only, both AR + EN labels.
 *  • Digits are ALWAYS Latin (0–9) via `numberingSystem: "latn"` —
 *    never Arabic-Indic (٠-٩), even when the surrounding UI is RTL.
 *  • Ticks every 1000 ms via setInterval (cleaned on unmount).
 *  • Standardized on Asia/Riyadh so the executive audience sees one wall
 *    clock regardless of the viewer's laptop timezone.
 *  • tabular-nums for stable width — the seconds do not cause jitter.
 */
import { useEffect, useState } from "react";

const TZ = "Asia/Riyadh";

// Explicit `numberingSystem: "latn"` forces English digits even under ar-*.
const gregDateEn = new Intl.DateTimeFormat("en-GB-u-nu-latn", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TZ,
  numberingSystem: "latn",
});
const gregDateAr = new Intl.DateTimeFormat("ar-u-nu-latn", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TZ,
  numberingSystem: "latn",
});
const timeFmt = new Intl.DateTimeFormat("en-GB-u-nu-latn", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: TZ,
  numberingSystem: "latn",
});

interface LiveClockProps {
  readonly variant?: "chip" | "inline";
  readonly showArabic?: boolean;
  readonly className?: string;
}

export function LiveClock({ variant = "chip", showArabic = true, className = "" }: LiveClockProps) {
  // Initialised synchronously so the SSR HTML already contains a real
  // timestamp — the clock is NEVER an empty chip. The client re-stamps on
  // hydration (suppressHydrationWarning below) then ticks every second.
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const dEn = gregDateEn.format(now);
  const dAr = showArabic ? gregDateAr.format(now) : "";
  const t = timeFmt.format(now);

  if (variant === "inline") {
    return (
      <span
        dir="ltr"
        className={`inline-flex items-center gap-2 text-[11px] font-medium tabular-nums text-white/70 ${className}`}
        aria-label="Live Gregorian date and time (Asia/Riyadh)"
      >
        <span suppressHydrationWarning className="whitespace-nowrap">
          {dEn}
        </span>
        <span aria-hidden className="text-white/30">
          ·
        </span>
        <span suppressHydrationWarning className="whitespace-nowrap text-white/90">
          {t}
        </span>
      </span>
    );
  }

  return (
    <div
      role="group"
      aria-label="Live platform · Gregorian date and time (Asia/Riyadh)"
      dir="ltr"
      className={`inline-flex items-center gap-2 rounded-full border border-[#3AE8FF]/30 bg-black/50 px-3 py-1 text-[11px] font-medium tabular-nums text-white/85 shadow-[0_0_20px_rgba(0,212,255,0.18)] backdrop-blur-md ${className}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden className="relative inline-flex h-2 w-2">
          <span className="absolute inset-0 animate-ping rounded-full bg-[#3AE8FF]/60" />
          <span className="relative inline-block h-2 w-2 rounded-full bg-[#3AE8FF] shadow-[0_0_10px_#3AE8FF]" />
        </span>
        <span className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-[#3AE8FF]">
          Live
        </span>
      </span>
      <span aria-hidden className="text-white/20">
        ·
      </span>
      <span suppressHydrationWarning className="whitespace-nowrap text-white">
        {t}
      </span>
      <span aria-hidden className="text-white/20">
        ·
      </span>
      <span suppressHydrationWarning className="whitespace-nowrap text-white/80">
        {dEn}
      </span>
      {showArabic && dAr && (
        <>
          <span aria-hidden className="hidden text-white/20 sm:inline">
            ·
          </span>
          <span
            suppressHydrationWarning
            dir="rtl"
            lang="ar"
            className="hidden whitespace-nowrap text-white/70 sm:inline"
            style={{ fontFamily: '"IBM Plex Sans Arabic","Tajawal",ui-sans-serif,system-ui' }}
          >
            {dAr}
          </span>
        </>
      )}
    </div>
  );
}

export default LiveClock;
