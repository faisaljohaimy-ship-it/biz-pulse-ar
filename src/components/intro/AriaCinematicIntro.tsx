import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import ariaIntro from "@/assets/aria-intro.mp4.asset.json";
import { installInteractionTracker, markInteracted } from "@/lib/user-interaction";

const STORAGE_KEY = "aria_intro_seen_v1";

type Props = {
  /** Optional identifier to scope replay state per surface. */
  surface?: string;
};

/**
 * AriaCinematicIntro
 * Full-screen cinematic pre-hero video. Plays once per device
 * (localStorage flag `aria_intro_seen_v1`). Respects
 * prefers-reduced-motion. Silent-fails on error; never blocks the page.
 */
export function AriaCinematicIntro({ surface = "global" }: Props) {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [muted, setMuted] = useState(true);
  const [showSoundChip, setShowSoundChip] = useState(false);
  // FR-1/FR-2: choose object-fit per device class. Portrait mobile → cover
  // (fills, face in upper third). Everything else → contain (no cropping).
  const [fitMode, setFitMode] = useState<"cover" | "contain">("contain");

  // Decide on mount whether to show.
  useEffect(() => {
    if (typeof window === "undefined") return;
    installInteractionTracker();
    try {
      const seen = window.localStorage.getItem(STORAGE_KEY);
      if (seen === "1") return;
    } catch {
      /* ignore storage errors */
    }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* noop */
      }
      return;
    }
    setVisible(true);
  }, [surface]);

  // FR-1/FR-2: recompute fit mode on mount + on resize/orientation change.
  // Portrait AND ≤768px  → cover ; otherwise contain (laptop/desktop/tablet/landscape).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px) and (orientation: portrait)");
    const apply = () => setFitMode(mq.matches ? "cover" : "contain");
    apply();
    mq.addEventListener?.("change", apply);
    window.addEventListener("resize", apply);
    return () => {
      mq.removeEventListener?.("change", apply);
      window.removeEventListener("resize", apply);
    };
  }, []);

  const finish = () => {
    if (fading) return;
    setFading(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* noop */
    }
    window.setTimeout(() => setVisible(false), 600);
  };

  // Expose a global replay hook for the footer button.
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as unknown as { __ariaReplayIntro?: () => void }).__ariaReplayIntro = () => {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* noop */
      }
      setFading(false);
      setVisible(true);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ar ? "مقدّمة سينمائية" : "Cinematic intro"}
      dir={ar ? "rtl" : "ltr"}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-background"
      style={{
        opacity: fading ? 0 : 1,
        transition: "opacity 600ms cubic-bezier(0.22,1,0.36,1)",
        maxHeight: "100dvh",
      }}
      onPointerDown={() => {
        if (!muted) return;
        const v = videoRef.current;
        if (!v) return;
        markInteracted();
        v.muted = false;
        v.volume = 1;
        v.play().catch(() => {});
        setMuted(false);
        setShowSoundChip(false);
      }}
    >
      {/* Cinematic blurred backdrop */}
      <video
        ref={bgVideoRef}
        src={ariaIntro.url}
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden
        className="absolute inset-0 h-full w-full"
        style={{
          objectFit: "cover",
          filter: "blur(28px) brightness(0.55) saturate(1.05)",
          transform: "scale(1.15)",
        }}
      />
      <video
        ref={videoRef}
        src={ariaIntro.url}
        autoPlay
        muted={muted}
        playsInline
        // iOS/Android Safari: `webkit-playsinline` is required on some older
        // engines; harmless elsewhere. Also disable picture-in-picture and
        // remote playback so the intro cannot be minimised by the OS.
        {...({ "webkit-playsinline": "true", "x5-playsinline": "true" } as Record<string, string>)}
        disablePictureInPicture
        disableRemotePlayback
        controls={false}
        preload="auto"
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          // First, guarantee playback (muted always works on mobile).
          v.play().catch(() => {
            /* noop */
          });
          // Then attempt to unmute. If the browser blocks it (iOS), stay
          // muted and surface the "Tap for sound" chip.
          try {
            v.muted = false;
            v.volume = 1;
            const p = v.play();
            if (p && typeof p.then === "function") {
              p.then(() => {
                setMuted(false);
                setShowSoundChip(false);
              }).catch(() => {
                v.muted = true;
                setMuted(true);
                setShowSoundChip(true);
                v.play().catch(() => {
                  /* noop */
                });
              });
            }
          } catch {
            v.muted = true;
            setMuted(true);
            setShowSoundChip(true);
          }
        }}
        onEnded={finish}
        onError={() => {
          console.warn("[AriaCinematicIntro] video failed to load");
          finish();
        }}
        className="relative h-full w-full"
        // FR-1: portrait mobile → cover + face-in-upper-third.
        // FR-2: laptop/desktop/tablet/landscape → contain (no cropping);
        // the blurred bgVideo fills any letterbox area so the frame is
        // never bare black bars.
        style={{
          objectFit: fitMode,
          objectPosition: fitMode === "cover" ? "center 30%" : "center",
          maxHeight: "100dvh",
        }}
      />

      {/* Edge-only vignette (does not cover the face) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 50%, transparent 65%, hsl(var(--background) / 0.7) 100%)",
        }}
      />

      <div
        className="absolute end-4 z-30 flex items-center gap-2"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)" }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const v = videoRef.current;
            if (!v) return;
            markInteracted();
            const next = !muted;
            v.muted = next;
            if (!next) v.volume = 1;
            setMuted(next);
            if (!next) {
              setShowSoundChip(false);
              v.play().catch(() => {
                /* noop */
              });
            }
          }}
          aria-label={muted ? (ar ? "تشغيل الصوت" : "Unmute") : ar ? "كتم الصوت" : "Mute"}
          aria-pressed={!muted}
          className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary shadow-[0_0_24px_hsl(var(--primary)/0.35)] backdrop-blur transition hover:border-primary/60 hover:bg-background/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          <span>
            {showSoundChip
              ? ar
                ? "اضغط لتفعيل الصوت"
                : "Tap for sound"
              : muted
                ? ar
                  ? "تشغيل الصوت"
                  : "Sound on"
                : ar
                  ? "كتم"
                  : "Mute"}
          </span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            finish();
          }}
          aria-label={ar ? "تخطّي المقدّمة · Skip intro" : "Skip intro · تخطّي المقدّمة"}
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary shadow-[0_0_24px_hsl(var(--primary)/0.35)] backdrop-blur transition hover:border-primary/60 hover:bg-background/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span>{ar ? "تخطّي" : "Skip"}</span>
          <span aria-hidden className="text-[10px] opacity-70">
            {ar ? "Skip" : "تخطّي"}
          </span>
        </button>
      </div>
    </div>
  );
}

/**
 * Small footer utility button — restores the intro for the current device
 * (clears the seen flag and re-mounts). Import and place inside a footer.
 */
export function AriaIntroReplayButton() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  return (
    <button
      type="button"
      onClick={() => {
        const fn = (window as unknown as { __ariaReplayIntro?: () => void }).__ariaReplayIntro;
        if (fn) fn();
      }}
      className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground hover:text-primary"
      aria-label={ar ? "إعادة تشغيل المقدّمة" : "Replay cinematic intro"}
    >
      {ar ? "إعادة تشغيل المقدّمة" : "Replay intro"}
    </button>
  );
}

export default AriaCinematicIntro;
