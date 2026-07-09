/**
 * GlobalPageBackdrop — cinematic ARIA hologram backdrop for every page
 * EXCEPT the homepage (which uses HomeVideoBackdrop). Fixed, non-interactive,
 * behind all content. Cropped exactly like the reference: face high-in-frame,
 * body fading into the dark deck.
 */
import ariaBg from "@/assets/aria-global-bg.jpeg.asset.json";

export function GlobalPageBackdrop() {
  return (
    <div
      aria-hidden="true"
      dir="ltr"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#04070F]"
    >
      <img
        src={ariaBg.url}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-[center_top] opacity-70 md:opacity-75"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 45%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.15) 92%, rgba(0,0,0,0) 100%)",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.9) 45%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.15) 92%, rgba(0,0,0,0) 100%)",
        }}
      />
      {/* Readability veil */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(4,7,15,0.25) 0%, rgba(4,7,15,0.55) 55%, rgba(4,7,15,0.9) 100%)",
        }}
      />
    </div>
  );
}

export default GlobalPageBackdrop;
