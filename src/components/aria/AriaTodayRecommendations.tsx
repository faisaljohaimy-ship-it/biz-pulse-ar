/**
 * AriaTodayRecommendations — proactive "توصيات آريا اليوم" strip (Phase 2 §3).
 *
 * Renders the three prioritized recommendations from `getTodayRecommendations`
 * (derived from the dashboard's own simulation fixtures) as tappable rows that
 * link to the REAL module to act on. Navy/emerald glassmorphism, full RTL,
 * ≥44px touch targets, and badged «محاكاة» because the figures are simulated.
 */
import { Link } from "@tanstack/react-router";
import { Sparkles, ChevronLeft, AlertTriangle, ShieldCheck, Camera } from "lucide-react";
import { getTodayRecommendations, type RecoTone } from "@/lib/aria/today-recommendations";
import { SimBadge } from "@/components/os/SimBadge";
import { cn } from "@/lib/utils";

const TONE_RING: Record<RecoTone, string> = {
  rose: "border-rose-400/40 bg-rose-400/[0.06] text-rose-200",
  amber: "border-amber-400/40 bg-amber-400/[0.06] text-amber-200",
  cyan: "border-[#3AE8FF]/40 bg-[#3AE8FF]/[0.06] text-[#BEEBFF]",
};
const TONE_ICON = {
  rose: AlertTriangle,
  amber: ShieldCheck,
  cyan: Camera,
} as const;

export function AriaTodayRecommendations({ className }: { className?: string }) {
  const recos = getTodayRecommendations();
  return (
    <section
      dir="rtl"
      aria-label="توصيات آريا اليوم"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[#3AE8FF]/18 bg-gradient-to-b from-[#0A1B33]/70 to-[#06101F]/70 p-4 backdrop-blur-md",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#3AE8FF]/12 text-[#3AE8FF]">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <h2 className="text-sm font-bold text-white">توصيات آريا اليوم</h2>
        </div>
        <SimBadge ar className="text-[9px]" />
      </div>
      <ul className="flex flex-col gap-2">
        {recos.map((r) => {
          const Icon = TONE_ICON[r.tone];
          return (
            <li key={r.id}>
              <Link
                to={r.to}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 text-[13px] leading-relaxed transition-all hover:brightness-125",
                  TONE_RING[r.tone],
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="flex-1 text-white/90">{r.textAr}</span>
                <ChevronLeft className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default AriaTodayRecommendations;
