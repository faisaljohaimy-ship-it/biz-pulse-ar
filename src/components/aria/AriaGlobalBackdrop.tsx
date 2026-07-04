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
        className={`absolute left-1/2 top-0 h-[90%] -translate-x-1/2 transition-[transform,opacity] duration-[1100ms] ease-out ${state === "speaking" ? "opacity-[0.62] scale-[1.015]" : state === "listening" ? "opacity-[0.48] scale-[1.02]" : "opacity-[0.42] scale-100"}`}
        style={{
          width: "min(720px, 96vw)",
          animation: "aria-figure-reveal 1200ms cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
        <AriaVideoAvatar
          poster={STILL_SRC}
          className="absolute inset-0"
        />
      </div>

      {/* Readability scrims — top for header, bottom for content stack. No middle band. */}
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

      <style>{`
        @keyframes aria-figure-reveal {
          from { opacity: 0; transform: translate(-50%, 2vh) scale(1.02); }
          to   { opacity: 0.55; transform: translate(-50%, 0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .aria-presence [style*="aria-figure-reveal"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

export default AriaGlobalBackdrop;
