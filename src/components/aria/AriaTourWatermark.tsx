/**
 * AriaTourWatermark — floating ARIA watermark at the BOTTOM-RIGHT of every page.
 *
 * Default state: a small pulsing ARIA icon ("اضغط للمتابعة"). No video is
 * mounted or played until the user taps the watermark. On tap, the narration
 * segment for the current route begins with sound. When the segment ends the
 * component collapses back to the icon so it can be replayed. Works on all
 * devices (phones/tablets/laptops) — playback starts from a user gesture so
 * mobile autoplay-with-sound restrictions do not apply.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Play, Sparkles } from "lucide-react";
import ariaTour from "@/assets/aria-tour-full-v2.mp4.asset.json";
import { TOUR_CUES, type TourCue } from "@/lib/aria/tour-cues";
import { useIntroActive } from "@/lib/intro-store";

function cueForRoute(pathname: string): { cue: TourCue; endSec: number } {
  let best: TourCue | null = null;
  let bestLen = -1;
  for (const c of TOUR_CUES) {
    if (pathname === c.route || pathname.startsWith(c.route + "/")) {
      if (c.route.length > bestLen) {
        best = c;
        bestLen = c.route.length;
      }
    }
  }
  const chosen = best ?? TOUR_CUES[0];
  const idx = TOUR_CUES.indexOf(chosen);
  const endSec = idx + 1 < TOUR_CUES.length ? TOUR_CUES[idx + 1].tSec : chosen.tSec + 20;
  return { cue: chosen, endSec };
}

export function AriaTourWatermark() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const introActive = useIntroActive();
  const [visible, setVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const match = useMemo(() => cueForRoute(pathname), [pathname]);

  // Re-show and restart on every route change (after leaving home).
  useEffect(() => {
    setVisible(true);
  }, [pathname]);

  // Auto-play the cue segment on mount / route change.
  useEffect(() => {
    if (!visible) return;
    const v = videoRef.current;
    if (!v) return;
    try {
      v.currentTime = match.cue.tSec + 0.05;
      v.muted = false;
      v.volume = 1;
      const p = v.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          // Mobile autoplay-with-sound blocked — fall back to muted.
          v.muted = true;
          v.play().catch(() => {});
        });
      }
    } catch {
      /* noop */
    }
  }, [visible, match]);

  // Auto-hide the video when the cue segment ends.
  useEffect(() => {
    if (!visible) return;
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      if (v.currentTime >= match.endSec - 0.1) {
        v.pause();
        setVisible(false);
      }
    };
    const onEnded = () => setVisible(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnded);
    };
  }, [visible, match]);

  if (introActive) return null;
  if (pathname.startsWith("/aria/tour")) return null;
  // Hide on the home/landing page — narration starts from the first window
  // opened AFTER the home page.
  if (pathname === "/") return null;
  if (!visible) return null;


  // Expanded state — narration video for the current route.
  return (
    <div
      dir="rtl"
      className="fixed bottom-3 right-3 z-[55] w-[150px] animate-fade-in overflow-hidden rounded-2xl border border-cyan-400/40 bg-[#061A2E]/90 shadow-[0_0_28px_rgba(0,212,255,0.35)] backdrop-blur-md sm:bottom-6 sm:right-6 sm:w-[240px]"
    >
      <Link
        to="/aria/tour"
        aria-label={`جولة مع آريا — ${match.cue.titleAr}`}
        title={`${match.cue.titleAr} · اضغط لفتح الجولة الكاملة`}
        className="group block"
      >
        <div className="relative aspect-[9/16] w-full bg-black">
          <video
            ref={videoRef}
            src={ariaTour.url}
            playsInline
            preload="auto"
            className="h-full w-full object-cover object-top"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#061A2E] to-transparent" />
          <span className="absolute right-2 top-2 rounded-full border border-cyan-400/50 bg-[#061A2E]/80 px-2 py-0.5 text-[10px] font-medium tracking-wide text-cyan-100">
            جولة آريا
          </span>
          <div className="absolute inset-x-2 bottom-2">
            <div className="truncate text-[11px] font-semibold text-cyan-100">
              {match.cue.titleAr}
            </div>
            <div className="truncate text-[9px] text-cyan-300/70">
              {match.cue.titleEn}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
