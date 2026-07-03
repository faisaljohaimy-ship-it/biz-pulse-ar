import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import ariaStillAsset from "@/assets/aria-hologram.png.asset.json";

const KEY = "aria-sys-greeted";
const GREETING_SRC = "/aria-greeting.mp4";
const STILL_SRC = ariaStillAsset.url;

/**
 * AriaSystemBackdrop — fixed full-viewport ARIA presence layer.
 * Full figure, face never cropped. z-0, pointer-events-none, aria-hidden.
 * Greeting video plays once per session (muted), then breathing still.
 * Excluded on /promo/* routes which own their own cinematic visuals.
 */
export function AriaSystemBackdrop() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mode, setMode] = useState<"video" | "still">("still");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced && sessionStorage.getItem(KEY) !== "1") setMode("video");
  }, []);

  useEffect(() => {
    if (mode !== "video") return;
    const v = videoRef.current;
    if (!v) return;
    const settle = () => {
      try { sessionStorage.setItem(KEY, "1"); } catch { /* noop */ }
      setMode("still");
    };
    v.addEventListener("ended", settle);
    v.addEventListener("error", settle);
    const guard = setTimeout(() => { if (v.readyState < 2) settle(); }, 3000);
    v.play().catch(settle);
    return () => {
      v.removeEventListener("ended", settle);
      v.removeEventListener("error", settle);
      clearTimeout(guard);
    };
  }, [mode]);

  if (pathname?.startsWith("/promo")) return null;

  const mediaClass =
    "absolute left-1/2 top-[8%] h-[92%] w-auto max-w-none -translate-x-1/2 " +
    "object-contain object-top opacity-80 select-none animate-aria-sys-breathe";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Radial life-glow behind her */}
      <div
        className="absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(0,212,255,0.22) 0%, rgba(58,232,255,0.08) 45%, transparent 75%)",
          filter: "blur(40px)",
        }}
      />

      {/* ARIA — full figure, face always in frame */}
      {mode === "video" ? (
        <video
          ref={videoRef}
          src={GREETING_SRC}
          poster={STILL_SRC}
          muted
          playsInline
          autoPlay
          preload="auto"
          className={mediaClass}
        />
      ) : (
        <img
          src={STILL_SRC}
          alt=""
          draggable={false}
          className={mediaClass}
        />
      )}

      {/* Readability scrims — UI always wins */}
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
