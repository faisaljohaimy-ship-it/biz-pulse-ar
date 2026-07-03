/**
 * AriaGlobalBackdrop — THE ONLY ARIA visual on the site.
 *
 * Fixed, static image with CSS-only breathing + presence states.
 * No particles, no video, no AudioContext. Safe on mobile Safari.
 *
 * Reuses the site-wide `.aria-presence` state classes (idle / listening /
 * thinking / speaking) so her figure pulses while TTS is playing.
 */
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
      {/* Soft radial cyan glow behind her */}
      <div
        className="aria-glow absolute left-1/2 top-[38%] h-[70vh] w-[90vw] max-w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(0,212,255,0.22), rgba(0,212,255,0.06) 55%, transparent 75%)",
          filter: "blur(4px)",
        }}
      />

      {/* Her figure — static image, CSS breathing only */}
      <div className="aria-figure absolute inset-0">
        <img
          src="/aria-backdrop.webp"
          alt=""
          draggable={false}
          decoding="async"
          loading="eager"
          className="absolute left-1/2 top-[8%] h-[88%] -translate-x-1/2 select-none"
          style={{
            objectFit: "contain",
            objectPosition: "center top",
            opacity: 0.42,
            maxWidth: "min(560px, 92vw)",
          }}

          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <div className="aria-shimmer" aria-hidden />
      </div>

      {/* Readability scrims — top vignette + bottom fade for text contrast */}
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
