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

  const mediaOpacity =
    state === "speaking" ? 0.62 : state === "listening" ? 0.5 : 0.38;

  return (
    <div
      aria-hidden="true"
      data-aria-state={state}
      dir="ltr"
      className="aria-presence pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ background: "transparent" }}
    >
      {/* Soft radial cyan glow behind her */}
      <div
        className="absolute left-1/2 top-[40%] h-[70vh] w-[90vw] max-w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(0,212,255,0.22), rgba(0,212,255,0.06) 55%, transparent 75%)",
          filter: "blur(4px)",
        }}
      />

      {/* Full-screen centered media stack. Dir-neutral, no start/end utilities. */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-opacity duration-[900ms] ease-out"
        style={{ opacity: mediaOpacity }}
      >
        <AriaVideoAvatar
          poster={STILL_SRC}
          className="relative h-full w-full"
          mediaClassName="h-full w-full object-cover object-[center_20%] md:object-[center_30%]"
        />
      </div>

      {/* Readability scrims — top bar + bottom stack. No band across her face. */}
      <div
        className="absolute inset-x-0 top-0 h-[22%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(4,7,15,0.65) 0%, rgba(4,7,15,0.15) 70%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[44%]"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(4,7,15,0.55) 45%, rgba(4,7,15,0.92) 100%)",
        }}
      />
    </div>
  );
}

export default AriaGlobalBackdrop;
