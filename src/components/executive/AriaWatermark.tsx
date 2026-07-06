import ariaPortrait from "@/assets/aria-hero-presence.png.asset.json";

/**
 * AriaWatermark — global ghosted ARIA presence rendered behind every route.
 * Mounted once in the app shell (src/routes/__root.tsx). Sits at z-index 0
 * so all page content (wrapped at z-index ≥ 1) renders above it.
 * RTL-aware via `inset-inline-end`. Never rendered inside intro overlays.
 */
export function AriaWatermark() {
  return (
    <div
      aria-hidden="true"
      className="aria-watermark pointer-events-none fixed bottom-[-6%] z-0 select-none"
      style={{
        insetInlineEnd: "-8%",
        height: "82vh",
        opacity: 0.05,
        WebkitMaskImage:
          "radial-gradient(ellipse at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 78%)",
        maskImage:
          "radial-gradient(ellipse at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 78%)",
      }}
    >
      <img
        src={ariaPortrait.url}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-full w-auto object-contain"
        style={{ filter: "grayscale(35%)" }}
      />
      <style>{`
        @media (max-width: 767px) {
          .aria-watermark { height: 55vh !important; opacity: 0.04 !important; inset-inline-end: 0 !important; bottom: 0 !important; }
        }
      `}</style>
    </div>
  );
}
