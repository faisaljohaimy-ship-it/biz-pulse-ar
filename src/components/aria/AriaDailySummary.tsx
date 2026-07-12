/**
 * AriaDailySummary — the 3-line executive summary atop the dashboard (Phase 5).
 * A concise, ARIA-voiced status read derived from the dashboard's own fixtures.
 * Navy/emerald glassmorphism, full RTL, badged «محاكاة».
 */
import { Sparkles } from "lucide-react";
import { getDailySummary } from "@/lib/aria/today-summary";
import { SimBadge } from "@/components/os/SimBadge";
import { cn } from "@/lib/utils";

export function AriaDailySummary({ className }: { className?: string }) {
  const lines = getDailySummary();
  return (
    <section
      dir="rtl"
      aria-label="ملخص آريا التنفيذي اليومي"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-l from-[#06231c]/70 via-[#0A1B33]/70 to-[#06101F]/70 p-4 backdrop-blur-md",
        className,
      )}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-400/12 text-emerald-300">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <h2 className="text-sm font-bold text-white">ملخص آريا التنفيذي — اليوم</h2>
        </div>
        <SimBadge ar className="text-[9px]" />
      </div>
      <ol className="space-y-1.5 pr-1">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-white/85">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-300" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default AriaDailySummary;
