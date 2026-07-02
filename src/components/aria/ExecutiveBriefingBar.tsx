/**
 * ExecutiveBriefingBar — additive, glass bottom-center HUD shown while a
 * synchronized briefing is playing. Renders portrait + live transcript
 * line + per-KPI progress dots + pause/skip/stop controls.
 *
 * Mount once (globally in __root or per page). Renders nothing when
 * inactive so it has zero cost outside of a briefing.
 */
import { useEffect, useState } from "react";
import { Pause, Play, SkipForward, X, Mic } from "lucide-react";
import { briefing, useBriefingState } from "@/lib/aria/executive-briefing-orchestrator";
import { useI18n } from "@/lib/i18n";
import ariaAvatar from "@/assets/aria-holo-executive.png";

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener?.("change", on);
    return () => mq.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

export function ExecutiveBriefingBar() {
  const s = useBriefingState();
  const { locale } = useI18n();
  const ar = locale === "ar";
  const reduced = usePrefersReducedMotion();
  const [replayVisible, setReplayVisible] = useState(false);

  // Show the "replay" chip for 8s after a natural completion.
  useEffect(() => {
    if (s.active) {
      setReplayVisible(false);
      return;
    }
    if (!s.transcript) return;
    setReplayVisible(true);
    const t = window.setTimeout(() => setReplayVisible(false), 8000);
    return () => window.clearTimeout(t);
  }, [s.active, s.transcript]);

  if (!s.active && !replayVisible) return null;

  if (!s.active && replayVisible) {
    return (
      <div
        dir={ar ? "rtl" : "ltr"}
        className="pointer-events-none fixed bottom-6 left-1/2 z-[2147480000] -translate-x-1/2"
      >
        <button
          type="button"
          onClick={() => setReplayVisible(false)}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[#3AE8FF]/40 bg-[#0a1520]/80 px-4 py-2 text-xs font-semibold text-white/90 shadow-[0_0_24px_rgba(58,232,255,0.25)] backdrop-blur-md hover:bg-[#0a1520]/95"
        >
          <span>{ar ? "إعادة الإحاطة ↺" : "Replay briefing ↺"}</span>
        </button>
      </div>
    );
  }

  const totalKpis = s.progressKpis.length;
  // Number of KPI segments already reached (segmentIndex counts all segments
  // including untagged preamble). Progress = kpis with index <= segmentIndex.
  let done = 0;
  // Walk the ordered KPI list; a KPI is "done" if the segment it belongs to
  // has an index <= current.
  // We don't have direct per-KPI indices — approximate by clamping.
  done = Math.min(totalKpis, Math.max(0, s.progressKpis.length && s.activeCard ? s.progressKpis.findIndex(() => false) + 1 : 0));
  // Simpler: count based on segmentIndex share.
  done = Math.min(
    totalKpis,
    Math.round(((s.segmentIndex + 1) / Math.max(1, s.totalSegments)) * totalKpis),
  );

  return (
    <div
      dir={ar ? "rtl" : "ltr"}
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-1/2 z-[2147480000] w-[min(96vw,720px)] -translate-x-1/2 sm:bottom-6"
    >
      <div
        className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-[#3AE8FF]/40 bg-[#050e18]/85 p-3 shadow-[0_10px_60px_rgba(0,212,255,0.35)] backdrop-blur-xl sm:p-4"
        style={{
          boxShadow:
            "0 10px 60px rgba(0,212,255,0.35), inset 0 0 0 1px rgba(255,255,255,0.06)",
        }}
      >
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-[#3AE8FF]/40 bg-black/40 sm:h-12 sm:w-12">
          <img
            src={ariaAvatar}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
            style={{
              filter: "drop-shadow(0 0 12px rgba(58,232,255,0.6))",
            }}
          />
          {!reduced && (
            <div
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{
                boxShadow: "0 0 0 2px rgba(58,232,255,0.4) inset",
                animation: "brf-pulse 1.6s ease-in-out infinite",
              }}
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Mic className="h-3 w-3 text-[#3AE8FF]" aria-hidden />
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#3AE8FF]/80">
              {ar ? "إحاطة تنفيذية" : "Executive Briefing"}
            </span>
            {s.paused && (
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300/80">
                {ar ? "· متوقفة" : "· Paused"}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-white/90 sm:text-base">
            {s.transcript || (ar ? "…جارٍ التحضير" : "Preparing…")}
          </p>
          {totalKpis > 0 && (
            <div
              className={`mt-1.5 flex items-center gap-1 ${ar ? "justify-end" : "justify-start"}`}
              aria-label={ar ? "تقدم المؤشرات" : "KPI progress"}
            >
              {Array.from({ length: totalKpis }).map((_, i) => (
                <span
                  key={i}
                  className="h-1.5 w-4 rounded-full transition-colors"
                  style={{
                    background:
                      i < done
                        ? "rgba(58,232,255,0.95)"
                        : "rgba(255,255,255,0.14)",
                    boxShadow:
                      i < done ? "0 0 8px rgba(58,232,255,0.7)" : undefined,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {s.paused ? (
            <button
              type="button"
              onClick={() => briefing.resume()}
              aria-label={ar ? "استئناف" : "Resume"}
              className="rounded-full border border-white/15 bg-white/5 p-2 text-white/85 hover:bg-white/10"
            >
              <Play className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => briefing.pause()}
              aria-label={ar ? "إيقاف مؤقت" : "Pause"}
              className="rounded-full border border-white/15 bg-white/5 p-2 text-white/85 hover:bg-white/10"
            >
              <Pause className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => briefing.skip()}
            aria-label={ar ? "المؤشر التالي" : "Next KPI"}
            className="rounded-full border border-white/15 bg-white/5 p-2 text-white/85 hover:bg-white/10"
          >
            <SkipForward className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => briefing.stop()}
            aria-label={ar ? "إيقاف" : "Stop"}
            className="rounded-full border border-rose-400/30 bg-rose-500/10 p-2 text-rose-200 hover:bg-rose-500/20"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes brf-pulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(58,232,255,0.4) inset; }
          50% { box-shadow: 0 0 0 3px rgba(58,232,255,0.8) inset; }
        }
      `}</style>
    </div>
  );
}

export default ExecutiveBriefingBar;
