import ariaPortrait from "@/assets/aria-hologram-portrait.jpeg.asset.json";

/**
 * AriaWatermark — global ARIA presence rendered behind every route.
 * Mounted once in the app shell (src/routes/__root.tsx). Sits at z-index 0
 * so all page content (wrapped at z-index ≥ 1) renders above it. Uses the
 * canonical hologram portrait as the system-wide backdrop across every
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
        height: "92vh",
        opacity: 0.14,
        WebkitMaskImage:
          "radial-gradient(ellipse at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 82%)",
        maskImage: "radial-gradient(ellipse at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 82%)",
      }}
    >
      <img
        src={ariaPortrait.url}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-full w-auto object-contain"
        style={{ filter: "saturate(115%) contrast(105%)" }}
      />
      <style>{`
        @media (max-width: 767px) {
          .aria-watermark {
            height: 70vh !important;
            opacity: 0.12 !important;
            inset-inline-end: -12% !important;
            bottom: -2% !important;
          }
        }
      `}</style>
    </div>
  );
}
