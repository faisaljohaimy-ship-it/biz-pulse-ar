/**
 * MiniAriaHeroBadge — half-size ARIA presence inside the hero.
 *
 * Sits beneath the hero CTA after the welcome curtain dissolves, with a
 * single line — "بماذا يمكنني مساعدتك؟". Dismissable via the cyan orb;
 * pure presentation (no audio, no listeners — those live in AriaDock).
 */
import { useState } from "react";
import { Sparkles, X } from "lucide-react";

export function MiniAriaHeroBadge() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div
      dir="rtl"
      role="status"
      aria-label="آريا في الهيرو"
      className="relative z-20 mx-auto mt-4 flex w-[min(420px,calc(100vw-1.5rem))] items-center gap-3 rounded-2xl border border-[#3AE8FF]/40 bg-[#061A2E]/85 p-3 backdrop-blur-xl shadow-[0_0_30px_rgba(58,232,255,0.35)] animate-fade-in"
    >
      <style>{`
        @keyframes mab-core { 0%,100% { box-shadow: 0 0 18px rgba(58,232,255,0.55), inset 0 0 10px rgba(58,232,255,0.3); } 50% { box-shadow: 0 0 28px rgba(58,232,255,0.85), inset 0 0 14px rgba(58,232,255,0.45); } }
      `}</style>
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#3AE8FF]/60 bg-gradient-to-br from-[#00D4FF]/35 via-[#0a2a44] to-[#061A2E]"
        style={{ animation: "mab-core 3.2s ease-in-out infinite" }}
      >
        <Sparkles className="h-5 w-5 text-[#3AE8FF] drop-shadow-[0_0_6px_rgba(58,232,255,0.9)]" />
      </span>
      <div className="min-w-0 flex-1 text-right">
        <div className="text-[10px] uppercase tracking-[0.25em] text-[#3AE8FF]/75">ARIA</div>
        <div className="truncate text-sm font-medium text-white">بماذا يمكنني مساعدتك؟</div>
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="إغلاق آريا"
        title="إغلاق"
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#3AE8FF]/70 bg-gradient-to-br from-[#3AE8FF]/45 via-[#00D4FF]/25 to-[#061A2E] shadow-[0_0_18px_rgba(58,232,255,0.7),inset_0_0_10px_rgba(58,232,255,0.4)] transition hover:scale-110 hover:shadow-[0_0_28px_rgba(58,232,255,0.95)]"
      >
        <span aria-hidden className="absolute inset-1 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.85),rgba(58,232,255,0.05)_60%,transparent_72%)]" />
        <X className="relative h-3.5 w-3.5 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.9)]" />
      </button>
    </div>
  );
}
