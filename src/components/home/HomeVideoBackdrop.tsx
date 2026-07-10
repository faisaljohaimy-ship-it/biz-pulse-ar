/**
 * HomeVideoBackdrop — fullscreen looping video backdrop for the homepage.
 *
 * Voice policy: ARIA speaks AUTOMATICALLY on every homepage entry. Her
 * voice is the video's own audio track, so speech and motion start on the
 * same frame (restarted from t=0 together — frame-accurate sync). When she
 * finishes speaking (first full playthrough ends) the voice stops for good
 * and only the silent motion loop remains.
 *
 * Coordination:
 *  - never talks over the WelcomeThenGenesis intro — the voice waits until
 *    the intro is fully complete (motion runs muted underneath meanwhile);
 *  - owns the AriaAudioBus "hero-soundtrack" channel while speaking, so any
 *    higher-priority ARIA voice (panel greeting / chat reply) preempts and
 *    mutes it instantly — one voice at a time, always;
 *  - if the browser refuses unmuted autoplay (no gesture yet), the first
 *    pointer/key gesture retries the voice automatically — no button.
 */
import { useEffect, useRef, useState } from "react";
import homeBg from "@/assets/home-bg.mp4.asset.json";
import { useIntroActive } from "@/lib/intro-store";
import { AriaAudioBus } from "@/lib/aria/audio-bus";
import { INTRO_SESSION_KEY, INTRO_COMPLETE_VALUE } from "@/components/cinematic/WelcomeThenGenesis";

export function HomeVideoBackdrop() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const introActive = useIntroActive();
  // Latched when the greeting ends (or a higher-priority voice takes over).
  // The voice must never restart within this mount — motion only.
  const doneSpeakingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = videoRef.current;
    if (!v) return;

    // Is the welcome intro on screen, or about to mount this session?
    let introPending = introActive;
    if (!introPending) {
      try {
        introPending = window.sessionStorage.getItem(INTRO_SESSION_KEY) !== INTRO_COMPLETE_VALUE;
      } catch {
        introPending = false;
      }
    }

    let cancelled = false;

    const silentLoop = () => {
      v.muted = true;
      v.loop = true;
      setMuted(true);
      void v.play().catch(() => {});
    };

    const onVoiceEnded = () => {
      // She finished speaking — stop the voice, keep the motion looping.
      doneSpeakingRef.current = true;
      AriaAudioBus.release("hero-soundtrack");
      silentLoop();
    };

    // Start voice + motion together from frame zero.
    const startSpeaking = async (viaGesture: boolean): Promise<boolean> => {
      if (cancelled || doneSpeakingRef.current) return false;
      if (viaGesture) AriaAudioBus.unlock();
      const granted = AriaAudioBus.acquire(
        "hero-soundtrack",
        () => {
          // Preempted by a higher-priority ARIA voice — yield for good.
          doneSpeakingRef.current = true;
          silentLoop();
        },
        viaGesture ? undefined : { bypassGesture: true },
      );
      if (!granted) return false;
      try {
        v.loop = false; // `ended` marks the exact end of her speech
        v.currentTime = 0; // voice and motion begin together
        v.muted = false;
        v.volume = 1;
        setMuted(false);
        await v.play();
        AriaAudioBus.notifyPlaying("hero-soundtrack", v);
        return true;
      } catch {
        // Unmuted autoplay refused by the browser.
        AriaAudioBus.release("hero-soundtrack");
        return false;
      }
    };

    if (introPending) {
      // Intro owns the audio stage — run the motion muted. When the intro
      // completes, introActive flips and this effect re-runs to speak.
      silentLoop();
      return () => {
        cancelled = true;
      };
    }

    v.addEventListener("ended", onVoiceEnded);

    const onFirstGesture = () => {
      void startSpeaking(true).then((ok) => {
        if (!ok && !cancelled && !doneSpeakingRef.current) silentLoop();
      });
    };

    void startSpeaking(false).then((ok) => {
      if (ok || cancelled || doneSpeakingRef.current) return;
      // Blocked before any user gesture — keep the motion running and arm a
      // one-shot retry so the voice still starts by itself on first touch.
      silentLoop();
      window.addEventListener("pointerdown", onFirstGesture, { once: true });
      window.addEventListener("keydown", onFirstGesture, { once: true });
    });

    return () => {
      cancelled = true;
      v.removeEventListener("ended", onVoiceEnded);
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
      AriaAudioBus.release("hero-soundtrack");
    };
  }, [introActive]);

  return (
    <div
      aria-hidden="true"
      dir="ltr"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#04070F]"
    >
      <video
        ref={videoRef}
        src={homeBg.url}
        autoPlay
        loop
        playsInline
        muted={muted}
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover object-[center_25%]"
      />
      {/* Readability scrims */}
      <div
        className="absolute inset-x-0 top-0 h-[18%] md:h-[10%]"
        style={{
          background:
            "linear-gradient(180deg, rgba(4,7,15,0.55) 0%, rgba(4,7,15,0.1) 70%, transparent 100%)",
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-[46%] md:h-[24%]"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(4,7,15,0.45) 55%, rgba(4,7,15,0.88) 100%)",
        }}
      />
    </div>
  );
}

export default HomeVideoBackdrop;
