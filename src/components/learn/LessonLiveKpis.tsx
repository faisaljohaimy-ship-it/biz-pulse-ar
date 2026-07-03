/**
 * LessonLiveKpis — executive KPI strip shown above the simulation for
 * Golden-Reference lessons. Bespoke per-lesson (each lesson passes its
 * own kpi set). Renders with the NEXUS luxury palette.
 */
import { cn } from "@/lib/utils";

export interface LiveKpi {
  label: string;
  value: string;
  hint?: string;
  tone?: "info" | "ok" | "warn" | "critical";
}

const TONE: Record<NonNullable<LiveKpi["tone"]>, string> = {
  info: "border-cyan-400/30 text-cyan-200",
  ok: "border-emerald-400/40 text-emerald-200",
  warn: "border-amber-400/40 text-amber-200",
  critical: "border-rose-400/40 text-rose-200",
};

export function LessonLiveKpis({ kpis }: { kpis: LiveKpi[] }) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      role="group"
      aria-label="Live executive KPIs"
    >
      {kpis.map((k) => (
        <div
          key={k.label}
          className={cn(
            "relative overflow-hidden rounded-2xl border bg-[#0A1E33]/60 p-4 backdrop-blur-xl",
            TONE[k.tone ?? "info"],
          )}
        >
          <div className="text-[10px] uppercase tracking-[0.2em] text-white/60">
            {k.label}
          </div>
          <div className="mt-1 font-mono text-2xl font-light text-white">{k.value}</div>
          {k.hint ? (
            <div className="mt-1 text-[11px] text-white/50">{k.hint}</div>
          ) : null}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-60"
          />
        </div>
      ))}
    </div>
  );
}
