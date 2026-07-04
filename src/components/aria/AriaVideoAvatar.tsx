/**
 * AriaVideoAvatar — reusable, single-<video> state machine for ARIA's
 * living presence. Applies to BOTH the full-page backdrop and the panel
 * background.
 *
 * States (driven by AriaAudioBus events, never timers):
 *   • greeting  → aria-greeting.mp4 once WITH audio, then → idle
 *   • speaking  → aria-talking.mp4 muted loop while TTS is playing
 *   • idle      → aria-idle.mp4 muted loop
 *
 * Crossfade 300ms between switches via opacity on the video AND a
 * poster image layered beneath it that stays visible whenever the
 * video is faded out or has failed to load.
 *
 * Mobile Safari memory discipline:
 *   • preload="metadata" only
 *   • pause + release src when tab hidden or component unmounts
 *   • static poster is always mounted as fallback
 *   • prefers-reduced-motion → static poster only (no video mount)
 */
import { useEffect, useRef, useState } from "react";
import { AriaAudioBus } from "@/lib/aria/audio-bus";

type VideoState = "idle" | "speaking" | "greeting";

const SRC: Record<VideoState, string> = {
  idle: "/aria-idle.mp4",
  speaking: "/aria-talking.mp4",
  greeting: "/aria-greeting.mp4",
};

const FADE_MS = 300;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  catch { return false; }
}

export interface AriaVideoAvatarProps {
  /** Static image URL used as poster and fallback. */
  poster: string;
  /** Extra class names on the outer wrapper. */
  className?: string;
  /** Inline style overrides on the outer wrapper. */
  style?: React.CSSProperties;
  /** Style overrides applied to both <video> and <img> (position / sizing). */
  mediaStyle?: React.CSSProperties;
  /** If false, the avatar unmounts video and shows poster only (dismiss). */
  active?: boolean;
}

export function AriaVideoAvatar({
  poster,
  className,
  style,
  mediaStyle,
  active = true,
}: AriaVideoAvatarProps) {
  const [reduced] = useState(prefersReducedMotion);
  const [state, setState] = useState<VideoState>("idle");
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof document === "undefined") return true;
    return document.visibilityState !== "hidden";
  });
  const [videoOpacity, setVideoOpacity] = useState(0);
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // ── Subscribe to AriaAudioBus for state transitions ─────────────────
  useEffect(() => {
    if (reduced) return;
    const unsub = AriaAudioBus.subscribe((e) => {
      if (e.kind === "start") {
        if (e.source === "panel-greeting" || e.source === "hero-greeting") {
          setState("greeting");
        } else if (e.source === "chat-tts") {
          setState("speaking");
        }
      } else if (e.kind === "end") {
        setState("idle");
      }
    });
    // Sync current state on mount
    const cur = AriaAudioBus.currentSource();
    if (cur === "chat-tts") setState("speaking");
    else if (cur === "panel-greeting" || cur === "hero-greeting") setState("greeting");
    else setState("idle");
    return unsub;
  }, [reduced]);

  // ── Visibility: pause when tab hidden, resume when visible ─────────
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const shouldMountVideo = !reduced && active && visible && !failed;

  // ── Drive playback on state / mount changes ────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !shouldMountVideo) {
      setVideoOpacity(0);
      return;
    }
    // Fade out during swap; the poster below stays visible.
    setVideoOpacity(0);
    const src = SRC[state];
    if (v.getAttribute("src") !== src) {
      try { v.pause(); } catch { /* ignore */ }
      v.setAttribute("src", src);
      try { v.load(); } catch { /* ignore */ }
    }
    v.muted = state !== "greeting";
    v.loop = state !== "greeting";
    v.playsInline = true;
    const onReady = () => {
      // Small delay so the fade-out completes before fade-in.
      window.setTimeout(() => {
        void v.play().then(() => setVideoOpacity(1)).catch(() => {
          // Autoplay refused (e.g. unmuted greeting without gesture) —
          // fall back to muted playback to keep visuals alive.
          if (!v.muted) {
            v.muted = true;
            void v.play().then(() => setVideoOpacity(1)).catch(() => setFailed(true));
          } else {
            setFailed(true);
          }
        });
      }, 40);
    };
    v.addEventListener("canplay", onReady, { once: true });
    return () => v.removeEventListener("canplay", onReady);
  }, [state, shouldMountVideo]);

  // ── Greeting one-shot → return to idle when video ends ─────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v || state !== "greeting") return;
    const onEnded = () => setState("idle");
    v.addEventListener("ended", onEnded);
    return () => v.removeEventListener("ended", onEnded);
  }, [state]);

  // ── Unmount / dismiss cleanup: release the media element ───────────
  useEffect(() => {
    if (shouldMountVideo) return;
    const v = videoRef.current;
    if (!v) return;
    try { v.pause(); } catch { /* ignore */ }
    try { v.removeAttribute("src"); v.load(); } catch { /* ignore */ }
  }, [shouldMountVideo]);

  useEffect(() => {
    return () => {
      const v = videoRef.current;
      if (!v) return;
      try { v.pause(); } catch { /* ignore */ }
      try { v.removeAttribute("src"); v.load(); } catch { /* ignore */ }
    };
  }, []);

  const combinedMediaStyle: React.CSSProperties = {
    objectFit: "contain",
    objectPosition: "center top",
    ...mediaStyle,
  };

  return (
    <div className={className} style={style} aria-hidden>
      {/* Poster / fallback — ALWAYS mounted. */}
      <img
        src={poster}
        alt=""
        draggable={false}
        decoding="async"
        loading="eager"
        className="absolute inset-0 h-full w-full select-none pointer-events-none"
        style={combinedMediaStyle}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
      {shouldMountVideo && (
        <video
          ref={videoRef}
          preload="metadata"
          playsInline
          disablePictureInPicture
          controls={false}
          className="absolute inset-0 h-full w-full select-none pointer-events-none"
          style={{
            ...combinedMediaStyle,
            opacity: videoOpacity,
            transition: `opacity ${FADE_MS}ms ease-out`,
          }}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export default AriaVideoAvatar;
