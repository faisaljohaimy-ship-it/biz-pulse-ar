import { useEffect, useRef, useState } from "react";
import heroVideo from "@/assets/hero-intro-video.mp4.asset.json";
import heroAudio from "@/assets/hero-intro-audio.mp3.asset.json";

/**
 * NEXIOS Hero Orb — inline cinematic hero for the homepage.
 * Renders the vertical blue-orb video with the narration audio
 * autoplaying (muted-fallback + one-tap unmute), and the bilingual
 * descriptor above it. Sits in the hero stack above the CTAs.
 */
export function NexiosHeroOrb({ ar }: { ar: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [needsUnmute, setNeedsUnmute] = useState(false);
  const [played, setPlayed] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    const a = audioRef.current;
    if (v) { try { void v.play(); } catch { /* noop */ } }
    const tryAudio = async () => {
      if (!a || played) return;
      a.volume = 0.9;
      a.muted = false;
      try { await a.play(); setPlayed(true); }
      catch {
        try { a.muted = true; await a.play(); setNeedsUnmute(true); }
        catch { setNeedsUnmute(true); }
      }
    };
    void tryAudio();

    // Fallback: unlock on first user interaction if browser blocked autoplay.
    const unlock = () => {
      const el = audioRef.current;
      if (!el) return;
      try { el.muted = false; el.volume = 0.9; void el.play(); setNeedsUnmute(false); setPlayed(true); } catch { /* noop */ }
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [played]);

  const handleUnmute = () => {
    const a = audioRef.current;
    if (!a) return;
    try { a.muted = false; a.volume = 0.9; void a.play(); } catch { /* noop */ }
    setNeedsUnmute(false);
    setPlayed(true);
  };

  return (
    <div className="nx-hero-orb relative mb-8 w-full" dir={ar ? "rtl" : "ltr"}>
      {/* Top descriptor */}
      <header className="nx-hero-orb__top">
        <div className="nx-hero-orb__brand">NEXIOS</div>
        <div className="nx-hero-orb__tagline">
          {ar
            ? "منصة إنجاز الأعمال التنفيذية · رؤية 2030"
            : "Executive Execution Platform · Vision 2030"}
        </div>
        <div className="nx-hero-orb__rule" aria-hidden />
      </header>

      {/* Orb video */}
      <div className="nx-hero-orb__stage">
        <video
          ref={videoRef}
          className="nx-hero-orb__video"
          src={heroVideo.url}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden
        />
        <audio ref={audioRef} src={heroAudio.url} preload="auto" playsInline />
        <div className="nx-hero-orb__wash" aria-hidden />

        {needsUnmute && (
          <button
            type="button"
            onClick={handleUnmute}
            className="nx-hero-orb__unmute"
            aria-label={ar ? "تشغيل الصوت" : "Enable sound"}
          >
            <span aria-hidden>🔊</span>
            <span>{ar ? "تشغيل الصوت" : "Tap for sound"}</span>
          </button>
        )}
      </div>

      <style>{`
        .nx-hero-orb__top {
          text-align: center;
          color: #eaf6ff;
          text-shadow: 0 2px 12px rgba(0,0,0,0.6);
          margin-bottom: 1.1rem;
        }
        .nx-hero-orb__brand {
          font-weight: 900;
          letter-spacing: 0.42em;
          font-size: 0.95rem;
          color: #eaf6ff;
        }
        .nx-hero-orb__tagline {
          margin-top: 0.5rem;
          font-size: 0.85rem;
          font-weight: 500;
          letter-spacing: 0.06em;
          color: rgba(220,235,250,0.9);
        }
        .nx-hero-orb__rule {
          margin: 0.75rem auto 0;
          width: 48px; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(58,232,255,0.75), transparent);
        }
        @media (min-width: 640px) {
          .nx-hero-orb__brand   { font-size: 1.15rem; letter-spacing: 0.5em; }
          .nx-hero-orb__tagline { font-size: 1rem; }
        }

        .nx-hero-orb__stage {
          position: relative;
          width: 100%;
          aspect-ratio: 9 / 12;
          max-height: 62svh;
          margin: 0 auto;
          border-radius: 18px;
          overflow: hidden;
          background: #04070F;
          box-shadow:
            0 0 60px rgba(0,140,255,0.28),
            0 0 120px rgba(255,90,20,0.18);
        }
        @media (min-width: 640px) {
          .nx-hero-orb__stage { aspect-ratio: 16 / 10; max-height: 58svh; }
        }
        .nx-hero-orb__video {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover; object-position: center;
        }
        .nx-hero-orb__wash {
          position: absolute; inset: 0; pointer-events: none;
          background:
            radial-gradient(65% 45% at 50% 55%, transparent 0%, rgba(4,7,15,0.30) 75%, rgba(4,7,15,0.65) 100%),
            linear-gradient(180deg, rgba(4,7,15,0.35) 0%, transparent 20%, transparent 75%, rgba(4,7,15,0.55) 100%);
        }
        .nx-hero-orb__unmute {
          position: absolute;
          left: 50%;
          bottom: 1rem;
          transform: translateX(-50%);
          appearance: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          border: 1px solid rgba(58,232,255,0.45);
          background: rgba(6,10,18,0.75);
          color: #eaf6ff;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.55), 0 0 24px rgba(58,232,255,0.28);
          animation: nxOrbPulse 2.4s ease-in-out infinite;
        }
        @keyframes nxOrbPulse {
          0%, 100% { box-shadow: 0 8px 30px rgba(0,0,0,0.55), 0 0 0 0 rgba(58,232,255,0.5); }
          50%      { box-shadow: 0 8px 30px rgba(0,0,0,0.55), 0 0 0 14px rgba(58,232,255,0); }
        }
      `}</style>
    </div>
  );
}
