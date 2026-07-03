/**
 * AvatarGreeting — plays a one-shot MP4 greeting when the ARIA panel opens,
 * then cross-fades to a still image. Fully isolated from HeyGen streaming.
 *
 * Behavior:
 *   • On mount (panel open): autoplay /aria-greeting.mp4 with sound.
 *   • On end: 300ms fade to still image.
 *   • Autoplay-with-sound blocked → fall back to muted autoplay + unmute chip.
 *   • Unmount (panel close): pause + reset instantly. No audio leaks.
 *   • Video error → still image immediately.
 */
import { useEffect, useRef, useState } from "react";
import ariaStill from "@/assets/aria-hologram.png.asset.json";

const VIDEO_SRC = "/aria-greeting.mp4";
const STILL_FALLBACK = "/aria.png";

type Phase = "video" | "fading" | "still" | "error";

export function AvatarGreeting() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [phase, setPhase] = useState<Phase>("video");
  const [needsUnmute, setNeedsUnmute] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    let cancelled = false;
    v.muted = false;
    v.volume = 1;

    const tryPlay = async () => {
      try {
        await v.play();
        if (!cancelled) setNeedsUnmute(false);
      } catch {
        // Autoplay with sound blocked — fall back to muted autoplay.
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
      // Hard stop: pause, reset, drop audio immediately.
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

  const showVideo = phase === "video" || phase === "fading";
  const showStill = phase !== "video";

  return (
    <div className="relative mx-4 mt-3 aspect-video overflow-hidden rounded-xl border border-primary/20 bg-background/50">
      {showVideo && (
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          autoPlay
          playsInline
          preload="auto"
          onEnded={handleEnded}
          onError={handleError}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            phase === "fading" ? "opacity-0" : "opacity-100"
          }`}
        />
      )}
      {showStill && (
        <img
          src={STILL_FALLBACK}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = ariaStill.url;
          }}
          alt="ARIA"
          draggable={false}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            phase === "still" || phase === "error" ? "opacity-100" : "opacity-0"
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
