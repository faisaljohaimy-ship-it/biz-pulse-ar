import { useEffect, useRef, useState } from "react";
import ariaStillAsset from "@/assets/aria-hologram.png.asset.json";

const SESSION_KEY = "aria-greeted";
const GREETING_SRC = "/aria-greeting.mp4";
const STILL_SRC = ariaStillAsset.url;

/**
 * AriaBackdrop — full cinematic ARIA presence layer behind the hero UI.
 * First visit per session: muted greeting video plays once behind the buttons.
 * Every subsequent render: still image with a soft breathing glow.
 * Always aria-hidden + pointer-events-none — never intercepts a tap or focus.
 * Any video error / 3s load timeout / autoplay block → silent fallback to still.
 */
export function AriaBackdrop() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mode, setMode] = useState<"video" | "still">("still");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const greeted = sessionStorage.getItem(SESSION_KEY) === "1";
    if (!reduced && !greeted) setMode("video");
  }, []);

  useEffect(() => {
    if (mode !== "video") return;
    const v = videoRef.current;
    if (!v) return;
    const toStill = () => {
      try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* noop */ }
      setMode("still");
    };
    v.addEventListener("ended", toStill);
    v.addEventListener("error", toStill);
    const timeout = setTimeout(() => {
      if (v.readyState < 2) toStill();
    }, 3000);
    v.play().catch(toStill); // muted autoplay; any block → still
    return () => {
      v.removeEventListener("ended", toStill);
      v.removeEventListener("error", toStill);
      clearTimeout(timeout);
    };
  }, [mode]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* ARIA layer — centered, full-height, contained */}
      <div className="absolute left-1/2 top-1/2 h-[110%] w-[min(110%,900px)] -translate-x-1/2 -translate-y-1/2 animate-aria-breathe">
        {mode === "video" ? (
          <video
            ref={videoRef}
            src={GREETING_SRC}
            poster={STILL_SRC}
            muted
            playsInline
            autoPlay
            preload="auto"
            className="h-full w-full object-contain object-center opacity-90"
          />
        ) : (
          <img
            src={STILL_SRC}
            alt=""
            draggable={false}
            className="h-full w-full object-contain object-center opacity-85 select-none"
          />
        )}
      </div>

      {/* Cinematic radial glow behind her */}
      <div
        className="absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,255,0.28) 0%, rgba(58,232,255,0.10) 42%, transparent 72%)",
          filter: "blur(30px)",
        }}
      />

      {/* Readability scrims — UI must always win */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 45%, rgba(6,26,46,0.35) 0%, rgba(6,26,46,0.75) 65%, rgba(6,26,46,0.92) 100%)",
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
