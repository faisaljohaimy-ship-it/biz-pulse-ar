/**
 * AvatarGreeting — plays a one-shot MP4 greeting when the ARIA panel opens,
 * then cross-fades to a still image. Fully isolated from HeyGen streaming.
 *
 * Guarantees:
 *   • Still image is ALWAYS mounted underneath the video — a video failure
 *     can never expose an empty box.
 *   • Hard 3s load timeout: if the video hasn't produced a frame by then,
 *     we fall back to the still image immediately.
 *   • Panel close → pause, reset, drop audio; no audio leaks.
 */
import { useEffect, useRef, useState } from "react";
import ariaStill from "@/assets/aria-hologram.png.asset.json";

const VIDEO_SRC = "/aria-greeting.mp4";
// Primary still uses the bundled asset URL (guaranteed to exist). We keep a
// second /aria.png attempt only as a very last resort.
const STILL_PRIMARY = ariaStill.url;
const STILL_FALLBACK = "/aria.png";

type Phase = "video" | "fading" | "still" | "error";

export function AvatarGreeting() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState<Phase>("video");
  const [needsUnmute, setNeedsUnmute] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) {
      setPhase("error");
      return;
    }

    let cancelled = false;
    v.muted = false;
    v.volume = 1;

    // Hard 3s load timeout — if no frame is ready, degrade to still.
    const loadTimeout = window.setTimeout(() => {
      if (cancelled) return;
      if (v.readyState < 2) {
        setPhase("error");
      }
    }, 3000);

    const tryPlay = async () => {
      try {
        await v.play();
        if (!cancelled) setNeedsUnmute(false);
      } catch {
        if (cancelled) return;
        v.muted = true;
        setNeedsUnmute(true);
        try {
          await v.play();
        } catch {
          if (!cancelled) setPhase("error");
        }
      }
    };
    void tryPlay();

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimeout);
      try {
        v.pause();
        v.currentTime = 0;
        v.muted = true;
        v.removeAttribute("src");
        v.load();
      } catch {
        /* noop */
      }
    };
  }, []);

  const handleEnded = () => {
    setPhase("fading");
    window.setTimeout(() => setPhase("still"), 300);
  };

  const handleError = () => setPhase("error");

  const unmuteReplay = async () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.currentTime = 0;
    try {
      await v.play();
      setNeedsUnmute(false);
    } catch {
      /* keep chip */
    }
  };

  const videoVisible = phase === "video";
  const videoMounted = phase === "video" || phase === "fading";

  return (
    <div className="relative mx-4 mt-3 aspect-video overflow-hidden rounded-xl border border-primary/20 bg-background/50">
      {/* Still image is ALWAYS mounted underneath — guarantees no blank box. */}
      <img
        src={STILL_PRIMARY}
        onError={(e) => {
          const img = e.currentTarget as HTMLImageElement;
          if (img.src.endsWith(STILL_FALLBACK)) return;
          img.src = STILL_FALLBACK;
        }}
        alt="ARIA"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {videoMounted && (
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          autoPlay
          playsInline
          preload="auto"
          onEnded={handleEnded}
          onError={handleError}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            videoVisible ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
      {needsUnmute && phase === "video" && (
        <button
          type="button"
          onClick={unmuteReplay}
          className="absolute bottom-2 end-2 rounded-full border border-primary/40 bg-card/85 px-3 py-1 text-xs font-medium text-primary shadow-lg backdrop-blur hover:bg-card"
          aria-label="Play greeting with sound"
        >
          🔊 اضغط للاستماع
        </button>
      )}
    </div>
  );
}
