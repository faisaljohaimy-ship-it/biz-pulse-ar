import ariaHologram from "@/assets/aria-hologram-bg.png.asset.json";

/**
 * AriaWatermark — global ARIA presence rendered behind every route.
 * Mounted once in the app shell (src/routes/__root.tsx). Sits at z-index 0
 * so all page content (wrapped at z-index ≥ 1) renders above it. Uses the
 * user-provided hologram portrait as the system-wide backdrop across every
 * page, sub-page, and window. Ghosted enough to keep content readable.
 * RTL-aware via `inset-inline-end`. Never rendered inside intro overlays.
 */
export function AriaWatermark() {
  return (
    <div
      aria-hidden="true"
      className="aria-watermark pointer-events-none fixed bottom-[-4%] z-0 select-none"
      style={{
        insetInlineEnd: "-6%",
        height: "96vh",
        opacity: 0.18,
        WebkitMaskImage: "radial-gradient(ellipse at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 82%)",
        maskImage: "radial-gradient(ellipse at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 82%)",
      }}
    >
      <img
        src={ariaHologram.url}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-full w-auto object-contain"
        style={{ filter: "saturate(120%) contrast(108%)" }}
      />
      <style>{`
        @media (max-width: 767px) {
          .aria-watermark {
            height: 72vh !important;
            opacity: 0.14 !important;
            inset-inline-end: -12% !important;
            bottom: -2% !important;
          }
        }
      `}</style>
    </div>
  );
}
