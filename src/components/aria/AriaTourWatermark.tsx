/**
 * AriaTourWatermark — floating video watermark at the TOP-RIGHT of every page.
 *
 * Plays the segment of the master ARIA tour narration that corresponds to
 * the current route (looked up via TOUR_CUES). Muted, looping within its
 * cue window, click to open the full /aria/tour experience.
 *
 * Separate from the chat button (which sits bottom-right).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { PlayCircle, X } from "lucide-react";
import ariaTour from "@/assets/aria-tour-full-v2.mp4.asset.json";
import { TOUR_CUES, type TourCue } from "@/lib/aria/tour-cues";
import { useIntroActive } from "@/lib/intro-store";

const DISMISS_KEY = "aria-tour-watermark-dismissed";

function cueForRoute(pathname: string): { cue: TourCue; endSec: number } | null {
  // Prefer the most-specific route match by longest prefix.
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
  if (!best) return null;
  const idx = TOUR_CUES.indexOf(best);
  const endSec = idx + 1 < TOUR_CUES.length ? TOUR_CUES[idx + 1].tSec : best.tSec + 20;
  return { cue: best, endSec };
}

export function AriaTourWatermark() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const introActive = useIntroActive();
  const [dismissed, setDismissed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  const match = useMemo(() => cueForRoute(pathname), [pathname]);

  // Seek to the current cue whenever the route changes.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !match) return;
    try {
      v.currentTime = match.cue.tSec + 0.05;
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch {
      /* noop */
    }
  }, [match]);

  // Loop within the cue window instead of playing the entire narration.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !match) return;
    const onTime = () => {
      if (v.currentTime >= match.endSec - 0.1) {
        v.currentTime = match.cue.tSec + 0.05;
      }
    };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, [match]);

  if (introActive) return null;
  if (dismissed) return null;
  if (pathname.startsWith("/aria/tour")) return null;
  if (!match) return null;

  return (
    <div
      dir="rtl"
      className="fixed right-4 top-20 z-[55] w-[260px] animate-fade-in overflow-hidden rounded-2xl border border-cyan-400/40 bg-[#061A2E]/85 shadow-[0_0_28px_rgba(0,212,255,0.35)] backdrop-blur-md"
    >
      <Link
        to="/aria/tour"
        aria-label={`جولة مع آريا — ${match.cue.titleAr}`}
        title={`${match.cue.titleAr} · اضغط لفتح الجولة الكاملة`}
        className="group block"
      >
        <div className="relative aspect-video w-full bg-black">
          <video
            ref={videoRef}
            src={ariaTour.url}
            muted
            playsInline
            autoPlay
            preload="metadata"
            className="h-full w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#061A2E]/90 via-transparent to-transparent" />
          <PlayCircle
            className="absolute inset-0 m-auto h-10 w-10 text-cyan-200 opacity-70 transition group-hover:scale-110 group-hover:opacity-100"
            aria-hidden
          />
          <span className="absolute left-2 top-2 rounded-full border border-cyan-400/50 bg-[#061A2E]/80 px-2 py-0.5 text-[10px] font-medium tracking-wide text-cyan-100">
            جولة آريا
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-cyan-100">
              {match.cue.titleAr}
            </div>
            <div className="truncate text-[10px] text-cyan-300/70">
              {match.cue.titleEn}
            </div>
          </div>
          <span className="shrink-0 rounded-md bg-cyan-500/15 px-1.5 py-0.5 text-[10px] text-cyan-200">
            افتح
          </span>
        </div>
      </Link>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          sessionStorage.setItem(DISMISS_KEY, "1");
          setDismissed(true);
        }}
        aria-label="إخفاء علامة الجولة"
        className="absolute left-1.5 top-1.5 rounded-full bg-black/50 p-1 text-cyan-100/80 transition hover:bg-black/80 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
