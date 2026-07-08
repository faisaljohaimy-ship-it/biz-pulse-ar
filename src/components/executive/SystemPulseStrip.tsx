import type { PulseTone } from "@/lib/executive-presentation.functions";

const TONE_CLASS: Record<PulseTone, string> = {
  healthy:
    "bg-emerald-500/10 text-emerald-300 border-emerald-400/40 shadow-[0_0_16px_-4px_rgba(16,185,129,0.5)]",
  warning:
    "bg-amber-500/10 text-amber-300 border-amber-400/40 shadow-[0_0_16px_-4px_rgba(245,158,11,0.5)]",
  critical:
    "bg-rose-500/10 text-rose-300 border-rose-400/40 shadow-[0_0_16px_-4px_rgba(244,63,94,0.6)] animate-pulse",
  unknown: "bg-white/5 text-foreground/50 border-white/10",
};

const DOT_CLASS: Record<PulseTone, string> = {
  healthy: "bg-emerald-400",
  warning: "bg-amber-400",
  critical: "bg-rose-400",
  unknown: "bg-white/30",
};

export function SystemPulseStrip({
  chips,
  confidence,
}: {
  chips: {
    key: string;
    label_ar: string;
    label_en: string;
    status: PulseTone;
    value: string;
    detail: string;
  }[];
  confidence: number;
}) {
  return (
    <section className="rounded-xl border border-white/5 bg-background/40 backdrop-blur-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-primary/80">
            System Pulse · نبض المنظومة
          </div>
          <div className="text-sm text-foreground/60 mt-0.5">الحالة اللحظية لكل وحدات النظام</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono uppercase tracking-widest text-foreground/50">
            Confidence
          </div>
          <div
            className={`text-2xl font-bold tabular-nums ${confidence >= 85 ? "text-emerald-300" : confidence >= 60 ? "text-amber-300" : "text-rose-300"}`}
          >
            {confidence}%
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
        {chips.map((c) => (
          <div
            key={c.key}
            className={`rounded-lg border px-3 py-2 transition-all duration-300 ${TONE_CLASS[c.status]}`}
            title={c.detail}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider opacity-80 truncate">
                {c.label_en}
              </span>
              <span className={`w-1.5 h-1.5 rounded-full ${DOT_CLASS[c.status]}`} />
            </div>
            <div className="mt-1 text-lg font-bold tabular-nums leading-none">{c.value}</div>
            <div className="mt-1 text-[10px] font-mono opacity-70 truncate">{c.label_ar}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
