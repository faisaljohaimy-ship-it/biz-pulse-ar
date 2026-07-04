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
import { useCallback, useEffect, useRef, useState } from "react";
import { AriaAudioBus } from "@/lib/aria/audio-bus";

type VideoState = "idle" | "speaking" | "greeting";

// Single clean HeyGen clip drives every non-idle state. Idle shows the
// static poster only (no video mounted).
const HERO_MOTION_SRC = "/aria-hero-motion.mp4";
const SRC: Record<VideoState, string | null> = {
  idle: null,
  speaking: HERO_MOTION_SRC,
  greeting: HERO_MOTION_SRC,
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
  const audioElRef = useRef<HTMLMediaElement | null>(null);
  const driftTimerRef = useRef<number | null>(null);
  const correctionCountRef = useRef(0);

  const freezeMotion = useCallback(() => {
    const v = videoRef.current;
    if (v) { try { v.pause(); } catch { /* ignore */ } }
    setVideoOpacity(0);
    if (driftTimerRef.current !== null) {
      window.clearInterval(driftTimerRef.current);
      driftTimerRef.current = null;
    }
    audioElRef.current = null;
  }, []);

  const startMotionSynced = useCallback((audioEl: HTMLMediaElement | null) => {
    const v = videoRef.current;
    if (!v) return;
    audioElRef.current = audioEl;
    // Single tick: reset to 0 and play together with the audio clock.
    try { v.currentTime = 0; } catch { /* ignore */ }
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    void v.play().then(() => setVideoOpacity(1)).catch(() => setFailed(true));

    if (driftTimerRef.current !== null) window.clearInterval(driftTimerRef.current);
    if (!audioEl) return; // no clock to sync against (SpeechSynthesis fallback)
    driftTimerRef.current = window.setInterval(() => {
      const vv = videoRef.current;
      const ae = audioElRef.current;
      if (!vv || !ae || ae.paused) return;
      const audioT = ae.currentTime;
      const vidDur = vv.duration || 0;
      if (!Number.isFinite(audioT) || vidDur <= 0) return;
      const expected = audioT % vidDur;
      const offsetMs = Math.abs(vv.currentTime - expected) * 1000;
      if (offsetMs > 80) {
        try { vv.currentTime = expected; } catch { /* ignore */ }
        correctionCountRef.current += 1;
        console.log(`[aria-sync] corrected ${Math.round(offsetMs)}ms`);
      }
    }, 500);
  }, []);

  // ── Subscribe to AriaAudioBus. Motion is driven by playing/stopped
  //    events — NEVER by fetch, render, or the acquire start event. ────
  useEffect(() => {
    if (reduced) return;
    const unsub = AriaAudioBus.subscribe((e) => {
      if (e.kind === "start") {
        // Reserve the state (mount the correct src) but don't play yet.
        if (e.source === "panel-greeting" || e.source === "hero-greeting") setState("greeting");
        else if (e.source === "chat-tts") setState("speaking");
      } else if (e.kind === "playing") {
        // The single clock has begun — start motion in the same tick.
        if (e.source === "panel-greeting" || e.source === "hero-greeting") setState("greeting");
        else if (e.source === "chat-tts") setState("speaking");
        // Defer to next microtask so the <video src=…> swap effect has run.
        Promise.resolve().then(() => startMotionSynced(e.audioEl ?? null));
      } else if (e.kind === "stopped" || e.kind === "end") {
        freezeMotion();
        setState("idle");
      }
    });
    const cur = AriaAudioBus.currentSource();
    if (cur === "chat-tts") setState("speaking");
    else if (cur === "panel-greeting" || cur === "hero-greeting") setState("greeting");
    else setState("idle");
    return () => { unsub(); freezeMotion(); };
  }, [reduced, freezeMotion, startMotionSynced]);

  // ── Visibility: pause when tab hidden, resume when visible ─────────
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const shouldMountVideo = !reduced && active && visible && !failed;

  // ── Mount the correct src for the state (but do NOT autoplay).
  //    Playback is triggered by the audio 'playing' event above.
  useEffect(() => {
    const v = videoRef.current;
    const src = SRC[state];
    if (!v || !shouldMountVideo || !src) {
      setVideoOpacity(0);
      if (v) { try { v.pause(); } catch { /* ignore */ } }
      return;
    }
    if (v.getAttribute("src") !== src) {
      try { v.pause(); } catch { /* ignore */ }
      v.setAttribute("src", src);
      try { v.load(); } catch { /* ignore */ }
    }
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
  }, [state, shouldMountVideo]);

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
      freezeMotion();
      const v = videoRef.current;
      if (!v) return;
      try { v.pause(); } catch { /* ignore */ }
      try { v.removeAttribute("src"); v.load(); } catch { /* ignore */ }
    };
  }, [freezeMotion]);


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
