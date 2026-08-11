/**
 * SadeedDailySummary — the 3-line executive summary atop the dashboard (Phase 5).
 * A concise, SADEED-voiced status read derived from the dashboard's own fixtures.
 * Navy/emerald glassmorphism, full RTL.
 */
import { Sparkles } from "lucide-react";
import { getDailySummary } from "@/lib/sadeed/today-summary";
import { cn } from "@/lib/utils";
import { SADEED_DISPLAY_NAME_AR, SADEED_DISPLAY_NAME_AR_PLAIN } from "@/lib/sadeed-core/branding";

export function SadeedDailySummary({ className }: { className?: string }) {
  const lines = getDailySummary();
  return (
    <section
      dir="rtl"
      aria-label={`ملخص ${SADEED_DISPLAY_NAME_AR_PLAIN} التنفيذي اليومي`}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-l from-[#06231c]/70 via-[#0A1B33]/70 to-[#06101F]/70 p-4 backdrop-blur-md",
        className,
      )}
    >
      {/* صفٌّ واحد بعد رفع شارة المحاكاة (٢٠٢٦/٠٨/١١): كان الصفّ الخارجي
          `justify-between` بطرفين — عنوانٌ وشارة. وبقاء الغلاف بطرفٍ واحد
          يترك `justify-between` بلا معنى و`div` وسيطًا بلا وظيفة، فدُمج
          الصفّان في صفّ العنوان وحده. */}
      <div className="mb-2.5 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-400/12 text-emerald-300">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <h2 className="text-sm font-bold text-white">
          {`ملخص ${SADEED_DISPLAY_NAME_AR} التنفيذي — اليوم`}
        </h2>
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

export default SadeedDailySummary;
