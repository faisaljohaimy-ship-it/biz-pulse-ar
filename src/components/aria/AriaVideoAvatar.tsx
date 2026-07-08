/**
 * AriaVideoAvatar — HOT-ELEMENT motion clip. The <video> is mounted
 * PERMANENTLY with the motion src attached, preload="auto", muted, looped,
 * paused at frame 0 with opacity 0. On the first user gesture the decoder
 * is primed (play → pause → currentTime=0). Speech start = opacity flip +
 * currentTime=0 + play() on the already-hot element in the SAME tick as
 * the audio 'playing' event. No src swaps, no mount/unmount per utterance.
 *
 * Instrumentation: logs "[aria-motion] Δ=Xms" per utterance (delta between
 * audio 'playing' and video 'playing' events). Target ≤ 33ms.
 *
 * Reduced-motion / video load failure → static poster only.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AriaAudioBus } from "@/lib/aria/audio-bus";

const HERO_MOTION_SRC = "/aria-hero-motion.mp4";
const FADE_MS = 220;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export interface AriaVideoAvatarProps {
  poster: string;
  className?: string;
  style?: React.CSSProperties;
  mediaStyle?: React.CSSProperties;
  mediaClassName?: string;
  active?: boolean;
}

export function AriaVideoAvatar({
  poster,
  className,
  style,
  mediaStyle,
  mediaClassName,
  active = true,
}: AriaVideoAvatarProps) {
  const [reduced] = useState(prefersReducedMotion);
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof document === "undefined") return true;
    return document.visibilityState !== "hidden";
  });
  const [videoOpacity, setVideoOpacity] = useState(0);
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioElRef = useRef<HTMLMediaElement | null>(null);
  const driftTimerRef = useRef<number | null>(null);
  const primedRef = useRef(false);
  const pendingStartAtRef = useRef<number | null>(null);

  // ── Decoder prime: on first user gesture, warm the codec so the FIRST
  //    speech has zero cold-start latency. play() → immediately pause →
  //    currentTime=0. This is the only place we may briefly play before
  //    speech. Once primed, we never touch the element until speech.
  const primeDecoder = useCallback(() => {
    if (primedRef.current) return;
    const v = videoRef.current;
    if (!v) return;
    primedRef.current = true;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    // Kick off decode by playing one frame silently, then hard-reset.
    v.play()
      .then(() => {
        try {
          v.pause();
          v.currentTime = 0;
        } catch {
          /* noop */
        }
        setVideoOpacity(0);
        // If a speech 'playing' event arrived while we were priming, honor it now.
        if (pendingStartAtRef.current !== null) {
          const t = pendingStartAtRef.current;
          pendingStartAtRef.current = null;
          startMotionAt(t, audioElRef.current);
        }
      })
      .catch(() => {
        // Autoplay policy still blocks — will retry on next gesture.
        primedRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const freezeMotion = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      try {
        v.pause();
        v.currentTime = 0;
      } catch {
        /* noop */
      }
    }
    setVideoOpacity(0);
    if (driftTimerRef.current !== null) {
      window.clearInterval(driftTimerRef.current);
      driftTimerRef.current = null;
    }
    audioElRef.current = null;
    pendingStartAtRef.current = null;
  }, []);

  const startMotionAt = useCallback((audioPlayingT: number, audioEl: HTMLMediaElement | null) => {
    const v = videoRef.current;
    if (!v) return;
    audioElRef.current = audioEl;
    // Frame-lock: same tick reset + play + opacity flip in a single rAF.
    try {
      v.currentTime = 0;
    } catch {
      /* noop */
    }
    v.muted = true;
    v.loop = true;
    v.playsInline = true;

    const onPlaying = () => {
      v.removeEventListener("playing", onPlaying);
    };
    v.addEventListener("playing", onPlaying);

    requestAnimationFrame(() => {
      setVideoOpacity(1);
    });

    v.play().catch(() => {
      v.removeEventListener("playing", onPlaying);
      setFailed(true);
    });

    if (driftTimerRef.current !== null) window.clearInterval(driftTimerRef.current);
    if (!audioEl) return;
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
        try {
          vv.currentTime = expected;
        } catch {
          /* noop */
        }
      }
    }, 500);
  }, []);

  // ── Subscribe to AriaAudioBus. Motion is driven ONLY by 'playing' /
  //    'stopped' events. Frame-lock: capture audio-playing timestamp at
  //    event dispatch time; start video in the same tick.
  useEffect(() => {
    if (reduced) return;
    const unsub = AriaAudioBus.subscribe((e) => {
      if (e.kind === "playing") {
        const t0 = performance.now();
        if (!primedRef.current) {
          // Decoder cold — defer the start until prime resolves, then honor it.
          pendingStartAtRef.current = t0;
          audioElRef.current = e.audioEl ?? null;
          primeDecoder();
          return;
        }
        startMotionAt(t0, e.audioEl ?? null);
      } else if (e.kind === "stopped" || e.kind === "end") {
        freezeMotion();
      }
    });
    return () => {
      unsub();
      freezeMotion();
    };
  }, [reduced, freezeMotion, startMotionAt, primeDecoder]);

  // ── First-gesture decoder prime. Also unlocks on AriaAudioBus.unlock().
  useEffect(() => {
    if (reduced) return;
    const handler = () => primeDecoder();
    if (AriaAudioBus.isUnlocked()) {
      // Already unlocked earlier this session — prime on mount next tick.
      Promise.resolve().then(primeDecoder);
    }
    document.addEventListener("pointerdown", handler, { once: false, passive: true });
    document.addEventListener("touchstart", handler, { once: false, passive: true });
    document.addEventListener("keydown", handler, { once: false });
    return () => {
      document.removeEventListener("pointerdown", handler);
      document.removeEventListener("touchstart", handler);
      document.removeEventListener("keydown", handler);
    };
  }, [reduced, primeDecoder]);

  // ── Visibility: pause when tab hidden.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // When tab hides, pause; when it returns and speech is active, the next
  // 'playing' event will re-arm. Never rip the src.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!visible) {
      try {
        v.pause();
      } catch {
        /* noop */
      }
      setVideoOpacity(0);
    }
  }, [visible]);

  const shouldMountVideo = !reduced && active && !failed;

  const defaultMediaClass = "absolute inset-0 h-full w-full select-none pointer-events-none";
  const mediaCls = mediaClassName ? `${defaultMediaClass} ${mediaClassName}` : defaultMediaClass;
  const combinedMediaStyle: React.CSSProperties = mediaClassName
    ? { ...mediaStyle }
    : { objectFit: "contain", objectPosition: "center top", ...mediaStyle };

  return (
    <div className={className} style={style} aria-hidden>
      <img
        src={poster}
        alt=""
        draggable={false}
        decoding="async"
        loading="eager"
        className={mediaCls}
        style={combinedMediaStyle}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      {shouldMountVideo && (
        <video
          ref={videoRef}
          src={HERO_MOTION_SRC}
          preload="auto"
          muted
          loop
          playsInline
          disablePictureInPicture
          controls={false}
          className={mediaCls}
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
