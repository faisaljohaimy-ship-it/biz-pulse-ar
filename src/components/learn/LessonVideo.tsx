/**
 * LessonVideo — HTML5 cinematic video with progress tracking.
 * Persists watched seconds via updateProgress (debounced).
 */
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Play, Pause, Volume2, VolumeX, Maximize2, Loader2 } from "lucide-react";
import { updateProgress } from "@/lib/learn/lessons.functions";
import { cn } from "@/lib/utils";

interface Props {
  slug: string;
  src: string;
  lang: "ar" | "en";
  initialSeconds?: number;
  poster?: string | null;
}

export function LessonVideo({ slug, src, lang, initialSeconds = 0, poster }: Props) {
  const ar = lang === "ar";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(initialSeconds);
  const [loaded, setLoaded] = useState(false);
  const persist = useServerFn(updateProgress);
  const lastSavedRef = useRef(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = initialSeconds;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onTime() {
    const v = videoRef.current;
    if (!v) return;
    const t = Math.floor(v.currentTime);
    setCurrent(t);
    // Persist every 5s of watched progress.
    if (t - lastSavedRef.current >= 5) {
      lastSavedRef.current = t;
      persist({ data: { slug, video_watched_seconds: t } }).catch(() => {});
    }
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play(); else v.pause();
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  function goFullscreen() {
    const v = videoRef.current;
    if (!v) return;
    if (v.requestFullscreen) v.requestFullscreen().catch(() => {});
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${r}`;
  }

  const pct = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-cyan-400/15 bg-black shadow-[0_20px_80px_-30px_rgba(0,212,255,0.35)]">
      {!loaded && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-[#04111F]/70 text-cyan-200">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        className="aspect-video w-full"
        onLoadedMetadata={(e) => { setDuration(e.currentTarget.duration || 0); setLoaded(true); }}
        onTimeUpdate={onTime}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); persist({ data: { slug, video_watched_seconds: Math.floor(duration) } }).catch(() => {}); }}
        playsInline
        preload="metadata"
      />

      {/* HUD frame */}
      <div aria-hidden className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-cyan-400/10" />

      {/* Controls */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 text-white opacity-0 transition-opacity group-hover:opacity-100",
          !playing && "opacity-100",
        )}
        dir="ltr"
      >
        <button onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className="grid h-10 w-10 place-items-center rounded-full bg-cyan-400/20 ring-1 ring-cyan-400/50 backdrop-blur">
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <div className="flex-1">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
            <div className="h-full bg-cyan-300 transition-[width] duration-200" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] tabular-nums text-white/70">
            <span>{fmt(current)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
        <button onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur">
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button onClick={goFullscreen} aria-label={ar ? "ملء الشاشة" : "Fullscreen"} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 ring-1 ring-white/20 backdrop-blur">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {!playing && loaded && (
        <button
          onClick={togglePlay}
          aria-label={ar ? "تشغيل" : "Play"}
          className="absolute inset-0 grid place-items-center"
        >
          <span className="grid h-20 w-20 place-items-center rounded-full bg-cyan-400/25 ring-2 ring-cyan-300 backdrop-blur-md transition-transform hover:scale-110">
            <Play className="h-8 w-8 text-white" />
          </span>
        </button>
      )}
    </div>
  );
}
