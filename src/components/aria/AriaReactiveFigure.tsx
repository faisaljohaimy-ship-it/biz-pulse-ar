/**
 * AriaReactiveFigure — the ONE shared ARIA visual.
 *
 * Renders a centered still (breathing) and swaps to a looping muted
 * video ONLY while the global ARIA state is "speaking". On silence it
 * pauses the video and fades back to the still — near-zero idle cost
 * (video is paused, not just hidden).
 *
 * `prefers-reduced-motion` or a video error → still only, always.
 * Blank backdrop is impossible: the still is always mounted.
 *
 * Used by:
 *   - <AriaGlobalBackdrop /> site-wide behind every route.
 *   - <AriaPanelBackdrop /> inside the chat panel.
 */
import { useEffect, useRef, useState } from "react";
import { useAriaPresenceState } from "@/lib/aria/aria-state";

const MOTION_SRC = "/aria-hero-motion.mp4";
const STILL_SRC = "/aria-backdrop.webp";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export interface AriaReactiveFigureProps {
  /** Opacity applied to the still when idle. Default 0.34 for site. */
  stillOpacity?: number;
  /** Opacity applied to the video while speaking. Default 0.42. */
  videoOpacity?: number;
  /** Extra classes for the outer positioning wrapper. */
  className?: string;
}

export function AriaReactiveFigure({
  stillOpacity = 0.34,
  videoOpacity = 0.42,
  className = "",
}: AriaReactiveFigureProps) {
  const state = useAriaPresenceState();
  const [motionFailed, setMotionFailed] = useState(false);
  const [reduced] = useState<boolean>(() => prefersReducedMotion());
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const canMove = !reduced && !motionFailed;
  const speaking = state === "speaking";
  const showVideo = canMove && speaking;

  // Drive play/pause from the global state, not from React re-renders.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (showVideo) {
      v.currentTime = v.currentTime || 0;
      void v.play().catch(() => setMotionFailed(true));
    } else {
      try {
        v.pause();
      } catch {
        /* ignore */
      }
    }
  }, [showVideo]);

  return (
    <div
      className={
        "absolute left-1/2 top-1/2 h-[86%] w-auto -translate-x-1/2 -translate-y-1/2 " +
        className
      }
      style={{ aspectRatio: "auto" }}
    >
      {/* Still — always mounted, fades out only when video is visible. */}
      <img
        src={STILL_SRC}
        alt=""
        draggable={false}
        decoding="async"
        loading="eager"
        className="aria-figure absolute inset-0 h-full w-auto select-none animate-aria-sys-breathe transition-opacity duration-500"
        style={{
          objectFit: "contain",
          objectPosition: "center center",
          opacity: showVideo ? 0 : stillOpacity,
          maxWidth: "min(560px, 92vw)",
        }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />

      {/* Reactive motion — ONLY while ARIA is speaking. */}
      {canMove && (
        <video
          ref={videoRef}
          src={MOTION_SRC}
          muted
          playsInline
          loop
          preload="auto"
          disablePictureInPicture
          controls={false}
          onError={() => setMotionFailed(true)}
          className="absolute inset-0 h-full w-auto select-none transition-opacity duration-400"
          style={{
            objectFit: "contain",
            objectPosition: "center center",
            opacity: showVideo ? videoOpacity : 0,
            maxWidth: "min(560px, 92vw)",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}

export default AriaReactiveFigure;
