/**
 * AriaGlobalBackdrop — site-wide reactive ARIA backdrop, rendered once
 * in `__root`. Uses the shared <AriaReactiveFigure /> which plays the
 * looping motion clip ONLY while ARIA is speaking, and settles back to
 * the breathing still on silence.
 */
import { AriaReactiveFigure } from "./AriaReactiveFigure";
import { useAriaPresenceState } from "@/lib/aria/aria-state";

export function AriaGlobalBackdrop() {
  const state = useAriaPresenceState();
  return (
    <div
      aria-hidden
      data-aria-state={state}
      className="aria-presence pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ background: "transparent" }}
    >
      {/* Soft radial cyan glow behind her — centered. */}
      <div
        className="aria-glow absolute left-1/2 top-1/2 h-[70vh] w-[90vw] max-w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(0,212,255,0.22), rgba(0,212,255,0.06) 55%, transparent 75%)",
          filter: "blur(4px)",
        }}
      />

      <AriaReactiveFigure stillOpacity={0.34} videoOpacity={0.42} />

      {/* Readability scrims above her, still below content. */}
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
