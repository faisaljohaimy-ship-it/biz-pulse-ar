import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";

export type TourStep = {
  title: string;
  body: string;
};

export function GuidedTour({
  steps,
  open,
  onClose,
  isAr,
}: {
  steps: TourStep[];
  open: boolean;
  onClose: () => void;
  isAr: boolean;
}) {
  const [i, setI] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => { if (open) setI(0); }, [open]);

  if (!mounted || !open) return null;
  const step = steps[i];
  const last = i === steps.length - 1;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg rounded-2xl border border-primary/40 bg-card p-6 shadow-glow">
        <button onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground" aria-label="Close">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-primary">
          <Sparkles className="h-3 w-3" />
          {isAr ? `الخطوة ${i + 1} من ${steps.length}` : `Step ${i + 1} of ${steps.length}`}
        </div>
        <h3 className="mt-2 text-xl font-bold text-foreground">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>

        <div className="mt-5 flex h-1 w-full overflow-hidden rounded-full bg-white/5">
          <div className="h-full bg-gradient-primary transition-all" style={{ width: `${((i + 1) / steps.length) * 100}%` }} />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            onClick={() => setI((n) => Math.max(0, n - 1))}
            disabled={i === 0}
            className="flex items-center gap-1 rounded-md border border-white/10 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            {isAr ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            {isAr ? "السابق" : "Back"}
          </button>
          <button
            onClick={() => (last ? onClose() : setI((n) => n + 1))}
            className="flex items-center gap-1.5 rounded-md bg-gradient-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow"
          >
            {last ? (isAr ? "إنهاء" : "Finish") : (isAr ? "التالي" : "Next")}
            {!last && (isAr ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />)}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
