/**
 * AriaWelcomeVideo — the SINGLE pre-system intro. Full-screen ARIA welcome
 * clip that plays once per browser session, then crossfades to the app.
 *
 * Contract:
 *   • Full-screen dark backdrop (#04111f), object-fit: cover with
 *     object-position: top center so ARIA's face is never cropped.
 *   • Attempts autoplay with sound after any prior user interaction; if
 *     the browser blocks it, shows a "دخول" button that starts playback
 *     with sound on click.
 *   • prefers-reduced-motion: no autoplay, static first-frame + "دخول" button.
 *   • Skip button (تخطّي) always visible → jumps straight to the app.
 *   • Clean pause + unmount on exit (no double-audio).
 *   • Crossfade (~0.6s) to next stage via parent-controlled opacity.
 *   • Calls setIntroActive(true/false) on the intro-store so the rest of
 *     the shell hides while playing.
 */
import { useEffect, useRef, useState } from "react";
import welcomeAsset from "@/assets/aria-welcome.mp4.asset.json";
import { setIntroActive } from "@/lib/intro-store";

interface Props {
  onDone: () => void;
}

const FADE_MS = 600;

export function AriaWelcomeVideo({ onDone }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [visible, setVisible] = useState(true);
  const [needsGesture, setNeedsGesture] = useState(false);
  const finishedRef = useRef(false);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const v = videoRef.current;
    try { v?.pause(); } catch { /* ignore */ }
    if (v) { try { v.removeAttribute("src"); v.load(); } catch { /* ignore */ } }
    setVisible(false);
    window.setTimeout(() => {
      setIntroActive(false);
      onDone();
    }, FADE_MS);
  };

  useEffect(() => {
    setIntroActive(true);
    try { window.sessionStorage.setItem("nexios-welcome", "1"); } catch { /* ignore */ }

    const reduced = (() => {
      try { return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false; }
      catch { return false; }
    })();

    const v = videoRef.current;
    if (!v) {
      return () => { setIntroActive(false); };
    }
    v.muted = false;
    v.volume = 1;

    if (reduced) {
      setNeedsGesture(true);
    } else {
      const p = v.play();
      if (p && typeof p.then === "function") {
        p.catch(() => setNeedsGesture(true));
      }
    }

    return () => {
      try { v.pause(); } catch { /* ignore */ }
      setIntroActive(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startWithSound = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      v.muted = false;
      v.volume = 1;
      await v.play();
      setNeedsGesture(false);
    } catch {
      setNeedsGesture(true);
    }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[120] flex items-center justify-center"
      style={{
        background: "#04111f",
        colorScheme: "dark",
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: visible ? "auto" : "none",
      }}
      aria-label="ترحيب آريا"
    >
      <video
        ref={videoRef}
        src={welcomeAsset.url}
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
        className="h-full w-full"
        style={{
          objectFit: "cover",
          objectPosition: "top center",
          background: "#04111f",
        }}
      />

      {/* subtle vignette so text/buttons remain readable */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 20%, transparent 55%, rgba(4,17,31,0.55) 100%)",
        }}
      />

      {/* Enter-with-sound button (shown when autoplay blocked or reduced-motion) */}
      {needsGesture && (
        <button
          type="button"
          onClick={startWithSound}
          className="absolute inset-0 z-10 flex items-center justify-center bg-[#04111f]/60 text-white backdrop-blur-sm"
        >
          <span className="rounded-full border border-emerald-400/60 bg-emerald-400/15 px-8 py-4 text-lg font-semibold shadow-[0_0_32px_rgba(52,211,153,0.35)] transition hover:bg-emerald-400/25">
            دخول
          </span>
        </button>
      )}

      {/* Skip */}
      <button
        type="button"
        onClick={finish}
        className="absolute bottom-6 left-6 z-20 rounded-full border border-white/25 bg-black/40 px-4 py-2 text-xs font-medium text-white/85 backdrop-blur transition hover:bg-black/60 sm:text-sm"
      >
        تخطّي
      </button>
    </div>
  );
}

export default AriaWelcomeVideo;
