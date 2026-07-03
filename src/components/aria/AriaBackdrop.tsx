import { useAriaPresenceState } from "@/lib/aria/aria-state";

/**
 * AriaBackdrop — STATIC full-figure ARIA presence behind the hero UI.
 * No video. No audio. No AudioContext. Safe on mobile Safari.
 * State-driven CSS only (transform / opacity / filter):
 *   idle      → slow breathing + soft glow
 *   listening → emerald ring, gentle glow pulse
 *   thinking  → subtle shimmer sweep
 *   speaking  → rhythmic glow pulse
 * Always aria-hidden + pointer-events-none.
 */
export function AriaBackdrop() {
  const state = useAriaPresenceState();

  return (
    <div
      aria-hidden
      data-aria-state={state}
      className="aria-presence pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* ARIA figure — centered, full height, top-anchored so face never crops */}
      <div className="aria-figure absolute left-1/2 top-0 h-full w-[min(110%,900px)] -translate-x-1/2">
        <img
          src="/aria.jpg"
          alt=""
          draggable={false}
          loading="eager"
          decoding="async"
          className="h-full w-full select-none object-contain object-top opacity-[0.32]"
        />
        {/* Shimmer sweep — visible only in 'thinking' state via CSS */}
        <div className="aria-shimmer" aria-hidden />
      </div>

      {/* Cyan life-glow — pulses per state */}
      <div
        className="aria-glow absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
      />

      {/* Readability scrims — UI must always win */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(6,26,46,0.35) 0%, rgba(6,26,46,0.72) 65%, rgba(6,26,46,0.90) 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[45%]"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(6,26,46,0.85) 65%, #061A2E 100%)",
        }}
      />
    </div>
  );
}

export default AriaBackdrop;
