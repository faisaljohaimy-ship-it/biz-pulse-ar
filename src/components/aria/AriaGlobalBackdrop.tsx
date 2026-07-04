/**
 * AriaGlobalBackdrop — THE ONLY ARIA visual on the site.
 *
 * Delegates the living-avatar state machine (idle / speaking / greeting)
 * to AriaVideoAvatar, which drives one <video> element from AriaAudioBus
 * events. Reduced-motion / video-load failure both fall through to the
 * static breathing still.
 */
import { useAriaPresenceState } from "@/lib/aria/aria-state";
import { AriaVideoAvatar } from "./AriaVideoAvatar";

const STILL_SRC = "/aria-backdrop.webp";

export function AriaGlobalBackdrop() {
  const state = useAriaPresenceState();

  return (
    <div
      aria-hidden
      data-aria-state={state}
      className="aria-presence pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ background: "transparent" }}
    >
      {/* Soft radial cyan glow behind her */}
      <div
        className="aria-glow absolute left-1/2 top-[38%] h-[70vh] w-[90vw] max-w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(0,212,255,0.22), rgba(0,212,255,0.06) 55%, transparent 75%)",
          filter: "blur(4px)",
        }}
      />

      <div
        className={`absolute left-1/2 top-[2%] h-[96%] -translate-x-1/2 transition-transform duration-500 ease-out ${state === "listening" ? "scale-[1.02]" : "scale-100"}`}
        style={{ width: "min(720px, 96vw)", opacity: 0.38 }}
      >
        <AriaVideoAvatar
          poster={STILL_SRC}
          className="absolute inset-0"
        />
      </div>

      {/* Readability scrims */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(4,7,15,0.55) 0%, rgba(4,7,15,0.15) 32%, rgba(4,7,15,0.35) 70%, rgba(4,7,15,0.85) 100%)",
        }}
      />
    </div>
  );
}

export default AriaGlobalBackdrop;
