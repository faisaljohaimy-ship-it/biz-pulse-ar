/**
 * AriaBackdrop — STATIC full-figure ARIA presence behind the hero UI.
 * No video. No audio. No AudioContext. Safe on mobile Safari.
 * Only motion: cheap CSS breathing (transform/filter) already defined in styles.
 * Always aria-hidden + pointer-events-none — never intercepts a tap or focus.
 */
export function AriaBackdrop() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {/* ARIA figure — centered, full height, top-anchored so face never crops */}
      <div className="absolute left-1/2 top-0 h-full w-[min(110%,900px)] -translate-x-1/2 animate-aria-breathe">
        <img
          src="/aria.jpg"
          alt=""
          draggable={false}
          loading="eager"
          decoding="async"
          className="h-full w-full select-none object-contain object-top opacity-[0.32]"
        />
      </div>

      {/* Soft cyan life-glow behind her */}
      <div
        className="absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,255,0.22) 0%, rgba(58,232,255,0.08) 45%, transparent 72%)",
          filter: "blur(30px)",
        }}
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
