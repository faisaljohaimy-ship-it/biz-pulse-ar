/**
 * AriaGlobalBackdrop — THE ONLY ARIA visual on the site.
 *
 * Full-screen, hard-centered, dir-neutral. Fills every route edge-to-edge
 * behind all content via object-cover. No RTL-affected utilities (no
 * me-, ms-, start-, end-, translate-x). Face stays in frame via responsive
 * object-position (center 20% mobile, center 30% desktop).
 */

import { useAriaPresenceState } from "@/lib/aria/aria-state";
import { AriaVideoAvatar } from "./AriaVideoAvatar";

const STILL_SRC = "/aria-backdrop.webp";

export function AriaGlobalBackdrop() {
  const state = useAriaPresenceState();

  // On laptop/desktop ARIA is fully present: her face is integrated into the
  // scene and her opacity stays near-solid so she reads as a real presence,
  // not a faded backdrop. Mobile keeps softer values so foreground text
  // remains legible on narrow viewports.
  const mediaOpacity =
    state === "speaking" ? 0.95 : state === "listening" ? 0.88 : 0.75;

  return (
    <div
      aria-hidden="true"
      data-aria-state={state}
      dir="ltr"
      className="aria-presence pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ background: "transparent" }}
      suppressHydrationWarning
    >

      {/* Soft radial cyan glow behind her */}
      <div
        className="absolute left-1/2 top-[38%] h-[75vh] w-[95vw] max-w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(0,212,255,0.24), rgba(0,212,255,0.06) 55%, transparent 75%)",
          filter: "blur(4px)",
        }}
      />

      {/* Full-screen centered media. Mobile keeps object-cover with a
          top-biased crop so her face stays high in frame. Desktop switches
          to object-cover as well (not contain) so ARIA fills the viewport
          edge-to-edge and her face anchors near the upper third — fully
          integrated, no dark side-bars. */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-opacity duration-[900ms] ease-out"
        style={{ opacity: mediaOpacity }}
      >
        <AriaVideoAvatar
          poster={STILL_SRC}
          className="relative h-full w-full"
          mediaClassName="h-full w-full object-cover object-[center_20%] md:object-[center_22%]"
        />
      </div>

      {/* Readability scrims — thin on desktop so her body is not clipped by
          dark bands, stronger on mobile for text legibility. */}
      <div
        className="absolute inset-x-0 top-0 h-[18%] md:h-[8%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(4,7,15,0.55) 0%, rgba(4,7,15,0.1) 70%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[44%] md:h-[20%]"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(4,7,15,0.4) 55%, rgba(4,7,15,0.85) 100%)",
        }}
      />

    </div>
  );
}


export default AriaGlobalBackdrop;
