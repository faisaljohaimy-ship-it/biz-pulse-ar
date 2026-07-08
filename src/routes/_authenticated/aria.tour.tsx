/**
 * /aria/tour — Auto-Guided Executive Tour
 *
 * ARIA narrates the entire NEXIOS platform (32 windows). As her voice
 * describes each surface, the tour shell auto-navigates the embedded
 * viewport to that route in real time, so the window physically
 * "opens itself" at the exact moment she introduces it.
 *
 * Two panes:
 *   • Left  — draggable ARIA video (portrait, sticky, always on top)
 *   • Right — live iframe of the current NEXIOS route (same origin
 *     so the authenticated session, ARIA singleton, theme, and RTL
 *     all inherit from the parent)
 *
 * Sync engine: the video element is the master clock. On every
 * `timeupdate`, we resolve the active `TourCue`; when it changes,
 * we mutate the iframe's `src` — the browser preloads the next window
 * while ARIA is still finishing the current sentence.
 *
 * Operator controls: Space (play/pause), ← / → (prev / next chapter),
 * M (mark timestamp — logs a copy-paste-ready cue to console for
 * calibration).
 */
import { createFileRoute } from "@tanstack/react-router";
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";
import { useEffect, useRef, useState, useCallback } from "react";
import ariaTour from "@/assets/aria-tour-full-v2.mp4.asset.json";
import { TOUR_CUES, activeCue, nextCue, prevCue, type TourCue } from "@/lib/aria/tour-cues";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/aria/tour")({
  component: AriaTourPage,
  head: () => ({
    meta: [
      { title: "ARIA — جولة تنفيذية مباشرة" },
      {
        name: "description",
        content:
          "جولة تنفيذية ذاتية القيادة: ARIA تشرح المنصة وتفتح كل نافذة في وقتها الصحيح.",
      },
    ],
  }),
  errorComponent: ({ error, reset }) => (
    <RouteErrorBoundary error={error} reset={reset} routeLabel="/aria/tour" />
  ),
  notFoundComponent: () => (
    <div dir="rtl" className="p-6">
      الصفحة غير موجودة
    </div>
  ),
});

function AriaTourPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const prefetchRef = useRef<HTMLIFrameElement | null>(null);
  const navigate = useNavigate();

  const [current, setCurrent] = useState<TourCue>(TOUR_CUES[0]);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [now, setNow] = useState(0);
  // Window-opening moment: when a new cue fires, the ARIA video pops
  // to the foreground for `REVEAL_MS`, then quietly settles back to
  // its ambient corner state — mirroring "the window opens, ARIA
  // speaks over it, then steps aside."
  const [revealUntil, setRevealUntil] = useState<number>(() => Date.now() + 6000);
  const REVEAL_MS = 5200;

  // Silence any autoplaying audio/video/TTS inside the embedded route so
  // the ARIA narration is the ONLY voice the user hears.
  const silenceIframe = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    const doc = iframeRef.current?.contentDocument;
    if (!win || !doc) return;
    try {
      doc.querySelectorAll("audio,video").forEach((el) => {
        const m = el as HTMLMediaElement;
        m.muted = true;
        m.pause?.();
      });
      win.speechSynthesis?.cancel?.();
    } catch {
      /* cross-origin or detached — safe to ignore */
    }
  }, []);

  // === Sync engine ============================================
  const applyCue = useCallback(
    (cue: TourCue) => {
      setCurrent((prev) => {
        if (prev.route === cue.route) return prev;
        if (iframeRef.current) iframeRef.current.src = cue.route;
        setRevealUntil(Date.now() + REVEAL_MS);
        // Pre-warm the following window so it paints instantly.
        const upcoming = nextCue(cue.tSec);
        if (upcoming && prefetchRef.current) {
          prefetchRef.current.src = upcoming.route;
        }
        return cue;
      });
    },
    [],
  );

  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setNow(v.currentTime);
    applyCue(activeCue(v.currentTime));
  }, [applyCue]);

  // Keep a live "is the reveal window still open?" tick so the video
  // fades on schedule without needing a re-render loop.
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, []);
  const revealed = Date.now() < revealUntil;

  // === Keyboard controls ======================================
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;
      if (e.key === " ") {
        e.preventDefault();
        if (v.paused) v.play();
        else v.pause();
      } else if (e.key === "ArrowRight") {
        const n = nextCue(v.currentTime);
        if (n) v.currentTime = n.tSec + 0.05;
      } else if (e.key === "ArrowLeft") {
        const p = prevCue(v.currentTime);
        if (p) v.currentTime = p.tSec + 0.05;
      } else if (e.key.toLowerCase() === "m") {
        console.info(
          `[TOUR CUE] { tSec: ${v.currentTime.toFixed(1)}, route: "${current.route}", titleAr: "${current.titleAr}", titleEn: "${current.titleEn}" },`,
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current]);

  // === Autoplay attempt =======================================
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => setPlaying(false));
  }, []);


  const seekTo = (cue: TourCue) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = cue.tSec + 0.05;
    v.play();
  };

  const pct = duration > 0 ? Math.min(100, (now / duration) * 100) : 0;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-40 flex flex-col bg-[#040d1a] text-white"
    >
      {/* ── Top rail: chapter + progress ─────────────────────── */}
      <header className="flex items-center gap-4 border-b border-cyan-400/20 bg-[#061a2e]/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_10px_#00d4ff]" />
          <span className="text-xs font-medium tracking-wider text-cyan-300">
            ARIA · جولة تنفيذية مباشرة
          </span>
        </div>
        <div className="flex-1 truncate text-sm font-semibold text-white">
          {current.titleAr}
          <span className="mx-2 text-cyan-500/60">·</span>
          <span className="text-xs font-normal text-cyan-200/70">
            {current.route}
          </span>
        </div>
        <div className="text-[11px] tabular-nums text-cyan-200/60">
          {fmt(now)} / {fmt(duration)}
        </div>
        <button
          onClick={() => navigate({ to: "/os" })}
          className="rounded-md border border-cyan-400/30 p-1.5 text-cyan-200 hover:bg-cyan-500/10"
          aria-label="إنهاء الجولة"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* progress rail with chapter ticks */}
      <div className="relative h-1.5 w-full bg-cyan-950/60">
        <div
          className="absolute inset-y-0 right-0 bg-gradient-to-l from-cyan-400 to-cyan-500 shadow-[0_0_8px_#00d4ff]"
          style={{ width: `${pct}%` }}
        />
        {TOUR_CUES.map((c) => (
          <button
            key={`${c.tSec}-${c.route}`}
            onClick={() => seekTo(c)}
            title={`${c.titleAr} · ${c.route}`}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 h-3 w-0.5 hover:h-4 hover:w-1 transition-all",
              c.route === current.route
                ? "bg-cyan-200 shadow-[0_0_6px_#00d4ff]"
                : "bg-cyan-400/40",
            )}
            style={{ right: `${(c.tSec / (duration || 499)) * 100}%` }}
          />
        ))}
      </div>

      {/* ── Main stage ────────────────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">
        <iframe
          ref={iframeRef}
          src={current.route}
          title="NEXIOS tour viewport"
          className="h-full w-full border-0 bg-[#061a2e]"
          onLoad={silenceIframe}
        />
        {/* invisible pre-warm iframe: loads the NEXT cue's route so the
            following window paints instantly when ARIA reaches it. */}
        <iframe
          ref={prefetchRef}
          aria-hidden
          tabIndex={-1}
          title="prefetch"
          className="pointer-events-none absolute h-1 w-1 opacity-0"
        />

        {/* Floating ARIA video — links appearance to window opening:
            expands when a new cue fires, then quietly shrinks to a pill
            while the operator reads the freshly-opened surface. */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className={cn(
              "pointer-events-auto absolute bottom-6 left-6 overflow-hidden rounded-2xl border border-cyan-400/40 bg-black/60 shadow-[0_10px_40px_rgba(0,212,255,0.35)] backdrop-blur-xl transition-all duration-700 ease-out",
              revealed ? "w-[260px] opacity-100 scale-100" : "w-[140px] opacity-70 scale-95",
            )}
          >

            <video
              ref={videoRef}
              src={ariaTour.url}
              className="block aspect-[9/16] w-full object-cover"
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              playsInline
            />
            <div className="flex items-center justify-between gap-1 border-t border-cyan-400/20 bg-[#061a2e]/95 px-2 py-1.5">
              <button
                onClick={() => {
                  const p = prevCue(now);
                  if (p) seekTo(p);
                }}
                className="rounded p-1 text-cyan-200 hover:bg-cyan-500/10"
                aria-label="السابق"
              >
                <SkipForward className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  const v = videoRef.current;
                  if (!v) return;
                  if (v.paused) v.play();
                  else v.pause();
                }}
                className="rounded-full bg-cyan-500 p-1.5 text-[#061a2e] shadow-[0_0_12px_#00d4ff] hover:bg-cyan-400"
                aria-label={playing ? "إيقاف" : "تشغيل"}
              >
                {playing ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={() => {
                  const n = nextCue(now);
                  if (n) seekTo(n);
                }}
                className="rounded p-1 text-cyan-200 hover:bg-cyan-500/10"
                aria-label="التالي"
              >
                <SkipBack className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  const v = videoRef.current;
                  if (!v) return;
                  v.muted = !v.muted;
                  setMuted(v.muted);
                }}
                className="rounded p-1 text-cyan-200 hover:bg-cyan-500/10"
                aria-label={muted ? "تشغيل الصوت" : "كتم"}
              >
                {muted ? (
                  <VolumeX className="h-3.5 w-3.5" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Chapter chip (top-left over iframe) */}
          <div className="pointer-events-auto absolute top-6 right-6 max-w-sm rounded-xl border border-cyan-400/30 bg-[#061a2e]/85 px-4 py-2 text-right shadow-[0_6px_24px_rgba(0,212,255,0.25)] backdrop-blur">
            <div className="text-[10px] tracking-widest text-cyan-300/70">
              الفصل الحالي
            </div>
            <div className="text-sm font-bold text-white">{current.titleAr}</div>
            <div className="text-[10px] font-mono text-cyan-200/60">
              {current.titleEn} · {current.route}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fmt(s: number): string {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}
