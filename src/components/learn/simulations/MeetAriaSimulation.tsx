/** Guided learning simulation backed by the singleton ARIA conversation. */
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, PlayCircle, ShieldCheck, Sparkles } from "lucide-react";
import { useAria } from "@/lib/aria-core/hooks/useAria";
import { updateProgress } from "@/lib/learn/lessons.functions";
import type { Bilingual } from "@/lib/learn/types";
import { cn } from "@/lib/utils";

interface Props {
  slug: string;
  lang: "ar" | "en";
  suggested: Bilingual[];
  onCompleted?: () => void;
}

export function MeetAriaSimulation({ slug, lang, suggested, onCompleted }: Props) {
  const ar = lang === "ar";
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [chosen, setChosen] = useState<string | null>(null);
  const requestedAt = useRef(0);
  const persist = useServerFn(updateProgress);
  const { open, activeTurn } = useAria();

  useEffect(() => {
    if (step !== 2 || !activeTurn || requestedAt.current === 0) return;
    const startedAt = Date.parse(activeTurn.startedAt);
    const belongsToSimulation =
      Number.isFinite(startedAt) && startedAt >= requestedAt.current - 750;
    if (
      belongsToSimulation &&
      (activeTurn.status === "completed" || activeTurn.status === "failed")
    ) {
      setStep(3);
    }
  }, [activeTurn, step]);

  function ask(text: string) {
    setChosen(text);
    requestedAt.current = Date.now();
    setStep(2);
    const prompt = ar
      ? `[محاكاة تعليمية — الدرس: ${slug}] اشرح استدلالك التنفيذي بوضوح لهذا السؤال: ${text}`
      : `[Learning simulation — lesson: ${slug}] Explain your executive reasoning clearly for this question: ${text}`;
    open({ send: prompt, focus: false });
  }

  async function complete() {
    await persist({ data: { slug, simulation_completed: true } });
    onCompleted?.();
  }

  return (
    <div className="space-y-5" dir={ar ? "rtl" : "ltr"}>
      <ExecutiveStepper step={step} ar={ar} />

      {step === 1 && (
        <div className="space-y-4">
          <div className="text-sm text-white/70">
            {ar
              ? "اختر سؤالاً تنفيذياً؛ ستفتحه آريا في محادثتها الرسمية مع الاحتفاظ بذاكرتها وصوتها الواحد."
              : "Choose an executive question; ARIA will open it in her official conversation with one persistent memory and voice."}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {suggested.map((suggestion, index) => {
              const text = ar ? suggestion.ar : suggestion.en;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => ask(text)}
                  className="group flex items-start gap-3 rounded-2xl border border-cyan-400/20 bg-white/[0.02] p-4 text-start transition-all hover:border-cyan-400/50 hover:bg-cyan-400/[0.06]"
                >
                  <PlayCircle className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300 transition-transform group-hover:scale-110" />
                  <span className="text-sm text-white/90">{text}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(step === 2 || step === 3) && chosen && (
        <div className="rounded-2xl border border-cyan-400/20 bg-[#04111F]/70 p-5">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200/70">
            <Sparkles className="h-4 w-4" />
            {ar ? "المحادثة الرسمية" : "Official conversation"}
          </div>
          <p className="mt-3 text-sm text-white/90">{chosen}</p>
          <div className="mt-4 flex items-center gap-2 text-xs text-white/60">
            {step === 2 ? (
              <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
            )}
            {step === 2
              ? ar
                ? "آريا تعالج السؤال في نافذتها الموحدة…"
                : "ARIA is processing in her unified panel…"
              : ar
                ? "اكتملت الجولة عبر ذاكرة آريا وصوتها الرسمي."
                : "The turn completed through ARIA's official memory and voice."}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] p-4">
          <div className="text-sm text-white/90">
            {ar
              ? "اكتملت تجربة آريا الموحّدة. سجّل تقدمك في الحصة."
              : "You completed the unified ARIA experience. Record your lesson progress."}
          </div>
          <button
            type="button"
            onClick={complete}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-[#04111F]",
              "transition-transform hover:scale-[1.02]",
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            {ar ? "أكملت المحاكاة" : "Mark complete"}
          </button>
        </div>
      )}
    </div>
  );
}

function ExecutiveStepper({ step, ar }: { step: 1 | 2 | 3; ar: boolean }) {
  const labels = ar
    ? ["اختر سؤالاً", "شاهد آريا الرسمية", "أكمل المحاكاة"]
    : ["Choose a question", "Watch official ARIA", "Complete"];

  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {labels.map((label, index) => {
        const position = (index + 1) as 1 | 2 | 3;
        const done = step > position;
        const active = step === position;
        return (
          <li
            key={label}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5",
              active && "border-cyan-400/45 bg-cyan-400/10 text-cyan-100",
              done && "border-emerald-400/35 bg-emerald-400/10 text-emerald-200",
              !active && !done && "border-white/10 text-white/45",
            )}
          >
            <span>{done ? "✓" : position}</span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
