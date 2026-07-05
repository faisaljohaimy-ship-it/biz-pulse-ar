import { useEffect, useRef, useState } from "react";
import heroVideo from "@/assets/hero-intro-video.mp4.asset.json";
import heroAudio from "@/assets/hero-intro-audio.mp3.asset.json";
import { useI18n } from "@/lib/i18n";

/**
 * NEXIOS cinematic intro — pre-page shown once per session.
 * A vertical video of the fiery blue orb plays fullscreen with the
 * narration audio autoplayed in sync. A bilingual descriptor sits at
 * the top; a subtle "Skip" chip appears after 1s. The intro auto-
 * dismisses when the video ends (hard cap 34s) and crossfades into
 * the system homepage.
 */

const SEEN_KEY = "nexios-genesis-seen";
const T_FADE = 700;
const T_MAX = 34000;

function useReducedMotion() {
  const [rm, setRm] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setRm(mq.matches);
    const h = (e: MediaQueryListEvent) => setRm(e.matches);
    mq.addEventListener?.("change", h);
    return () => mq.removeEventListener?.("change", h);
  }, []);
  return rm;
}

export function NexiosGenesisIntro() {
  const { locale } = useI18n();
  const ar = locale === "ar";
  const reducedMotion = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);
  const [needsUnmute, setNeedsUnmute] = useState(false);
  const [showSkip, setShowSkip] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.sessionStorage.getItem(SEEN_KEY)) return;
    } catch { /* noop */ }
    if (reducedMotion) {
      try { window.sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* noop */ }
      return;
    }
    setMounted(true);
  }, [reducedMotion]);

  const dismiss = () => {
    try { window.sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* noop */ }
    const a = audioRef.current, v = videoRef.current;
    if (a) { try { a.pause(); } catch { /* noop */ } }
    if (v) { try { v.pause(); } catch { /* noop */ } }
    setFading(true);
    window.setTimeout(() => setGone(true), T_FADE);
  };

  useEffect(() => {
    if (!mounted) return;
    const a = audioRef.current;
    const v = videoRef.current;

    // Try unmuted audio autoplay; if blocked, offer one-tap unmute.
    const tryAudio = async () => {
      if (!a) return;
      a.volume = 0.9;
      a.muted = false;
      try { await a.play(); }
      catch {
        try { a.muted = true; await a.play(); setNeedsUnmute(true); }
        catch { setNeedsUnmute(true); }
      }
    };
    void tryAudio();
    if (v) { try { void v.play(); } catch { /* noop */ } }

    const skipT = window.setTimeout(() => setShowSkip(true), 1000);
    const capT = window.setTimeout(dismiss, T_MAX);
    timersRef.current.push(skipT, capT);
    const onEnded = () => dismiss();
    v?.addEventListener("ended", onEnded, { once: true });
    a?.addEventListener("ended", onEnded, { once: true });
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
      v?.removeEventListener("ended", onEnded);
      a?.removeEventListener("ended", onEnded);
    };
  }, [mounted]);

  const handleUnmute = () => {
    const a = audioRef.current;
    if (!a) return;
    try { a.muted = false; a.volume = 0.9; void a.play(); } catch { /* noop */ }
    setNeedsUnmute(false);
  };

  if (!mounted || gone) return null;

  return (
    <div
      className="nx-genesis"
      data-fading={fading ? "1" : "0"}
      role="dialog"
      aria-modal="true"
      aria-label="NEXIOS"
    >
      <video
        ref={videoRef}
        className="nx-genesis__video"
        src={heroVideo.url}
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden
      />
      <audio ref={audioRef} src={heroAudio.url} preload="auto" playsInline />

      {/* Vignette + gradient wash for readability */}
      <div className="nx-genesis__wash" aria-hidden />

      {/* Top descriptor */}
      <header className="nx-genesis__top" dir={ar ? "rtl" : "ltr"}>
        <div className="nx-genesis__brand">NEXIOS</div>
        <div className="nx-genesis__tagline">
          {ar
            ? "منصة إنجاز الأعمال التنفيذية · رؤية 2030"
            : "Executive Execution Platform · Vision 2030"}
        </div>
        <div className="nx-genesis__rule" aria-hidden />
      </header>

      {needsUnmute && (
        <button
          type="button"
          onClick={handleUnmute}
          className="nx-genesis__unmute"
          aria-label={ar ? "تشغيل الصوت" : "Enable sound"}
        >
          <span aria-hidden>🔊</span>
          <span>{ar ? "تشغيل الصوت" : "Tap for sound"}</span>
        </button>
      )}

      {showSkip && (
        <button
          type="button"
          onClick={dismiss}
          className="nx-genesis__skip"
          aria-label={ar ? "تخطي" : "Skip"}
        >
          {ar ? "تخطي" : "Skip"}
        </button>
      )}

      <style>{`
        .nx-genesis {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #04070F;
          overflow: hidden;
          transition: opacity ${T_FADE}ms ease;
          opacity: 1;
        }
        .nx-genesis[data-fading="1"] { opacity: 0; pointer-events: none; }
        .nx-genesis__video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }
        .nx-genesis__wash {
          position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(60% 40% at 50% 55%, transparent 0%, rgba(4,7,15,0.35) 70%, rgba(4,7,15,0.75) 100%),
            linear-gradient(180deg, rgba(4,7,15,0.55) 0%, transparent 22%, transparent 70%, rgba(4,7,15,0.7) 100%);
        }

        /* Top descriptor */
        .nx-genesis__top {
          position: absolute;
          top: calc(1.4rem + env(safe-area-inset-top));
          left: 0; right: 0;
          padding: 0 1.25rem;
          text-align: center;
          color: #eaf6ff;
          text-shadow: 0 2px 12px rgba(0,0,0,0.6);
          pointer-events: none;
        }
        .nx-genesis__brand {
          font-weight: 900;
          letter-spacing: 0.42em;
          font-size: 0.9rem;
          color: #eaf6ff;
        }
        .nx-genesis__tagline {
          margin-top: 0.55rem;
          font-size: 0.8rem;
          font-weight: 500;
          letter-spacing: 0.06em;
          color: rgba(220,235,250,0.88);
        }
        .nx-genesis__rule {
          margin: 0.85rem auto 0;
          width: 44px; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(58,232,255,0.75), transparent);
        }
        @media (min-width: 640px) {
          .nx-genesis__brand   { font-size: 1.1rem; letter-spacing: 0.5em; }
          .nx-genesis__tagline { font-size: 0.95rem; }
        }

        /* Unmute chip */
        .nx-genesis__unmute {
          position: absolute;
          left: 50%;
          bottom: calc(4.5rem + env(safe-area-inset-bottom));
          transform: translateX(-50%);
          appearance: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.55rem 1.1rem;
          border-radius: 9999px;
          border: 1px solid rgba(58,232,255,0.45);
          background: rgba(6,10,18,0.75);
          color: #eaf6ff;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.55), 0 0 24px rgba(58,232,255,0.28);
          animation: nxPulse 2.4s ease-in-out infinite;
        }
        @keyframes nxPulse {
          0%, 100% { box-shadow: 0 8px 30px rgba(0,0,0,0.55), 0 0 0 0 rgba(58,232,255,0.5); }
          50%      { box-shadow: 0 8px 30px rgba(0,0,0,0.55), 0 0 0 14px rgba(58,232,255,0); }
        }

        /* Skip */
        .nx-genesis__skip {
          position: absolute;
          bottom: calc(1.25rem + env(safe-area-inset-bottom));
          right: 1.25rem;
          appearance: none;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(10,14,20,0.55);
          color: rgba(240,245,255,0.9);
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          padding: 0.5rem 0.95rem;
          border-radius: 9999px;
          cursor: pointer;
          backdrop-filter: blur(8px);
          animation: nxFadeIn 300ms ease-out both;
        }
        .nx-genesis__skip:hover { background: rgba(20,26,36,0.75); border-color: rgba(255,255,255,0.4); }
        [dir="rtl"] .nx-genesis__skip { right: auto; left: 1.25rem; }
        @keyframes nxFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
