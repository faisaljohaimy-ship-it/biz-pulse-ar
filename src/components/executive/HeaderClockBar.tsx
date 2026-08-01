/**
 * HeaderClockBar — the unified top header strip.
 *
 * OWNER DIRECTIVE (G3): the scrolling marquee ("سَدِيد التنفيذية
 * ✦ NEXIOS AI") is REMOVED from every screen. It was mounted once in
 * __root.tsx, so deleting it here removes it everywhere at once — الرئيسية and
 * الأمن الصناعي included — with no per-screen edits.
 *
 * The LIVE clock is deliberately KEPT. It shared this bar with the marquee
 * (one strip, no ghost row), so removing the component wholesale would have
 * silently taken the clock down with it. The clock is a distinct, live
 * element the marquee merely sat next to.
 *
 * Renamed from BetaMarqueeBar: a component called "Marquee" that contains no
 * marquee is exactly the kind of stale name that misleads the next reader.
 */

import { LiveClock } from "@/components/LiveClock";

interface HeaderClockBarProps {
  readonly showClock?: boolean;
}

export function HeaderClockBar({ showClock = true }: HeaderClockBarProps) {
  // With the marquee gone the clock is this bar's only content, so an empty
  // bar would render as a bare gradient line. Nothing to show → nothing.
  if (!showClock) return null;

  return (
    <div
      dir="ltr"
      className="pointer-events-none sticky top-0 z-[100] w-full overflow-hidden border-b border-[#3AE8FF]/30 bg-gradient-to-r from-[#02101e] via-[#04243c] to-[#02101e] shadow-[0_4px_24px_-8px_rgba(0,212,255,0.4)]"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="relative flex h-9 items-center sm:h-10">
        <div className="pointer-events-auto ps-2 sm:ps-3">
          <LiveClock className="!border-transparent !bg-transparent !px-0 !py-0 !shadow-none" />
        </div>
      </div>
    </div>
  );
}
