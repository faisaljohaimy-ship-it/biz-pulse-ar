/**
 * LessonQuiz — server-graded knowledge test.
 * Client never sees correct_index; submitQuiz returns per-question feedback.
 */
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, XCircle, Loader2, Award, RefreshCw } from "lucide-react";
import { getQuiz, submitQuiz } from "@/lib/learn/lessons.functions";
import { cn } from "@/lib/utils";
import type { QuizSubmissionResult } from "@/lib/learn/types";

interface Props {
  slug: string;
  lang: "ar" | "en";
  passScore: number;
  onPassed?: () => void;
}

export function LessonQuiz({ slug, lang, passScore, onPassed }: Props) {
  const ar = lang === "ar";
  const getQuizFn = useServerFn(getQuiz);
  const submitFn = useServerFn(submitQuiz);

  const q = useQuery({
    queryKey: ["learn-quiz", slug],
    queryFn: () => getQuizFn({ data: { slug } }),
    refetchOnWindowFocus: false,
  });

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizSubmissionResult | null>(null);

  const submit = useMutation({
    mutationFn: async () => {
      const payload = Object.entries(answers).map(([id, choice]) => ({ id, choice }));
      return submitFn({ data: { slug, answers: payload } });
    },
    onSuccess: (r) => {
      setResult(r);
      if (r.passed) onPassed?.();
    },
  });

  if (q.isLoading) {
    return <div className="text-sm text-white/50">{ar ? "جاري تحميل الاختبار…" : "Loading quiz…"}</div>;
  }
  if (q.isError) {
    return <div className="text-sm text-rose-300">{(q.error as Error).message}</div>;
  }

  const questions = q.data ?? [];
  const allAnswered = questions.every((qq) => answers[qq.id] !== undefined);

  function reset() {
    setAnswers({});
    setResult(null);
  }

  return (
    <div className="space-y-6" dir={ar ? "rtl" : "ltr"}>
      {result && (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4",
            result.passed
              ? "border-emerald-400/40 bg-emerald-400/10"
              : "border-amber-400/40 bg-amber-400/10",
          )}
        >
          <div className="flex items-center gap-3">
            <Award className={cn("h-6 w-6", result.passed ? "text-emerald-300" : "text-amber-300")} />
            <div>
              <div className="text-lg font-semibold text-white">
                {ar ? "النتيجة" : "Score"}: {result.score}%
              </div>
              <div className="text-xs text-white/60">
                {ar ? "درجة النجاح" : "Pass score"}: {passScore}%
              </div>
            </div>
          </div>
          <div className="text-sm text-white/80">
            {result.passed
              ? (ar ? "✓ اجتزت هذه الحصة" : "✓ You have completed this lesson")
              : (ar ? "أعد المحاولة لاجتياز الحصة" : "Try again to pass this lesson")}
          </div>
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white transition-colors hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4" />
            {ar ? "إعادة" : "Retry"}
          </button>
        </div>
      )}

      <ol className="space-y-5">
        {questions.map((qq, idx) => {
          const feedback = result?.per_question.find((p) => p.id === qq.id);
          const chosen = answers[qq.id];
          return (
            <li key={qq.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="mb-3 text-sm font-semibold text-white/90">
                <span className="text-cyan-300">{idx + 1}. </span>
                {ar ? qq.prompt_ar : qq.prompt_en}
              </div>
              <div className="grid gap-2">
                {(ar ? qq.options_ar : qq.options_en).map((opt, i) => {
                  const selected = chosen === i;
                  const isCorrect = feedback && i === feedback.correct_index;
                  const isWrongPick = feedback && selected && !feedback.correct;
                  return (
                    <button
                      key={i}
                      disabled={!!result}
                      onClick={() => setAnswers((a) => ({ ...a, [qq.id]: i }))}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border px-3 py-2 text-sm text-white/90 transition-colors",
                        !result && selected && "border-cyan-400/60 bg-cyan-400/10",
                        !result && !selected && "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]",
                        result && isCorrect && "border-emerald-400/60 bg-emerald-400/10",
                        result && isWrongPick && "border-rose-400/60 bg-rose-400/10",
                        result && !isCorrect && !isWrongPick && "border-white/10 bg-white/[0.02] opacity-60",
                      )}
                    >
                      {result && isCorrect ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                      ) : result && isWrongPick ? (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                      ) : (
                        <span className={cn(
                          "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[10px]",
                          selected ? "border-cyan-400 bg-cyan-400/20 text-cyan-100" : "border-white/30 text-white/50",
                        )}>
                          {String.fromCharCode(65 + i)}
                        </span>
                      )}
                      <span className="text-start">{opt}</span>
                    </button>
                  );
                })}
              </div>
              {feedback && (
                <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/75">
                  {ar ? feedback.explanation_ar : feedback.explanation_en}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!result && (
        <button
          onClick={() => submit.mutate()}
          disabled={!allAnswered || submit.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-500 px-6 py-3 text-sm font-semibold text-[#04111F] transition-opacity disabled:opacity-50"
        >
          {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {ar ? "أرسل إجاباتي" : "Submit answers"}
        </button>
      )}
      {submit.isError && (
        <div className="text-sm text-rose-300">{(submit.error as Error).message}</div>
      )}
    </div>
  );
}
