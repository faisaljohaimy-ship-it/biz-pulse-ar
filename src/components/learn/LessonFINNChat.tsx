/** Lesson adapter for the singleton FINN conversation. */
import { useState } from "react";
import { Send, Sparkles, ShieldCheck } from "lucide-react";
import { useFinn } from "@/lib/finn-core/hooks/useFinn";
import type { Bilingual } from "@/lib/learn/types";

interface Props {
  slug: string;
  lang: "ar" | "en";
  suggested: Bilingual[];
}

export function LessonFINNChat({ slug, lang, suggested }: Props) {
  const [input, setInput] = useState("");
  const { open, activeTurn } = useFinn();
  const ar = lang === "ar";
  const busy = activeTurn?.status === "queued" || activeTurn?.status === "streaming";

  function send(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    setInput("");
    const context = ar
      ? `[سياق تعليمي موثوق — الدرس: ${slug}] أجب عن سؤال المتعلم مع الحفاظ على ذاكرة FINN الرسمية: ${value}`
      : `[Trusted learning context — lesson: ${slug}] Answer the learner using FINN's official memory: ${value}`;
    open({ send: context, focus: false });
  }

  return (
    <div className="space-y-4" dir={ar ? "rtl" : "ltr"}>
      <div className="rounded-2xl border border-cyan-400/20 bg-[#04111F]/65 p-5 backdrop-blur">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-200/80">
          <Sparkles className="h-4 w-4" />
          {ar ? "FINN الرسمية · سياق الدرس" : "Official FINN · lesson context"}
        </div>
        <p className="mt-3 text-sm leading-6 text-white/70">
          {ar
            ? "تُفتح المحادثة الرسمية الوحيدة لFINN هنا، بنفس الذاكرة والصوت والصلاحيات في بقية النظام."
            : "This opens FINN's one official conversation, with the same memory, voice, and permissions used throughout SADEED."}
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-300/80">
          <ShieldCheck className="h-4 w-4" />
          {ar ? "لا توجد جلسة أو هوية مساعدة مكررة" : "No duplicate assistant identity or session"}
        </div>
      </div>

      {suggested.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggested.map((suggestion, index) => {
            const text = ar ? suggestion.ar : suggestion.en;
            return (
              <button
                key={index}
                type="button"
                disabled={busy}
                onClick={() => send(text)}
                className="rounded-full border border-cyan-400/25 bg-cyan-400/[0.06] px-3 py-1.5 text-xs text-cyan-100 transition-colors hover:bg-cyan-400/15 disabled:opacity-50"
              >
                {text}
              </button>
            );
          })}
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={ar ? "اكتب سؤالك لFINN…" : "Type your question to FINN…"}
          aria-label={ar ? "اكتب سؤالك لFINN" : "Type your question to FINN"}
          className="flex-1 rounded-xl border border-cyan-400/20 bg-[#04111F]/60 px-4 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-cyan-400/60 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-[#04111F] transition-opacity disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {ar ? "افتح واسأل" : "Open and ask"}
        </button>
      </form>
    </div>
  );
}
