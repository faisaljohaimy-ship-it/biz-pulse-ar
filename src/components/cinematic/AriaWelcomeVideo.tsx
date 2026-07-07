/**
 * AriaWelcomeVideo — the SINGLE pre-system intro. Full-screen ARIA welcome
 * clip that plays once per browser session, then crossfades to the app.
 *
 * Framing: object-fit: contain against a dark backdrop so ARIA's face and
 * shoulders are always fully visible regardless of aspect ratio. A blurred
 * duplicate of the same video fills the letterbox with a cinematic wash.
 *
 * Audio: tries to autoplay with sound; if the browser blocks it, plays
 * muted immediately and surfaces a small non-blocking chip. Any pointer /
 * touch / key event anywhere on the overlay unmutes.
 */
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import welcomeAsset from "@/assets/aria-welcome.mp4.asset.json";
import { setIntroActive } from "@/lib/intro-store";
import {
  hasPriorInteraction,
  installInteractionTracker,
  markInteracted,
} from "@/lib/user-interaction";

interface Props {
  onDone: () => void;
}

const FADE_MS = 600;

export function AriaWelcomeVideo({ onDone }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const [visible, setVisible] = useState(true);
  const [needsGesture, setNeedsGesture] = useState(false); // reduced-motion only
  const [muted, setMuted] = useState(false);
  const [showSoundChip, setShowSoundChip] = useState(false);
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const v = videoRef.current;
    const bg = bgVideoRef.current;
    try { v?.pause(); } catch { /* ignore */ }
    try { bg?.pause(); } catch { /* ignore */ }
    if (v) { try { v.removeAttribute("src"); v.load(); } catch { /* ignore */ } }
    if (bg) { try { bg.removeAttribute("src"); bg.load(); } catch { /* ignore */ } }
    setVisible(false);
    window.setTimeout(() => {
      setIntroActive(false);
      onDone();
    }, FADE_MS);
  };

  useEffect(() => {
    setIntroActive(true);
    installInteractionTracker();

    const reduced = (() => {
      try { return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false; }
      catch { return false; }
    })();

    const v = videoRef.current;
    const bg = bgVideoRef.current;
    if (!v) {
      return () => { setIntroActive(false); };
    }

    if (reduced) {
      setNeedsGesture(true);
      return () => {
        try { v.pause(); } catch { /* ignore */ }
        try { bg?.pause(); } catch { /* ignore */ }
        setIntroActive(false);
      };
    }

    const startBg = () => { if (bg) { bg.muted = true; bg.play().catch(() => {}); } };

    const tryWithSound = async () => {
      v.muted = false;
      v.volume = 1;
      try {
        await v.play();
        startBg();
        setMuted(false);
        setShowSoundChip(false);
      } catch {
        // Fallback: play muted so the scene doesn't freeze, show chip.
        v.muted = true;
        setMuted(true);
        setShowSoundChip(true);
        try { await v.play(); } catch { /* ignore */ }
        startBg();
      }
    };

    // If the user has interacted this session, sound will almost certainly
    // be allowed. Otherwise still attempt — some browsers/policies allow it.
    void hasPriorInteraction();
    void tryWithSound();

    return () => {
      try { v.pause(); } catch { /* ignore */ }
      try { bg?.pause(); } catch { /* ignore */ }
      setIntroActive(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unmute = () => {
    const v = videoRef.current;
    if (!v) return;
    markInteracted();
    v.muted = false;
    v.volume = 1;
    v.play().catch(() => { /* ignore */ });
    setMuted(false);
    setShowSoundChip(false);
  };

  const startReduced = async () => {
    const v = videoRef.current;
    if (!v) return;
    markInteracted();
    try {
      v.muted = false;
      v.volume = 1;
      await v.play();
      const bg = bgVideoRef.current;
      if (bg) { bg.muted = true; bg.play().catch(() => {}); }
      setMuted(false);
      setNeedsGesture(false);
      setShowSoundChip(false);
    } catch {
      setNeedsGesture(true);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    const next = !muted;
    v.muted = next;
    if (!next) {
      v.volume = 1;
      v.play().catch(() => {});
    }
    setMuted(next);
    if (!next) setShowSoundChip(false);
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden"
      style={{
        background: "#04111f",
        colorScheme: "dark",
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: visible ? "auto" : "none",
        maxHeight: "100dvh",
      }}
      aria-label="ترحيب آريا"
      onPointerDown={() => { if (muted) unmute(); }}
    >
      {/* Cinematic blurred backdrop (same source, muted, cover) */}
      <video
        ref={bgVideoRef}
        src={welcomeAsset.url}
        playsInline
        muted
        preload="auto"
        aria-hidden
        className="absolute inset-0 h-full w-full"
        style={{
          objectFit: "cover",
          filter: "blur(28px) brightness(0.55) saturate(1.05)",
          transform: "scale(1.15)",
          background: "#04111f",
        }}
      />

      {/* Main video — fully visible, letterboxed against the blur */}
      <video
        ref={videoRef}
        src={welcomeAsset.url}
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
        className="relative h-full w-full"
        style={{
          objectFit: "contain",
          background: "transparent",
          maxHeight: "100dvh",
        }}
      />

      {/* Edge-only vignette (does not cover the face) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 50%, transparent 65%, rgba(4,17,31,0.65) 100%)",
        }}
      />

      {/* Sound chip — non-blocking */}
      {showSoundChip && (
        <button
          type="button"
          onClick={unmute}
          className="absolute top-4 end-4 z-20 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background/50 px-4 py-2 text-xs font-semibold text-primary shadow-[0_0_24px_hsl(var(--primary)/0.35)] backdrop-blur transition hover:bg-background/70 sm:text-sm"
        >
          <Volume2 className="size-4" />
          <span>اضغط لتفعيل الصوت · Tap for sound</span>
        </button>
      )}

      {/* Mute toggle (mirrors real state) */}
      {!showSoundChip && !needsGesture && (
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "تشغيل الصوت" : "كتم الصوت"}
          aria-pressed={!muted}
          className="absolute top-4 end-4 z-20 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/50 px-3 py-2 text-xs font-medium text-primary backdrop-blur transition hover:bg-background/70"
        >
          {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
        </button>
      )}

      {/* Reduced-motion explicit entry */}
      {needsGesture && (
        <button
          type="button"
          onClick={startReduced}
          className="absolute inset-0 z-10 flex items-center justify-center bg-[#04111f]/60 text-white backdrop-blur-sm"
        >
          <span className="rounded-full border border-emerald-400/60 bg-emerald-400/15 px-8 py-4 text-lg font-semibold shadow-[0_0_32px_rgba(52,211,153,0.35)] transition hover:bg-emerald-400/25">
            دخول
          </span>
        </button>
      )}

      {/* Skip — always visible */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); finish(); }}
        className="absolute bottom-6 start-6 z-30 rounded-full border border-white/25 bg-black/40 px-4 py-2 text-xs font-medium text-white/85 backdrop-blur transition hover:bg-black/60 sm:text-sm"
      >
        تخطّي · Skip
      </button>
    </div>
  );
}

export default AriaWelcomeVideo;
