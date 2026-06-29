/**
 * Mission Timeline — animated horizontal/vertical executive storytelling
 * stream. Reads real `enterprise_events` (narrated) via
 * `getMissionTimeline()`. Supports pause, severity filter, and replay.
 */
import { useMemo, useState } from "react";
import { Pause, Play, RefreshCw, Filter, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MissionTimelineEntry } from "@/lib/exec/bridge.functions";

type Severity = "all" | "info" | "warn" | "critical";

const TONE_DOT: Record<MissionTimelineEntry["tone"], string> = {
  info:     "bg-cyan-300",
  success:  "bg-emerald-300",
  warn:     "bg-amber-300",
  critical: "bg-rose-400",
};

const TONE_RING: Record<MissionTimelineEntry["tone"], string> = {
  info:     "ring-cyan-400/30 bg-cyan-400/5",
  success:  "ring-emerald-400/30 bg-emerald-400/5",
  warn:     "ring-amber-400/30 bg-amber-400/5",
  critical: "ring-rose-400/40 bg-rose-400/5",
};

interface Props {
  entries: MissionTimelineEntry[];
  ar: boolean;
  loading: boolean;
  onRefresh: () => void;
  paused: boolean;
  onTogglePause: () => void;
}

export function MissionTimeline({ entries, ar, loading, onRefresh, paused, onTogglePause }: Props) {
  const [severity, setSeverity] = useState<Severity>("all");

  const visible = useMemo(() => {
    if (severity === "all") return entries;
    return entries.filter((e) => {
      if (severity === "critical") return e.tone === "critical";
      if (severity === "warn") return e.tone === "warn" || e.tone === "critical";
      return e.tone === "info" || e.tone === "success";
    });
  }, [entries, severity]);

  return (
    <section className="rounded-3xl border border-cyan-400/15 bg-[#0A1E33]/70 p-4 backdrop-blur-xl">
      <header className="mb-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200/80">
          <Activity className="h-4 w-4" />
          {ar ? "خط زمني للمهمة" : "Mission Timeline"}
          <span className="text-white/30">·</span>
          <span className="tabular-nums text-white/60">{visible.length}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 text-[11px]">
            <Filter className="ml-1 h-3 w-3 text-white/40" />
            {(["all", "info", "warn", "critical"] as Severity[]).map((s) => (
              <button
                key={s}
                onClick={() => setSeverity(s)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 uppercase tracking-wider transition-colors",
                  severity === s ? "bg-cyan-400/20 text-cyan-100" : "text-white/50 hover:text-white",
                )}
              >
                {ar
                  ? { all: "الكل", info: "معلوماتي", warn: "تحذير", critical: "حرج" }[s]
                  : s}
              </button>
            ))}
          </div>

          <button
            onClick={onTogglePause}
            className="rounded-full border border-white/10 bg-white/[0.03] p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="pause/resume"
            title={paused ? (ar ? "استئناف" : "Resume") : (ar ? "إيقاف مؤقت" : "Pause")}
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={onRefresh}
            className="rounded-full border border-white/10 bg-white/[0.03] p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="refresh"
            title={ar ? "إعادة التحميل" : "Reload"}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
        </div>
      </header>

      {visible.length === 0 && !loading && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-sm text-white/50">
          {ar ? "لا توجد أحداث ضمن هذا الفلتر." : "No events match this filter."}
        </div>
      )}

      <div className="relative max-h-[280px] overflow-y-auto pr-1">
        <div
          aria-hidden
          className="pointer-events-none absolute left-3 top-1 bottom-1 w-px bg-gradient-to-b from-cyan-400/40 via-cyan-400/15 to-transparent"
        />
        <ul className="space-y-2">
          {visible.map((e) => (
            <li
              key={e.id}
              className={cn(
                "relative ml-1 rounded-2xl border border-transparent p-3 pl-8 ring-1 transition-colors",
                TONE_RING[e.tone],
                "animate-in fade-in slide-in-from-bottom-1 duration-300",
              )}
            >
              <span
                className={cn(
                  "absolute left-2 top-3.5 inline-block h-2.5 w-2.5 rounded-full ring-2 ring-[#0A1E33]",
                  TONE_DOT[e.tone],
                )}
              />
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-cyan-200/80">
                <span className="truncate">{ar ? e.agent_name_ar : e.agent_name_en}</span>
                <span className="text-white/30">·</span>
                <span className="truncate text-white/50">{ar ? e.action_ar : e.action_en}</span>
                <span className="ml-auto tabular-nums text-white/40">
                  {new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className={cn("mt-1 text-[13px] leading-snug text-white/85", ar && "text-right")}>
                {ar ? e.text_ar : e.text_en}
              </div>
              {(ar ? e.result_ar : e.result_en) && (
                <div className={cn("mt-0.5 text-[12px] leading-snug text-white/55", ar && "text-right")}>
                  {ar ? e.result_ar : e.result_en}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
