/**
 * MeetAriaSimulation — guided demo where the learner walks through a live
 * three-step conversation with ARIA, watching how she reasons.
 *
 *   Step 1: Pick a preset executive question (or type your own).
 *   Step 2: Watch ARIA stream her evidence-backed answer.
 *   Step 3: Confirm you completed the simulation → marks progress.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Sparkles, PlayCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  const persist = useServerFn(updateProgress);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [transport] = useState(
    () =>
      new DefaultChatTransport({
        api: "/api/learn/aria-teach",
        body: () => ({ slug, lang }),
        fetch: async (url, init) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return fetch(url, { ...init, headers });
        },
      }),
  );
  const { messages, sendMessage, status } = useChat({
    id: `sim-meet-aria-${slug}`,
    transport,
  });

  const streaming = status === "submitted" || status === "streaming";
  const hasAssistant = useMemo(
    () => messages.some((m) => m.role === "assistant" && m.parts.some((p) => p.type === "text" && p.text.length > 0)),
    [messages],
  );

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (step === 2 && !streaming && hasAssistant) setStep(3);
  }, [step, streaming, hasAssistant]);

  async function ask(text: string) {
    setChosen(text);
    setStep(2);
    await sendMessage({ text });
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
              ? "اختر سؤالاً تنفيذياً لتراقب كيف تُفكّر آريا. ستستجيب فوراً ببثّ مباشر لاستدلالها."
              : "Pick an executive question and watch how ARIA thinks. She will stream her reasoning live."}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {suggested.map((s, i) => {
              const text = ar ? s.ar : s.en;
              return (
                <button
                  key={i}
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

      {(step === 2 || step === 3) && (
        <div className="space-y-4">
          {chosen && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/90">
              <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-white/50">
                {ar ? "سؤالك التنفيذي" : "Your executive question"}
              </div>
              <div>{chosen}</div>
            </div>
          )}
          <div
            ref={scrollRef}
            className="max-h-[380px] min-h-[180px] overflow-y-auto rounded-2xl border border-cyan-400/20 bg-[#04111F]/70 p-4"
          >
            {messages
              .filter((m) => m.role === "assistant")
              .map((m: UIMessage) => {
                const text = (m.parts ?? []).map((p) => (p.type === "text" ? p.text : "")).join("");
                return (
                  <div key={m.id} className="flex gap-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cyan-400/15 ring-1 ring-cyan-400/30">
                      <Sparkles className="h-4 w-4 text-cyan-200" />
                    </div>
                    <div className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-white/90">
                      {text || <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />}
                    </div>
                  </div>
                );
              })}
            {streaming && !hasAssistant && (
              <div className="flex items-center gap-2 text-sm text-cyan-200">
                <Loader2 className="h-4 w-4 animate-spin" />
                {ar ? "آريا تُفكّر…" : "ARIA is thinking…"}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/[0.06] p-4">
          <div className="text-sm text-white/90">
            {ar
              ? "لقد شاهدت آريا تُفكّر مباشرة. أكمل المحاكاة لتسجيل تقدّمك في الحصة."
              : "You have watched ARIA reason live. Complete the simulation to record your progress."}
          </div>
          <button
            onClick={complete}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-500 px-4 py-2.5 text-sm font-semibold text-[#04111F]",
              "transition-transform hover:scale-[1.02]",
            )}
          >
            <CheckCircle2 className="h-4 w-4" />
            {ar ? "أكملت المحاكاة" : "Mark simulation complete"}
          </button>
        </div>
      )}
    </div>
  );
}

function ExecutiveStepper({ step, ar }: { step: 1 | 2 | 3; ar: boolean }) {
  const labels = ar
    ? ["اختر سؤالاً تنفيذياً", "شاهد آريا تُفكّر", "أكمل المحاكاة"]
    : ["Choose an executive question", "Watch ARIA reason", "Complete the simulation"];
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs">
      {labels.map((l, i) => {
        const n = (i + 1) as 1 | 2 | 3;
        const done = step > n;
        const active = step === n;
        return (
          <li
            key={i}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5",
              active && "border-cyan-400/60 bg-cyan-400/10 text-cyan-100",
              done && "border-emerald-400/50 bg-emerald-400/10 text-emerald-200",
              !active && !done && "border-white/15 bg-white/[0.02] text-white/50",
            )}
          >
            <span
              className={cn(
                "grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold",
                active && "bg-cyan-400 text-[#04111F]",
                done && "bg-emerald-400 text-[#04111F]",
                !active && !done && "bg-white/10 text-white/60",
              )}
            >
              {done ? "✓" : n}
            </span>
            {l}
          </li>
        );
      })}
    </ol>
  );
}
