/**
 * HomeVideoBackdrop — fullscreen video backdrop for the homepage.
 *
 * Voice + motion policy: NOTHING plays automatically. The video (which
 * carries ARIA's voice on its own audio track) stays frozen on its first
 * frame until the user presses the greeting button. On press, voice and
 * motion start together from frame zero — same media element, so they are
 * frame-accurately in sync. The moment she finishes speaking (the video
 * ends) both the voice AND the motion stop, frozen back on the first
 * frame. No loop, no idle movement, no repetition.
 *
 * The greeting button talks to this component through home-greeting-store
 * (registerHomeGreeting / startHomeGreeting / stopHomeGreeting).
 *
 * While speaking, the video owns the AriaAudioBus "hero-soundtrack"
 * channel, so any higher-priority ARIA voice (panel greeting / chat reply)
 * preempts it and the greeting stops instantly — one voice at a time.
 */
import { useEffect, useRef, useState } from "react";
import homeBg from "@/assets/home-bg.mp4.asset.json";
import homeToroid from "@/assets/nexios-home-toroid.png.asset.json";
import { AriaAudioBus } from "@/lib/aria/audio-bus";
import { registerHomeGreeting, setHomeGreetingState } from "@/lib/home-greeting-store";

export function HomeVideoBackdrop() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = videoRef.current;
    if (!v) return;

    // Freeze the greeting: voice off, motion off, back to the first frame.
    const freeze = () => {
      try {
        v.pause();
      } catch {
        /* ignore */
      }
      v.muted = true;
      setActive(false);
      try {
        v.currentTime = 0;
      } catch {
        /* metadata not ready yet — first frame is where we already are */
      }
      setMuted(true);
      setHomeGreetingState("idle");
    };

    const stopGreeting = () => {
      AriaAudioBus.release("hero-soundtrack");
      freeze();
    };

    // She finished speaking — voice and motion stop together.
    const onEnded = () => stopGreeting();

    // Button press (a real user gesture): voice + motion from frame zero.
    const startGreeting = () => {
      AriaAudioBus.unlock();
      const granted = AriaAudioBus.acquire("hero-soundtrack", freeze);
      if (!granted) return;
      try {
        v.currentTime = 0;
      } catch {
        /* ignore */
      }
      v.loop = false;
      v.muted = false;
      v.volume = 1;
      setMuted(false);
      v.play()
        .then(() => {
          setActive(true);
          AriaAudioBus.notifyPlaying("hero-soundtrack", v);
          setHomeGreetingState("speaking");
        })
        .catch(() => {
          stopGreeting();
        });
    };

    v.addEventListener("ended", onEnded);
    const unregister = registerHomeGreeting({ start: startGreeting, stop: stopGreeting });

    return () => {
      v.removeEventListener("ended", onEnded);
      unregister();
      AriaAudioBus.release("hero-soundtrack");
      try {
        v.pause();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      dir="ltr"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#04070F]"
    >
      {/* Permanent homepage backdrop: the cinematic NEXIOS toroid over the
          Saudi command plateau. Object-cover keeps the toroid centred from
          360px phones through 4K wall displays. */}
      <img
        src={homeToroid.url}
        alt=""
        fetchPriority="high"
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover object-center"
      />

      {/* ARIA's greeting film temporarily cross-fades above the artwork only
          after an explicit user gesture, then yields back to the image. */}
      <video
        ref={videoRef}
        src={homeBg.url}
        playsInline
        muted={muted}
        preload="metadata"
        className={`absolute inset-0 h-full w-full object-cover object-[center_25%] transition-opacity duration-700 ${active ? "opacity-100" : "opacity-0"}`}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,8,18,0.34)_0%,rgba(2,8,18,0.12)_34%,rgba(2,8,18,0.5)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(0,212,255,0.08),transparent_42%)]" />
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
