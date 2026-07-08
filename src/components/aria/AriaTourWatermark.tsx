/**
 * AriaTourWatermark — floating ARIA video at the BOTTOM-RIGHT of every page.
 *
 * Auto-plays the narration segment for the current route (from TOUR_CUES),
 * with ARIA's face clearly visible. Auto-hides when the segment ends.
 * No dismiss button — fully self-managed. Click to open the full tour.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
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
  const [finished, setFinished] = useState(false);
  const [muted, setMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const match = useMemo(() => cueForRoute(pathname), [pathname]);

  // Reset finished state on route change and seek/play.
  useEffect(() => {
    setFinished(false);
    const v = videoRef.current;
    if (!v) return;
    try {
      v.currentTime = match.cue.tSec + 0.05;
      v.muted = false;
      const p = v.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => {
          // Browser blocked audio autoplay — retry muted so the video is at least visible.
          v.muted = true;
          setMuted(true);
          v.play().catch(() => {});
        });
      }
    } catch {
      /* noop */
    }
  }, [match]);

  // Auto-hide when the cue segment ends.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      if (v.currentTime >= match.endSec - 0.1) {
        v.pause();
        setFinished(true);
      }
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [match]);

  if (introActive) return null;
  if (finished) return null;
  if (pathname.startsWith("/aria/tour")) return null;

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
            autoPlay
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
          {muted && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const v = videoRef.current;
                if (!v) return;
                v.muted = false;
                setMuted(false);
                v.play().catch(() => {});
              }}
              aria-label="تشغيل الصوت"
              className="absolute left-2 top-2 rounded-full border border-cyan-400/50 bg-[#061A2E]/80 px-2 py-0.5 text-[10px] font-medium text-cyan-100 hover:bg-cyan-500/20"
            >
              🔊 تشغيل الصوت
            </button>
          )}
        </div>
      </Link>
    </div>
  );
}
