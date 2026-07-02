import { Sparkles } from "lucide-react";

/**
 * DemoDataBadge — small glass chip announcing simulated data on public sections.
 * Caller decides when to render (unauthenticated only).
 */
export function DemoDataBadge({ className = "" }: { className?: string }) {
  return (
    <span
      role="note"
      aria-label="Demo data"
      className={
        "inline-flex items-center gap-1.5 rounded-full border border-white/12 " +
        "bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium text-white/60 " +
        "backdrop-blur-md " + className
      }
      style={{ letterSpacing: "0.02em" }}
    >
      <Sparkles className="h-3 w-3 text-[color:var(--nx-cyan-2,#3AE8FF)]/70" aria-hidden />
      <span dir="rtl">بيانات عرض توضيحي</span>
      <span aria-hidden className="text-white/25">·</span>
      <span>Demo Data</span>
    </span>
  );
}

export default DemoDataBadge;
