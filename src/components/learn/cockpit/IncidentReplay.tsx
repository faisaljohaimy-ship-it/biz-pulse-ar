/**
 * IncidentReplay — scrubbable incident timeline for Golden-Reference lessons.
 *
 * Auto-plays through recorded frames of a past incident with a scrub bar
 * and status pill, so an executive can *see* how an event unfolded and
 * where ARIA intervened. Reusable via `cockpit-content.ts`.
 */
import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { CockpitReplayFrame } from "@/lib/learn/cockpit-content";
import { cn } from "@/lib/utils";

const STATUS: Record<CockpitReplayFrame["status"], string> = {
  ok: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  warn: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  critical: "border-rose-400/40 bg-rose-400/10 text-rose-200",
};

interface Props {
  title: string;
  frames: CockpitReplayFrame[];
  lang: "ar" | "en";
}

export function IncidentReplay({ title, frames, lang }: Props) {
  const ar = lang === "ar";
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setIdx((i) => {
        if (i >= frames.length - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 1400);
    return () => window.clearInterval(id);
  }, [playing, frames.length]);

  const current = frames[idx];
  if (!current) return null;

  return (
    <div className="space-y-3" dir={ar ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.18em] text-cyan-200/80">{title}</div>
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (idx >= frames.length - 1) setIdx(0);
              setPlaying((p) => !p);
            }}
            className="grid h-7 w-7 place-items-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-cyan-200 transition hover:bg-cyan-400/20"
            aria-label={playing ? (ar ? "إيقاف" : "Pause") : (ar ? "تشغيل" : "Play")}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => { setIdx(0); setPlaying(false); }}
            className="grid h-7 w-7 place-items-center rounded-full border border-white/15 bg-white/[0.04] text-white/70 transition hover:bg-white/10"
            aria-label={ar ? "إعادة" : "Restart"}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Scrub bar */}
      <div className="relative h-1.5 rounded-full bg-white/[0.06]">
        <div
          className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-cyan-400 to-cyan-300"
          style={{ width: `${((idx + 1) / frames.length) * 100}%` }}
        />
        <div className="absolute inset-0 flex items-center justify-between">
          {frames.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setIdx(i); setPlaying(false); }}
              className={cn(
                "h-3 w-3 rounded-full border transition",
                i <= idx
                  ? "border-cyan-300 bg-cyan-300"
                  : "border-white/25 bg-[#04111F] hover:border-cyan-300/60",
              )}
              aria-label={`Frame ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Current frame */}
      <div
        className={cn(
          "rounded-xl border p-3 text-sm transition-colors",
          STATUS[current.status],
        )}
      >
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-xs tabular-nums opacity-80">
            {ar ? current.label_ar : current.label_en}
          </span>
          <span className="text-[10px] uppercase tracking-[0.16em] opacity-70">
            {ar ? "الحالة" : "State"}
          </span>
        </div>
        <div className="mt-1 leading-relaxed">
          {ar ? current.detail_ar : current.detail_en}
        </div>
      </div>
    </div>
  );
}
