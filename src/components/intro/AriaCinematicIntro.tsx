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
        preload="auto"
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          v.muted = false;
          v.volume = 1;
          const p = v.play();
          if (p && typeof p.then === "function") {
            p.then(() => { setMuted(false); setShowSoundChip(false); }).catch(() => {
              v.muted = true;
              setMuted(true);
              setShowSoundChip(true);
              v.play().catch(() => { /* noop */ });
            });
          }
        }}
        onEnded={finish}
        onError={() => {
          // eslint-disable-next-line no-console
          console.warn("[AriaCinematicIntro] video failed to load");
          finish();
        }}
        className="relative h-full w-full"
        style={{ objectFit: "contain", maxHeight: "100dvh" }}
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



      <div className="absolute top-4 end-4 z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const v = videoRef.current;
            if (!v) return;
            const next = !muted;
            v.muted = next;
            setMuted(next);
            if (!next) {
              // Ensure playback resumes after user gesture unmute.
              v.play().catch(() => { /* noop */ });
            }
          }}
          aria-label={muted ? (ar ? "تشغيل الصوت" : "Unmute") : (ar ? "كتم الصوت" : "Mute")}
          aria-pressed={!muted}
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary shadow-[0_0_24px_hsl(var(--primary)/0.35)] backdrop-blur transition hover:border-primary/60 hover:bg-background/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          <span>{muted ? (ar ? "تشغيل الصوت" : "Sound on") : (ar ? "كتم" : "Mute")}</span>
        </button>
        <button
          type="button"
          onClick={finish}
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
        const fn = (window as unknown as { __ariaReplayIntro?: () => void })
          .__ariaReplayIntro;
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
