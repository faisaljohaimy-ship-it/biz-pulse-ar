/**
 * DecisionTimeline — executive decision ledger for Golden-Reference lessons.
 *
 * Renders a compact vertical timeline of the key decisions made during
 * an incident/scenario, colour-coded by tone. Reusable across every
 * lesson via `cockpit-content.ts`.
 */
import type { CockpitDecisionEvent } from "@/lib/learn/cockpit-content";
import { cn } from "@/lib/utils";

const TONE: Record<CockpitDecisionEvent["tone"], string> = {
  info: "bg-cyan-400/15 text-cyan-200 ring-cyan-400/40",
  ok: "bg-emerald-400/15 text-emerald-200 ring-emerald-400/40",
  warn: "bg-amber-400/15 text-amber-200 ring-amber-400/40",
  critical: "bg-rose-400/15 text-rose-200 ring-rose-400/40",
};

interface Props {
  events: CockpitDecisionEvent[];
  lang: "ar" | "en";
}

export function DecisionTimeline({ events, lang }: Props) {
  const ar = lang === "ar";
  return (
    <ol className="relative space-y-4 ps-6" dir={ar ? "rtl" : "ltr"}>
      <span
        aria-hidden
        className="absolute inset-y-1 start-2 w-px bg-gradient-to-b from-cyan-400/40 via-cyan-400/20 to-transparent"
      />
      {events.map((e, i) => (
        <li key={i} className="relative">
          <span
            aria-hidden
            className={cn(
              "absolute start-[-6px] top-1 grid h-4 w-4 place-items-center rounded-full ring-1",
              TONE[e.tone],
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
          </span>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-[11px] tabular-nums text-cyan-300/80">{e.t}</span>
            <span className="text-xs uppercase tracking-[0.14em] text-white/60">
              {ar ? e.actor_ar : e.actor_en}
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-white/85">
            {ar ? e.decision_ar : e.decision_en}
          </p>
        </li>
      ))}
    </ol>
  );
}
