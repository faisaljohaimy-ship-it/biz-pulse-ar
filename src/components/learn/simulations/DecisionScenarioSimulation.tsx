/**
 * DecisionScenarioSimulation — data-driven multi-step executive drill.
 *
 * The scenario config (see src/lib/learn/scenarios.ts) drives everything:
 * briefings, KPIs, options, correct answer, and delta feedback. Runs entirely
 * client-side, but persists completion via updateProgress once the learner
 * finishes all steps.
 */
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, XCircle, ArrowRight, Trophy, RotateCcw, TrendingUp, TrendingDown } from "lucide-react";
import { updateProgress } from "@/lib/learn/lessons.functions";
import { DECISION_SCENARIOS, type DecisionScenario, type DecisionOption } from "@/lib/learn/scenarios";
import { cn } from "@/lib/utils";

interface Props {
  slug: string;
  lang: "ar" | "en";
  onCompleted?: () => void;
}

function clamp(n: number) { return Math.max(0, Math.min(100, n)); }

export function DecisionScenarioSimulation({ slug, lang, onCompleted }: Props) {
  const ar = lang === "ar";
  const scenario: DecisionScenario | undefined = DECISION_SCENARIOS[slug];
  const persist = useServerFn(updateProgress);

  const [stepIdx, setStepIdx] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [kpis, setKpis] = useState<Record<string, number>>(() => {
    if (!scenario) return {};
    return Object.fromEntries(scenario.initialKpis.map((k) => [k.key, k.value]));
  });
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const step = scenario?.steps[stepIdx];

  const kpiRows = useMemo(() => {
    if (!scenario) return [];
    return scenario.initialKpis.map((k) => ({ key: k.key, label: ar ? k.label.ar : k.label.en, value: kpis[k.key] ?? k.value }));
  }, [scenario, kpis, ar]);

  if (!scenario) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-sm text-white/60">
        {ar ? "لا توجد سيناريو مسجّل لهذه الحصة." : "No scenario registered for this lesson."}
      </div>
    );
  }

  async function choose(optIdx: number) {
    if (chosen !== null || !step) return;
    setChosen(optIdx);
    const opt = step.options[optIdx];
    if (opt.correct) setCorrectCount((c) => c + 1);
    setKpis((prev) => {
      const next = { ...prev };
      for (const change of opt.kpiChanges) {
        next[change.key] = clamp((next[change.key] ?? 50) + change.delta);
      }
      return next;
    });
  }

  async function advance() {
    if (!step) return;
    if (stepIdx + 1 >= scenario.steps.length) {
      // finish
      setDone(true);
      setSaving(true);
      try {
        await persist({ data: { slug, simulation_completed: true } });
        onCompleted?.();
      } finally {
        setSaving(false);
      }
      return;
    }
    setStepIdx((i) => i + 1);
    setChosen(null);
  }

  function reset() {
    setStepIdx(0);
    setChosen(null);
    setCorrectCount(0);
    setDone(false);
    setKpis(Object.fromEntries(scenario!.initialKpis.map((k) => [k.key, k.value])));
  }

  if (done) {
    const total = scenario.steps.length;
    const pct = Math.round((correctCount / total) * 100);
    return (
      <div className="space-y-5" dir={ar ? "rtl" : "ltr"}>
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] p-6">
          <div className="mb-3 flex items-center gap-3">
            <Trophy className="h-6 w-6 text-emerald-300" />
            <div className="text-lg font-semibold text-white">
              {ar ? "أكملت المحاكاة التنفيذية" : "Executive simulation complete"}
            </div>
          </div>
          <div className="mb-4 text-2xl font-light text-white/90">
            {correctCount}/{total} · {pct}%
          </div>
          <p className="text-sm leading-relaxed text-white/80">{ar ? scenario.debrief.ar : scenario.debrief.en}</p>
        </div>
        <KpiBar rows={kpiRows} ar={ar} />
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm text-white/80 hover:bg-white/[0.06]"
        >
          <RotateCcw className="h-4 w-4" /> {ar ? "أعد التشغيل" : "Run again"}
        </button>
        {saving && <div className="text-xs text-white/50">{ar ? "جاري حفظ التقدّم…" : "Saving progress…"}</div>}
      </div>
    );
  }

  return (
    <div className="space-y-5" dir={ar ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.16em] text-white/50">
        <span>{ar ? `الخطوة ${stepIdx + 1} من ${scenario.steps.length}` : `Step ${stepIdx + 1} of ${scenario.steps.length}`}</span>
        <span>{ar ? `القرارات الصحيحة: ${correctCount}` : `Correct: ${correctCount}`}</span>
      </div>

      <KpiBar rows={kpiRows} ar={ar} />

      <div className="rounded-2xl border border-cyan-400/25 bg-[#04111F]/70 p-5">
        <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">
          {ar ? "إحاطة تنفيذية" : "Executive briefing"}
        </div>
        <h3 className="mb-3 text-lg font-semibold text-white">{ar ? step!.headline.ar : step!.headline.en}</h3>
        <p className="mb-4 text-sm leading-relaxed text-white/80">{ar ? step!.briefing.ar : step!.briefing.en}</p>
        <div className="grid grid-cols-3 gap-2">
          {step!.metrics.map((m, i) => (
            <div
              key={i}
              className={cn(
                "rounded-xl border p-3 text-center",
                m.tone === "good" && "border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-100",
                m.tone === "warn" && "border-amber-400/30 bg-amber-400/[0.06] text-amber-100",
                m.tone === "bad" && "border-rose-400/30 bg-rose-400/[0.06] text-rose-100",
                !m.tone && "border-white/10 bg-white/[0.02] text-white/85",
              )}
            >
              <div className="mb-1 text-[10px] uppercase tracking-wider opacity-70">{ar ? m.label.ar : m.label.en}</div>
              <div className="text-base font-semibold tabular-nums">{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {step!.options.map((opt, i) => (
          <OptionButton
            key={i}
            option={opt}
            index={i}
            chosen={chosen}
            ar={ar}
            onClick={() => choose(i)}
          />
        ))}
      </div>

      {chosen !== null && (
        <button
          onClick={advance}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-[#04111F] transition-transform hover:scale-[1.02]"
        >
          {stepIdx + 1 >= scenario.steps.length
            ? (ar ? "إنهاء المحاكاة" : "Finish simulation")
            : (ar ? "الخطوة التالية" : "Next step")}
          <ArrowRight className={cn("h-4 w-4", ar && "rotate-180")} />
        </button>
      )}
    </div>
  );
}

function OptionButton({
  option, index, chosen, ar, onClick,
}: {
  option: DecisionOption;
  index: number;
  chosen: number | null;
  ar: boolean;
  onClick: () => void;
}) {
  const isChosen = chosen === index;
  const revealed = chosen !== null;
  const showCorrect = revealed && option.correct;
  const showWrong = revealed && isChosen && !option.correct;

  return (
    <button
      onClick={onClick}
      disabled={revealed}
      className={cn(
        "group flex flex-col gap-2 rounded-2xl border p-4 text-start transition-all",
        !revealed && "border-white/12 bg-white/[0.02] hover:border-cyan-400/50 hover:bg-cyan-400/[0.05]",
        showCorrect && "border-emerald-400/50 bg-emerald-400/[0.08]",
        showWrong && "border-rose-400/50 bg-rose-400/[0.08]",
        revealed && !isChosen && !option.correct && "opacity-40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium text-white/95">{ar ? option.label.ar : option.label.en}</div>
        {showCorrect && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />}
        {showWrong && <XCircle className="h-5 w-5 shrink-0 text-rose-300" />}
      </div>
      {revealed && (isChosen || option.correct) && (
        <div className="rounded-lg border border-white/8 bg-black/30 p-3 text-xs leading-relaxed text-white/80">
          {ar ? option.feedback.ar : option.feedback.en}
          {option.kpiChanges.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {option.kpiChanges.map((c, i) => (
                <span
                  key={i}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    c.delta > 0 ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/15 text-rose-200",
                  )}
                >
                  {c.delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {ar ? c.label.ar : c.label.en} {c.delta > 0 ? "+" : ""}{c.delta}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

function KpiBar({ rows, ar }: { rows: Array<{ key: string; label: string; value: number }>; ar: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {rows.map((r) => (
        <div key={r.key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-white/50">
            <span>{r.label}</span>
            <span className="tabular-nums text-white/80">{Math.round(r.value)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500",
                r.value >= 70 ? "bg-emerald-400" : r.value >= 45 ? "bg-amber-400" : "bg-rose-400",
              )}
              style={{ width: `${r.value}%` }}
              dir="ltr"
            />
          </div>
          <div className="sr-only">{ar ? "قيمة" : "value"} {r.value}</div>
        </div>
      ))}
    </div>
  );
}
