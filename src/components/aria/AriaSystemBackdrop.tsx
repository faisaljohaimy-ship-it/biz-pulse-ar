import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Volume2, VolumeX } from "lucide-react";
import ariaStillAsset from "@/assets/aria-hologram.png.asset.json";

const KEY = "aria-sys-greeted";
const VOICE_KEY = "aria-voice-on";
const GREETING_SRC = "/aria-greeting.mp4";
const STILL_SRC = ariaStillAsset.url;

/**
 * AriaSystemBackdrop — fixed full-viewport ARIA presence layer.
 * Greeting video plays once per session (autoplay, muted by default).
 * `aria-sys-greeted` is set ONLY on `ended` — so failed attempts retry.
 * Unmute button (top-right, pointer-events on itself only) persists in
 * localStorage `aria-voice-on`.
 * Excluded on /promo/* routes.
 */
export function AriaSystemBackdrop() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [mode, setMode] = useState<"video" | "still">("still");
  const [voiceOn, setVoiceOn] = useState(false);
  // Mobile crash guard: on ≤768px viewports never load the greeting video or
  // the large hologram still — lightweight glow only. `null` = unknown yet.
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Init: decide mode + hydrate voice pref
  useEffect(() => {
    if (typeof window === "undefined" || isMobile !== false) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduced && sessionStorage.getItem(KEY) !== "1") setMode("video");
    try { setVoiceOn(localStorage.getItem(VOICE_KEY) === "1"); } catch { /* noop */ }
  }, [isMobile]);

  // Greeting playback lifecycle
  useEffect(() => {
    if (mode !== "video") return;
    const v = videoRef.current;
    if (!v) return;

    const onEnded = () => {
      try { sessionStorage.setItem(KEY, "1"); } catch { /* noop */ }
      setMode("still");
    };
    const onError = () => setMode("still"); // do NOT persist — retry next mount

    v.addEventListener("ended", onEnded);
    v.addEventListener("error", onError);

    // Fallback timeout — if media never becomes ready, fall back to still.
    const guard = setTimeout(() => { if (v.readyState < 2) setMode("still"); }, 5000);

    // Attempt autoplay (muted always at first — browsers block audible autoplay).
    v.muted = true;
    v.play().catch(() => {
      // Autoplay blocked entirely → wait for first user gesture, then try.
      const onGesture = () => {
        v.play().catch(() => { /* leave to timeout */ });
        document.removeEventListener("pointerdown", onGesture);
      };
      document.addEventListener("pointerdown", onGesture, { once: true });
    });

    // If user had voice on from a previous session, try unmute once playing.
    if (voiceOn) {
      const tryUnmute = () => { try { v.muted = false; } catch { /* noop */ } };
      v.addEventListener("playing", tryUnmute, { once: true });
    }

    return () => {
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("error", onError);
      clearTimeout(guard);
    };
  }, [mode, voiceOn]);

  // Zero-collision: mute greeting video when the AudioBus claims the channel
  // (tour narration or any ARIA voice). Restore previous state on release.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onClaim = () => {
      const v = videoRef.current;
      if (v) { try { v.muted = true; v.pause(); } catch { /* noop */ } }
    };
    const onRelease = () => {
      const v = videoRef.current;
      if (v && mode === "video") {
        try { v.muted = !voiceOn; v.play().catch(() => { /* noop */ }); } catch { /* noop */ }
      }
    };
    window.addEventListener("nexios:audio-claim", onClaim);
    window.addEventListener("nexios:audio-release", onRelease);
    return () => {
      window.removeEventListener("nexios:audio-claim", onClaim);
      window.removeEventListener("nexios:audio-release", onRelease);
    };
  }, [mode, voiceOn]);

  const toggleVoice = () => {
    const next = !voiceOn;
    setVoiceOn(next);
    try { localStorage.setItem(VOICE_KEY, next ? "1" : "0"); } catch { /* noop */ }
    try { localStorage.setItem("aria.voiceEnabled", String(next)); } catch { /* noop */ }
    const v = videoRef.current;
    if (v) {
      v.muted = !next;
      if (next) v.play().catch(() => { /* noop */ });
    }
  };

  if (pathname?.startsWith("/promo")) return null;

  const mediaClass =
    "absolute left-1/2 top-[8%] h-[92%] w-auto max-w-none -translate-x-1/2 " +
    "object-contain object-top opacity-80 select-none animate-aria-sys-breathe";

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Radial life-glow */}
        <div
          className="absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(0,212,255,0.22) 0%, rgba(58,232,255,0.08) 45%, transparent 75%)",
            filter: "blur(40px)",
          }}
        />

        {isMobile !== false ? null : mode === "video" ? (
          <video
            ref={videoRef}
            src={GREETING_SRC}
            poster={STILL_SRC}
            muted
            playsInline
            autoPlay
            preload="auto"
            className={mediaClass}
          />
        ) : (
          <img src={STILL_SRC} alt="" draggable={false} className={mediaClass} />
        )}

        {/* Readability scrims */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 50% 40%, rgba(4,7,15,0.55) 0%, rgba(4,7,15,0.82) 60%, rgba(4,7,15,0.94) 100%)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-[40%]"
          style={{
            background:
              "linear-gradient(180deg, transparent 0%, rgba(4,7,15,0.85) 70%, #04070F 100%)",
          }}
        />
      </div>

      {/* Unmute button — only interactive element in the backdrop layer (desktop only) */}
      {isMobile === false && (
        <button
          type="button"
          onClick={toggleVoice}
          aria-pressed={voiceOn}
          aria-label={voiceOn ? "Mute ARIA voice" : "Unmute ARIA voice"}
          className="pointer-events-auto fixed end-4 top-4 z-40 grid h-9 w-9 place-items-center rounded-full border border-cyan-400/40 bg-black/50 text-cyan-200 backdrop-blur-md transition hover:bg-black/70 hover:text-cyan-100"
        >
          {voiceOn ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
        </button>
      )}
    </>
  );
}

export default AriaSystemBackdrop;
