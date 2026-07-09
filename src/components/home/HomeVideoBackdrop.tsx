/**
 * HomeVideoBackdrop — fullscreen looping video backdrop for the homepage.
 *
 * Audio policy: plays with SOUND exactly once per system session (first
 * time the homepage mounts after login). All subsequent mounts — including
 * returning to the homepage from any inner window — play MUTED. The
 * session flag lives in sessionStorage so it resets on a new browser
 * session / new login.
 */
import { useEffect, useRef, useState } from "react";
import homeBg from "@/assets/home-bg.mp4.asset.json";

const SESSION_KEY = "nexios-home-bg-sound-played";

export function HomeVideoBackdrop() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = videoRef.current;
    if (!v) return;

    let shouldPlaySound = false;
    try {
      shouldPlaySound = window.sessionStorage.getItem(SESSION_KEY) !== "1";
    } catch {
      shouldPlaySound = true;
    }

    const start = async () => {
      try {
        if (shouldPlaySound) {
          v.muted = false;
          v.volume = 1;
          setMuted(false);
          await v.play();
          try {
            window.sessionStorage.setItem(SESSION_KEY, "1");
          } catch {
            /* noop */
          }
        } else {
          v.muted = true;
          setMuted(true);
          await v.play();
        }
      } catch {
        // Autoplay-with-sound blocked → fall back to muted autoplay.
        try {
          v.muted = true;
          setMuted(true);
          await v.play();
        } catch {
          /* give up silently */
        }
      }
    };

    void start();
  }, []);

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
