/**
 * Executive Briefing Stage — full-screen takeover that plays the
 * generated briefing in sequence with a spotlight on the current speaker.
 * ≤60s end-to-end, text-only narration (ARIA speaks ONLY in the copilot's
 * Conversation Mode). All segments come from `generateExecutiveBriefing()`
 * — never fabricated.
 */
import { useEffect, useState } from "react";
import { X, Pause, Play, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExecutiveBriefing, BriefingSegment } from "@/lib/exec/briefing.functions";

interface Props {
  briefing: ExecutiveBriefing;
  ar: boolean;
  onClose: () => void;
  /** Called when a segment becomes active so the bridge can spotlight the speaker. */
  onSegmentChange?: (segment: BriefingSegment | null) => void;
}

export function BriefingStage({ briefing, ar, onClose, onSegmentChange }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);

  // Tick.
  useEffect(() => {
    if (paused) return;
    const start = Date.now() - elapsed * 1000;
    const id = window.setInterval(() => {
      const next = (Date.now() - start) / 1000;
      if (next >= briefing.total_seconds + 4) {
        window.clearInterval(id);
        return;
      }
      setElapsed(next);
    }, 100);
    return () => window.clearInterval(id);
  }, [paused, briefing.total_seconds]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine active segment.
  const activeIndex =
    briefing.segments
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => elapsed >= s.at)
      .at(-1)?.i ?? 0;
  const active = briefing.segments[activeIndex];

  useEffect(() => {
    onSegmentChange?.(active ?? null);
  }, [activeIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = Math.min(100, (elapsed / briefing.total_seconds) * 100);
  const done = elapsed >= briefing.total_seconds;

  return (
    <div className="fixed inset-0 z-[120] bg-[#040E1C]/95 backdrop-blur-xl">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-cyan-400/10 px-6 py-4">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-cyan-300" />
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">
            {ar ? "الموجز التنفيذي الحي" : "Live Executive Briefing"}
          </div>
          <div className="text-xs text-white/40 tabular-nums">
            {Math.floor(elapsed)}s / {briefing.total_seconds}s
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaused((p) => !p)}
            className="rounded-full p-2 text-white/70 hover:bg-white/5 hover:text-white"
            aria-label="play/pause"
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/70 hover:bg-white/5 hover:text-white"
            aria-label="close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="h-1 w-full bg-white/5">
        <div
          className="h-1 bg-gradient-to-r from-cyan-300 to-emerald-300 transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stage */}
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 pt-12 pb-10">
        {/* Current speaker */}
        {active && !done && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="text-xs uppercase tracking-[0.22em] text-cyan-300/80">
              {active.speaker_name}
            </div>
            <h2
              className={cn(
                "max-w-3xl text-balance text-3xl font-light leading-[1.25] text-white sm:text-4xl",
                ar && "font-arabic",
              )}
              dir={ar ? "rtl" : "ltr"}
            >
              {ar ? active.text_ar : active.text_en}
            </h2>
            {active.badges && (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                {active.badges.map((b) => (
                  <div
                    key={b.label}
                    className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-5 py-3 backdrop-blur"
                  >
                    <div className="text-[10px] uppercase tracking-wider text-cyan-200/70">
                      {b.label}
                    </div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums text-white">
                      {b.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Final recommendation */}
        {done && (
          <div className="mx-auto max-w-3xl rounded-3xl border border-emerald-300/30 bg-gradient-to-br from-emerald-400/5 to-cyan-400/5 p-8 shadow-[0_0_60px_rgba(52,211,153,0.18)]">
            <div className="text-xs uppercase tracking-[0.22em] text-emerald-300/90">
              {ar ? "التوصية التنفيذية" : "Executive Recommendation"}
            </div>
            <h2
              className={cn(
                "mt-3 text-3xl font-light text-white sm:text-4xl",
                ar && "font-arabic text-right",
              )}
              dir={ar ? "rtl" : "ltr"}
            >
              {ar ? briefing.recommendation.title_ar : briefing.recommendation.title_en}
            </h2>
            <p
              className={cn(
                "mt-4 text-base leading-relaxed text-white/75",
                ar && "font-arabic text-right",
              )}
              dir={ar ? "rtl" : "ltr"}
            >
              {ar ? briefing.recommendation.rationale_ar : briefing.recommendation.rationale_en}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2">
                <div className="text-[10px] uppercase tracking-wider text-white/50">
                  {ar ? "الثقة" : "Confidence"}
                </div>
                <div className="text-xl font-semibold text-emerald-200 tabular-nums">
                  {Math.round(briefing.recommendation.confidence * 100)}%
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2">
                <div className="text-[10px] uppercase tracking-wider text-white/50">
                  {ar ? "الأفق" : "Horizon"}
                </div>
                <div className="text-xl font-semibold text-cyan-200 tabular-nums">
                  {briefing.recommendation.horizon_hours}h
                </div>
              </div>
              <button
                onClick={onClose}
                className="ml-auto inline-flex items-center gap-2 rounded-xl bg-cyan-400/90 px-5 py-3 text-sm font-semibold text-[#04111F] hover:bg-cyan-300"
              >
                {ar ? "العودة إلى الجسر" : "Return to Bridge"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Timeline strip */}
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2">
          {briefing.segments.map((s, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 w-12 rounded-full transition-colors",
                i < activeIndex
                  ? "bg-cyan-300/70"
                  : i === activeIndex
                    ? "bg-cyan-300 animate-pulse"
                    : "bg-white/10",
              )}
              title={`${s.speaker_name} · ${s.at}s`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
