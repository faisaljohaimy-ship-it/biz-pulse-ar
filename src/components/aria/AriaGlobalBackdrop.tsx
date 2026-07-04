/**
 * AriaGlobalBackdrop — THE ONLY ARIA visual on the site.
 *
 * On the homepage a short muted looped-once motion clip plays first
 * (hand / lips / head), then crossfades to the breathing still. On any
 * other route (or with prefers-reduced-motion / video failure) the still
 * renders immediately. No AudioContext, no particle systems.
 */
import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useAriaPresenceState } from "@/lib/aria/aria-state";

const MOTION_SRC = "/aria-hero-motion.mp4";
const STILL_SRC = "/aria-backdrop.webp";
const MOTION_LOAD_TIMEOUT_MS = 3000;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  catch { return false; }
}

export function AriaGlobalBackdrop() {
  const state = useAriaPresenceState();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/" || pathname === "";

  const [motionDone, setMotionDone] = useState(false);
  const [motionFailed, setMotionFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Decide whether to attempt motion at all.
  const wantMotion = isHome && !prefersReducedMotion();
  const showVideo = wantMotion && !motionDone && !motionFailed;

  // Load timeout safety net — never leave a blank backdrop.
  useEffect(() => {
    if (!showVideo) return;
    const t = window.setTimeout(() => {
      const v = videoRef.current;
      if (!v || v.readyState < 2) setMotionFailed(true);
    }, MOTION_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [showVideo]);

  const stillOpacity = showVideo ? 0 : 0.42;

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

      {/* Motion (homepage only, once) — crossfades out on end/error */}
      {wantMotion && !motionFailed && (
        <video
          ref={videoRef}
          src={MOTION_SRC}
          muted
          playsInline
          autoPlay
          preload="auto"
          disablePictureInPicture
          controls={false}
          onEnded={() => setMotionDone(true)}
          onError={() => setMotionFailed(true)}
          onCanPlay={() => { void videoRef.current?.play().catch(() => setMotionFailed(true)); }}
          className="absolute left-1/2 top-[8%] h-[88%] -translate-x-1/2 select-none transition-opacity duration-500"
          style={{
            objectFit: "contain",
            objectPosition: "center top",
            opacity: motionDone ? 0 : 0.34,
            maxWidth: "min(560px, 92vw)",
          }}
        />
      )}

      {/* Still — always mounted; fades in when motion done or on non-home routes */}
      <div className="aria-figure absolute inset-0">
        <img
          src={STILL_SRC}
          alt=""
          draggable={false}
          decoding="async"
          loading="eager"
          className="absolute left-1/2 top-[8%] h-[88%] -translate-x-1/2 select-none transition-opacity duration-500"
          style={{
            objectFit: "contain",
            objectPosition: "center top",
            opacity: stillOpacity,
            maxWidth: "min(560px, 92vw)",
          }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
        <div className="aria-shimmer" aria-hidden />
      </div>

      {/* Readability scrims */}
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
