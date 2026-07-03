import { useRouterState } from "@tanstack/react-router";
import ariaStillAsset from "@/assets/aria-hologram.png.asset.json";

const STILL_SRC = ariaStillAsset.url;

/**
 * AriaSystemBackdrop — fixed full-viewport ARIA presence layer.
 * STATIC IMAGE ONLY. No video, no audio, no AudioContext.
 * Desktop only (mobile crash guard). Excluded on /promo/*.
 */
export function AriaSystemBackdrop() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname?.startsWith("/promo")) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden hidden md:block">
      <div
        className="absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,255,0.22) 0%, rgba(58,232,255,0.08) 45%, transparent 75%)",
          filter: "blur(40px)",
        }}
      />
      <img
        src={STILL_SRC}
        alt=""
        draggable={false}
        className="absolute left-1/2 top-[8%] h-[92%] w-auto max-w-none -translate-x-1/2 object-contain object-top opacity-80 select-none animate-aria-sys-breathe"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(4,7,15,0.55) 0%, rgba(4,7,15,0.82) 60%, rgba(4,7,15,0.94) 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[40%]"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(4,7,15,0.85) 70%, #04070F 100%)",
        }}
      />
    </div>
  );
}

export default AriaSystemBackdrop;
